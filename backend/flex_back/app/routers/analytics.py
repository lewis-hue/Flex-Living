"""
Analytics Router with real-time data integration
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from datetime import datetime
import csv
import io
import json
from dateutil import parser

from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..services.real_analytics import real_analytics_service
from ..services.realtime_analytics import realtime_analytics_service

settings = get_settings()
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/comprehensive", response_model=Dict[str, Any])
async def get_comprehensive_analytics(
    property_id: Optional[str] = Query(None, description="Filter by specific property ID"),
    start_date: Optional[str] = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    force_refresh: Optional[bool] = Query(False, description="Force fresh data instead of using cache"),
    current_user: UserInDB = Depends(get_current_user)  # Authentication required
):
    """
    Get comprehensive real-time analytics from MongoDB collections
    
    This endpoint provides:
    - Real-time property performance from rev_data and prop_data
    - Live sentiment analysis from reviews
    - Dynamic AI insights based on current data patterns
    - Property metrics from actual guest reviews
    - Visualization data from visualizations_data collection
    - Automatic updates when database changes
    """
    try:
        # Convert date strings to ISO format if provided
        start_iso = None
        end_iso = None
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
                start_iso = start_date_obj.isoformat()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
                
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
                end_iso = end_date_obj.isoformat()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

        # Get real-time analytics data
        analytics_data = await realtime_analytics_service.get_fresh_analytics(
            property_id=property_id,
            start_date=start_iso,
            end_date=end_iso,
            force_refresh=force_refresh
        )
        
        return analytics_data
        
    except Exception as e:
        print(f"❌ Error fetching comprehensive analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")

@router.get("/property/{property_id}", response_model=Dict[str, Any])
async def get_property_analytics(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    current_user: UserInDB = Depends(get_current_user)  # Authentication required
):
    """Get analytics for a specific property using real data"""
    try:
        start_iso = None
        end_iso = None
        
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date)
            start_iso = start_date_obj.isoformat()
            
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date)
            end_iso = end_date_obj.isoformat()
        
        analytics_data = await real_analytics_service.get_comprehensive_analytics(
            property_id=property_id,
            start_date=start_iso,
            end_date=end_iso
        )
        
        return analytics_data
        
    except Exception as e:
        print(f"❌ Error fetching property analytics for {property_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch property analytics: {str(e)}")

@router.get("/real-data-summary", response_model=Dict[str, Any])
async def get_real_data_summary():
    """
    Get summary of real data available in collections
    This helps verify that we're using real data instead of mock data
    """
    try:
        # Get counts from each collection
        rev_count = await db.db.rev_data.count_documents({})
        prop_count = await db.db.prop_data.count_documents({})
        guest_count = await db.db.guest_data.count_documents({})
        viz_count = await db.db.visualization_data.count_documents({})
        
        # Get sample property performance from real data
        reviews = await db.db.rev_data.find().limit(100).to_list(length=None)
        property_stats = {}
        
        for review in reviews:
            prop_id = review.get("property_id")
            if prop_id:
                if prop_id not in property_stats:
                    property_stats[prop_id] = {"reviews": 0, "ratings": []}
                property_stats[prop_id]["reviews"] += 1
                property_stats[prop_id]["ratings"].append(review.get("rating", 0))
        
        # Get property names
        properties = await db.db.prop_data.find().to_list(length=None)
        prop_lookup = {prop.get("property_id"): prop for prop in properties}
        
        # Calculate actual top property
        top_property = None
        if property_stats:
            top_prop_id = max(property_stats.keys(), key=lambda pid: property_stats[pid]["reviews"])
            top_ratings = property_stats[top_prop_id]["ratings"]
            avg_rating = sum(top_ratings) / len(top_ratings) if top_ratings else 0
            top_property = {
                "property_id": top_prop_id,
                "property_name": prop_lookup.get(top_prop_id, {}).get("name", "Unknown"),
                "review_count": property_stats[top_prop_id]["reviews"],
                "average_rating": round(avg_rating, 2)
            }
        
        # Calculate real sentiment distribution
        sentiments = [review.get("sentiment", "neutral") for review in reviews]
        from collections import Counter
        sentiment_counts = Counter(sentiments)
        total_sentiment = len(sentiments)
        
        sentiment_dist = {
            "positive": sentiment_counts.get("positive", 0),
            "negative": sentiment_counts.get("negative", 0),
            "neutral": sentiment_counts.get("neutral", 0),
            "total": total_sentiment
        }
        
        return {
            "data_source_verification": {
                "using_real_data": True,
                "collections": {
                    "reviews": rev_count,
                    "properties": prop_count,
                    "guests": guest_count,
                    "visualizations": viz_count
                },
                "sample_size": len(reviews)
            },
            "actual_property_performance": {
                "top_property": top_property,
                "total_properties_with_reviews": len(property_stats)
            },
            "real_sentiment_distribution": sentiment_dist,
            "note": "This shows actual data from your MongoDB collections, not mock data"
        }
        
    except Exception as e:
        print(f"❌ Error fetching real data summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data summary: {str(e)}")

@router.get("/export")
async def export_analytics_report(
    format: str = Query("csv", description="Export format: csv or pdf"),
    property_id: Optional[str] = Query(None, description="Filter by specific property ID"),
    start_date: Optional[str] = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Export analytics report in CSV or PDF format
    """
    try:
        # Get analytics data
        analytics_data = await real_analytics_service.get_comprehensive_analytics(
            property_id=property_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Convert date strings to ISO format if provided
        start_iso = None
        end_iso = None
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
                start_iso = start_date_obj.isoformat()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
                
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
                end_iso = end_date_obj.isoformat()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
        
        if format.lower() == "csv":
            return await generate_csv_export(analytics_data, property_id, start_date, end_date)
        elif format.lower() == "pdf":
            return await generate_pdf_export(analytics_data, property_id, start_date, end_date)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv' or 'pdf'")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error exporting analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export analytics: {str(e)}")

async def generate_csv_export(analytics_data: Dict[str, Any], property_id: Optional[str], start_date: Optional[str], end_date: Optional[str]):
    """Generate CSV export of analytics data"""
    try:
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["Reviews HQ Analytics Report"])
        writer.writerow([f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        if property_id:
            writer.writerow([f"Property ID: {property_id}"])
        if start_date and end_date:
            writer.writerow([f"Date Range: {start_date} to {end_date}"])
        writer.writerow([])
        
        # Overview section
        overview = analytics_data.get("overview", {})
        writer.writerow(["Overview"])
        writer.writerow(["Total Reviews", overview.get("total_reviews", 0)])
        writer.writerow(["Average Rating", overview.get("averageRating", 0)])
        writer.writerow([])
        
        # Sentiment analysis
        sentiment = analytics_data.get("sentiment_analysis", {})
        writer.writerow(["Sentiment Analysis"])
        writer.writerow(["Positive Reviews", sentiment.get("positive", 0)])
        writer.writerow(["Neutral Reviews", sentiment.get("neutral", 0)])
        writer.writerow(["Negative Reviews", sentiment.get("negative", 0)])
        writer.writerow(["Average Sentiment Score", sentiment.get("average_sentiment_score", 0)])
        writer.writerow([])
        
        # Property performance
        properties = analytics_data.get("property_performance", [])
        writer.writerow(["Property Performance"])
        writer.writerow(["Property ID", "Property Name", "Average Rating", "Review Count", "Response Rate", "Average Sentiment"])
        
        for prop in properties:
            writer.writerow([
                prop.get("property_id", "N/A"),
                prop.get("property_name", "N/A"),
                prop.get("average_rating", 0),
                prop.get("review_count", 0),
                prop.get("response_rate", 0),
                prop.get("average_sentiment", 0)
            ])
        
        writer.writerow([])
        
        # AI Insights
        insights = analytics_data.get("ai_insights", {})
        writer.writerow(["AI Insights"])
        writer.writerow(["Summary", insights.get("summary", "N/A")])
        
        recommendations = insights.get("recommendations", [])
        if recommendations:
            writer.writerow(["Recommendations"])
            for i, rec in enumerate(recommendations, 1):
                writer.writerow([f"{i}. {rec}"])
        
        # Prepare response
        output.seek(0)
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=flex-living-analytics-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
            }
        )
        return response
        
    except Exception as e:
        print(f"Error generating CSV export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV export: {str(e)}")

