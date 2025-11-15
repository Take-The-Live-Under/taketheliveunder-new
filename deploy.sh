#!/bin/bash
# One-Command Deployment Script for Basketball Betting App
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Basketball Betting App - Deployment Script"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found${NC}"
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo -e "${GREEN}Step 1: Deploying Backend to Railway...${NC}"
echo "---------------------------------------"

# Deploy to Railway
if railway up --detach; then
    echo -e "${GREEN}✅ Backend deployed to Railway${NC}"
else
    echo -e "${RED}❌ Railway deployment failed${NC}"
    echo "Make sure you've run 'railway login' and 'railway link' first"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Building Frontend...${NC}"
echo "----------------------------"

# Build frontend
cd frontend
if npm run build; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3: Deploying Frontend to Vercel...${NC}"
echo "---------------------------------------"

# Deploy to Vercel
if vercel --prod --yes; then
    echo -e "${GREEN}✅ Frontend deployed to Vercel${NC}"
else
    echo -e "${RED}❌ Vercel deployment failed${NC}"
    echo "Make sure you've run 'vercel login' and linked your project"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}=============================================="
echo "✅ Deployment Complete!"
echo "===============================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit your Railway dashboard to get the backend URL"
echo "2. Update Vercel environment variable NEXT_PUBLIC_API_URL with Railway URL"
echo "3. Test your production site!"
echo ""
echo "Useful commands:"
echo "  railway logs      - View backend logs"
echo "  vercel logs       - View frontend logs"
echo "  railway status    - Check backend status"
echo ""
