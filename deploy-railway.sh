#!/bin/bash

# 🚀 FinBuddy AI - Railway Deployment Script
# This script helps deploy your backend to Railway (FREE)

echo "🚀 Starting FinBuddy AI Backend Deployment to Railway..."
echo "💰 This deployment is 100% FREE - No API keys required!"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed!"
    echo ""
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway:"
    railway login
    echo ""
fi

echo "📁 Deploying backend from ./backend directory..."
echo "🎯 Using free server configuration (no API keys needed)"
echo ""

# Navigate to backend directory
cd backend

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up --service finbuddy-backend

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Wait for deployment to complete (2-3 minutes)"
echo "2. Get your backend URL from Railway dashboard"
echo "3. Set VITE_API_URL in Netlify to your Railway URL"
echo "4. Redeploy your Netlify frontend"
echo ""
echo "🔗 Railway Dashboard: https://railway.app/dashboard"
echo "🌐 Netlify Dashboard: https://app.netlify.com"
echo ""
echo "🎉 Your FinBuddy AI will be live soon!"