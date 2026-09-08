"""
Comments service with AI integration for Flex Living reviews system.
Handles comment management, AI responses, and analytics.
"""

from typing import List, Dict, Any
from datetime import datetime
from ..core.database import db
from ..core.config import get_settings
from ..models.comments import (
    CommentResponse, CommentsListResponse,
    CreateCommentRequest, UpdateCommentRequest, AIResponseRequest,
    CommentType, convert_comment_mongo_document
)

settings = get_settings()


class CommentsService:
    """Service for managing comments with AI integration"""
    
    def __init__(self):
        self.comments_collection = None
        self.reviews_collection = None
        self.analytics_collection = None
        
    async def initialize(self):
        """Initialize service collections"""
        self.comments_collection = db.get_collection("comments")
        self.reviews_collection = db.get_collection(settings.REVIEW_COLLECTION)
        self.analytics_collection = db.get_collection(settings.ANALYTICS_COLLECTION)
    
    async def create_comment(self, comment_data: CreateCommentRequest) -> CommentResponse:
        """Create a new comment"""
        try:
            # Create comment data
            comment_dict = comment_data.dict()
            comment_dict["created_at"] = datetime.utcnow()
            
            # Insert into database
            result = await self.comments_collection.insert_one(comment_dict)
            comment_dict["_id"] = str(result.inserted_id)
            
            # Update analytics for comment creation
            await self._update_comment_analytics(comment_dict["review_id"], "created")
            
            return CommentResponse(**comment_dict)
        except Exception as _:
            raise Exception(f"Failed to create comment: {str(e)}")
    
    async def get_comments_by_review(
        self, 
        review_id: str, 
        page: int = 1, 
        limit: int = 10
    ) -> CommentsListResponse:
        """Get comments for a specific review"""
        try:
            # Build query
            query = {"review_id": review_id}
            
            # Get total count
            total_count = await self.comments_collection.count_documents(query)
            
            # Get comments with pagination
            skip = (page - 1) * limit
            comments = await self.comments_collection.find(query).skip(skip).limit(limit).sort("created_at", 1).to_list(length=None)
            
            # Convert to response format
            response_comments = []
            for comment in comments:
                comment = convert_comment_mongo_document(comment)
                
                # Get replies for this comment
                replies_query = {"parent_comment_id": str(comment["_id"])}
                replies = await self.comments_collection.find(replies_query).sort("created_at", 1).to_list(length=None)
                replies = [convert_comment_mongo_document(reply) for reply in replies]
                
                # Add reply count
                comment["reply_count"] = len(replies)
                comment["replies"] = [CommentResponse(**reply) for reply in replies]
                
                response_comments.append(CommentResponse(**comment))
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit
            has_next = page < total_pages
            has_prev = page > 1
            
            return CommentsListResponse(
                comments=response_comments,
                total_count=total_count,
                page=page,
                limit=limit,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
        except Exception as _:
            raise Exception(f"Failed to get comments: {str(e)}")
    
    async def update_comment(
        self, 
        comment_id: str, 
        update_data: UpdateCommentRequest
    ) -> CommentResponse:
        """Update an existing comment"""
        try:
            # Prepare update data
            update_dict = update_data.dict(exclude_unset=True)
            update_dict["updated_at"] = datetime.utcnow()
            
            # Update in database
            result = await self.comments_collection.update_one(
                {"_id": comment_id},
                {"$set": update_dict}
            )
            
            if result.modified_count == 0:
                raise Exception("Comment not found")
            
            # Get updated comment
            updated_comment = await self.comments_collection.find_one({"_id": comment_id})
            updated_comment = convert_comment_mongo_document(updated_comment)
            
            return CommentResponse(**updated_comment)
        except Exception as _:
            raise Exception(f"Failed to update comment: {str(e)}")
    
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment and its replies"""
        try:
            # Delete comment and its replies
            result = await self.comments_collection.delete_many({
                "$or": [
                    {"_id": comment_id},
                    {"parent_comment_id": comment_id}
                ]
            })
            
            return result.deleted_count > 0
        except Exception as _:
            raise Exception(f"Failed to delete comment: {str(e)}")
    
    async def generate_ai_response(self, ai_request: AIResponseRequest) -> CommentResponse:
        """Generate AI response to a review"""
        try:
            # Get the review data
            review = await self.reviews_collection.find_one({"_id": ai_request.review_id})
            if not review:
                raise Exception("Review not found")
            
            # Generate AI response based on review content and sentiment
            ai_response_text = await self._generate_ai_response_text(
                ai_request.review_text,
                ai_request.response_style,
                ai_request.max_length
            )
            
            # Generate tags if requested
            tags = []
            if ai_request.include_tags:
                tags = await self._generate_ai_tags(ai_request.review_text)
            
            # Create AI comment
            ai_comment_data = CreateCommentRequest(
                review_id=ai_request.review_id,
                comment_text=ai_response_text,
                comment_type=CommentType.AI,
                author_name="Flex Living AI Assistant",
                is_ai_response=True,
                ai_model_used="Groq-Llama",
                tags=tags
            )
            
            return await self.create_comment(ai_comment_data)
        except Exception as _:
            raise Exception(f"Failed to generate AI response: {str(e)}")
    
    async def _generate_ai_response_text(
        self, 
        review_text: str, 
        style: str, 
        max_length: int
    ) -> str:
        """Generate AI response text using Groq"""
        try:
            # This would integrate with Groq API for response generation
            # For now, return a template response based on sentiment and content
            
            if "bad" in review_text.lower() or "terrible" in review_text.lower() or "awful" in review_text.lower():
                response_templates = [
                    "We sincerely apologize for your negative experience. Your feedback is valuable to us, and we are committed to addressing these issues promptly.",
                    "Thank you for bringing this to our attention. We take all feedback seriously and will work to improve the areas you mentioned.",
                    "We're sorry to hear about your experience. Please contact our management team so we can make this right."
                ]
            elif "good" in review_text.lower() or "great" in review_text.lower() or "excellent" in review_text.lower():
                response_templates = [
                    "Thank you so much for your wonderful review! We're thrilled that you had such a positive experience.",
                    "We're delighted to hear that you enjoyed your stay. Your kind words mean the world to our team.",
                    "Thank you for the fantastic feedback! We look forward to welcoming you back soon."
                ]
            else:
                response_templates = [
                    "Thank you for taking the time to share your feedback. We appreciate your input and will continue to improve our services.",
                    "Thank you for your review. Your experience is important to us, and we welcome any additional feedback you may have.",
                    "We appreciate you sharing your thoughts. Your feedback helps us maintain and improve our standards."
                ]
            
            # Simple selection based on style
            import random
            response = random.choice(response_templates)
            
            # Truncate if needed
            if len(response) > max_length:
                response = response[:max_length-3] + "..."
            
            return response
            
        except Exception as _:
            # Fallback response
            return "Thank you for your feedback. We appreciate you taking the time to share your experience with us."
    
    async def _generate_ai_tags(self, review_text: str) -> List[str]:
        """Generate AI tags for a review"""
        try:
            # Simple keyword-based tagging
            tags = []
            text_lower = review_text.lower()
            
            # Service-related tags
            if any(word in text_lower for word in ["staff", "service", "help", "friendly"]):
                tags.append("service")
            if any(word in text_lower for word in ["clean", "dirty", "hygiene", "tidy"]):
                tags.append("cleanliness")
            if any(word in text_lower for word in ["location", "area", "nearby", "accessible"]):
                tags.append("location")
            if any(word in text_lower for word in ["price", "cost", "value", "expensive", "cheap"]):
                tags.append("value")
            if any(word in text_lower for word in ["amenities", "facilities", "pool", "gym", "wifi"]):
                tags.append("amenities")
            
            # Sentiment tags
            if any(word in text_lower for word in ["excellent", "amazing", "perfect", "wonderful"]):
                tags.append("positive")
            elif any(word in text_lower for word in ["bad", "terrible", "awful", "poor"]):
                tags.append("negative")
            else:
                tags.append("neutral")
            
            return tags[:5]  # Limit to 5 tags
            
        except Exception as _:
            return ["general"]
    
    async def _update_comment_analytics(self, review_id: str, action: str):
        """Update analytics when comments are created/modified"""
        try:
            analytics_data = {
                "review_id": review_id,
                "action": action,
                "timestamp": datetime.utcnow()
            }
            
            await self.analytics_collection.insert_one(analytics_data)
        except Exception as _:
            print(f"Warning: Failed to update comment analytics: {e}")
    
    async def get_comment_analytics(self, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Get comment analytics and statistics"""
        try:
            # Build date filter
            date_filter = {}
            if start_date:
                date_filter["created_at"] = {"$gte": start_date}
            if end_date:
                if "created_at" in date_filter:
                    date_filter["created_at"]["$lte"] = end_date
                else:
                    date_filter["created_at"] = {"$lte": end_date}
            
            # Get total comments
            total_comments = await self.comments_collection.count_documents(date_filter)
            
            # Get comments by type
            comment_types_pipeline = [
                {"$match": date_filter},
                {"$group": {"_id": "$comment_type", "count": {"$sum": 1}}}
            ]
            comment_types = await self.comments_collection.aggregate(comment_types_pipeline).to_list(length=None)
            
            # Get AI responses count
            ai_responses = await self.comments_collection.count_documents({**date_filter, "is_ai_response": True})
            
            # Get resolved comments
            resolved_comments = await self.comments_collection.count_documents({**date_filter, "is_resolved": True})
            
            # Get most common tags
            tags_pipeline = [
                {"$match": date_filter},
                {"$unwind": "$tags"},
                {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            top_tags = await self.comments_collection.aggregate(tags_pipeline).to_list(length=None)
            
            return {
                "total_comments": total_comments,
                "ai_responses": ai_responses,
                "resolved_comments": resolved_comments,
                "comment_types": {item["_id"]: item["count"] for item in comment_types},
                "top_tags": [{"tag": item["_id"], "count": item["count"]} for item in top_tags],
                "resolution_rate": (resolved_comments / total_comments * 100) if total_comments > 0 else 0,
                "ai_response_rate": (ai_responses / total_comments * 100) if total_comments > 0 else 0
            }
        except Exception as _:
            raise Exception(f"Failed to get comment analytics: {str(e)}")
    
    async def get_pending_comments(self, limit: int = 20) -> List[CommentResponse]:
        """Get comments that need attention (unresolved, not AI responses)"""
        try:
            query = {
                "is_resolved": False,
                "is_ai_response": False
            }
            
            comments = await self.comments_collection.find(query).sort("created_at", -1).limit(limit).to_list(length=None)
            return [CommentResponse(**convert_comment_mongo_document(comment)) for comment in comments]
        except Exception as _:
            raise Exception(f"Failed to get pending comments: {str(e)}")


# Global service instance
comments_service = CommentsService()