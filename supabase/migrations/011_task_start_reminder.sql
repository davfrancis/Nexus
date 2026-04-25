-- ================================================================
-- NEXUS — Lembrete de início e horário de início das tarefas
-- ================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_time           TEXT,
  -- horário de início no formato HH:MM (ex: "09:00")
  ADD COLUMN IF NOT EXISTS start_reminder_type  TEXT DEFAULT 'none',
  -- none | 15min | 30min | 1h | 2h | 6h | 12h | 1day | 2days | 3days | 1week
  ADD COLUMN IF NOT EXISTS start_reminder_sent  BOOLEAN DEFAULT FALSE;
  -- flag para não disparar o mesmo lembrete de início duas vezes

-- Índice para lembretes de início pendentes
CREATE INDEX IF NOT EXISTS idx_tasks_start_reminder
  ON tasks (user_id, start_date, start_reminder_type, start_reminder_sent)
  WHERE start_reminder_type != 'none' AND start_reminder_sent = FALSE AND status != 'done';
