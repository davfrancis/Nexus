-- Ticket tracker
CREATE TABLE IF NOT EXISTS work_tickets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users NOT NULL,
  ticket_ref     text,
  title          text NOT NULL,
  client         text,
  category       text,
  priority       text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_client','waiting_vendor','resolved','closed')),
  description    text,
  resolution     text,
  draft_response text,
  notes          text,
  drive_link     text,
  opened_at      date NOT NULL DEFAULT CURRENT_DATE,
  resolved_at    date,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Knowledge base / procedures
CREATE TABLE IF NOT EXISTS work_kb (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  client      text,
  category    text,
  content     text NOT NULL,
  tags        text,
  drive_link  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Script library
CREATE TABLE IF NOT EXISTS work_scripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  language    text NOT NULL DEFAULT 'powershell',
  category    text,
  description text,
  content     text NOT NULL,
  tags        text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Response templates
CREATE TABLE IF NOT EXISTS work_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users NOT NULL,
  title      text NOT NULL,
  content    text NOT NULL,
  category   text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE work_tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_kb        ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_scripts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_tickets_own"   ON work_tickets   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "work_kb_own"        ON work_kb        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "work_scripts_own"   ON work_scripts   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "work_templates_own" ON work_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_work_tickets_user   ON work_tickets(user_id, status);
CREATE INDEX idx_work_kb_user        ON work_kb(user_id);
CREATE INDEX idx_work_scripts_user   ON work_scripts(user_id);
CREATE INDEX idx_work_templates_user ON work_templates(user_id);
