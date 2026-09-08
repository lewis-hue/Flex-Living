# 🚀 Flex Living - Google Cloud Deployment Guide

## Overview
This guide will help you deploy the full-stack Flex Living application to Google Cloud using Cloud Run with a single command.

## Prerequisites

### 1. Google Cloud Setup
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth login
```

### 2. Environment Variables Required
Before deployment, ensure you have these environment variables or secrets:

```bash
# Required secrets (store as environment variables)
export MONGODB_URL="your-mongodb-atlas-connection-string"
export MONGODB_DATABASE="flex_living"
export JWT_SECRET="your-jwt-secret-key"
export ENCRYPTION_KEY="your-encryption-key"
export GROQ_API_KEY="your-groq-api-key"
export HOSTAWAY_API_KEY="your_hostaway_api_key"
export HOSTAWAY_ACCOUNT_ID="61148"
export SENDGRID_API_KEY="your-sendgrid-api-key"
export FROM_EMAIL="your-from-email"
```

### 3. Project Configuration
```bash
# Set your Google Cloud project
export GOOGLE_CLOUD_PROJECT="your-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

## Deployment Methods

### Method 1: One-Click Script (Recommended)
```bash
# Make the script executable
chmod +x deploy-to-gcloud.sh

# Run deployment
./deploy-to-gcloud.sh
```

### Method 2: Manual Cloud Build
```bash
# Build and deploy directly
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_NAME=flex-living-app,_REPOSITORY_NAME=flex-living-repo,_REGION=us-central1
```

### Method 3: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "Cloud Build" > "Triggers"
3. Create new trigger with this repository
4. Set configuration file to `cloudbuild.yaml`
5. Run trigger

## What Gets Deployed

### 🔧 Cloud Build Steps
1. **Build Docker Image**: Creates optimized full-stack container
2. **Push to Artifact Registry**: Stores image in Google-managed registry
3. **Deploy to Cloud Run**: Creates managed serverless service
4. **Configure Environment**: Sets all required environment variables

### 🏗️ Cloud Run Configuration
- **Service Name**: `flex-living-app`
- **Region**: `us-central1` (configurable)
- **Port**: `8080`
- **Memory**: `1GB`
- **CPU**: `1 vCPU`
- **Min Instances**: `0` (cost-effective for development)
- **Max Instances**: `10` (auto-scaling)
- **Execution Environment**: `Gen2` (latest runtime)
- **Authentication**: Public (no auth required)

## Post-Deployment Configuration

### 1. Set Environment Variables in Cloud Run
```bash
# Edit the service environment variables
gcloud run services update flex-living-app \
    --region=us-central1 \
    --set-env-vars="ENVIRONMENT=production,DEBUG=false"
```

### 2. Configure MongoDB Atlas
If using MongoDB Atlas:
1. Go to your MongoDB Atlas cluster
2. Add your Cloud Run service IP to IP whitelist
3. Update `MONGODB_URL` in Cloud Run environment variables

### 3. Test Deployment
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe flex-living-app \
    --platform=managed \
    --region=us-central1 \
    --format='value(status.url)')

# Test endpoints
curl $SERVICE_URL/health
curl $SERVICE_URL/api/v1/health
```

## Access Points

After successful deployment, your application will be available at:

- **🌐 Main Application**: `https://flex-living-app-[hash].run.app`
- **🔌 Backend API**: `https://flex-living-app-[hash].run.app/api/v1/`
- **❤️ Health Check**: `https://flex-living-app-[hash].run.app/health`
- **📊 Analytics**: `https://flex-living-app-[hash].run.app/api/v1/analytics/properties`

## Monitoring and Management

### View Logs
```bash
# View real-time logs
gcloud run services logs read flex-living-app --region=us-central1

# View specific build logs
gcloud builds log --stream [BUILD_ID]
```

### Update Service
```bash
# Redeploy with latest changes
gcloud run services replace flex-living-app \
    --image=us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/flex-living-repo/flex-living-app:latest \
    --region=us-central1
```

### Delete Service
```bash
# Remove the service
gcloud run services delete flex-living-app --region=us-central1
```

## Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Check build logs
   gcloud builds log --stream [BUILD_ID]
   ```

2. **Service Won't Start**
   ```bash
   # Check service logs
   gcloud run services logs read flex-living-app --region=us-central1
   ```

3. **Database Connection Issues**
   - Verify MongoDB Atlas IP whitelist includes Cloud Run service
   - Check environment variables are set correctly
   - Test connection from local environment first

4. **Environment Variables**
   ```bash
   # List current environment variables
   gcloud run services describe flex-living-app --region=us-central1 \
       --format="export"
   ```

## Cost Optimization

### Current Configuration
- **Idle Cost**: $0 (min-instances=0)
- **Active Cost**: ~$10-15/month (1GB RAM, 1 vCPU)
- **Build Cost**: ~$0.50 per deployment

### To Reduce Costs Further
- Use smaller instance types (e.g., 512MB RAM)
- Implement request caching
- Use Cloud CDN for static assets

## Security Best Practices

1. **Enable Authentication** (if needed)
   ```bash
   gcloud run services update flex-living-app \
       --region=us-central1 \
       --no-allow-unauthenticated
   ```

2. **Use Secret Manager** for sensitive data
   ```bash
   # Store secrets securely
   echo -n "your-secret" | gcloud secrets create SECRET_NAME --data-file=-
   ```

3. **Set up HTTPS**: Automatically handled by Cloud Run
4. **Environment Isolation**: Production vs Development environments

## Next Steps

1. **Domain Configuration**: Set up custom domain
2. **Database Migration**: Import production data
3. **Monitoring Setup**: Configure Cloud Monitoring
4. **Backup Strategy**: Implement database backups
5. **CI/CD Pipeline**: Automate deployments

---

## Support

For issues with this deployment:
1. Check the [troubleshooting section](#troubleshooting)
2. Review Google Cloud Run documentation
3. Check application logs in Cloud Console

**🎉 Happy Deploying!**