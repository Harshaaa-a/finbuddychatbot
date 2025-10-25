#!/bin/bash

# ⚡ FinBuddy AI - LIGHTNING FAST 100% FREE Deployment
# Vercel + Netlify + Render (The Speed Demon Combo!)

echo "⚡ FinBuddy AI - LIGHTNING FAST Deployment"
echo "=========================================="
echo "🚀 Vercel + Netlify + Render (100% FREE)"
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

echo "⚡ LIGHTNING FAST Deployment Options:"
echo "1. Deploy to Vercel + Render (Recommended - Fastest)"
echo "2. Deploy to Netlify + Render (Reliable Backup)"
echo "3. Deploy to ALL THREE (Vercel + Netlify + Render)"
echo "4. Show deployment URLs only"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "⚡ Deploying to Vercel + Render (FASTEST COMBO)"
        echo "=============================================="
        echo ""
        echo "1. Deploy Backend to Render (2 minutes):"
        echo "   🌐 https://render.com → New → Web Service"
        echo "   📁 Root Directory: backend"
        echo "   🚀 Start Command: npm run free"
        echo "   🔧 Environment: NODE_ENV=production"
        echo ""
        echo "2. Deploy Frontend to Vercel (1 minute):"
        echo "   🌐 https://vercel.com → New Project → Import from GitHub"
        echo "   ⚡ Framework: Vite (auto-detected)"
        echo "   🔧 Environment: VITE_API_URL=https://your-backend.onrender.com"
        echo ""
        echo "📖 See LIGHTNING_DEPLOYMENT.md for detailed instructions"
        ;;
    2)
        echo ""
        echo "🌐 Deploying to Netlify + Render (RELIABLE COMBO)"
        echo "==============================================="
        echo ""
        echo "1. Deploy Backend to Render (2 minutes):"
        echo "   🌐 https://render.com → New → Web Service"
        echo "   📁 Root Directory: backend"
        echo "   🚀 Start Command: npm run free"
        echo "   🔧 Environment: NODE_ENV=production"
        echo ""
        echo "2. Deploy Frontend to Netlify (1 minute):"
        echo "   🌐 https://netlify.com → New site from Git → GitHub"
        echo "   📦 Build Command: npm run build"
        echo "   📁 Publish Directory: dist"
        echo "   🔧 Environment: VITE_API_URL=https://your-backend.onrender.com"
        echo ""
        echo "📖 See LIGHTNING_DEPLOYMENT.md for detailed instructions"
        ;;
    3)
        echo ""
        echo "🎉 Deploying to ALL THREE (Vercel + Netlify + Render)"
        echo "=================================================="
        echo ""
        echo "1. Deploy Backend to Render:"
        echo "   🌐 https://render.com → New → Web Service"
        echo "   📁 Root Directory: backend, Start Command: npm run free"
        echo "   🔧 Environment: NODE_ENV=production"
        echo ""
        echo "2. Deploy Frontend to Vercel:"
        echo "   🌐 https://vercel.com → New Project → Import from GitHub"
        echo "   ⚡ Framework: Vite, Environment: VITE_API_URL=https://your-backend.onrender.com"
        echo ""
        echo "3. Deploy Frontend to Netlify:"
        echo "   🌐 https://netlify.com → New site from Git → GitHub"
        echo "   📦 Build Command: npm run build, Publish Directory: dist"
        echo "   🔧 Environment: VITE_API_URL=https://your-backend.onrender.com"
        echo ""
        echo "📖 See LIGHTNING_DEPLOYMENT.md for detailed instructions"
        ;;
    4)
        echo ""
        echo "⚡ Your LIGHTNING FAST deployment URLs will be:"
        echo "============================================="
        echo ""
        echo "Backend (Render):"
        echo "  https://your-project-name.onrender.com"
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
echo "⚡ Performance Stats:"
echo "🚀 Render: 750 hours/month (24/7 + extra)"
echo "🌐 Vercel: 100GB bandwidth/month (thousands of users)"
echo "🌐 Netlify: 100GB bandwidth/month (thousands of users)"
echo ""
echo "💰 Total Cost: $0.00/month (100% FREE!)"
echo "⏱️ Total Time: ~5 minutes"
echo "🎉 Your LIGHTNING FAST AI financial advisor will be live!"
echo ""
echo "📚 Need help? Check LIGHTNING_DEPLOYMENT.md for detailed steps"




