-- Custom field definitions per org
CREATE TABLE custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN (
    'text', 'paragraph', 'number', 'boolean',
    'select', 'multi_select', 'date', 'url', 'email', 'phone'
  )),
  applies_to text NOT NULL DEFAULT 'jobs' CHECK (applies_to IN ('jobs', 'leads', 'both')),
  options jsonb,           -- [{label: string, value: string}] for select / multi_select
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One key per org
CREATE UNIQUE INDEX idx_custom_fields_org_key ON custom_fields(org_id, field_key);
-- Fast ordered list per org
CREATE INDEX idx_custom_fields_org_order ON custom_fields(org_id, sort_order);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- All org members may read
CREATE POLICY "custom_fields_select" ON custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_fields.org_id
        AND members.user_id = auth.uid()
    )
  );

-- Only admins may write
CREATE POLICY "custom_fields_insert" ON custom_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_fields.org_id
        AND members.user_id = auth.uid()
        AND members.role = 'admin'
    )
  );

CREATE POLICY "custom_fields_update" ON custom_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_fields.org_id
        AND members.user_id = auth.uid()
        AND members.role = 'admin'
    )
  );

CREATE POLICY "custom_fields_delete" ON custom_fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_fields.org_id
        AND members.user_id = auth.uid()
        AND members.role = 'admin'
    )
  );

-- -------------------------------------------------------------------

-- Values stored per entity (job or lead)
CREATE TABLE custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('job', 'lead')),
  entity_id text NOT NULL,          -- Hover job ID (integer as text) or lead UUID
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One value per (field, entity)
CREATE UNIQUE INDEX idx_cfv_unique ON custom_field_values(field_id, entity_type, entity_id);
-- Batch-load all values for a given entity
CREATE INDEX idx_cfv_entity ON custom_field_values(org_id, entity_type, entity_id);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- All org members may read / write values
CREATE POLICY "cfv_select" ON custom_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_field_values.org_id
        AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "cfv_insert" ON custom_field_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_field_values.org_id
        AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "cfv_update" ON custom_field_values
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_field_values.org_id
        AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "cfv_delete" ON custom_field_values
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.org_id = custom_field_values.org_id
        AND members.user_id = auth.uid()
    )
  );
