-- Create latest_news table for storing financial news headlines
CREATE TABLE latest_news (
  id SERIAL PRIMARY KEY,
  headline TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by creation date
CREATE INDEX idx_latest_news_created_at ON latest_news(created_at DESC);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE latest_news ENABLE ROW LEVEL SECURITY;

-- Allow read access for service role
CREATE POLICY "Allow service role full access" ON latest_news
  FOR ALL USING (auth.role() = 'service_role');