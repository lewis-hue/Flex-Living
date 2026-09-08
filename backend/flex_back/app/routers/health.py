from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from datetime import datetime
from ..core.database import db
from ..services.analytics import analytics_service
from ..services.email_service import email_service
from ..core.config import get_settings
from ..core.auth import get_current_user
from ..models import User

router = APIRouter(prefix="/health", tags=["health"])
settings = get_settings()

@router.get("/", response_model=Dict)
async def health_check():
    """
    Check health of all services
    """
    try:
        # Test MongoDB Connection
        try:
            await db.client.admin.command('ping')
            mongodb_status = "healthy"
        except Exception as e:
            mongodb_status = f"unhealthy: {str(e)}"

        # Test Groq AI Service
        groq_test = await analytics_service.test_groq_connection()
        
        # Test SendGrid Email Service
        try:
            if settings.DEBUG_EMAIL_TESTING:
                email_test = await email_service.send_test_email()
                email_status = "healthy" if email_test else "unhealthy"
            else:
                email_status = "not tested (debug mode off)"
        except Exception as e:
            email_status = f"unhealthy: {str(e)}"

        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "mongodb": mongodb_status,
                "groq_ai": groq_test["status"],
                "sendgrid": email_status
            },
            "environment": settings.ENVIRONMENT
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )

@router.get("/analytics", response_model=Dict)
async def analytics_health(current_user: User = Depends(get_current_user)):
    """
    Check analytics service health (protected endpoint)
    """
    try:
        # Test Groq AI with sample analysis
        sentiment_test = await analytics_service.analyze_review_sentiment(
            "Test review for service health check."
        )
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "analytics_service": {
                "groq_ai": "healthy" if "error" not in sentiment_test else f"unhealthy: {sentiment_test['error']}",
                "last_processed": sentiment_test.get("processed_at")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analytics health check failed: {str(e)}"
        )