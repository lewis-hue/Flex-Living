from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"
    USER = "user"
    MANAGER = "manager"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.USER
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: Optional[str] = None  # Add id field for user identification
    hashed_password: str
    created_at: datetime = datetime.utcnow()
    last_login: Optional[datetime] = None
    verified: bool = False
    verification_code: Optional[str] = None
    verification_code_expires: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None