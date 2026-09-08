import sys
from pathlib import Path
import uvicorn

# Add flex_back to Python path
backend_path = Path(__file__).parent
flex_back_path = backend_path / "flex_back"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(flex_back_path))

if __name__ == "__main__":
    import os
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("flex_back.app.main:app", host=host, port=port, reload=True)