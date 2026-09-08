# Frontend Redeployment Required - CORS Fix Implementation

**Issue:** The CORS fixes I implemented aren't live because the frontend needs to be rebuilt and redeployed.

## Current Problem
- Frontend still connects to `localhost:8080` (old version)
- API URL shows as `undefined` (environment variable not applied)
- Changes made to source code don't take effect until rebuild

## Required Steps to Fix

### Step 1: Set Environment Variable for Production
Create a production environment file:
```bash
cd Flex Living/frontend
echo "VITE_API_BASE_URL=/api" > .env.production
```

### Step 2: Rebuild Frontend with New Configuration
```bash
cd Flex Living/frontend
npm run build
```

### Step 3: Redeploy with Updated Static Files
The updated build needs to be deployed to Cloud Run. You can either:

**Option A: Use existing Cloud Build pipeline**
```bash
cd "Flex Living"
gcloud builds submit --config cloudbuild.yaml
```

**Option B: Manual redeploy with static files**
```bash
gcloud run deploy flexliving-backend \
  --source=./ \
  --region=us-central1 \
  --allow-unauthenticated
```

## Why This Fix Works
- The frontend build process reads environment variables
- `VITE_API_BASE_URL=/api` will be compiled into the production bundle
- This makes all API calls use relative URLs instead of localhost
- Combined with the CORS backend fix, this resolves the connection issues

## Expected Result After Redeploy
- API calls will use `/api/v1/auth/me` instead of `http://localhost:8080/api/v1/auth/me`
- CORS will work because frontend and backend are on same domain
- Authentication will function properly