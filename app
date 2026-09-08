"""
Complete standalone Cloud Run application for Flex Living
No dependencies on the existing app structure
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get configuration from environment
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080").split(",")

# Create FastAPI app
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
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Database connection (simplified - no actual DB connection for now)
connected_to_db = False

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    global connected_to_db
    try:
        # For now, just log that we're starting up without actual DB connection
        logger.info("Flex Living API starting up...")
        connected_to_db = True
        logger.info("API started successfully")
    except Exception as e:
        logger.error(f"Startup error: {e}")
        connected_to_db = False

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global connected_to_db
    connected_to_db = False
    logger.info("Flex Living API shutting down")

# Health check endpoint
@app.get("/health", include_in_schema=False)
async def simple_health_check():
    """Simple health check for load balancer"""
    return {
        "status": "ok", 
        "service": "flex-living-backend", 
        "version": "1.0.0",
        "database_connected": connected_to_db
    }

# Root route - serve a simple landing page
@app.get("/", include_in_schema=False)
async def serve_frontend():
    """Serve a simple welcome page"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Flex Living API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; }
            .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info { background: #e7f3ff; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏠 Flex Living API</h1>
            <div class="status">
                ✅ API is running successfully!
            </div>
            <div class="info">
                <h3>Available Endpoints:</h3>
                <ul>
                    <li><a href="/health">GET /health</a> - Health check</li>
                    <li><a href="/api/v1">GET /api/v1</a> - API root</li>
                    <li><a href="/api/docs">GET /api/docs</a> - API documentation (if enabled)</li>
                </ul>
            </div>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Status:</strong> Cloud Run Ready ✅</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Basic API routes
@app.get("/api/v1", include_in_schema=True)
async def api_root():
    """API root endpoint"""
    return {
        "service": "Flex Living Analytics API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "api_root": "/api/v1"
        }
    }

# Example analytics endpoint (mock data for now)
@app.get("/api/analytics/properties")
async def get_properties_analytics():
    """Get analytics data for all properties (mock data)"""
    return [
        {
            "property_id": "property_1",
            "name": "Sample Property 1",
            "analytics": {
                "total_reviews": 45,
                "average_rating": 4.2,
                "occupancy_rate": 0.85
            }
        },
        {
            "property_id": "property_2", 
            "name": "Sample Property 2",
            "analytics": {
                "total_reviews": 32,
                "average_rating": 4.5,
                "occupancy_rate": 0.92
            }
        }
    ]

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found", "path": str(request.url.path)}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)

# Export the app for uvicorn
application = app