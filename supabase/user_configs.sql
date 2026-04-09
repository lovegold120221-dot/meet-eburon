-- Supabase schema for user configurations
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identity TEXT NOT NULL UNIQUE,
  tts_engine TEXT DEFAULT 'cartesia',
  translation_engine TEXT DEFAULT 'google',
  target_language TEXT DEFAULT 'en',
  voice_id TEXT,
  continuous_save_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for reads and writes
CREATE POLICY "Allow all access to user_configs" ON user_configs
  FOR ALL USING (true) WITH CHECK (true);

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_configs_identity ON user_configs(user_identity);
