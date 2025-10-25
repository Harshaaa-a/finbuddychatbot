#!/bin/bash

# FinBuddy AI Deployment Helper Script
# This script helps you deploy FinBuddy AI to free hosting services

echo "🚀 FinBuddy AI Deployment Helper"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the FinBuddy root directory"
    exit 1
fi

echo "✅ Found FinBuddy project structure"
echo ""

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo ""
echo "🎯 Deployment Options:"
echo "1. Vercel + Railway (Recommended)"
echo "2. Netlify + Render"
echo "3. Test locally first"
echo ""

read -p "Choose an option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Vercel + Railway"
        echo "================================"
        echo ""
        echo "1. Go to https://railway.app and deploy your backend"
        echo "2. Go to https://vercel.com and deploy your frontend"
        echo "3. Set VITE_API_URL environment variable to your backend URL"
        echo ""
        echo "📖 See DEPLOYMENT_COMPLETE.md for detailed instructions"
        ;;
    2)
        echo ""
        echo "🌐 Deploying to Netlify + Render"
        echo "================================"
        echo ""
        echo "1. Go to https://render.com and deploy your backend"
        echo "2. Go to https://netlify.com and deploy your frontend"
        echo "3. Set VITE_API_URL environment variable to your backend URL"
        echo ""
        echo "📖 See DEPLOYMENT_COMPLETE.md for detailed instructions"
        ;;
    3)
        echo ""
        echo "🧪 Testing Locally"
        echo "=================="
        echo ""
        echo "Starting backend server..."
        cd backend && npm run free-dev &
        BACKEND_PID=$!
        
        echo "Starting frontend server..."
        npm run dev &
        FRONTEND_PID=$!
        
        echo ""
        echo "✅ Servers started!"
        echo "Backend: http://localhost:3001"
        echo "Frontend: http://localhost:5173"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        
        # Wait for user to stop
        wait
        
        # Cleanup
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        ;;
    *)
        echo "❌ Invalid option. Please choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "🎉 Happy deploying! Your AI financial advisor awaits!"



