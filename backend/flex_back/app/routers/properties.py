from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..models.database_models import (
    PropertyResponse,
    PropertyDetailsResponse,
    convert_mongo_document
)

settings = get_settings()
router = APIRouter(prefix="/properties", tags=["properties"])

@router.get("/", response_model=List[PropertyResponse])
async def get_properties(current_user: UserInDB = Depends(get_current_user)):
    """Get all properties"""
    try:
        properties_cursor = db.get_collection(settings.PROPERTY_COLLECTION).find()
        properties = await properties_cursor.to_list(length=None)
        
        # Convert ObjectIds to strings and return as PropertyResponse
        converted_properties = []
        for prop in properties:
            if "_id" in prop:
                prop["_id"] = str(prop["_id"])
            converted_properties.append(PropertyResponse(**prop))
        
        return converted_properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Get a specific property by ID"""
    try:
        # Handle both string IDs and ObjectId
        if ObjectId.is_valid(property_id):
            query = {"_id": ObjectId(property_id)}
        else:
            query = {"_id": property_id}
            
        property_data = await db.get_collection(settings.PROPERTY_COLLECTION).find_one(query)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Convert ObjectId to string
        if "_id" in property_data:
            property_data["_id"] = str(property_data["_id"])
            
        return PropertyResponse(**property_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{property_id}/details", response_model=PropertyDetailsResponse)
async def get_property_details(property_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Get detailed property information including analytics"""
    try:
        # Handle both string IDs and ObjectId
        if ObjectId.is_valid(property_id):
            query = {"_id": ObjectId(property_id)}
        else:
            query = {"_id": property_id}
        
        # Get property data
        property_data = await db.get_collection(settings.PROPERTY_COLLECTION).find_one(query)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")

        # Convert ObjectId to string
        if "_id" in property_data:
            property_data["_id"] = str(property_data["_id"])

        # Get analytics data
        analytics = await db.get_collection(settings.ANALYTICS_COLLECTION).find_one({"property_id": property_id})
        if analytics:
            analytics = convert_mongo_document(analytics)

        # Get reviews count
        reviews_count = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"property_id": property_id})

        return {
            "property": PropertyResponse(**property_data),
            "analytics": analytics,
            "reviews_count": reviews_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))