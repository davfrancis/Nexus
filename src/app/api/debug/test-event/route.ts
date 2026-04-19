// src/app/api/debug/test-event/route.ts
// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover após resolver
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', authError }, { status: 401 })

  const admin = createAdminClient()

  // 1. Verificar se colunas existem
  const { data: cols } = await admin
    .from('information_schema.columns' as any)
    .select('table_name, column_name')
    .in('table_name', ['tasks', 'events'])
    .in('column_name', ['calendar_linked', 'task_id'])

  // 2. Buscar tarefas com calendar_linked = true
  const { data: linkedTasks, error: taskErr } = await admin
    .from('tasks')
    .select('id, title, due_date, calendar_linked')
    .eq('user_id', user.id)
    .eq('calendar_linked', true)

  // 3. Buscar eventos com task_id preenchido
  const { data: taskEvents, error: evErr } = await admin
    .from('events')
    .select('id, title, event_date, task_id')
    .eq('user_id', user.id)
    .not('task_id', 'is', null)

  // 4. Tentar inserir evento de teste
  const testDate = new Date().toISOString().split('T')[0]
  const { data: testInsert, error: insertErr } = await admin
    .from('events')
    .insert({
      user_id: user.id,
      title: '🧪 TESTE DIAGNÓSTICO — pode deletar',
      event_date: testDate,
      category: 'work',
      recurrence: 'none',
      source: 'local',
      task_id: null,
    })
    .select()
    .single()

  // Limpar o evento de teste se criado
  if (testInsert?.id) {
    await admin.from('events').delete().eq('id', testInsert.id)
  }

  return NextResponse.json({
    user_id: user.id,
    columns_found: cols,
    linked_tasks: linkedTasks,
    linked_tasks_error: taskErr?.message,
    task_events: taskEvents,
    task_events_error: evErr?.message,
    test_insert_ok: !!testInsert,
    test_insert_error: insertErr?.message,
  })
}
