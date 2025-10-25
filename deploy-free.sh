#!/bin/bash

# FinBuddy AI - 100% FREE Deployment Script
# Deploy to Vercel + Netlify + Railway

echo "🚀 FinBuddy AI - 100% FREE Deployment"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the FinBuddy root directory"
    exit 1
fi

echo "✅ Found FinBuddy project structure"
echo ""

# Build the project
echo "📦 Building frontend for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check for errors."
    exit 1
fi

echo "✅ Frontend built successfully!"
echo ""

echo "🎯 Deployment Options (All 100% FREE):"
echo "1. Deploy to Vercel + Railway"
echo "2. Deploy to Netlify + Railway"  
echo "3. Deploy to BOTH (Vercel + Netlify + Railway)"
echo "4. Show deployment URLs only"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Vercel + Railway"
        echo "================================"
        echo ""
        echo "1. Go to https://railway.app and deploy your backend:"
        echo "   - New Project → Deploy from GitHub repo"
        echo "   - Select your repository"
        echo "   - Root Directory: backend"
        echo "   - Start Command: npm run free"
        echo "   - Add Environment Variable: PORT=3001"
        echo ""
        echo "2. Go to https://vercel.com and deploy your frontend:"
        echo "   - New Project → Import from GitHub"
        echo "   - Select your repository"
        echo "   - Framework: Vite"
        echo "   - Add Environment Variable: VITE_API_URL=https://your-backend-url.railway.app"
        echo ""
        echo "📖 See FREE_DEPLOYMENT_GUIDE.md for detailed instructions"
        ;;
    2)
        echo ""
        echo "🌐 Deploying to Netlify + Railway"
        echo "================================"
        echo ""
        echo "1. Go to https://railway.app and deploy your backend:"
        echo "   - New Project → Deploy from GitHub repo"
        echo "   - Select your repository"
        echo "   - Root Directory: backend"
        echo "   - Start Command: npm run free"
        echo "   - Add Environment Variable: PORT=3001"
        echo ""
        echo "2. Go to https://netlify.com and deploy your frontend:"
        echo "   - New site from Git → GitHub"
        echo "   - Select your repository"
        echo "   - Build Command: npm run build"
        echo "   - Publish Directory: dist"
        echo "   - Add Environment Variable: VITE_API_URL=https://your-backend-url.railway.app"
        echo ""
        echo "📖 See FREE_DEPLOYMENT_GUIDE.md for detailed instructions"
        ;;
    3)
        echo ""
        echo "🎉 Deploying to ALL platforms (Vercel + Netlify + Railway)"
        echo "========================================================"
        echo ""
        echo "1. Deploy Backend to Railway:"
        echo "   - https://railway.app → New Project → Deploy from GitHub repo"
        echo "   - Root Directory: backend, Start Command: npm run free"
        echo "   - Environment Variable: PORT=3001"
        echo ""
        echo "2. Deploy Frontend to Vercel:"
        echo "   - https://vercel.com → New Project → Import from GitHub"
        echo "   - Framework: Vite, Environment Variable: VITE_API_URL=https://your-backend-url.railway.app"
        echo ""
        echo "3. Deploy Frontend to Netlify:"
        echo "   - https://netlify.com → New site from Git → GitHub"
        echo "   - Build Command: npm run build, Publish Directory: dist"
        echo "   - Environment Variable: VITE_API_URL=https://your-backend-url.railway.app"
        echo ""
        echo "📖 See FREE_DEPLOYMENT_GUIDE.md for detailed instructions"
        ;;
    4)
        echo ""
        echo "🌐 Your deployment URLs will be:"
        echo "==============================="
        echo ""
        echo "Backend (Railway):"
        echo "  https://your-project-name.up.railway.app"
        echo ""
        echo "Frontend (Vercel):"
        echo "  https://your-project-name.vercel.app"
        echo ""
        echo "Frontend (Netlify):"
        echo "  https://your-project-name.netlify.app"
        echo ""
        echo "💡 Replace 'your-project-name' with your actual project names"
        ;;
    *)
        echo "❌ Invalid option. Please choose 1, 2, 3, or 4."
        exit 1
        ;;
esac

echo ""
echo "💰 Total Cost: $0.00/month (100% FREE!)"
echo "🎉 Your AI financial advisor will be live in ~10 minutes!"
echo ""
echo "📚 Need help? Check FREE_DEPLOYMENT_GUIDE.md for detailed steps"




