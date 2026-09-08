from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from bson import ObjectId
from enum import Enum

# Custom ObjectId serializer for Pydantic v2
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        # Update the JSON schema to use string type
        schema.update(type="string")
        return schema

# Enums
class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Database models with proper ObjectId handling
class PropertyDB(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: str
    address: str
    price: float
    property_type: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int] = None
    amenities: List[str] = []
    images: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "Luxury Apartment",
                "description": "Beautiful apartment in downtown",
                "address": "123 Main St, City, State",
                "price": 2500.0,
                "property_type": "apartment",
                "bedrooms": 2,
                "bathrooms": 2.0,
                "square_feet": 1200,
                "amenities": ["pool", "gym", "parking"],
                "images": ["image1.jpg", "image2.jpg"],
                "created_at": "2023-01-01T00:00:00Z"
            }
        }

class ReviewDB(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    property_id: str
    reviewer_name: str
    reviewer_email: str
    rating: float
    review_text: str
    source: str = "direct"
    status: ReviewStatus = ReviewStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AnalyticsDB(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    property_id: Optional[str] = None
    review_id: Optional[str] = None
    sentiment_label: Optional[SentimentType] = None
    sentiment_score: Optional[float] = None
    confidence_score: Optional[float] = None
    emotions: List[str] = []
    topics: List[str] = []
    key_phrases: List[str] = []
    visualizations: Optional[Dict[str, Any]] = None
    insights: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Response models
class PropertyResponse(BaseModel):
    id: str = Field(..., description="Property ID")
    name: str
    description: str
    address: str
    price: float
    property_type: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int]
    amenities: List[str]
    images: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

class PropertyDetailsResponse(BaseModel):
    property: PropertyResponse
    analytics: Optional[Dict[str, Any]] = None
    reviews_count: int = 0

class ReviewResponse(BaseModel):
    id: str = Field(..., description="Review ID")
    property_id: str
    reviewer_name: str
    reviewer_email: str
    rating: float
    review_text: str
    source: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    rejected_at: Optional[datetime]
    rejected_by: Optional[str]
    rejection_reason: Optional[str]
    # Enhanced fields
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    emotions: List[str] = []
    topics: List[str] = []
    confidence_score: Optional[float] = None

class ReviewsListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool

class ReviewDetailsResponse(BaseModel):
    review: ReviewResponse
    analytics: Optional[Dict[str, Any]] = None

# Utility functions
def convert_mongo_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable format"""
    if not doc:
        return doc
    
    # Convert ObjectId to string
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    
    # Convert any nested ObjectIds
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, dict):
            doc[key] = convert_mongo_document(value)
        elif isinstance(value, list):
            doc[key] = [
                convert_mongo_document(item) if isinstance(item, dict) else 
                (str(item) if isinstance(item, ObjectId) else item)
                for item in value
            ]
    
    return doc