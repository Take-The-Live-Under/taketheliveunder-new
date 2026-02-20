#!/bin/bash
# Automated Railway Environment Setup Script
# This sets all environment variables automatically

echo "🚀 Setting up Railway environment variables..."
echo ""

# Set all required environment variables
railway variables set ODDS_API_KEY="c1e957e22dfde2c23b3cac82758bef3e"
railway variables set SECRET_KEY="ncaa-betting-monitor-secret-key-change-in-production"
railway variables set USE_KENPOM="false"
railway variables set SPORT_MODE="ncaa"
railway variables set ENVIRONMENT="production"
railway variables set API_HOST="0.0.0.0"
railway variables set KENPOM_EMAIL="brookssawyer@gmail.com"
railway variables set KENPOM_PASSWORD="Suttonruth9424$$"
railway variables set OPENAI_API_KEY="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"

echo ""
echo "✅ All environment variables set!"
echo ""
echo "Run 'railway variables' to verify"
