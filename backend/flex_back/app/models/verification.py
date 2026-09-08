from typing import Optional
from pydantic import BaseModel

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendVerificationRequest(BaseModel):
    email: str

class VerificationResponse(BaseModel):
    message: str
    status: Optional[dict] = None