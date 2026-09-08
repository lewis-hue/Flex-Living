from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId

from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..models.database_models import convert_mongo_document

settings = get_settings()
router = APIRouter(prefix="/manager-comments", tags=["manager-comments"])

@router.get("/", response_model=Dict[str, Any])
async def get_manager_comments(
    status: Optional[str] = Query(None, description="Filter by comment status"),
    comment_type: Optional[str] = Query(None, description="Filter by comment type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    manager_id: Optional[str] = Query(None, description="Filter by manager ID"),
    limit: int = Query(50, ge=1, le=200, description="Number of comments to return"),
    offset: int = Query(0, ge=0, description="Number of comments to skip"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get manager comments with optional filters"""
    try:
        # Build query
        query = {}
        if status:
            query["status"] = status
        if comment_type:
            query["comment_type"] = comment_type
        if priority:
            query["priority"] = priority
        if property_id:
            query["property_id"] = property_id
        if manager_id:
            query["manager_id"] = manager_id

        # Get total count
        total_count = await db.get_collection("manager_comments").count_documents(query)

        # Get comments with pagination
        comments = await db.get_collection("manager_comments").find(query).skip(offset).limit(limit).sort("created_at", -1).to_list(length=None)

        # Convert ObjectIds to strings
        comments = [convert_mongo_document(comment) for comment in comments]

        return {
            "comments": comments,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_next": total_count > offset + limit,
            "has_prev": offset > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Dict[str, str])
async def create_manager_comment(
    comment_data: Dict[str, Any],
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new manager comment"""
    try:
        # Add metadata
        comment_data.update({
            "manager_id": current_user.email,
            "status": "open",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

        # Insert into database
        result = await db.get_collection("manager_comments").insert_one(comment_data)
        
        return {
            "message": "Manager comment created successfully",
            "comment_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{comment_id}", response_model=Dict[str, str])
async def update_manager_comment(
    comment_id: str,
    update_data: Dict[str, Any],
    current_user: UserInDB = Depends(get_current_user)
):
    """Update an existing manager comment"""
    try:
        # Add update timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Update in database
        result = await db.get_collection("manager_comments").update_one(
            {"_id": ObjectId(comment_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Manager comment not found")

        return {"message": "Manager comment updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{comment_id}", response_model=Dict[str, str])
async def delete_manager_comment(
    comment_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a manager comment"""
    try:
        result = await db.get_collection("manager_comments").delete_one({"_id": ObjectId(comment_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Manager comment not found")

        return {"message": "Manager comment deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))