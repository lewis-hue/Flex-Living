"""
Standard Models for Flex Living Review System
These models define the standard format for review data transformation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Standard Models
class GuestDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    email: str
    country: Optional[str] = "Unknown"
    joined_date: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class StandardPropertyDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    description: str
    address: str
    price_range: float
    type: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int] = None
    amenities: List[str] = []
    images: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class StandardReviewDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    review_id: str
    property_id: str
    guest_id: Optional[str] = None
    rating: float
    sentiment: str
    review_text: str
    source: Optional[str] = "direct"
    status: ReviewStatus = ReviewStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

# Response Models
class GuestResponse(BaseModel):
    id: str = Field(..., description="Guest ID")
    name: str
    email: str
    country: Optional[str] = "Unknown"
    joined_date: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class StandardPropertyResponse(BaseModel):
    id: str = Field(..., description="Property ID")
    name: str
    description: str
    address: str
    price_range: float
    type: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int] = None
    amenities: List[str] = []
    images: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

class StandardReviewResponse(BaseModel):
    id: str = Field(..., description="Review ID")
    review_id: str
    property_id: str
    guest_id: Optional[str] = None
    rating: float
    sentiment: str
    review_text: str
    source: Optional[str] = "direct"
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None