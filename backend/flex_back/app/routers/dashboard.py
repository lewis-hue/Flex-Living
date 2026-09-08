from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..models.database_models import convert_mongo_document

settings = get_settings()
router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=Dict[str, Any])
async def get_dashboard_stats(current_user: UserInDB = Depends(get_current_user)):
    """Get dashboard statistics"""
    try:
        # Get total reviews count
        total_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({})

        # Get pending reviews count
        pending_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"status": "pending"})

        # Get approved reviews count
        approved_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"status": "approved"})

        # Calculate average rating
        pipeline = [
            {"$match": {"rating": {"$exists": True}}},
            {"$group": {"_id": None, "averageRating": {"$avg": "$rating"}}}
        ]
        rating_result = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(pipeline).to_list(length=1)
        average_rating = rating_result[0]["averageRating"] if rating_result else 0

        # Get recent reviews and convert ObjectIds
        recent_reviews_cursor = db.get_collection(settings.REVIEW_COLLECTION).find().sort("created_at", -1).limit(5)
        recent_reviews = await recent_reviews_cursor.to_list(length=None)
        recent_reviews = [convert_mongo_document(review) for review in recent_reviews]

        # Calculate sentiment distribution
        sentiment_pipeline = [
            {"$match": {"sentiment_label": {"$exists": True}}},
            {"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}
        ]
        sentiment_results = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(sentiment_pipeline).to_list(length=None)
        sentiment_distribution = {result["_id"]: result["count"] for result in sentiment_results}

        return {
            "totalReviews": total_reviews,
            "pendingReviews": pending_reviews,
            "approvedReviews": approved_reviews,
            "averageRating": average_rating,
            "recentReviews": recent_reviews,
            "sentimentDistribution": sentiment_distribution
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview", response_model=Dict[str, Any])
async def get_overview_dashboard(
    start_date: str = None,
    end_date: str = None,
    property_id: str = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get overview dashboard data"""
    try:
        # Build query for date filtering
        date_query = {}
        if start_date or end_date:
            date_query["created_at"] = {}
            if start_date:
                date_query["created_at"]["$gte"] = start_date
            if end_date:
                date_query["created_at"]["$lte"] = end_date

        if property_id:
            date_query["property_id"] = property_id

        # Get review statistics
        total_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents(date_query)

        # Get average rating
        rating_pipeline = [
            {"$match": {**date_query, "rating": {"$exists": True}}},
            {"$group": {"_id": None, "averageRating": {"$avg": "$rating"}}}
        ]
        rating_result = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(rating_pipeline).to_list(length=1)
        average_rating = rating_result[0]["averageRating"] if rating_result else 0

        # Get sentiment distribution
        sentiment_pipeline = [
            {"$match": {**date_query, "sentiment_label": {"$exists": True}}},
            {"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}
        ]
        sentiment_results = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(sentiment_pipeline).to_list(length=None)
        sentiment_distribution = {result["_id"]: result["count"] for result in sentiment_results}

        # Get property performance
        property_pipeline = [
            {"$match": date_query},
            {"$group": {
                "_id": "$property_id",
                "reviewCount": {"$sum": 1},
                "averageRating": {"$avg": "$rating"}
            }},
            {"$sort": {"reviewCount": -1}},
            {"$limit": 10}
        ]
        property_performance = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(property_pipeline).to_list(length=None)

        return {
            "totalReviews": total_reviews,
            "averageRating": average_rating,
            "sentimentDistribution": sentiment_distribution,
            "propertyPerformance": property_performance,
            "dateRange": {"start": start_date, "end": end_date}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))