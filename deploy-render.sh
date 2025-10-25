#!/bin/bash

# Deploy FinBuddy Full-Stack App to Render
# This script prepares the app for Render deployment

echo "🚀 Preparing FinBuddy for Render deployment..."

# Build the frontend
echo "📦 Building frontend..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed! dist directory not found."
    exit 1
fi

echo "✅ Frontend built successfully!"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Check if backend dependencies installed successfully
if [ ! -d "node_modules" ]; then
    echo "❌ Backend dependencies installation failed!"
    exit 1
fi

echo "✅ Backend dependencies installed successfully!"

# Go back to root
cd ..

echo "🎉 FinBuddy is ready for Render deployment!"
echo ""
echo "📋 Render Configuration:"
echo "   Root Directory: . (root)"
echo "   Build Command: npm run build:fullstack"
echo "   Start Command: npm run free"
echo "   Node Version: 18"
echo ""
echo "🌐 After deployment, your app will be available at:"
echo "   https://your-app-name.onrender.com"
echo ""
echo "✅ Ready to deploy! 🚀"
