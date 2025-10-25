#!/bin/bash

# 🔍 FinBuddy AI - Connection Diagnostic Script
# This script helps diagnose Render + Netlify connection issues

echo "🔍 FinBuddy AI Connection Diagnostic"
echo "=================================="
echo ""

# Check if we can access the backend
echo "📡 Testing backend connection..."
echo "Please enter your Render backend URL (e.g., https://finbuddy-backend.onrender.com):"
read BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo "❌ No backend URL provided"
    exit 1
fi

# Remove trailing slash if present
BACKEND_URL=$(echo "$BACKEND_URL" | sed 's:/*$::')

echo ""
echo "🔗 Testing backend at: $BACKEND_URL"
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend health check: PASSED"
    echo "   Response: $(curl -s "$BACKEND_URL/health" | head -c 100)..."
else
    echo "❌ Backend health check: FAILED"
    echo "   Make sure your Render backend is running"
    exit 1
fi

echo ""
echo "📋 Environment Variable Configuration:"
echo "====================================="
echo "In your Netlify dashboard:"
echo "1. Go to Site Settings → Environment Variables"
echo "2. Add/Update variable:"
echo "   Key: VITE_API_URL"
echo "   Value: $BACKEND_URL"
echo "   Scopes: ✅ All boxes checked"
echo ""
echo "3. Redeploy your site after setting the variable"
echo ""

echo "🧪 Testing chat endpoint..."
if curl -s -X POST "$BACKEND_URL/chat" \
   -H "Content-Type: application/json" \
   -d '{"message":"test"}' > /dev/null; then
    echo "✅ Chat endpoint: ACCESSIBLE"
else
    echo "❌ Chat endpoint: FAILED"
    echo "   Check your backend logs in Render dashboard"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Set VITE_API_URL = $BACKEND_URL in Netlify"
echo "2. Redeploy your Netlify site"
echo "3. Clear browser cache"
echo "4. Test your chat functionality"
echo ""
echo "🔗 Useful Links:"
echo "- Render Dashboard: https://dashboard.render.com"
echo "- Netlify Dashboard: https://app.netlify.com"
echo "- Your Backend: $BACKEND_URL"
echo ""
echo "✅ Diagnostic complete!"
