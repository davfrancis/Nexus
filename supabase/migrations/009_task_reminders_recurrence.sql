-- ================================================================
-- NEXUS — Lembretes e Recorrência de Tarefas
-- Adiciona suporte a notificações de prazo e tarefas recorrentes
-- ================================================================

-- Adicionar campos de lembrete e recorrência na tabela tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'none',
  -- none | 15min | 30min | 1h | 2h | 6h | 12h | 1day | 2days | 3days | 1week
  ADD COLUMN IF NOT EXISTS reminder_sent  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence     TEXT DEFAULT 'none',
  -- none | daily | weekly | biweekly | monthly | yearly
  ADD COLUMN IF NOT EXISTS recurrence_end DATE;
  -- data final para encerrar a recorrência (opcional)

-- Índice para buscar tarefas pendentes de notificação
CREATE INDEX IF NOT EXISTS idx_tasks_reminder
  ON tasks (user_id, due_date, reminder_type, reminder_sent)
  WHERE reminder_type != 'none' AND reminder_sent = FALSE AND status != 'done';

-- Índice para tarefas recorrentes ativas
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence
  ON tasks (user_id, recurrence)
  WHERE recurrence != 'none';
