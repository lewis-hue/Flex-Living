from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from ..core.config import get_settings

settings = get_settings()

class MongoDB:
    def __init__(self):
        """Initialize MongoDB connection"""
        self.client: "Optional[AsyncIOMotorClient]" = None
        self.db: "Optional[AsyncIOMotorDatabase]" = None
            
    async def connect_to_database(self):
        """Connect to MongoDB database if not already connected"""
        if self.client:
            return
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000
            )
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DATABASE]
            print("✅ MongoDB connection successful")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.client = None
            self.db = None
            
    async def close_database_connection(self):
        """Close database connection"""
        if self.client is not None:
            self.client.close()
            self.client = None
            self.db = None
            
    def get_collection(self, collection_name: str):
        """Get MongoDB collection by name"""
        if self.db is None:
            raise ConnectionError("MongoDB is not connected. Please ensure database is connected before accessing collections.")
        return self.db[collection_name]

# Create database instance
db = MongoDB()