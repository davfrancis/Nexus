-- ================================================================
-- NEXUS — Anotações (Notes)
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ================================================================

CREATE TABLE IF NOT EXISTS notes (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title             TEXT NOT NULL DEFAULT 'Sem título',
  content           JSONB,
  category          TEXT DEFAULT 'geral',
  tags              TEXT DEFAULT '',
  color             TEXT DEFAULT 'default',
  pinned            BOOLEAN DEFAULT FALSE,
  is_template       BOOLEAN DEFAULT FALSE,
  template_schedule TEXT DEFAULT 'none',   -- 'none' | 'daily' | 'weekly' | 'monthly'
  last_applied_at   DATE,                  -- última vez que o template gerou uma cópia
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_owner" ON notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_template ON notes(user_id, is_template, template_schedule);
