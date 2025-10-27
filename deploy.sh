#!/bin/bash

# FinBuddy Backend Deployment Script
# This script deploys the Supabase Edge Functions for FinBuddy

set -e

echo "🚀 Starting FinBuddy Backend Deployment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

# Deploy database migrations
echo "📊 Deploying database migrations..."
supabase db push

# Deploy Edge Functions
echo "🔧 Deploying chat function..."
supabase functions deploy chat --no-verify-jwt

echo "📰 Deploying fetchNews function..."
supabase functions deploy fetchNews --no-verify-jwt

# Set up environment variables (user needs to do this manually)
echo "⚙️  Please set up environment variables in your Supabase dashboard:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to Edge Functions > Settings"
echo "   3. Add the following environment variables:"
echo "      - HF_API_KEY: Your HuggingFace API key"
echo "      - NEWS_API_KEY: Your NewsData.io API key"
echo "      - SUPABASE_URL: Your Supabase project URL"
echo "      - SUPABASE_SERVICE_KEY: Your Supabase service role key"

# Set up cron job for news fetching
echo "⏰ Setting up cron job for news fetching..."
echo "   Please add this cron job in your Supabase dashboard:"
echo "   Function: fetchNews"
echo "   Schedule: 0 */6 * * * (every 6 hours)"
echo "   Or use the following SQL in your Supabase SQL editor:"
echo ""
echo "   SELECT cron.schedule("
echo "     'fetch-news-job',"
echo "     '0 */6 * * *',"
echo "     \$\$"
echo "     SELECT"
echo "       net.http_post("
echo "         url:='https://your-project-ref.supabase.co/functions/v1/fetchNews',"
echo "         headers:='{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer YOUR_ANON_KEY\"}'"
echo "       ) as request_id;"
echo "     \$\$"
echo "   );"

echo ""
echo "✅ Deployment complete!"
echo "🔗 Your chat endpoint: https://your-project-ref.supabase.co/functions/v1/chat"
echo "📰 Your fetchNews endpoint: https://your-project-ref.supabase.co/functions/v1/fetchNews"
echo ""
echo "📝 Next steps:"
echo "   1. Set up environment variables in Supabase dashboard"
echo "   2. Configure the cron job for automated news fetching"
echo "   3. Test your endpoints using the examples in README.md"