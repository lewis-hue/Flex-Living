from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class User(UserBase):
    id: str

class UserInDB(User):
    hashed_password: str