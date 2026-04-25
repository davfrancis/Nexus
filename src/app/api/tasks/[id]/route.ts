// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'category', 'priority', 'status', 'start_date', 'due_date', 'due_time', 'calendar_linked', 'reminder_type', 'reminder_sent', 'recurrence', 'recurrence_end']
const VALID_REMINDERS = ['none', '15min', '30min', '1h', '2h', '6h', '12h', '1day', '2days', '3days', '1week']
const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']
const VALID_CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_STATUSES = ['todo', 'doing', 'done']

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Permite apenas campos conhecidos — impede sobrescrever user_id, id, etc.
  const updates: Record<string, unknown> = {}
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      return NextResponse.json({ error: 'invalid title' }, { status: 400 })
    }
    if (updates.title.length > 255) {
      return NextResponse.json({ error: 'title too long' }, { status: 400 })
    }
    updates.title = (updates.title as string).trim()
  }
  if (updates.category && !VALID_CATEGORIES.includes(updates.category as string)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }
  if (updates.priority && !VALID_PRIORITIES.includes(updates.priority as string)) {
    return NextResponse.json({ error: 'invalid priority' }, { status: 400 })
  }
  if (updates.status && !VALID_STATUSES.includes(updates.status as string)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  if (updates.reminder_type && !VALID_REMINDERS.includes(updates.reminder_type as string)) {
    return NextResponse.json({ error: 'invalid reminder_type' }, { status: 400 })
  }
  if (updates.recurrence && !VALID_RECURRENCES.includes(updates.recurrence as string)) {
    return NextResponse.json({ error: 'invalid recurrence' }, { status: 400 })
  }
  // reset reminder_sent when due_date, due_time or reminder_type changes
  if ('due_date' in updates || 'due_time' in updates || 'reminder_type' in updates) {
    updates.reminder_sent = false
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })

  // Buscar evento espelho existente
  const { data: linkedEvent } = await admin
    .from('events')
    .select('id')
    .eq('task_id', id)
    .maybeSingle()

  // Se calendar_linked foi ativado e ainda não existe evento → CRIAR
  if (updates.calendar_linked === true && !linkedEvent && data?.due_date) {
    await admin.from('events').insert({
      user_id: user.id,
      title: `📋 ${data.title}`,
      description: data.description || null,
      event_date: data.due_date,
      start_time: null,
      end_time: null,
      category: data.category || 'work',
      recurrence: 'none',
      source: 'local',
      task_id: id,
    })
  }

  // Se calendar_linked foi desativado e existe evento → REMOVER
  if (updates.calendar_linked === false && linkedEvent) {
    await admin.from('events').delete().eq('id', linkedEvent.id)
  }

  // Se evento já existe → ATUALIZAR campos alterados
  if (linkedEvent && updates.calendar_linked !== false) {
    const eventUpdates: Record<string, unknown> = {}

    if (updates.title) {
      eventUpdates.title = `📋 ${updates.title}`
    }
    if ('description' in updates) {
      eventUpdates.description = updates.description
    }
    if (updates.category) {
      eventUpdates.category = updates.category
    }
    if (updates.due_date !== undefined) {
      eventUpdates.event_date = updates.due_date || data?.due_date
    }
    if (updates.status === 'done') {
      eventUpdates.color = 'done'
    } else if (updates.status === 'todo' || updates.status === 'doing') {
      eventUpdates.color = null
    }

    if (Object.keys(eventUpdates).length > 0) {
      await admin.from('events').update(eventUpdates).eq('id', linkedEvent.id)
    }
  }

  return NextResponse.json({ task: data })

}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // O evento espelho é removido automaticamente pelo ON DELETE SET NULL,
  // mas precisamos deletar o evento manualmente pois a FK é na events → tasks
  await admin.from('events').delete().eq('task_id', id)

  const { error } = await admin
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  return NextResponse.json({ success: true })
}
