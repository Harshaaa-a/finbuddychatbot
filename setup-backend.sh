#!/bin/bash

# FinBuddy Backend Setup Script
echo "🤖💰 Setting up FinBuddy AI Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️ Creating environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env with your API keys:"
    echo "   - OpenAI API Key: https://platform.openai.com"
    echo "   - Alpha Vantage API Key: https://www.alphavantage.co/support/#api-key"
    echo ""
else
    echo "✅ Environment file already exists"
fi

echo "🎉 Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API keys"
echo "2. Run: cd backend && npm run dev"
echo "3. Start the frontend: npm run dev"
echo ""
echo "Need help? Check SETUP.md for detailed instructions"