"""
Initialize MongoDB collections and indexes for the authentication system
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from app.core.config import get_settings

settings = get_settings()

async def init_mongodb_auth():
    """Initialize MongoDB collections and indexes for authentication"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DATABASE]
    
    # Create indexes for verification_codes collection
    await db.verification_codes.create_indexes([
        # Index for finding active codes
        {
            "keys": [("email", 1), ("type", 1), ("used", 1), ("expires_at", 1)],
            "name": "active_codes_index"
        },
        # Index for cleanup of expired codes
        {
            "keys": [("expires_at", 1)],
            "name": "expiry_index",
            "expireAfterSeconds": 0  # TTL index
        },
        # Index for code verification
        {
            "keys": [("email", 1), ("code", 1), ("type", 1)],
            "name": "verification_index"
        }
    ])
    
    # Create indexes for auth_data collection
    await db.auth_data.create_indexes([
        # Unique email index
        {
            "keys": [("email", 1)],
            "name": "unique_email_index",
            "unique": True
        },
        # Index for verified status
        {
            "keys": [("verified", 1), ("is_active", 1)],
            "name": "verification_status_index"
        }
    ])
    
    print("✅ MongoDB authentication collections and indexes initialized successfully")

if __name__ == "__main__":
    asyncio.run(init_mongodb_auth())