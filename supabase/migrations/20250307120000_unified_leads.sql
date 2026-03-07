-- Unified leads table: stores all lead data from both Hover (Instant Design) and manually added leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hover_lead_id integer NULL,
  source text NOT NULL DEFAULT '',
  full_name text,
  email text,
  phone_number text,
  location_line_1 text,
  location_city text,
  location_region text,
  location_postal_code text,
  phone_marketing_opt_in boolean,
  phone_marketing_opt_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_created ON leads(org_id, created_at DESC);
-- One row per Hover lead per org; multiple rows with hover_lead_id NULL allowed (custom leads)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_org_hover_lead_id ON leads(org_id, hover_lead_id) WHERE hover_lead_id IS NOT NULL;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_org" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_insert_org" ON leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_update_org" ON leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = leads.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_delete_org" ON leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = leads.org_id
      AND members.user_id = auth.uid()
    )
  );

-- Migrate existing custom leads into unified table (if custom_marketing_leads exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_marketing_leads') THEN
    INSERT INTO leads (id, org_id, hover_lead_id, source, full_name, email, phone_number, location_line_1, location_city, location_region, location_postal_code, created_at, updated_at)
    SELECT id, org_id, NULL, COALESCE(source, ''), full_name, email, phone_number, location_line_1, location_city, location_region, location_postal_code, created_at, updated_at
    FROM custom_marketing_leads
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
