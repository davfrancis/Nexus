// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'

const VALID_CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_STATUSES = ['todo', 'doing', 'done']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, description, category, priority, status, due_date, calendar_linked, reminder_type, recurrence, recurrence_end } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (title.length > 255) {
    return NextResponse.json({ error: 'title too long' }, { status: 400 })
  }
  if (description && (typeof description !== 'string' || description.length > 5000)) {
    return NextResponse.json({ error: 'description too long' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category as string)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }
  if (priority && !VALID_PRIORITIES.includes(priority as string)) {
    return NextResponse.json({ error: 'invalid priority' }, { status: 400 })
  }
  if (status && !VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const VALID_REMINDERS = ['none', '15min', '30min', '1h', '2h', '6h', '12h', '1day', '2days', '3days', '1week']
  const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']
  if (reminder_type && !VALID_REMINDERS.includes(reminder_type as string)) {
    return NextResponse.json({ error: 'invalid reminder_type' }, { status: 400 })
  }
  if (recurrence && !VALID_RECURRENCES.includes(recurrence as string)) {
    return NextResponse.json({ error: 'invalid recurrence' }, { status: 400 })
  }

  const admin = createAdminClient()
  const shouldLink = calendar_linked === true && !!due_date

  const { data, error } = await admin
    .from('tasks')
    .insert({
      user_id: user.id,
      title: (title as string).trim(),
      description: (description as string | null) || null,
      category: (category as string) || 'work',
      priority: (priority as string) || 'medium',
      status: (status as string) || 'todo',
      due_date: (due_date as string | null) || null,
      calendar_linked: shouldLink,
      reminder_type: (reminder_type as string) || 'none',
      reminder_sent: false,
      recurrence: (recurrence as string) || 'none',
      recurrence_end: (recurrence_end as string | null) || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })

  // Se vinculado ao calendário, criar evento espelho
  if (shouldLink && data) {
    const eventInsert = {
      user_id: user.id,
      title: `📋 ${(title as string).trim()}`,
      description: (description as string | null) || null,
      event_date: due_date as string,
      start_time: null as string | null,
      end_time: null as string | null,
      category: (category as string) || 'work',
      recurrence: 'none' as const,
      source: 'local' as const,
      task_id: data.id,
    }

    const { data: savedEvent, error: eventError } = await admin
      .from('events')
      .insert(eventInsert)
      .select()
      .single()

    if (eventError) {
      console.error('[tasks/POST] Falha ao criar evento espelho:', eventError.message)
      // Retorna a tarefa mesmo com erro no evento, mas informa o cliente
      return NextResponse.json({ task: data, calendar_error: eventError.message })
    }

    // Tentar sincronizar com Google Calendar se o usuário tiver token
    if (savedEvent) {
      const { data: profile } = await admin
        .from('profiles')
        .select('google_access_token')
        .eq('id', user.id)
        .single()

      if (profile?.google_access_token) {
        const gcalResult = await createCalendarEvent(profile.google_access_token, {
          title: `📋 ${(title as string).trim()}`,
          description: (description as string) || '',
          date: due_date as string,
          startTime: '00:00',
          endTime: '00:00',
        })
        if (gcalResult) {
          await admin
            .from('events')
            .update({ gcal_event_id: gcalResult.gcalEventId, source: 'gcal' })
            .eq('id', savedEvent.id)
        }
      }
    }
  }

  return NextResponse.json({ task: data })
}
