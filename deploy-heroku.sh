#!/bin/bash

# 🚀 FinBuddy Backend - Heroku Deployment Helper
# Deploy your backend to Heroku

echo "🚀 FinBuddy Backend - Heroku Deployment"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the FinBuddy root directory"
    exit 1
fi

echo "✅ Found FinBuddy project structure"
echo ""

# Check if Procfile exists
if [ ! -f "backend/Procfile" ]; then
    echo "📝 Creating Procfile for Heroku..."
    echo "web: npm run free" > backend/Procfile
    echo "✅ Procfile created"
else
    echo "✅ Procfile already exists"
fi

echo ""
echo "🚀 Heroku Deployment Steps:"
echo "=========================="
echo ""
echo "1. Go to https://heroku.com"
echo "2. Sign up for free account"
echo "3. Go to Dashboard → New → Create new app"
echo "4. Choose app name (e.g., finbuddy-backend)"
echo "5. Choose region (US or Europe)"
echo ""
echo "6. Connect GitHub:"
echo "   - Go to Deploy tab"
echo "   - Connect to GitHub"
echo "   - Select your finbuddy-chat-ai-main repository"
echo "   - Enable automatic deploys"
echo ""
echo "7. Configure Settings:"
echo "   - Go to Settings tab"
echo "   - Add buildpack: heroku/nodejs"
echo "   - Add config var: NODE_ENV = production"
echo ""
echo "8. Deploy:"
echo "   - Go to Deploy tab"
echo "   - Click 'Deploy Branch'"
echo "   - Wait for deployment (3-5 minutes)"
echo ""
echo "9. Get your Heroku URL:"
echo "   - https://your-app-name.herokuapp.com"
echo ""
echo "10. Update Netlify Environment Variable:"
echo "    - Go to Netlify dashboard"
echo "    - Site Settings → Environment Variables"
echo "    - Update VITE_API_URL to your Heroku URL"
echo "    - Redeploy your frontend"
echo ""

# Test backend locally first
echo "🧪 Testing backend locally..."
cd backend
if npm run free-dev > /dev/null 2>&1 & then
    BACKEND_PID=$!
    sleep 3
    
    # Test health endpoint
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Backend works locally"
        echo "✅ Health check passed"
        
        # Test chat endpoint
        CHAT_RESPONSE=$(curl -s -X POST http://localhost:3001/chat \
          -H "Content-Type: application/json" \
          -d '{"message": "Hello"}' 2>/dev/null)
        
        if echo "$CHAT_RESPONSE" | grep -q '"success":true'; then
            echo "✅ Chat API working"
        else
            echo "⚠️ Chat API might have issues"
        fi
    else
        echo "❌ Backend health check failed"
    fi
    
    # Cleanup
    kill $BACKEND_PID 2>/dev/null
else
    echo "❌ Failed to start backend locally"
fi

cd ..

echo ""
echo "💰 Heroku Free Tier:"
echo "==================="
echo "   - 550 hours/month (covers 24/7 usage)"
echo "   - 512MB RAM"
echo "   - 1GB storage"
echo "   - Total cost: $0.00/month"
echo ""
echo "🎉 Your AI financial advisor will be live!"