async def generate_pdf_export(analytics_data: Dict[str, Any], property_id: Optional[str], start_date: Optional[str], end_date: Optional[str]):
    """Generate PDF export of analytics data"""
    try:
        # For now, return JSON data as PDF is more complex
        # In a production environment, you would use a library like ReportLab or WeasyPrint
        
        # Create a comprehensive report in markdown format
        report_content = f"""# Reviews HQ Analytics Report
        
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{f"Property ID: {property_id}" if property_id else ""}
{f"Date Range: {start_date} to {end_date}" if start_date and end_date else ""}

## Overview
- Total Reviews: {analytics_data.get("overview", {}).get("total_reviews", 0)}
- Average Rating: {analytics_data.get("overview", {}).get("averageRating", 0)}

## Sentiment Analysis
- Positive: {analytics_data.get("sentiment_analysis", {}).get("positive", 0)}
- Neutral: {analytics_data.get("sentiment_analysis", {}).get("neutral", 0)}
- Negative: {analytics_data.get("sentiment_analysis", {}).get("negative", 0)}
- Average Sentiment Score: {analytics_data.get("sentiment_analysis", {}).get("average_sentiment_score", 0)}

## Property Performance
"""
        
        for prop in analytics_data.get("property_performance", []):
            report_content += f"""
### {prop.get("property_name", "Unknown Property")}
- Average Rating: {prop.get("average_rating", 0)}
- Review Count: {prop.get("review_count", 0)}
- Response Rate: {prop.get("response_rate", 0)}%
- Average Sentiment: {prop.get("average_sentiment", 0)}
"""
        
        insights = analytics_data.get("ai_insights", {})
        report_content += f"""
## AI Insights Summary
{insights.get("summary", "No summary available")}

## Key Findings
"""
        
        for finding in insights.get("key_findings", []):
            report_content += f"- {finding}\n"
        
        report_content += "\n## Recommendations\n"
        for rec in insights.get("recommendations", []):
            report_content += f"- {rec}\n"
        
        # Return as text for now (in production, convert to actual PDF)
        return StreamingResponse(
            iter([report_content]),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=reviews-hq-analytics-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
            }
        )
        
    except Exception as e:
        print(f"Error generating PDF export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF export: {str(e)}")

