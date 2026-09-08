# Flex Living Frontend - Startup Guide

## Problem Solved ✅

The original error was:
```bash
Error: Cannot find module '/home/lewis254/Downloads/AI ENGINEERING PROJECTS/Flex Living/frontend/start'
```

**Root Cause:** Missing "start" script in package.json

**Solution:** Added the missing "start" script to package.json that runs `vite` in development mode.

## Available Commands

### Development Server
```bash
# Navigate to frontend directory (handle spaces in directory name)
cd "Flex Living/frontend"

# Install dependencies (if not already installed)
npm install

# Start the development server (FIXED - now works with 'npm start')
npm start
# or
npm run dev
```

### Production Build
```bash
# Build for production
npm run build

# Build for development
npm run build:dev
```

### Other Commands
```bash
# Preview production build
npm run preview

# Run linting
npm run lint
```

## Server Details

- **URL:** http://localhost:8080/
- **Network:** http://192.168.100.4:8080/
- **Framework:** Vite + React + TypeScript
- **UI Library:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** React Query + Context API
- **Routing:** React Router DOM

## Project Structure

```
frontend/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # UI components (shadcn/ui)
│   │   └── *.tsx          # Custom components
│   ├── contexts/          # React contexts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities and API client
│   ├── pages/            # Page components
│   ├── assets/           # Static assets
│   └── *.tsx/.ts         # Entry and main files
├── public/               # Public static files
└── package.json         # Dependencies and scripts
```

## Environment Configuration

Create a `.env` file in the frontend directory based on `.env.example`:
```bash
cp .env.example .env
```

Default API URL is set to `http://localhost:8080` (backend server)

## Dependencies Status

All required dependencies are properly installed:
- ✅ React 18.3.1
- ✅ Vite 5.4.19
- ✅ TypeScript 5.8.3
- ✅ Radix UI components
- ✅ Tailwind CSS
- ✅ React Query (@tanstack/react-query)
- ✅ React Router DOM
- ✅ shadcn/ui components
- ✅ Lucide React (icons)

## Known Issues

- **Moderate vulnerabilities:** 2 moderate severity vulnerabilities detected in `esbuild` and `vite` packages
  - These are development-time vulnerabilities and don't affect production
  - Can be resolved with `npm audit fix --force` (may be a breaking change)
  - **Recommendation:** For now, these don't prevent the application from running

## Troubleshooting

### If npm start doesn't work:
1. Ensure you're in the correct directory: `cd "Flex Living/frontend"`
2. Run `npm install` to ensure all dependencies are installed
3. Check if port 8080 is available
4. Try `npm run dev` as an alternative

### If you get module not found errors:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`

### If the backend API isn't responding:
1. Ensure the backend is running on port 8080
2. Check the API URL in `.env` file
3. Verify CORS configuration in backend

## Next Steps

1. The frontend is now successfully running on http://localhost:8080/
2. Ensure the backend is running on http://localhost:8080/
3. Navigate to http://localhost:8080/ to access the application
4. Login with valid credentials to access the dashboard

The Flex Living frontend is now fully functional and ready for development!