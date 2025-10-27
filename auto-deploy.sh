#!/bin/bash

# FinBuddy Automatic Deployment Script
# Works with npx if Supabase CLI is not globally installed

set -e

echo "🚀 FinBuddy Backend Automatic Deployment"
echo "========================================"

# Function to run supabase command (tries global first, then npx)
run_supabase() {
    if command -v supabase &> /dev/null; then
        supabase "$@"
    else
        echo "Using npx supabase..."
        npx supabase "$@"
    fi
}

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Not in the correct directory. Please run this from your project root."
    echo "   Make sure you can see the 'supabase' folder here."
    exit 1
fi

echo "📁 Project directory verified ✓"

# Step 1: Check if user is logged in
echo ""
echo "🔐 Step 1: Checking Supabase login..."
if ! run_supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   Run: supabase login (or npx supabase login)"
    echo ""
    echo "🌐 This will open your browser to authenticate."
    read -p "Press Enter after you've logged in..."
    
    # Check again
    if ! run_supabase projects list &> /dev/null; then
        echo "❌ Still not logged in. Please run 'supabase login' first."
        exit 1
    fi
fi

echo "✅ Supabase login verified"

# Step 2: Check if project is linked
echo ""
echo "🔗 Step 2: Checking project link..."
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project not linked. Please link your project first:"
    echo "   1. Create a project at https://supabase.com/dashboard"
    echo "   2. Run: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    read -p "Enter your project reference ID: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project reference ID is required."
        exit 1
    fi
    
    echo "🔗 Linking project..."
    run_supabase link --project-ref "$PROJECT_REF"
fi

echo "✅ Project link verified"

# Step 3: Deploy database migrations
echo ""
echo "🗄️ Step 3: Deploying database migrations..."
run_supabase db push

echo "✅ Database migrations deployed"

# Step 4: Deploy Edge Functions
echo ""
echo "🔧 Step 4: Deploying Edge Functions..."

echo "   Deploying chat function..."
run_supabase functions deploy chat --no-verify-jwt

echo "   Deploying fetchNews function..."
run_supabase functions deploy fetchNews --no-verify-jwt

echo "✅ Edge Functions deployed"

# Step 5: Get project info
echo ""
echo "📋 Step 5: Getting project information..."
PROJECT_URL=$(run_supabase status | grep "API URL" | awk '{print $3}' || echo "")
if [ -z "$PROJECT_URL" ]; then
    echo "⚠️  Could not automatically detect project URL."
    echo "   Please get it from your Supabase dashboard."
else
    echo "🔗 Project URL: $PROJECT_URL"
fi

# Step 6: Environment variables setup
echo ""
echo "⚙️ Step 6: Environment Variables Setup"
echo "======================================"
echo ""
echo "🔑 Please set up these environment variables in your Supabase dashboard:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to Edge Functions > Settings"
echo "   3. Add the following environment variables:"
echo ""
echo "   Variable Name          | Where to Get It"
echo "   ----------------------|----------------------------------"
echo "   SUPABASE_URL          | Project Settings > API"
echo "   SUPABASE_SERVICE_KEY  | Project Settings > API (service_role)"
echo "   HF_API_KEY           | https://huggingface.co/settings/tokens"
echo "   NEWS_API_KEY         | https://newsdata.io/api-key (Optional)"
echo ""

# Step 7: Cron job setup
echo "⏰ Step 7: Cron Job Setup"
echo "========================="
echo ""
echo "📅 Set up automated news fetching:"
echo "   1. Go to Database > Extensions in your Supabase dashboard"
echo "   2. Enable 'pg_cron' extension"
echo "   3. Go to SQL Editor and run this query:"
echo ""
echo "   SELECT cron.schedule("
echo "     'finbuddy-fetch-news',"
echo "     '0 */6 * * *',"
echo "     \$\$"
echo "     SELECT"
echo "       net.http_post("
echo "         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetchNews',"
echo "         headers:='{\"Content-Type\": \"application/json\", \"Authorization\": \"Bearer YOUR_ANON_KEY\"}'"
echo "       ) as request_id;"
echo "     \$\$"
echo "   );"
echo ""
echo "   Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values."
echo ""

# Step 8: Testing
echo "🧪 Step 8: Testing Your Deployment"
echo "=================================="
echo ""
echo "🔍 Test your endpoints with these commands:"
echo ""
echo "Chat Endpoint:"
echo "curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer YOUR_ANON_KEY\" \\"
echo "  -d '{\"message\": \"What are mutual funds?\"}'"
echo ""
echo "News Endpoint:"
echo "curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetchNews \\"
echo "  -H \"Authorization: Bearer YOUR_ANON_KEY\""
echo ""

# Success message
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "✅ Your FinBuddy backend is now deployed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Set up environment variables (Step 6 above)"
echo "   2. Configure cron job (Step 7 above)"
echo "   3. Test your endpoints (Step 8 above)"
echo "   4. Update your frontend to use the new API endpoints"
echo ""
echo "🔗 Your API endpoints:"
echo "   Chat: https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat"
echo "   News: https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetchNews"
echo ""
echo "📚 For detailed documentation, see:"
echo "   - API.md (API reference)"
echo "   - DEPLOYMENT.md (deployment guide)"
echo "   - README.md (project overview)"
echo ""
echo "🎊 Happy coding!"