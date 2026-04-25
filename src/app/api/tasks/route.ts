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

  const { title, description, category, priority, status, start_date, start_time, start_reminder_type, due_date, due_time, calendar_linked, reminder_type, recurrence, recurrence_end } = body

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

  const insertPayload: Record<string, unknown> = {
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
  }

  // Campos das migrations 010/011 — só incluídos se tiverem valor real,
  // para não quebrar caso as migrations ainda não tenham sido aplicadas no banco
  if (start_date && typeof start_date === 'string')           insertPayload.start_date           = start_date
  if (start_time && typeof start_time === 'string')           insertPayload.start_time           = start_time
  if (due_time   && typeof due_time   === 'string')           insertPayload.due_time             = due_time
  if (start_reminder_type && (start_reminder_type as string) !== 'none') {
    insertPayload.start_reminder_type = start_reminder_type
    insertPayload.start_reminder_sent = false
  }

  const { data, error } = await admin
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('[tasks/POST] Insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  // Se vinculado ao calendário, criar evento espelho
  if (shouldLink && data) {
    const evStartTime = (start_time as string | null) || (due_time as string | null) || null
    const evEndTime   = (due_time as string | null) || evStartTime

    const eventInsert = {
      user_id: user.id,
      title: `📋 ${(title as string).trim()}`,
      description: (description as string | null) || null,
      event_date: due_date as string,
      start_time: evStartTime,
      end_time: evEndTime,
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
        // Monta reminders para o GCal com base nos tipos selecionados
        const REMINDER_MINUTES: Record<string, number> = {
          '15min': 15, '30min': 30, '1h': 60, '2h': 120,
          '6h': 360, '12h': 720, '1day': 1440, '2days': 2880, '3days': 4320, '1week': 10080,
        }
        const gcalReminders: { method: string; minutes: number }[] = []
        const startRem = (start_reminder_type as string) || 'none'
        const dueRem   = (reminder_type as string) || 'none'
        if (startRem !== 'none' && REMINDER_MINUTES[startRem]) gcalReminders.push({ method: 'email', minutes: REMINDER_MINUTES[startRem] })
        if (dueRem   !== 'none' && REMINDER_MINUTES[dueRem])   gcalReminders.push({ method: 'email', minutes: REMINDER_MINUTES[dueRem] })

        const gcalResult = await createCalendarEvent(profile.google_access_token, {
          title: `📋 ${(title as string).trim()}`,
          description: (description as string) || '',
          date: due_date as string,
          startTime: evStartTime || '00:00',
          endTime: evEndTime || '00:00',
          reminders: gcalReminders,
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
