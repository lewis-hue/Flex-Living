from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime, timedelta
from bson import ObjectId

from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from groq import Groq
import traceback

settings = get_settings()
router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationManager:
    def __init__(self):
        # Initialize Groq client without any potential proxy configuration
        try:
            self.client = Groq(api_key=settings.GROQ_API_KEY)
        except TypeError as e:
            if "proxies" in str(e):
                # If proxies error occurs, initialize with minimal config
                import httpx
                self.client = Groq(
                    api_key=settings.GROQ_API_KEY,
                    http_client=httpx.Client()
                )
            else:
                raise e

    async def generate_ai_notification_message(self, priority_type: str, context: dict) -> str:
        """Generate AI-powered notification messages based on priority cases"""
        try:
            prompt = f"""
            Generate a professional notification message for a property management system.
            
            Priority Type: {priority_type}
            Context: {context}
            
            Requirements:
            - Professional and actionable tone
            - Clear action items for team members
            - Specific to property management
            - Include relevant details from the context
            - Target audience: {context.get('team', 'general team')}
            
            Format: Keep it concise but informative, suitable for a notification system.
            """
            
            response = self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating AI notification: {e}")
            return self.get_fallback_message(priority_type, context)
    
    def get_fallback_message(self, priority_type: str, context: dict) -> str:
        """Fallback messages when AI generation fails"""
        messages = {
            "high_priority": f"High priority case requires immediate attention: {context.get('description', 'Review feedback indicates urgent action needed')}",
            "opportunity": f"New marketing opportunity identified: {context.get('description', 'Leverage positive feedback for campaigns')}",
            "technical": f"Technical issue requires resolution: {context.get('description', 'WiFi/maintenance issues reported')}",
            "marketing": f"Marketing brief generated from reviews: {context.get('description', 'Positive customer feedback available for campaigns')}"
        }
        return messages.get(priority_type, f"Notification: {context.get('description', 'General update available')}")

    async def create_notification(self, notification_data: dict) -> str:
        """Create a new notification in the database"""
        try:
            notification = {
                "notification_id": str(uuid.uuid4()),
                "title": notification_data.get("title", "New Notification"),
                "message": notification_data.get("message", ""),
                "type": notification_data.get("type", "info"),
                "priority": notification_data.get("priority", "medium"),
                "target_audience": notification_data.get("target_audience", "all"),
                "created_at": datetime.utcnow(),
                "created_by": notification_data.get("created_by", "system"),
                "expires_at": notification_data.get("expires_at"),
                "read_by": [],
                "action_required": notification_data.get("action_required", False),
                "action_url": notification_data.get("action_url"),
                "metadata": notification_data.get("metadata", {})
            }
            
            result = await db.get_collection("notifications").insert_one(notification)
            print(f"Notification created: {notification['notification_id']}")
            return notification["notification_id"]
            
        except Exception as e:
            print(f"Error creating notification: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_priority_notification(self, priority_type: str, context: dict) -> str:
        """Generate and create AI-powered priority notification"""
        try:
            # Generate AI message
            message = await self.generate_ai_notification_message(priority_type, context)
            
            # Create notification data
            notification_data = {
                "title": f"AI Alert: {priority_type.title()} Priority",
                "message": message,
                "type": "ai_generated",
                "priority": priority_type,
                "target_audience": context.get("team", "all"),
                "created_by": "ai_system",
                "action_required": True,
                "metadata": {
                    "ai_generated": True,
                    "source": context.get("source", "analytics"),
                    "context": context
                }
            }
            
            return await self.create_notification(notification_data)
            
        except Exception as e:
            print(f"Error generating priority notification: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_marketing_brief(self, positive_reviews: list, context: dict) -> str:
        """Generate marketing brief from positive reviews"""
        try:
            # Create prompt for marketing brief generation
            review_texts = [review.get("review_text", "") for review in positive_reviews[:5]]  # Top 5 reviews
            
            prompt = f"""
            Create a marketing brief based on positive customer reviews for Flex Living properties.
            
            Positive Reviews:
            {chr(10).join([f"- {review}" for review in review_texts])}
            
            Property Context: {context}
            
            Generate a professional marketing brief that:
            1. Highlights key positive themes
            2. Creates compelling marketing copy
            3. Suggests campaign angles
            4. Includes customer testimonials
            5. Is ready for team distribution
            
            Keep it concise but impactful.
            """
            
            response = self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.8
            )
            
            marketing_brief = response.choices[0].message.content.strip()
            
            # Create notification with marketing brief
            notification_data = {
                "title": "New Marketing Brief Available",
                "message": marketing_brief,
                "type": "marketing_brief",
                "priority": "medium",
                "target_audience": "marketing_team",
                "created_by": "ai_system",
                "metadata": {
                    "ai_generated": True,
                    "brief_type": "marketing",
                    "review_count": len(positive_reviews),
                    "context": context
                }
            }
            
            return await self.create_notification(notification_data)
            
        except Exception as e:
            print(f"Error generating marketing brief: {e}")
            # Fallback to simple notification
            notification_data = {
                "title": "Marketing Brief Generated",
                "message": f"Marketing brief created from {len(positive_reviews)} positive reviews. Review the latest feedback for campaign opportunities.",
                "type": "marketing_brief",
                "priority": "medium",
                "target_audience": "marketing_team",
                "created_by": "ai_system"
            }
            return await self.create_notification(notification_data)

notification_manager = NotificationManager()

@router.get("/", response_model=Dict[str, Any])
async def get_notifications(
    current_user: UserInDB = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    priority: Optional[str] = Query(None)
):
    """Get notifications for current user"""
    try:
        # Build query for user-specific notifications
        query = {}
        
        if unread_only:
            query["read_by"] = {"$ne": current_user.email}
        
        if priority:
            query["priority"] = priority
            
        # Get total count
        total_count = await db.get_collection("notifications").count_documents(query)
        
        # Get notifications with pagination
        skip = (page - 1) * limit
        notifications = await db.get_collection("notifications")\
            .find(query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=None)
        
        # Convert ObjectId to string
        for notification in notifications:
            notification["_id"] = str(notification["_id"])
            
        return {
            "notifications": notifications,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit,
            "unread_count": await db.get_collection("notifications").count_documents({
                "read_by": {"$ne": current_user.email}
            })
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Mark notification as read by current user"""
    try:
        result = await db.get_collection("notifications").update_one(
            {"notification_id": notification_id},
            {"$addToSet": {"read_by": current_user.email}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        return {"message": "Notification marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/priority-alert", response_model=Dict[str, str])
async def create_priority_notification(
    priority_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create AI-generated priority notification"""
    try:
        notification_id = await notification_manager.generate_priority_notification(
            priority_data.get("priority_type", "high_priority"),
            {
                "team": priority_data.get("team", "all"),
                "description": priority_data.get("description", ""),
                "source": priority_data.get("source", "manual"),
                "context": priority_data
            }
        )
        
        return {
            "message": "Priority notification created successfully",
            "notification_id": notification_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/marketing-brief", response_model=Dict[str, str])
async def create_marketing_brief(
    brief_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create AI-generated marketing brief notification"""
    try:
        notification_id = await notification_manager.generate_marketing_brief(
            brief_data.get("positive_reviews", []),
            brief_data.get("context", {})
        )
        
        return {
            "message": "Marketing brief notification created successfully",
            "notification_id": notification_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete notification (admin only)"""
    try:
        # Check if user has admin privileges
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
            
        result = await db.get_collection("notifications").delete_one(
            {"notification_id": notification_id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
            
        return {"message": "Notification deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))