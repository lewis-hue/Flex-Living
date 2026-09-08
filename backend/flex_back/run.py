import sys
import os
import uvicorn
import asyncio
import logging
from pathlib import Path

# Add the current directory to Python path for runtime execution
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir / "app"))

# Import the app with proper typing
# The type: ignore comments help mypy understand the imports
from app.main import app  # type: ignore[import]
from app.change_stream import run_change_stream_listener  # type: ignore[import]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Start the change stream listener in the background (non-blocking)
    try:
        # Create event loop if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Start change streams in background without blocking startup
        def start_change_streams_background():
            try:
                run_change_stream_listener()
                logger.info("Change stream listener started in background")
            except Exception as e:
                logger.warning(f"Failed to start change stream listener: {e}")
        
        # Schedule to start after the event loop starts
        loop.call_soon(start_change_streams_background)
        
    except Exception as e:
        logger.warning(f"Failed to initialize change stream listener: {e}")
        # Don't fail startup if change streams fail
    
    # Run the FastAPI application
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )