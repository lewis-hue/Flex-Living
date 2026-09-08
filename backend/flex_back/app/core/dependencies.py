from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.auth import UserInDB, UserRole
from ..services.auth import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get the current authenticated user"""
    if user := await auth_service.get_current_user(token):
        return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_admin_access(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Check if the current user has admin access"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can access this resource"
        )
    return current_user

def check_admin_or_viewer_access(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Check if the current user has admin or viewer access"""
    if current_user.role not in [UserRole.ADMIN, UserRole.VIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or viewer users can access this resource"
        )
    return current_user