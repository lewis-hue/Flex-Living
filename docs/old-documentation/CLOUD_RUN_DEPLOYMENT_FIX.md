# Cloud Run Deployment Fix for Flex Living Backend

## Problem Analysis

The deployment was failing due to permission errors with supervisord trying to write to system log directories. The original configuration was overly complex for Cloud Run, which is designed for simple, single-container deployments.

## Root Causes

1. **Permission Error**: `PermissionError: [Errno 13] Permission denied: '/var/log/supervisor/supervisord.log'`
2. **Complex Architecture**: Using supervisord + nginx when Cloud Run expects a simple single process
3. **Container Port Issues**: Health check failures due to startup process complications

## Solution Implemented

### 1. Simplified Dockerfile for Cloud Run
- Removed supervisord and nginx dependencies
- Direct FastAPI application serving
- Fixed directory permissions
- Proper user creation and security

### 2. New Cloud-Ready Entry Point
- Created `app/cloud_run_main.py` that serves both frontend and backend
- Single process serving static files and API
- Better error handling and logging
- Frontend SPA support

### 3. Architecture Changes
- **Before**: nginx + supervisord + FastAPI (multiple processes)
- **After**: Single FastAPI application serving both frontend and API

## Deployment Commands

### Option 1: Using the New Cloud-Run Optimized Dockerfile

```bash
# Build the image
cd Flex\ Living
docker build -f Dockerfile.cloudrun -t gcr.io/datascrapex-470817/flexliving-backend:latest .

# Push to Google Container Registry
docker push gcr.io/datascrapex-470817/flexliving-backend:latest

# Deploy to Cloud Run
gcloud run deploy flexliving-backend \
  --image=gcr.io/datascrapex-470817/flexliving-backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars=\
MONGODB_URL="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/",\
MONGODB_DATABASE="flex_living",\
GROQ_API_KEY="YOUR_GROQ_API_KEY",\
SENDGRID_API_KEY="YOUR_SENDGRID_API_KEY",\
FROM_EMAIL="roddymark706@gmail.com",\
JWT_SECRET="your_jwt_secret",\
JWT_ALGORITHM="HS256",\
JWT_ACCESS_TOKEN_EXPIRE_MINUTES="30",\
JWT_REFRESH_TOKEN_EXPIRE_DAYS="7",\
HOSTAWAY_API_KEY="your_hostaway_api_key",\
HOSTAWAY_ACCOUNT_ID="61148",\
HOSTAWAY_BASE_URL="https://api.hostaway.com/v1"
```

### Option 2: Direct Cloud Build (Recommended)

```bash
# Create cloudbuild.yaml in Flex Living directory
cat > cloudbuild.yaml << 'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.cloudrun', '-t', 'gcr.io/$PROJECT_ID/flexliving-backend:$BUILD_ID', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/flexliving-backend:$BUILD_ID']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'flexliving-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/flexliving-backend:$BUILD_ID'
      - '--platform'
      - 'managed'
      - '--region'
      - 'us-central1'
      - '--allow-unauthenticated'
      - '--port=8080'
      - '--set-env-vars'
      - 'MONGODB_URL=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/'
EOF

# Submit build
gcloud builds submit --config cloudbuild.yaml
```

## Key Changes Made

### Dockerfile.cloudrun
1. **Removed Complex Dependencies**: No supervisord, nginx, or multi-process setup
2. **Single Process**: Direct FastAPI application
3. **Proper Permissions**: Fixed log directory creation
4. **Security**: Non-root user execution
5. **Environment Setup**: Optimized for Cloud Run

### cloud_run_main.py
1. **Combined Frontend/Backend**: Single application serving both
2. **SPA Support**: React Router support for client-side routing
3. **Better Logging**: Comprehensive error handling and logging
4. **Health Checks**: Proper health endpoints
5. **Static File Serving**: Built-in static file serving

## Troubleshooting

### If Build Fails

1. **Check Dependencies**:
   ```bash
   cd Flex\ Living/frontend && npm install
   npm run build
   ```

2. **Verify Python Environment**:
   ```bash
   cd Flex\ Living/backend/flex_back
   pip install -r requirements.txt
   ```

3. **Test Locally**:
   ```bash
   docker run -p 8080:8080 flexliving-backend:test
   ```

### If Deployment Fails

1. **Check Logs**:
   ```bash
   gcloud run services describe flexliving-backend --region=us-central1
   gcloud run services logs read flexliving-backend --region=us-central1
   ```

2. **Common Issues**:
   - **Port 8080**: Ensure application listens on PORT environment variable
   - **Health Endpoint**: Check `/health` endpoint responds
   - **Database Connection**: Verify MongoDB URL is correct
   - **Environment Variables**: Check all required variables are set

3. **Rollback**:
   ```bash
   gcloud run services update-traffic flexliving-backend --to-latest --region=us-central1
   ```

### Performance Optimization

1. **Memory/CPU**: Adjust Cloud Run resources if needed
2. **Scaling**: Configure min/max instances based on traffic
3. **Caching**: Enable Cloud CDN for static assets
4. **Database**: Consider connection pooling for MongoDB

## Monitoring

### Health Checks
- **Application**: `GET /health`
- **API Docs**: `GET /api/docs` (dev only)
- **Frontend**: `GET /` (serves main app)

### Key Metrics to Monitor
- Container startup time
- Memory usage
- Request latency
- Error rates
- Database connection health

## Security Considerations

1. **Non-root User**: Application runs as non-root user
2. **Environment Variables**: Sensitive data in Cloud Run environment
3. **HTTPS**: Cloud Run provides automatic HTTPS
4. **CORS**: Configured for allowed origins
5. **JWT**: Secure token handling

This simplified approach should resolve the deployment issues and provide a more maintainable Cloud Run deployment.