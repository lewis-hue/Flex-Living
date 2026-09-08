from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from ..core.config import get_settings
from ..models.auth import UserInDB, UserCreate, TokenData, UserRole
from ..core.database import db

settings = get_settings()
# Use sha256_crypt to avoid bcrypt 72-byte limit issue
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        return pwd_context.hash(password)

    @staticmethod
    async def get_user(email: str) -> Optional[UserInDB]:
        if user_dict := await db.get_collection("auth_data").find_one({"email": email}):
            return UserInDB(**user_dict)
        return None

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
        if user := await AuthService.get_user(email):
            if AuthService.verify_password(password, user.hashed_password):
                # Update last login
                await db.get_collection("auth_data").update_one(
                    {"email": email},
                    {"$set": {"last_login": datetime.utcnow()}}
                )
                return user
        return None

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.JWT_SECRET, 
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    async def create_user(user: UserCreate, verified: bool = False) -> UserInDB:
        user_in_db = UserInDB(
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            hashed_password=AuthService.get_password_hash(user.password),
            is_active=False if not verified else True,
            verified=verified
        )
        
        await db.get_collection("auth_data").insert_one(user_in_db.model_dump())
        return user_in_db

    @staticmethod
    async def update_user_verification(email: str, verified: bool = True) -> bool:
        result = await db.get_collection("auth_data").update_one(
            {"email": email},
            {"$set": {"verified": verified, "is_active": verified}}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_current_user(token: str) -> Optional[UserInDB]:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
            token_data = TokenData(email=email)
        except JWTError:
            return None
            
        if user := await AuthService.get_user(token_data.email):
            return user
        return None

auth_service = AuthService()