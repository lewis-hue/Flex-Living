from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging
from pathlib import Path
from .core.config import get_settings
from .core.database import db
from .services.analytics import analytics_service
from .services.realtime_analytics import realtime_analytics_service
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
    title="Reviews HQ Analytics API",
    description="API for Reviews HQ property analytics and management",
    version="1.0.0"
)

logger.info(f"Starting Reviews HQ API in {settings.ENVIRONMENT} environment")
logger.info(f"Host: {settings.HOST}, Port: {settings.PORT}")
logger.info(f"Debug mode: {settings.DEBUG}")

# Include routers with v1 API versioning
app.include_router(auth_router, prefix="/api/v1")
app.include_router(properties_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(notifications_router, prefix="/api/v1", tags=["notifications"])
app.include_router(health_router, prefix="/api/v1")
app.include_router(manager_comments_router, prefix="/api/v1", tags=["manager-comments"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and real-time analytics"""
    try:
        logger.info("Initializing database connection...")
        # Start database connection in background without blocking
        await db.connect_to_database()
        logger.info("Database connection initialized successfully")
        
        # Start real-time analytics monitoring
        try:
            await realtime_analytics_service.start_change_streams()
            logger.info("Real-time analytics monitoring started successfully")
        except Exception as e:
            logger.error(f"Failed to start real-time analytics: {e}")
            # Don't re-raise to prevent startup failure
            
    except Exception as e:
        logger.error(f"Failed to initialize database connection: {e}")
        # Don't re-raise to prevent startup failure

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup database connection"""
    try:
        logger.info("Closing database connection...")
        await db.close_database_connection()
        logger.info("Database connection closed successfully")
    except Exception as e:
        logger.error(f"Error closing database connection: {e}")

# Serve static frontend files
# Check for production static files (Cloud Run container)
static_paths = [
    Path("/app/static"),  # Production path in container (ensure Path object)
    Path(__file__).parent.parent.parent / "static",  # Development path relative to main.py
    Path(__file__).parent.parent.parent.parent / "frontend" / "dist",  # Alternative dev path
    Path(__file__).parent.parent.parent.parent / "static"  # Alternative static path
]

for static_path in static_paths:
    if static_path.exists():
        logger.info(f"Serving static files from: {static_path}")
        # Mount assets directory for CSS/JS files
        assets_path = static_path / "assets"
        if assets_path.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
        # Mount property images from frontend/dist/properties
        properties_path = static_path / "properties"
        if properties_path.exists():
            app.mount("/properties", StaticFiles(directory=str(properties_path)), name="properties")
        # Mount images from frontend/dist/images
        images_path = static_path / "images"
        if images_path.exists():
            app.mount("/images", StaticFiles(directory=str(images_path)), name="images")
        # Keep legacy /static mount for any other files
        app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
        break

# Special route for favicon to handle webp format
@app.get("/favicon.ico")
async def favicon_ico():
    """Serve favicon in ICO format"""
    favicon_path = Path("/app/static/flex.webp")
    # Check development paths as well
    if not favicon_path.exists():
        for dev_path in [
            Path(__file__).parent.parent.parent.parent / "frontend" / "dist" / "flex.webp",
            Path(__file__).parent.parent.parent / "static" / "flex.webp"
        ]:
            if dev_path.exists():
                favicon_path = dev_path
                break
    
    if favicon_path.exists():
        return FileResponse(str(favicon_path), media_type="image/webp")
    return HTTPException(status_code=404, detail="Favicon not found")

@app.get("/flex.webp")
async def flex_webp():
    """Serve flex.webp favicon"""
    favicon_path = Path("/app/static/flex.webp")
    # Check development paths as well
    if not favicon_path.exists():
        for dev_path in [
            Path(__file__).parent.parent.parent.parent / "frontend" / "dist" / "flex.webp",
            Path(__file__).parent.parent.parent / "static" / "flex.webp"
        ]:
            if dev_path.exists():
                favicon_path = dev_path
                break
    
    if favicon_path.exists():
        return FileResponse(str(favicon_path), media_type="image/webp")
    return HTTPException(status_code=404, detail="Favicon not found")

# Frontend routes
@app.get("/", include_in_schema=False)
async def serve_frontend():
    """Serve the main frontend application"""
    index_path = Path("/app/static/index.html")
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Reviews HQ Application", "status": "running"}

# Simple health check endpoint (no auth required) - HIGH PRIORITY FOR CLOUD RUN
@app.get("/health", include_in_schema=False)
async def simple_health_check():
    """Simple health check for load balancer - returns immediately"""
    return {"status": "ok", "service": "flex-living-backend", "timestamp": "2025-11-10T10:37:35.000Z"}

# Alternative health check that can test database if available
@app.get("/health/detailed", include_in_schema=False)
async def detailed_health_check():
    """Detailed health check including database status"""
    health_status = {"status": "ok", "service": "flex-living-backend"}
    
    try:
        # Test database connection if available
        if db.client:
            await db.client.admin.command('ping')
            health_status["database"] = "connected"
        else:
            health_status["database"] = "not initialized"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
    
    return health_status

# Routes
@app.get("/api/analytics/property/{property_id}")
async def get_property_analytics(property_id: str):
    """Get analytics data for a specific property"""
    try:
        data = await analytics_service.get_property_analytics(property_id)
        return data
    except Exception as e:
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
        raise HTTPException(status_code=500, detail=str(e))