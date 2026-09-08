from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional, Any
from datetime import datetime
from ..analytics_transformer.advanced_transformer import AdvancedAnalyticsTransformer
from ..core.config import get_settings
from ..core.database import db
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..models.database_models import convert_mongo_document

settings = get_settings()
router = APIRouter()

analytics_transformer = AdvancedAnalyticsTransformer(db)

@router.get("/analytics/platform")
async def get_platform_analytics(current_user: UserInDB = Depends(get_current_user)):
    """Get platform analytics overview"""
    try:
        # Get overview metrics
        total_properties = await db.get_collection(settings.PROPERTY_COLLECTION).count_documents({})
        total_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({})
        pending_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"status": "pending"})
        approved_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"status": "approved"})
        
        # Calculate average rating
        rating_pipeline = [
            {"$match": {"rating": {"$exists": True}}},
            {"$group": {"_id": None, "avgRating": {"$avg": "$rating"}}}
        ]
        rating_result = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(rating_pipeline).to_list(length=1)
        average_rating = rating_result[0]["avgRating"] if rating_result else 0
        
        return {
            "overview": {
                "property_count": total_properties,
                "analyzed_reviews_count": total_reviews,
                "positive_sentiment_percentage": round((average_rating / 5) * 100),
                "open_issues_count": pending_reviews
            },
            "average_rating": average_rating,
            "total_reviews": total_reviews,
            "pending_reviews": pending_reviews,
            "approved_reviews": approved_reviews
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    property_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get analytics dashboard data"""
    try:
        # Build query for filtering
        query = {}
        if property_id:
            query["property_id"] = property_id
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date

        # Get reviews for the dashboard
        reviews = await db.get_collection(settings.REVIEW_COLLECTION).find(query).to_list(length=None)
        
        # Calculate metrics
        total_reviews = len(reviews)
        avg_rating = sum(r.get("rating", 0) for r in reviews) / total_reviews if total_reviews > 0 else 0
        
        # Get sentiment distribution
        sentiment_counts = {}
        for review in reviews:
            sentiment = review.get("sentiment_label", "neutral")
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        # Get property performance
        property_performance = {}
        for review in reviews:
            prop_id = review.get("property_id", "unknown")
            if prop_id not in property_performance:
                property_performance[prop_id] = {"reviews": [], "ratings": []}
            property_performance[prop_id]["reviews"].append(review)
            property_performance[prop_id]["ratings"].append(review.get("rating", 0))
        
        # Format property performance
        property_data = []
        for prop_id, data in property_performance.items():
            avg_rating = sum(data["ratings"]) / len(data["ratings"]) if data["ratings"] else 0
            property_data.append({
                "property_id": prop_id,
                "review_count": len(data["reviews"]),
                "average_rating": round(avg_rating, 2)
            })
        
        # Sort by review count
        property_data.sort(key=lambda x: x["review_count"], reverse=True)
        property_data = property_data[:10]  # Top 10
        
        return {
            "overview": {
                "total_reviews": total_reviews,
                "average_rating": round(avg_rating, 2),
                "sentiment_distribution": sentiment_counts,
                "property_performance": property_data
            },
            "date_range": {"start": start_date, "end": end_date},
            "filters": {"property_id": property_id}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/property/{property_id}")
async def get_property_analytics(property_id: str) -> Dict:
    """Get comprehensive analytics for a specific property"""
    try:
        analytics = await analytics_transformer.db[settings.ANALYTICS_COLLECTION].find_one(
            {"property_id": property_id}
        )
        
        if not analytics:
            raise HTTPException(status_code=404, detail="Analytics not found")
            
        return {
            "visualizations": analytics.get("visualizations", {}),
            "insights": analytics.get("insights", {}),
            "updated_at": analytics.get("updated_at")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/properties/overview")
async def get_properties_overview() -> Dict:
    """Get overview analytics for all properties"""
    try:
        # Get all properties
        properties = await analytics_transformer.db[settings.PROPERTY_COLLECTION].find().to_list(None)
        
        # Get aggregated analytics
        analytics_list = await analytics_transformer.db[settings.ANALYTICS_COLLECTION].find().to_list(None)
        
        # Create topic heatmap
        property_reviews = {
            prop["_id"]: await analytics_transformer.db[settings.REVIEW_COLLECTION].find(
                {"property_id": prop["_id"]}
            ).to_list(None)
            for prop in properties
        }
        
        heatmap = analytics_transformer.create_topic_heatmap(property_reviews)
        
        # Aggregate overall metrics
        overall_metrics = {
            "total_properties": len(properties),
            "total_reviews": sum(len(reviews) for reviews in property_reviews.values()),
            "average_rating": sum(
                sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
                for reviews in property_reviews.values()
            ) / len(properties) if properties else 0
        }
        
        return {
            "overall_metrics": overall_metrics,
            "topic_heatmap": heatmap,
            "property_analytics": analytics_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/reviews/{property_id}")
async def get_property_reviews(property_id: str) -> List[Dict]:
    """Get enhanced review data for a property"""
    try:
        reviews = await analytics_transformer.db[settings.REVIEW_COLLECTION].find(
            {"property_id": property_id}
        ).sort("created_at", -1).to_list(None)
        
        # Get analytics for each review
        review_analytics = await analytics_transformer.db[settings.ANALYTICS_COLLECTION].find(
            {"review_id": {"$in": [r["_id"] for r in reviews]}}
        ).to_list(None)
        
        # Combine review data with analytics
        analytics_map = {a["review_id"]: a for a in review_analytics}
        enhanced_reviews = []
        
        for review in reviews:
            analytics = analytics_map.get(review["_id"], {})
            enhanced_reviews.append({
                **review,
                "sentiment_score": analytics.get("sentiment_score"),
                "sentiment_label": analytics.get("sentiment_label"),
                "emotions": analytics.get("emotions", []),
                "topics": analytics.get("topics", []),
                "confidence_score": analytics.get("confidence_score")
            })
            
        return enhanced_reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/trends")
async def get_analytics_trends() -> Dict:
    """Get trend analysis across all properties"""
    try:
        reviews = await analytics_transformer.db[settings.REVIEW_COLLECTION].find().to_list(None)
        trends = analytics_transformer.generate_performance_trends(reviews)
        
        return {
            "performance_trends": trends,
            "updated_at": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/comprehensive")
async def get_comprehensive_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
) -> Dict:
    """Get comprehensive analytics for the dashboard"""
    try:
        # Build date filter
        date_filter = {}
        if start_date or end_date:
            date_filter["created_at"] = {}
            if start_date:
                date_filter["created_at"]["$gte"] = start_date
            if end_date:
                date_filter["created_at"]["$lte"] = end_date
        
        # Get overview metrics
        total_properties = await db.get_collection(settings.PROPERTY_COLLECTION).count_documents({})
        total_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents(date_filter)
        
        # Get rating distribution
        rating_pipeline = [
            {"$match": {**date_filter, "rating": {"$exists": True}}},
            {"$group": {
                "_id": None,
                "avgRating": {"$avg": "$rating"},
                "minRating": {"$min": "$rating"},
                "maxRating": {"$max": "$rating"},
                "totalRated": {"$sum": 1}
            }}
        ]
        rating_stats = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(rating_pipeline).to_list(length=1)
        avg_rating = rating_stats[0]["avgRating"] if rating_stats else 0
        
        # Get sentiment distribution
        sentiment_pipeline = [
            {"$match": {**date_filter, "sentiment_label": {"$exists": True}}},
            {"$group": {"_id": "$sentiment_label", "count": {"$sum": 1}}}
        ]
        sentiment_data = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(sentiment_pipeline).to_list(length=None)
        sentiment_distribution = {result["_id"]: result["count"] for result in sentiment_data}
        
        # Get property performance
        property_pipeline = [
            {"$match": date_filter},
            {"$group": {
                "_id": "$property_id",
                "reviewCount": {"$sum": 1},
                "avgRating": {"$avg": "$rating"},
                "approvedCount": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}}
            }},
            {"$sort": {"reviewCount": -1}},
            {"$limit": 10}
        ]
        property_data = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(property_pipeline).to_list(length=None)
        property_performance = [convert_mongo_document(prop) for prop in property_data]
        
        # Get recent activity
        recent_pipeline = [
            {"$match": date_filter},
            {"$sort": {"created_at": -1}},
            {"$limit": 20}
        ]
        recent_activity = await db.get_collection(settings.REVIEW_COLLECTION).aggregate(recent_pipeline).to_list(length=None)
        recent_activity = [convert_mongo_document(activity) for activity in recent_activity]
        
        return {
            "overview": {
                "totalProperties": total_properties,
                "totalReviews": total_reviews,
                "averageRating": round(avg_rating, 2) if avg_rating else 0
            },
            "sentimentDistribution": sentiment_distribution,
            "propertyPerformance": property_performance,
            "recentActivity": recent_activity,
            "dateRange": {"start": start_date, "end": end_date},
            "updatedAt": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/sentiment-trends")
async def get_sentiment_trends(property_id: Optional[str] = None, time_range: Optional[str] = None):
    """Get sentiment trends data"""
    try:
        # Build query
        query = {}
        if property_id:
            query["property_id"] = property_id
        
        # Get reviews for trends analysis
        reviews = await db.get_collection(settings.REVIEW_COLLECTION).find(query).to_list(length=None)
        
        # Group by date and sentiment
        trends = {}
        for review in reviews:
            date = review.get("created_at", "").split("T")[0] if review.get("created_at") else "unknown"
            sentiment = review.get("sentiment_label", "neutral")
            
            if date not in trends:
                trends[date] = {"positive": 0, "neutral": 0, "negative": 0}
            
            if sentiment in trends[date]:
                trends[date][sentiment] += 1
        
        # Convert to list format
        trend_data = []
        for date, sentiments in sorted(trends.items()):
            trend_data.append({
                "date": date,
                "positive": sentiments["positive"],
                "neutral": sentiments["neutral"],
                "negative": sentiments["negative"]
            })
        
        return trend_data[:30]  # Last 30 days
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/topic-analysis")
async def get_topic_analysis():
    """Get topic analysis data"""
    try:
        # Get analytics collection for topics
        analytics_data = await db.get_collection(settings.ANALYTICS_COLLECTION).find().to_list(length=None)
        
        # Extract topics
        topic_counts = {}
        for doc in analytics_data:
            topics = doc.get("topics", [])
            for topic in topics:
                topic_counts[topic] = topic_counts.get(topic, 0) + 1
        
        # Convert to list format
        topic_data = []
        for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
            topic_data.append({
                "topic": topic,
                "count": count
            })
        
        return topic_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview/stats")
async def get_overview_stats():
    """Get overview statistics for dashboard"""
    try:
        # Get basic counts
        total_properties = await db.get_collection(settings.PROPERTY_COLLECTION).count_documents({})
        total_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({})
        
        # Calculate positive sentiment percentage
        positive_reviews = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({
            "sentiment_label": "positive"
        })
        
        positive_percentage = round((positive_reviews / total_reviews * 100) if total_reviews > 0 else 0)
        
        # Count open issues (pending reviews)
        open_issues = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({
            "status": "pending"
        })
        
        return {
            "property_count": total_properties,
            "analyzed_reviews_count": total_reviews,
            "positive_sentiment_percentage": positive_percentage,
            "open_issues_count": open_issues
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/mongo-visualizations")
async def get_mongo_visualizations(current_user: UserInDB = Depends(get_current_user)):
    """Get comprehensive analytics from MongoDB visualization_data collection"""
    try:
        # Get all visualizations from the visualization_data collection
        visualizations = await db.get_collection('visualization_data').find().to_list(length=None)
        
        # Get collection statistics
        collection_stats = {
            'analytics_results': await db.get_collection('analytics_results').count_documents({}),
            'sentiment_analyses': await db.get_collection('sentiment_analyses').count_documents({}),
            'visualization_data': len(visualizations),
            'rev_data': await db.get_collection('rev_data').count_documents({}),
            'prop_data': await db.get_collection('prop_data').count_documents({}),
            'guest_data': await db.get_collection('guest_data').count_documents({})
        }
        
        # Process visualization data
        processed_visualizations = []
        chart_types = {}
        properties_with_viz = set()
        
        for viz in visualizations:
            processed_viz = {
                'viz_id': viz.get('viz_id', ''),
                'viz_type': viz.get('viz_type', ''),
                'data': viz.get('data', {}),
                'property_id': viz.get('property_id'),
                'created_at': viz.get('created_at', '').isoformat() if viz.get('created_at') else '',
                'updated_at': viz.get('updated_at', '').isoformat() if viz.get('updated_at') else ''
            }
            processed_visualizations.append(processed_viz)
            
            # Count chart types
            chart_type = viz.get('viz_type', 'unknown')
            chart_types[chart_type] = chart_types.get(chart_type, 0) + 1
            
            # Track properties with visualizations
            if viz.get('property_id'):
                properties_with_viz.add(viz.get('property_id'))
        
        # Generate AI insights based on visualization data
        insights = {
            'summary': f"Found {len(visualizations)} visualizations across {len(chart_types)} different chart types",
            'key_findings': [
                f"Most common visualization type: {max(chart_types.items(), key=lambda x: x[1])[0] if chart_types else 'None'}",
                f"Data spans {len(properties_with_viz)} properties with visualization data",
                f"Total data points available across all collections: {sum(collection_stats.values())}"
            ],
            'recommendations': [
                "Consider adding more property-specific trend analyses",
                "Explore temporal patterns in guest behavior",
                "Implement predictive analytics based on historical data"
            ]
        }
        
        # Overview data
        overview = {
            'total_visualizations': len(visualizations),
            'chart_types': chart_types,
            'properties_with_visualizations': list(properties_with_viz)
        }
        
        return {
            'visualizations': {
                'overview': overview,
                'visualization_data': processed_visualizations
            },
            'insights': insights,
            'data_sources': collection_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/mongo-visualizations/{viz_id}")
async def get_specific_visualization(viz_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Get a specific visualization by ID"""
    try:
        viz = await db.get_collection('visualization_data').find_one({'viz_id': viz_id})
        
        if not viz:
            raise HTTPException(status_code=404, detail="Visualization not found")
            
        return {
            'viz_id': viz.get('viz_id'),
            'viz_type': viz.get('viz_type'),
            'data': viz.get('data', {}),
            'property_id': viz.get('property_id'),
            'created_at': viz.get('created_at', '').isoformat() if viz.get('created_at') else '',
            'updated_at': viz.get('updated_at', '').isoformat() if viz.get('updated_at') else ''
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/collections-overview")
async def get_collections_overview(current_user: UserInDB = Depends(get_current_user)):
    """Get overview of all MongoDB collections used for analytics"""
    try:
        collections_info = {}
        
        # Define collections to check
        collections = [
            'analytics_results',
            'sentiment_analyses',
            'visualization_data',
            'rev_data',
            'prop_data',
            'guest_data',
            'properties',
            'reviews',
            'guests'
        ]
        
        for collection_name in collections:
            try:
                count = await db.get_collection(collection_name).count_documents({})
                
                # Get sample document for schema info
                sample_doc = await db.get_collection(collection_name).find_one({})
                
                collections_info[collection_name] = {
                    'document_count': count,
                    'has_data': count > 0,
                    'sample_keys': list(sample_doc.keys()) if sample_doc else []
                }
            except Exception as e:
                collections_info[collection_name] = {
                    'document_count': 0,
                    'has_data': False,
                    'error': str(e)
                }
        
        return {
            'collections': collections_info,
            'total_collections': len(collections),
            'collections_with_data': sum(1 for info in collections_info.values() if info.get('has_data', False))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))