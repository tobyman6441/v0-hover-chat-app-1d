-- Add column to track Hover token expiry time
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS hover_token_expires_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN organizations.hover_token_expires_at IS 'Timestamp when the Hover OAuth access token expires';
