# FinBuddy Backend Deployment Guide

This guide provides detailed instructions for deploying FinBuddy Backend to production using Supabase Edge Functions.

## Prerequisites

Before deploying, ensure you have:

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and updated
- A Supabase account and project
- API keys for HuggingFace and NewsData.io/Finnhub.io
- Git repository access

## Step-by-Step Deployment

### 1. Prepare Your Environment

#### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
curl -fsSL https://supabase.com/install.sh | sh
```

#### Login to Supabase

```bash
supabase login
```

### 2. Create or Link Supabase Project

#### Option A: Create New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: finbuddy-backend
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users (e.g., ap-south-1 for India)

#### Option B: Link Existing Project

```bash
supabase link --project-ref your-project-reference-id
```

### 3. Configure Environment Variables

#### Get Required Values

1. **Supabase URL**: Found in Project Settings > API
2. **Supabase Service Key**: Found in Project Settings > API (service_role key)
3. **HuggingFace API Key**: Get from [HuggingFace Settings](https://huggingface.co/settings/tokens)
4. **News API Key**: Get from [NewsData.io](https://newsdata.io/api-key) or [Finnhub.io](https://finnhub.io/dashboard)

#### Set Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** > **Settings**
3. Add the following environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://your-ref.supabase.co` | Your project URL |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Service role key |
| `HF_API_KEY` | `hf_...` | HuggingFace API key |
| `NEWS_API_KEY` | `your-key` | NewsData.io API key |
| `ENVIRONMENT` | `production` | Environment identifier |

### 4. Deploy Database Schema

Run the database migrations:

```bash
supabase db push
```

This creates the `latest_news` table with proper indexes.

### 5. Deploy Edge Functions

#### Automated Deployment (Recommended)

```bash
./deploy.sh
```

#### Manual Deployment

```bash
# Deploy chat function
supabase functions deploy chat --no-verify-jwt

# Deploy news fetcher function
supabase functions deploy fetchNews --no-verify-jwt
```

### 6. Set Up Automated News Fetching

#### Enable pg_cron Extension

1. Go to **Database** > **Extensions** in your Supabase dashboard
2. Search for "pg_cron"
3. Click "Enable" next to pg_cron

#### Create Cron Job

1. Go to **SQL Editor** in your Supabase dashboard
2. Run the following SQL (replace placeholders):

```sql
SELECT cron.schedule(
  'finbuddy-fetch-news',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetchNews',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'
    ) as request_id;
  $$
);
```

**Replace**:
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_ANON_KEY` with your anon/public key from Project Settings > API

### 7. Verify Deployment

#### Test Chat Endpoint

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"message": "What are mutual funds?"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Mutual funds are investment vehicles that pool money from multiple investors..."
}
```

#### Test News Fetcher

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetchNews \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully fetched and stored 10 news articles",
  "count": 10
}
```

#### Verify Cron Job

Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'finbuddy-fetch-news';
```

### 8. Configure CORS (If Needed)

CORS is pre-configured in the functions, but if you need to modify it:

1. Edit `supabase/functions/chat/index.ts`
2. Update the CORS headers in the response
3. Redeploy: `supabase functions deploy chat --no-verify-jwt`

## Production Checklist

- [ ] Environment variables set in Supabase dashboard
- [ ] Database migrations applied
- [ ] Both functions deployed successfully
- [ ] pg_cron extension enabled
- [ ] Cron job scheduled and verified
- [ ] Chat endpoint tested
- [ ] News fetcher tested
- [ ] API keys have appropriate permissions
- [ ] Project URL updated in frontend application

## Monitoring and Maintenance

### Monitor Function Logs

1. Go to **Edge Functions** in your Supabase dashboard
2. Click on function name (chat or fetchNews)
3. View logs and metrics

### Monitor Database Usage

1. Go to **Database** > **Usage** in your Supabase dashboard
2. Check storage and bandwidth usage
3. Monitor query performance

### Update Functions

To update deployed functions:

```bash
# Make your changes to the code
# Then redeploy
supabase functions deploy chat --no-verify-jwt
supabase functions deploy fetchNews --no-verify-jwt
```

### Backup Strategy

Supabase automatically backs up your database. For additional safety:

1. Export your database schema: `supabase db dump --schema-only`
2. Export your data: `supabase db dump --data-only`
3. Store backups in version control or cloud storage

## Scaling Considerations

### Performance Optimization

1. **Database Indexing**: Already optimized with proper indexes
2. **Function Cold Starts**: Consider upgrading to Supabase Pro for better performance
3. **API Rate Limits**: Monitor usage and upgrade API plans as needed

### Cost Management

1. **Monitor Usage**: Check Supabase dashboard regularly
2. **Optimize Queries**: Use efficient database queries
3. **Cache Responses**: Implement caching for frequently requested data

### High Availability

1. **Multiple Regions**: Consider deploying to multiple Supabase regions
2. **Fallback APIs**: Implement fallback for external API failures
3. **Health Checks**: Set up monitoring and alerting

## Troubleshooting Deployment Issues

### Common Deployment Errors

#### "Project not found"
```bash
# Re-link your project
supabase link --project-ref YOUR_PROJECT_REF
```

#### "Function deployment failed"
```bash
# Check function syntax
deno check supabase/functions/chat/index.ts
# Check imports
deno cache --import-map=supabase/functions/import_map.json supabase/functions/chat/index.ts
```

#### "Environment variables not found"
- Verify variables are set in Supabase dashboard
- Check variable names match exactly
- Ensure no extra spaces in values

#### "Database migration failed"
```bash
# Reset and retry
supabase db reset
supabase db push
```

### Getting Help

1. **Supabase Discord**: [Join the community](https://discord.supabase.com/)
2. **Supabase Docs**: [Official documentation](https://supabase.com/docs)
3. **GitHub Issues**: Create an issue in this repository

## Security Best Practices

### API Key Management

- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate API keys regularly
- Use least-privilege access for API keys

### Database Security

- Use service role key only in server-side functions
- Enable Row Level Security (RLS) if storing user data
- Regularly review database permissions

### Function Security

- Validate all input data
- Implement rate limiting
- Use HTTPS for all external API calls
- Log security events

---

**Deployment Complete!** 🎉

Your FinBuddy Backend is now live and ready to serve AI-powered financial advice to your users.

Next steps:
1. Update your frontend application with the new API endpoints
2. Set up monitoring and alerting
3. Plan for scaling based on usage patterns