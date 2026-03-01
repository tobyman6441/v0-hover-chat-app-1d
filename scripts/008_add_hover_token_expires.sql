-- Add hover_token_expires_at column to organizations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'hover_token_expires_at'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN hover_token_expires_at timestamptz;
  END IF;
END $$;
