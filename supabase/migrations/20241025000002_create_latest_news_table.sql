-- Create latest_news table for storing financial news headlines
CREATE TABLE IF NOT EXISTS latest_news (
  id SERIAL PRIMARY KEY,
  headline TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by creation date (most recent first)
CREATE INDEX IF NOT EXISTS idx_latest_news_created_at ON latest_news(created_at DESC);

-- Create index for efficient querying by published date
CREATE INDEX IF NOT EXISTS idx_latest_news_published_at ON latest_news(published_at DESC);

-- Add constraint to ensure headline is not empty
ALTER TABLE latest_news ADD CONSTRAINT chk_headline_not_empty CHECK (LENGTH(TRIM(headline)) > 0);

-- Add constraint to ensure source is not empty when provided
ALTER TABLE latest_news ADD CONSTRAINT chk_source_not_empty CHECK (source IS NULL OR LENGTH(TRIM(source)) > 0);

-- Add constraint to ensure url is valid format when provided
ALTER TABLE latest_news ADD CONSTRAINT chk_url_format CHECK (url IS NULL OR url ~ '^https?://');