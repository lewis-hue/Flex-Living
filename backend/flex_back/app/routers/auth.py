from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.auth import Token, UserCreate, UserInDB, UserLogin
from ..models.verification import VerifyEmailRequest, ResendVerificationRequest, VerificationResponse
from ..services.auth import auth_service
from ..services.verification import verification_service
from datetime import timedelta
from ..core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    if user := await auth_service.get_current_user(token):
        return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/login", response_model=Token)
async def login_for_access_token(user_credentials: UserLogin):
    if user := await auth_service.authenticate_user(user_credentials.email, user_credentials.password):
        access_token = auth_service.create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return Token(access_token=access_token, role=user.role)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/signup")
async def register_user(user: UserCreate):
    # Check if user already exists
    if await auth_service.get_user(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate and send verification code
    verification_code = await verification_service.create_verification(user.email)
    if not verification_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code"
        )
    
    # Store user with unverified status
    user_db = await auth_service.create_user(user, verified=False)
    return {"message": "Registration successful. Please check your email for verification code."}

@router.post("/verify-email", response_model=VerificationResponse)
async def verify_email(request: VerifyEmailRequest):
    # Get verification status first
    status = await verification_service.get_verification_status(request.email, request.code)
    
    if not status["valid"]:
        error_detail = "Invalid verification code"
        if status.get("expired"):
            error_detail = "Verification code has expired"
        elif status.get("attempts_remaining", 0) <= 0:
            error_detail = "Too many failed attempts"
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    
    # Attempt to verify the code
    if await verification_service.verify_code(request.email, request.code):
        # Update user's verified status
        await auth_service.update_user_verification(request.email, verified=True)
        return VerificationResponse(
            message="Email verified successfully",
            status={"verified": True}
        )
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to verify email"
    )

@router.post("/resend-verification", response_model=VerificationResponse)
async def resend_verification(request: ResendVerificationRequest):
    # Check if user exists and is unverified
    user = await auth_service.get_user(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user.verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate and send new verification code
    verification_code = await verification_service.create_verification(request.email)
    if not verification_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code"
        )
    
    return VerificationResponse(
        message="Verification code sent successfully",
        status={
            "sent": True,
            "expires_in_minutes": 15
        }
    )

@router.get("/verify-status/{email}/{code}", response_model=VerificationResponse)
async def check_verification_status(email: str, code: str):
    status = await verification_service.get_verification_status(email, code)
    return VerificationResponse(
        message="Verification status retrieved",
        status=status
    )

@router.get("/me", response_model=UserInDB)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user