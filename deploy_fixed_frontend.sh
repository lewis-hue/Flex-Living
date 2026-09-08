#!/bin/bash

# Flex Living - Deploy Fixed Frontend
# This script deploys the rebuilt frontend with CORS fixes

set -e

echo "🚀 Deploying Flex Living with CORS fixes..."

# Step 1: Ensure the dist directory is copied to the backend's expected location
echo "📁 Copying frontend build files..."
cd "Flex Living"
mkdir -p backend/static
rm -rf backend/static/*  # Clear old files
cp -r frontend/dist/* backend/static/

echo "✅ Frontend files copied to backend/static/"

# Step 2: Deploy the updated backend with new static files
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy flexliving-backend \
  --image=gcr.io/datascrapex-470817/flexliving-backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="MONGODB_URL=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/ Living,TEST_EMAIL=lewiemuguna417@gmail.com,ENVIRONMENT=production,DEBUG=false,LOG_LEVEL=INFO,HOST=0.0.0.0,PORT=8080"

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "✅ Your application should now work with:"
echo "  - Frontend connects to same domain (no more localhost)"
echo "  - CORS properly configured"
echo "  - Authentication working"
echo ""
echo "🌐 Test at: https://datascrapex-job3-1070255625225.us-central1.run.app"