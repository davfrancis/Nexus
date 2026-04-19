// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'category', 'priority', 'status', 'due_date', 'calendar_linked']
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

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })

  // Sincronizar evento espelho no calendário (se existir)
  const { data: linkedEvent } = await admin
    .from('events')
    .select('id')
    .eq('task_id', id)
    .single()

  if (linkedEvent) {
    const eventUpdates: Record<string, unknown> = {}

    // Atualizar título no evento
    if (updates.title) {
      eventUpdates.title = `📋 ${updates.title}`
    }
    // Atualizar descrição
    if ('description' in updates) {
      eventUpdates.description = updates.description
    }
    // Atualizar categoria
    if (updates.category) {
      eventUpdates.category = updates.category
    }
    // Atualizar data
    if (updates.due_date !== undefined) {
      eventUpdates.event_date = updates.due_date || data?.due_date
    }
    // Quando concluída, marcar cor do evento
    if (updates.status === 'done') {
      eventUpdates.color = 'done'
    } else if (updates.status === 'todo' || updates.status === 'doing') {
      eventUpdates.color = null
    }

    if (Object.keys(eventUpdates).length > 0) {
      await admin
        .from('events')
        .update(eventUpdates)
        .eq('id', linkedEvent.id)
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
