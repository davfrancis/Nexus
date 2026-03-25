-- ================================================================
-- NEXUS — Segundo Cérebro: tabela de pastas hierárquicas
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ================================================================

-- ── PASTAS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
  icon        TEXT DEFAULT '📁',
  color       TEXT DEFAULT '#6366f1',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE PROCEDURE update_folders_updated_at();

-- RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_own" ON folders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Adicionar folder_id à tabela de notas
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_folders_user_id  ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id  ON notes(folder_id);
