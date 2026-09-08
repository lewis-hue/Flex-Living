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