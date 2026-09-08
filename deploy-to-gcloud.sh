#!/bin/bash

# Flex Living - Google Cloud Deployment Script
# This script deploys the full-stack Flex Living application to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-your-project-id}"
REGION="${CLOUD_DEPLOY_REGION:-us-central1}"
SERVICE_NAME="flex-living-app"
REPOSITORY_NAME="flex-living-repo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Flex Living deployment to Google Cloud${NC}"

# Check if required environment variables are set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${RED}❌ Please set GOOGLE_CLOUD_PROJECT environment variable or update PROJECT_ID in this script${NC}"
    echo "Example: export GOOGLE_CLOUD_PROJECT=your-actual-project-id"
    exit 1
fi

# Step 1: Enable required APIs
echo -e "${YELLOW}📋 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Step 2: Create Artifact Registry repository
echo -e "${YELLOW}🏗️  Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories create $REPOSITORY_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Flex Living Docker repository" || echo "Repository may already exist"

# Step 3: Configure Docker authentication
echo -e "${YELLOW}🔐 Configuring Docker authentication...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev

# Step 4: Build and deploy using Cloud Build
echo -e "${YELLOW}🔨 Building and deploying with Cloud Build...${NC}"
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REPOSITORY_NAME=$REPOSITORY_NAME,_REGION=$REGION \
    --timeout=1800s \
    --machine-type=e2-highcpu-2

# Step 5: Get the service URL
echo -e "${YELLOW}🌐 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform=managed \
    --region=$REGION \
    --format='value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${GREEN}🎉 Your Flex Living application is now live at:${NC}"
echo -e "${GREEN}   📱 Frontend: $SERVICE_URL${NC}"
echo -e "${GREEN}   🔌 API: $SERVICE_URL/api/v1/${NC}"
echo -e "${GREEN}   ❤️  Health: $SERVICE_URL/health${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Set up your MongoDB Atlas connection"
echo "2. Configure your environment variables in Cloud Run"
echo "3. Test the application endpoints"
echo ""
echo -e "${YELLOW}💡 To view logs:${NC}"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION"