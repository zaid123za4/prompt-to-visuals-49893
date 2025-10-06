-- Create API keys table for programmatic access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_preview text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Add aspect_ratio column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS aspect_ratio text DEFAULT '16:9';

-- Add aspect_ratio column to scenes table
ALTER TABLE public.scenes 
ADD COLUMN IF NOT EXISTS aspect_ratio text DEFAULT '16:9';