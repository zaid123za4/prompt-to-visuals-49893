-- Add audio_url column to scenes table
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS audio_url TEXT;