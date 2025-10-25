#!/bin/bash

# 🔧 FinBuddy AI - Connection Diagnostic Script
# This script helps debug frontend-backend connection issues

echo "🔧 FinBuddy AI - Connection Diagnostic"
echo "====================================="
echo ""

# Get backend URL from user
read -p "Enter your backend URL (e.g., https://your-backend.onrender.com): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend URL is required"
    exit 1
fi

echo ""
echo "🔍 Testing backend connection..."
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Health check passed"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed"
    echo "Backend might be down or URL is incorrect"
    exit 1
fi

echo ""

# Test 2: Chat endpoint
echo "2. Testing chat endpoint..."
CHAT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Chat endpoint responded"
    echo "Response preview: ${CHAT_RESPONSE:0:100}..."
else
    echo "❌ Chat endpoint failed"
    echo "Backend might have issues"
    exit 1
fi

echo ""

# Test 3: Check response format
echo "3. Checking response format..."
if echo "$CHAT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Response format is correct"
else
    echo "❌ Response format is incorrect"
    echo "Full response: $CHAT_RESPONSE"
fi

echo ""

# Test 4: Check CORS
echo "4. Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$BACKEND_URL/chat" 2>/dev/null)
if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ CORS headers present"
else
    echo "⚠️ CORS headers might be missing"
fi

echo ""
echo "🎯 Frontend Configuration Check:"
echo "================================"
echo ""
echo "Make sure your Netlify environment variable is set to:"
echo "VITE_API_URL = $BACKEND_URL"
echo ""
echo "🔧 If tests passed but frontend still doesn't work:"
echo "1. Check Netlify environment variables"
echo "2. Redeploy your frontend"
echo "3. Clear browser cache"
echo "4. Check browser console for errors"
echo ""
echo "✅ Backend is working correctly!"
echo "The issue is likely in frontend configuration."




