-- FinBuddy Backend Cron Job Setup
-- This SQL script sets up automated news fetching every 6 hours

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the news fetching job to run every 6 hours
-- Replace 'your-project-ref' with your actual Supabase project reference
-- Replace 'YOUR_ANON_KEY' with your actual Supabase anon key
SELECT cron.schedule(
  'finbuddy-fetch-news',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/fetchNews',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'
    ) as request_id;
  $$
);

-- View scheduled jobs (for verification)
SELECT * FROM cron.job;

-- To remove the job if needed (uncomment the line below)
-- SELECT cron.unschedule('finbuddy-fetch-news');