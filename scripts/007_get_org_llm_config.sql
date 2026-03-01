-- Create RPC function to get organization LLM config for a user
-- This function bypasses RLS to allow consistent org lookup across the app

CREATE OR REPLACE FUNCTION public.get_org_llm_config(p_user_id uuid)
RETURNS TABLE (
  org_id uuid,
  org_name text,
  llm_provider text,
  llm_api_key text,
  hover_access_token text,
  hover_refresh_token text,
  hover_connected_at timestamptz,
  hover_token_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as org_id,
    o.name as org_name,
    o.llm_provider,
    o.llm_api_key_encrypted as llm_api_key,
    o.hover_access_token,
    o.hover_refresh_token,
    o.hover_connected_at,
    o.hover_token_expires_at
  FROM organizations o
  INNER JOIN members m ON m.org_id = o.id
  WHERE m.user_id = p_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_org_llm_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_llm_config(uuid) TO service_role;
