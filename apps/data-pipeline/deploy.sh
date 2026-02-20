#!/bin/bash

# Basketball Betting App - Seamless Deployment Script
# Deploys backend to Railway and frontend to Vercel

set -e  # Exit on error

echo "🏀 Basketball Betting Monitor - Deployment Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Commit current changes
echo -e "${BLUE}Step 1: Committing changes...${NC}"
git add .
git commit -m "Deploy: Updated with referee integration and new API key - $(date +%Y-%m-%d)" || echo "No changes to commit"

# Step 2: Push to GitHub
echo -e "${BLUE}Step 2: Pushing to GitHub...${NC}"
git push origin NEWSITE11

# Step 3: Check if Railway is linked
echo -e "${BLUE}Step 3: Checking Railway setup...${NC}"
if railway status &> /dev/null; then
    echo -e "${GREEN}✓ Railway project linked${NC}"

    # Deploy to Railway
    echo -e "${BLUE}Deploying backend to Railway...${NC}"
    railway up --detach

    # Get Railway URL
    RAILWAY_URL=$(railway domain 2>/dev/null || echo "")
    if [ -z "$RAILWAY_URL" ]; then
        echo -e "${YELLOW}⚠ No Railway domain found. Generating one...${NC}"
        railway domain
        RAILWAY_URL=$(railway domain 2>/dev/null || echo "https://your-railway-app.railway.app")
    fi

    echo -e "${GREEN}✓ Backend deployed to: $RAILWAY_URL${NC}"
else
    echo -e "${YELLOW}⚠ Railway not linked. Skipping backend deployment.${NC}"
    echo -e "${YELLOW}Run 'railway link' to connect to your Railway project${NC}"
    RAILWAY_URL="https://your-railway-app.railway.app"
fi

# Step 4: Deploy frontend to Vercel
echo -e "${BLUE}Step 4: Deploying frontend to Vercel...${NC}"
cd frontend

# Set environment variable for production API URL
echo -e "${BLUE}Setting production API URL: $RAILWAY_URL${NC}"

# Deploy to Vercel with production flag
vercel --prod -e NEXT_PUBLIC_API_URL="$RAILWAY_URL" --yes

# Get Vercel URL
VERCEL_URL=$(vercel inspect --wait 2>/dev/null | grep -o 'https://[^"]*' | head -1 || echo "your-app.vercel.app")

cd ..

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}Frontend URL:${NC} $VERCEL_URL"
echo -e "${GREEN}Backend URL:${NC} $RAILWAY_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify the frontend loads at the Vercel URL"
echo "2. Check that live games are flowing through"
echo "3. Monitor Railway logs: railway logs"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  railway logs         - View backend logs"
echo "  railway status       - Check deployment status"
echo "  vercel ls           - List Vercel deployments"
echo "  vercel logs         - View frontend logs"
echo ""
