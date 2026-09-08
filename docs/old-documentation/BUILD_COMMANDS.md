# 🐳 Flex Living Docker Build Commands

## Local Docker Build

### Navigate to the project directory and build:
```bash
cd "Flex Living"
docker build -t flex-living-fullstack:latest .
```

### Alternative with no cache (clean build):
```bash
cd "Flex Living"
docker build --no-cache -t flex-living-fullstack:latest .
```

### Build with buildkit (faster):
```bash
cd "Flex Living"
DOCKER_BUILDKIT=1 docker build -t flex-living-fullstack:latest .
```

## Test the Built Image

### Run the container:
```bash
docker run -p 8080:8080 flex-living-fullstack:latest
```

### Run in background:
```bash
docker run -d -p 8080:8080 --name flex-living-app flex-living-fullstack:latest
```

### View logs:
```bash
docker logs flex-living-app
```

## Build for Google Cloud (Production)

### Build and tag for Google Cloud:
```bash
cd "Flex Living"
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/flex-living-repo/flex-living-app:latest .
```

## Quick Command Reference

```bash
# Build the image
cd "Flex Living" && docker build -t flex-living-fullstack:latest .

# Test the image
docker run -p 8080:8080 flex-living-fullstack:latest

# Check if running
curl http://localhost:8080/health
```

---

# 📋 Dockerfile Content

```dockerfile
# Multi-stage Dockerfile for Flex Living Application
# Optimized for Google Cloud deployment

# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
COPY frontend/package-lock.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend for production
RUN npm run build

# Stage 2: Backend Build
FROM python:3.12-slim AS backend-builder

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy backend requirements
COPY backend/flex_back/requirements.txt backend/flex_back/pyproject.toml ./

# Copy backend source code
COPY backend/flex_back/ ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 3: Production Runtime
FROM python:3.12-slim AS production

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create and set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=backend-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy backend application
COPY --from=backend-builder /app/ /app/

# Copy built frontend to serve static files
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist /app/static

# Keep runtime dependencies minimal (no nginx/supervisord)
# Static files are copied to /app/static; ensure the app serves them or use external CDN.

# Create necessary directories and ensure ownership (keep static files)
RUN mkdir -p /app/static && \
    chown -R appuser:appuser /app

# Switch to non-root user for running the app
USER appuser

# Expose port 8080
EXPOSE 8080

# Health check (adjust path if your app exposes a different health endpoint)
HEALTHCHECK --interval=300000s --timeout=300000s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the FastAPI app directly (Cloud Run expects the container to listen on $PORT)
# Use sh -c to allow environment variable expansion for the port.
# Use app.main for the main application
CMD ["sh", "-c", "exec /opt/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

## Dockerfile Explanation

### Multi-Stage Build Structure:

**Stage 1 - Frontend Builder:**
- Uses `node:18-alpine` to build the React frontend
- Copies package files and installs dependencies
- Builds the production frontend into `/app/frontend/dist`

**Stage 2 - Backend Builder:**
- Uses `python:3.12-slim` for Python dependencies
- Creates virtual environment for isolation
- Installs all Python packages from requirements.txt
- Copies backend source code

**Stage 3 - Production Runtime:**
- Minimal `python:3.12-slim` image
- Creates non-root user for security
- Copies built frontend static files to `/app/static`
- Copies backend application and virtual environment
- Sets up health checks and startup command

### Key Features:
✅ **Optimized Image Size**: Multi-stage build reduces final image size  
✅ **Security**: Non-root user, minimal dependencies  
✅ **Health Checks**: Built-in health monitoring  
✅ **Cloud Run Ready**: Port configuration and startup optimized  
✅ **Static File Serving**: Frontend served through FastAPI  
✅ **Environment Variables**: PORT and other configs supported