-- ================================================================
-- NEXUS — Integração Tarefas ↔ Agenda
-- Execute no Supabase: Dashboard → SQL Editor → New query
-- ================================================================

-- Adiciona referência de tarefa na tabela de eventos
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Adiciona flag de vinculação ao calendário na tabela de tarefas
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS calendar_linked BOOLEAN DEFAULT FALSE;

-- Índice para buscas rápidas de eventos por tarefa
CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id);
