-- Custom (user-created) marketing leads; shown alongside Hover Instant Design leads
CREATE TABLE IF NOT EXISTS custom_marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone_number text,
  location_line_1 text,
  location_city text,
  location_region text,
  location_postal_code text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_marketing_leads_org ON custom_marketing_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_marketing_leads_created ON custom_marketing_leads(org_id, created_at DESC);

ALTER TABLE custom_marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_marketing_leads_select_org" ON custom_marketing_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_marketing_leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "custom_marketing_leads_insert_org" ON custom_marketing_leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_marketing_leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "custom_marketing_leads_update_org" ON custom_marketing_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_marketing_leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "custom_marketing_leads_delete_org" ON custom_marketing_leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_marketing_leads.org_id
      AND members.user_id = auth.uid()
    )
  );
