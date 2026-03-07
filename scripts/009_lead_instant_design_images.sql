-- Lead-to-Instant-Design-Image association (populated by webhook instant-design-image-created)
CREATE TABLE IF NOT EXISTS lead_instant_design_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id integer NOT NULL,
  image_id integer NOT NULL,
  job_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, lead_id, image_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_instant_design_images_org_lead ON lead_instant_design_images(org_id, lead_id);

-- Map Hover webhook_id to our org (so we can attribute webhook events to the right org)
CREATE TABLE IF NOT EXISTS hover_webhook_org (
  webhook_id bigint PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

ALTER TABLE lead_instant_design_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE hover_webhook_org ENABLE ROW LEVEL SECURITY;

-- Members of the org can read lead_instant_design_images for their org
CREATE POLICY "lead_instant_design_images_select_org" ON lead_instant_design_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = lead_instant_design_images.org_id
      AND members.user_id = auth.uid()
    )
  );

-- Only service/webhook can insert (no policy = no direct insert from client; we use service role in webhook handler)
-- Allow insert for org members so server actions with createClient() can insert when processing webhooks
CREATE POLICY "lead_instant_design_images_insert_org" ON lead_instant_design_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = lead_instant_design_images.org_id
      AND members.user_id = auth.uid()
    )
  );

-- Admins can manage webhook mapping for their org
CREATE POLICY "hover_webhook_org_select_org" ON hover_webhook_org
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = hover_webhook_org.org_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "hover_webhook_org_insert_admin" ON hover_webhook_org
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = hover_webhook_org.org_id
      AND members.user_id = auth.uid()
      AND members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "hover_webhook_org_delete_admin" ON hover_webhook_org
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = hover_webhook_org.org_id
      AND members.user_id = auth.uid()
      AND members.role IN ('admin', 'owner')
    )
  );
