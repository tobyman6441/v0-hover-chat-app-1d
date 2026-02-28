-- Pipeline stages for Kanban columns
CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS idx_stages_org_id ON stages(org_id);
CREATE INDEX IF NOT EXISTS idx_stages_sort_order ON stages(org_id, sort_order);

-- Job stage assignments (links Hover jobs to stages)
CREATE TABLE IF NOT EXISTS job_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hover_job_id integer NOT NULL,
  stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, hover_job_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_job_stages_org_id ON job_stages(org_id);
CREATE INDEX IF NOT EXISTS idx_job_stages_stage_id ON job_stages(stage_id);
CREATE INDEX IF NOT EXISTS idx_job_stages_hover_job_id ON job_stages(hover_job_id);

-- Webhook events log (for debugging/audit)
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_org_id ON webhook_events(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Enable RLS
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stages
CREATE POLICY "stages_select_own_org" ON stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = stages.org_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "stages_insert_admin_only" ON stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = stages.org_id 
      AND members.user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

CREATE POLICY "stages_update_admin_only" ON stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = stages.org_id 
      AND members.user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

CREATE POLICY "stages_delete_admin_only" ON stages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = stages.org_id 
      AND members.user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

-- RLS Policies for job_stages
CREATE POLICY "job_stages_select_own_org" ON job_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = job_stages.org_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "job_stages_insert_own_org" ON job_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = job_stages.org_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "job_stages_update_own_org" ON job_stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = job_stages.org_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "job_stages_delete_own_org" ON job_stages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = job_stages.org_id 
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for webhook_events (admin only for viewing)
CREATE POLICY "webhook_events_select_admin" ON webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = webhook_events.org_id 
      AND members.user_id = auth.uid()
      AND members.role = 'admin'
    )
  );

-- Function to create default stages for a new organization
CREATE OR REPLACE FUNCTION create_default_stages(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO stages (org_id, name, sort_order, is_default)
  VALUES
    (p_org_id, 'Pre-appointment', 0, true),
    (p_org_id, 'Appointment scheduled', 1, true),
    (p_org_id, 'Approved', 2, true),
    (p_org_id, 'Pre-production', 3, true),
    (p_org_id, 'Install', 4, true);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_default_stages TO authenticated;

-- Function to get or create job stage assignment
CREATE OR REPLACE FUNCTION get_or_create_job_stage(
  p_org_id uuid,
  p_hover_job_id integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_stage_id uuid;
  v_first_stage_id uuid;
BEGIN
  -- Check if job stage already exists
  SELECT id INTO v_job_stage_id
  FROM job_stages
  WHERE org_id = p_org_id AND hover_job_id = p_hover_job_id;
  
  IF v_job_stage_id IS NOT NULL THEN
    RETURN v_job_stage_id;
  END IF;
  
  -- Get the first stage (lowest sort_order)
  SELECT id INTO v_first_stage_id
  FROM stages
  WHERE org_id = p_org_id
  ORDER BY sort_order ASC
  LIMIT 1;
  
  -- Create new job stage assignment
  INSERT INTO job_stages (org_id, hover_job_id, stage_id)
  VALUES (p_org_id, p_hover_job_id, v_first_stage_id)
  RETURNING id INTO v_job_stage_id;
  
  RETURN v_job_stage_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_job_stage TO authenticated;

-- Function to update job stage
CREATE OR REPLACE FUNCTION update_job_stage(
  p_org_id uuid,
  p_hover_job_id integer,
  p_stage_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM members 
    WHERE org_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert the job stage
  INSERT INTO job_stages (org_id, hover_job_id, stage_id, updated_at)
  VALUES (p_org_id, p_hover_job_id, p_stage_id, now())
  ON CONFLICT (org_id, hover_job_id)
  DO UPDATE SET stage_id = p_stage_id, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION update_job_stage TO authenticated;
