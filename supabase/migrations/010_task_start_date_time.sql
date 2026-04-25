-- ================================================================
-- NEXUS — Data de início e horário nas tarefas
-- Adiciona start_date e due_time para suporte a horário no lembrete
-- ================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  -- data de início da tarefa / recorrência
  ADD COLUMN IF NOT EXISTS due_time   TEXT;
  -- horário da data limite no formato HH:MM (ex: "14:30")

-- Atualizar índice de lembretes para incluir due_time
DROP INDEX IF EXISTS idx_tasks_reminder;
CREATE INDEX IF NOT EXISTS idx_tasks_reminder
  ON tasks (user_id, due_date, reminder_type, reminder_sent)
  WHERE reminder_type != 'none' AND reminder_sent = FALSE AND status != 'done';
