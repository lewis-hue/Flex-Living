"""
Comments models and service for Flex Living reviews system.
Handles review comments and responses with AI integration.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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
class CommentType(str, Enum):
    GUEST = "guest"  # Comment from guest
    MANAGER = "manager"  # Comment from property manager
    AI = "ai"  # AI-generated response

# Database models
class CommentDB(BaseModel):
    """Database model for comments"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    review_id: str = Field(..., description="Review ID the comment belongs to")
    comment_text: str = Field(..., description="Comment text content")
    comment_type: CommentType = Field(..., description="Type of comment")
    author_name: str = Field(..., description="Author name")
    author_email: Optional[str] = Field(None, description="Author email")
    parent_comment_id: Optional[str] = Field(None, description="Parent comment ID for replies")
    is_ai_response: bool = Field(default=False, description="Whether this is an AI-generated response")
    ai_model_used: Optional[str] = Field(None, description="AI model used for generation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_resolved: bool = Field(default=False, description="Whether the comment/issue is resolved")
    tags: List[str] = Field(default_factory=list, description="Comment tags for categorization")
    
    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439014",
                "review_id": "rev_001",
                "comment_text": "Thank you for your feedback! We'll address these concerns.",
                "comment_type": "manager",
                "author_name": "Property Manager",
                "is_ai_response": False,
                "created_at": "2025-11-08T12:00:00Z"
            }
        }

# Response models
class CommentResponse(BaseModel):
    """Response model for comment data"""
    id: str = Field(..., description="Comment ID")
    review_id: str = Field(..., description="Review ID")
    comment_text: str = Field(..., description="Comment text")
    comment_type: str = Field(..., description="Comment type")
    author_name: str = Field(..., description="Author name")
    author_email: Optional[str] = Field(None, description="Author email")
    parent_comment_id: Optional[str] = Field(None, description="Parent comment ID")
    is_ai_response: bool = Field(..., description="Is AI response")
    ai_model_used: Optional[str] = Field(None, description="AI model used")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    is_resolved: bool = Field(..., description="Is resolved")
    tags: List[str] = Field(..., description="Comment tags")
    # Enhanced fields
    replies: List['CommentResponse'] = Field(default_factory=list, description="Reply comments")
    reply_count: int = Field(default=0, description="Number of replies")

class CommentsListResponse(BaseModel):
    """Response model for comments list"""
    comments: List[CommentResponse]
    total_count: int = Field(..., description="Total number of comments")
    page: int = Field(..., ge=1, description="Current page")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

# Request models
class CreateCommentRequest(BaseModel):
    """Request model for creating comments"""
    review_id: str = Field(..., description="Review ID")
    comment_text: str = Field(..., min_length=1, description="Comment text")
    comment_type: CommentType = Field(..., description="Comment type")
    author_name: str = Field(..., min_length=2, description="Author name")
    author_email: Optional[str] = Field(None, description="Author email")
    parent_comment_id: Optional[str] = Field(None, description="Parent comment ID for replies")
    tags: List[str] = Field(default_factory=list, description="Comment tags")
    is_ai_response: bool = Field(default=False, description="Is AI response")
    ai_model_used: Optional[str] = Field(None, description="AI model used")

class UpdateCommentRequest(BaseModel):
    """Request model for updating comments"""
    comment_text: Optional[str] = Field(None, min_length=1, description="Comment text")
    is_resolved: Optional[bool] = Field(None, description="Is resolved")
    tags: Optional[List[str]] = Field(None, description="Comment tags")

class AIResponseRequest(BaseModel):
    """Request model for AI-generated responses"""
    review_id: str = Field(..., description="Review ID")
    review_text: str = Field(..., description="Review text for AI to respond to")
    comment_type: CommentType = Field(CommentType.AI, description="Comment type")
    response_style: str = Field(default="professional", description="AI response style")
    include_tags: bool = Field(default=True, description="Include AI-generated tags")
    max_length: int = Field(default=500, description="Maximum response length")

# Utility functions
def convert_comment_mongo_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB comment document to JSON-serializable format"""
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
            doc[key] = convert_comment_mongo_document(value)
        elif isinstance(value, list):
            doc[key] = [
                convert_comment_mongo_document(item) if isinstance(item, dict) else 
                (str(item) if isinstance(item, ObjectId) else item)
                for item in value
            ]
    
    return doc