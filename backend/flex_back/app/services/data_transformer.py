"""
Data transformation services for Flex Living reviews system.
Handles conversion between current and standard data formats.
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from bson import ObjectId
from ..models.database_models import (
    ReviewDB, PropertyDB, AnalyticsDB, 
    convert_mongo_document
)
from ..models.standard_models import (
    GuestDB, StandardReviewDB, StandardPropertyDB,
    GuestResponse, StandardReviewResponse, StandardPropertyResponse
)
from ..core.database import db
from ..core.config import get_settings

settings = get_settings()


class DataTransformer:
    """Handles data transformations between current and standard formats"""
    
    def __init__(self):
        self.property_field_mapping = {
            "price": "price_range",
            "property_type": "type"
        }
        
    def transform_review_to_standard(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform current review format to standard format
        
        Current format:
        {
            "review_id": "rev_001", 
            "property_id": "prop_001", 
            "reviewer_name": "Emily Carter",
            "reviewer_email": "emily.carter@example.com", 
            "rating": 5, 
            "sentiment": "positive", 
            "review_text": "The Grand Estate was breathtaking...",
            "status": "pending",
            "source": "direct",
            "created_at": "2025-11-08T12:00:00Z"
        }
        
        Standard format:
        {
            "review_id": "rev_001",
            "property_id": "prop_001", 
            "guest_id": "guest_001",
            "rating": 5,
            "sentiment": "positive",
            "review_text": "The Grand Estate was breathtaking — luxurious and peaceful!",
            "created_at": "2025-11-08T12:00:00Z"
        }
        """
        # Handle ObjectId conversion
        review_id = str(review_data.get("_id", review_data.get("id", "")))
        if not review_id:
            review_id = str(ObjectId())
            
        # Extract guest information
        reviewer_name = review_data.get("reviewer_name", "")
        reviewer_email = review_data.get("reviewer_email", "")
        
        # Create or find guest based on email
        guest_id = None
        if reviewer_email:
            guest_id = self._find_or_create_guest(reviewer_name, reviewer_email)
        
        # Standard review data
        standard_data = {
            "review_id": review_id,
            "property_id": review_data.get("property_id", ""),
            "guest_id": guest_id,
            "rating": review_data.get("rating", 0.0),
            "sentiment": review_data.get("sentiment_label") or review_data.get("sentiment", "neutral"),
            "review_text": review_data.get("review_text", ""),
            "created_at": review_data.get("created_at", datetime.utcnow())
        }
        
        # Add optional fields if they exist
        if "source" in review_data:
            standard_data["source"] = review_data["source"]
        if "updated_at" in review_data:
            standard_data["updated_at"] = review_data["updated_at"]
            
        return standard_data
    
    def transform_property_to_standard(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform current property format to standard format
        
        Current format:
        {
            "price": 2500.0,
            "property_type": "apartment"
        }
        
        Standard format:
        {
            "price_range": 2500.0,
            "type": "apartment"
        }
        """
        # Create a copy to avoid modifying original
        standard_data = property_data.copy()
        
        # Apply field mappings
        for old_field, new_field in self.property_field_mapping.items():
            if old_field in standard_data:
                standard_data[new_field] = standard_data[old_field]
                # Keep old field for backward compatibility
                if old_field != new_field:
                    standard_data[f"_{old_field}_legacy"] = standard_data[old_field]
        
        return standard_data
    
    def enrich_review_with_property(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich review data with property information
        """
        property_id = review_data.get("property_id")
        if not property_id:
            return review_data
            
        try:
            # Try to get property data
            property_collection = db.get_collection(settings.PROPERTY_COLLECTION)
            property_doc = property_collection.find_one({"_id": property_id})
            
            if property_doc:
                property_doc = convert_mongo_document(property_doc)
                property_data = self.transform_property_to_standard(property_doc)
                
                # Add property data to review
                enriched_data = review_data.copy()
                enriched_data["property_data"] = property_data
                
                return enriched_data
        except Exception as e:
            print(f"Warning: Could not enrich review with property data: {e}")
            
        return review_data
    
    async def _find_or_create_guest(self, name: str, email: str) -> str:
        """
        Find existing guest by email or create new one
        Returns guest_id
        """
        try:
            guests_collection = db.get_collection(settings.GUEST_COLLECTION)
            
            # Try to find existing guest
            existing_guest = await guests_collection.find_one({"email": email})
            if existing_guest:
                return str(existing_guest["_id"])
            
            # Create new guest
            guest_data = {
                "name": name,
                "email": email,
                "country": "Unknown",  # Default value
                "joined_date": datetime.utcnow().isoformat()
            }
            
            result = await guests_collection.insert_one(guest_data)
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"Warning: Could not find or create guest: {e}")
            return None
    
    def batch_transform_reviews(self, reviews_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform a batch of reviews to standard format
        """
        return [self.transform_review_to_standard(review) for review in reviews_data]
    
    def batch_transform_properties(self, properties_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform a batch of properties to standard format
        """
        return [self.transform_property_to_standard(prop) for prop in properties_data]
    
    async def validate_standard_format(self, data: Dict[str, Any], data_type: str) -> bool:
        """
        Validate that data conforms to standard format
        """
        try:
            if data_type == "review":
                StandardReviewResponse(**data)
                return True
            elif data_type == "guest":
                GuestResponse(**data)
                return True
            elif data_type == "property":
                StandardPropertyResponse(**data)
                return True
        except Exception as e:
            print(f"Validation error for {data_type}: {e}")
            return False
        
        return False


# Global transformer instance
data_transformer = DataTransformer()