"""
Cloud Run optimized entry point for Flex Living Application
Simplified setup for Google Cloud Run deployment
"""

import os
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from .core.config import get_settings
from .core.database import db
from .services.analytics import analytics_service
from .routers.auth import router as auth_router
from .routers.properties import router as properties_router
from .routers.reviews import router as reviews_router
from .routers.dashboard import router as dashboard_router
from .routers.health import router as health_router
from .routers.analytics import router as analytics_router
from .routers.manager_comments import router as manager_comments_router
from .routers.notifications import router as notifications_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Flex Living Analytics API",
    description="API for Flex Living property analytics and management",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT", "production") != "production" else None,
    redoc_url="/api/redoc" if os.getenv("ENVIRONMENT", "production") != "production" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),  # Frontend URLs from env
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include API routers with v1 API versioning
app.include_router(auth_router, prefix="/api/v1")
app.include_router(properties_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(notifications_router, prefix="/api/v1", tags=["notifications"])
app.include_router(health_router, prefix="/api/v1")
app.include_router(manager_comments_router, prefix="/api/v1", tags=["manager-comments"])

# Mount frontend static files
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    app.mount("/images", StaticFiles(directory=os.path.join(frontend_dist_path, "images")), name="images")

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    try:
        await db.connect_to_database()
        logger.info("Successfully connected to database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    await db.close_database_connection()

# Health check endpoint (no auth required)
@app.get("/health", include_in_schema=False)
async def simple_health_check():
    """Simple health check for load balancer"""
    return {"status": "ok", "service": "flex-living-backend", "version": "1.0.0"}

# Root route - serve the frontend index.html
@app.get("/", include_in_schema=False)
async def serve_frontend():
    """Serve the main frontend application"""
    index_path = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built", "message": "Please build the frontend first"}

# Catch-all route for frontend routes (SPA support)
@app.get("/{path:path}", include_in_schema=False)
async def serve_spa(path: str):
    """Serve React Router routes (SPA support)"""
    # Skip API routes
    if path.startswith("api/"):
        return {"error": "API route not found", "path": path}
    
    # Serve index.html for frontend routes
    index_path = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"error": "Not found", "path": path}

# API Routes
@app.get("/api/analytics/property/{property_id}")
async def get_property_analytics(property_id: str):
    """Get analytics data for a specific property"""
    try:
        data = await analytics_service.get_property_analytics(property_id)
        return data
    except Exception as e:
        logger.error(f"Error getting property analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/properties")
async def get_all_properties_analytics():
    """Get analytics data for all properties"""
    try:
        properties = await db.get_collection(settings.PROPERTY_COLLECTION).find().to_list(length=None)
        results = []
        for prop in properties:
            analytics = await analytics_service.get_property_analytics(prop['_id'])
            results.append({
                "property_id": prop['_id'],
                "name": prop.get('name'),
                "analytics": analytics
            })
        return results
    except Exception as e:
        logger.error(f"Error getting all properties analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/reviews/{property_id}")
async def get_property_reviews(property_id: str):
    """Get all reviews for a specific property"""
    try:
        reviews = await db.get_collection(settings.REVIEW_COLLECTION).find(
            {"property_id": property_id}
        ).sort("created_at", -1).to_list(length=None)
        return reviews
    except Exception as e:
        logger.error(f"Error getting property reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    if str(request.url.path).startswith("/api/"):
        return {"error": "API endpoint not found"}
    # For non-API routes, serve the frontend (SPA support)
    return await serve_frontend()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)