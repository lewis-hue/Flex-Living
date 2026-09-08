from datetime import datetime, timedelta
from typing import Optional
import logging
from ..core.config import get_settings
from ..core.database import db
from ..services.email import email_service

settings = get_settings()
logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self):
        self._verification_codes = None
    
    @property
    def verification_codes(self):
        """Lazy initialization of verification codes collection"""
        if self._verification_codes is None:
            self._verification_codes = db.get_collection("verification_codes")
        return self._verification_codes
    
    async def _cleanup_old_codes(self, email: str):
        """Clean up old verification codes for the email"""
        await self.verification_codes.delete_many({
            "email": email,
            "expires_at": {"$lt": datetime.utcnow()}
        })
    
    async def create_verification(self, email: str) -> Optional[str]:
        """Create and send a verification code"""
        try:
            # Clean up old codes first
            await self._cleanup_old_codes(email)
            
            # Generate verification code
            code = email_service.generate_verification_code()
            
            # Store in verification_codes collection with 15-minute expiry
            await self.verification_codes.insert_one({
                "email": email,
                "code": code,
                "type": "email_verification",
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=15),
                "used": False,
                "attempts": 0,
                "max_attempts": 3
            })
            
            # Send verification email
            if await email_service.send_verification_code(email, code):
                return code
            
            # If email fails, delete the code
            await self.verification_codes.delete_one({"email": email, "code": code})
            return None
            
        except Exception as e:
            logger.error(f"Error creating verification code: {str(e)}")
            return None
    
    async def verify_code(self, email: str, code: str) -> bool:
        """Verify a code for an email"""
        try:
            # Clean up expired codes
            await self._cleanup_old_codes(email)
            
            # Find valid verification code
            verification = await self.verification_codes.find_one({
                "email": email,
                "code": code,
                "type": "email_verification",
                "used": False,
                "attempts": {"$lt": 3},
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if not verification:
                # Increment attempts if code exists but is wrong
                await self.verification_codes.update_many(
                    {
                        "email": email,
                        "type": "email_verification",
                        "used": False,
                        "expires_at": {"$gt": datetime.utcnow()}
                    },
                    {"$inc": {"attempts": 1}}
                )
                return False
            
            # Mark code as used
            await self.verification_codes.update_one(
                {"_id": verification["_id"]},
                {
                    "$set": {
                        "used": True,
                        "used_at": datetime.utcnow()
                    }
                }
            )
            
            # Send welcome email
            await email_service.send_welcome_email(email)
            return True
            
        except Exception as e:
            logger.error(f"Error verifying code: {str(e)}")
            return False
    
    async def is_email_verified(self, email: str) -> bool:
        """Check if an email has been verified"""
        try:
            # Look for a used verification code
            verification = await self.verification_codes.find_one({
                "email": email,
                "type": "email_verification",
                "used": True
            })
            return bool(verification)
        except Exception as e:
            logger.error(f"Error checking email verification: {str(e)}")
            return False
            
    async def get_verification_status(self, email: str, code: str) -> dict:
        """Get detailed status of a verification code"""
        try:
            verification = await self.verification_codes.find_one({
                "email": email,
                "code": code,
                "type": "email_verification"
            })
            
            if not verification:
                return {
                    "valid": False,
                    "message": "Code not found"
                }
            
            now = datetime.utcnow()
            is_expired = verification["expires_at"] < now
            too_many_attempts = verification["attempts"] >= verification["max_attempts"]
            
            return {
                "valid": not (is_expired or too_many_attempts or verification["used"]),
                "expired": is_expired,
                "attempts_remaining": verification["max_attempts"] - verification["attempts"],
                "expires_in_minutes": int((verification["expires_at"] - now).total_seconds() / 60)
            }
            
        except Exception as e:
            logger.error(f"Error getting verification status: {str(e)}")
            return {"valid": False, "message": "Error checking status"}

# Create verification service instance
verification_service = VerificationService()