# Real-time Analytics Endpoints
@router.get("/realtime/status", response_model=Dict[str, Any])
async def get_realtime_status(current_user: UserInDB = Depends(get_current_user)):
    """Get real-time analytics status and cache information"""
    try:
        cache_status = await realtime_analytics_service.get_cache_status()
        return {
            "realtime_enabled": True,
            "change_streams_active": True,
            "cache_status": cache_status,
            "last_check": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"❌ Error fetching real-time status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {str(e)}")

@router.post("/realtime/refresh", response_model=Dict[str, Any])
async def force_refresh_analytics(
    property_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Manually trigger analytics refresh"""
    try:
        # Convert date strings to ISO format if provided
        start_iso = None
        end_iso = None
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            start_iso = start_date_obj.isoformat()
                
        if end_date:
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
            end_iso = end_date_obj.isoformat()

        # Force refresh analytics
        fresh_analytics = await realtime_analytics_service.get_fresh_analytics(
            property_id=property_id,
            start_date=start_iso,
            end_date=end_iso,
            force_refresh=True
        )
        
        return {
            "message": "Analytics refreshed successfully",
            "data": fresh_analytics,
            "refreshed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"❌ Error forcing analytics refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh analytics: {str(e)}")

@router.delete("/realtime/cache", response_model=Dict[str, Any])
async def clear_analytics_cache(current_user: UserInDB = Depends(get_current_user)):
    """Clear analytics cache manually"""
    try:
        await realtime_analytics_service.clear_cache()
        return {
            "message": "Analytics cache cleared successfully",
            "cleared_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")