// src/app/api/calendar/events/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'

const VALID_CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent']
const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'monthly']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'invalid month format' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', `${month}-01`)
    .lte('event_date', `${month}-31`)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  return NextResponse.json({ events: data })
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

  const { title, description, event_date, start_time, end_time, category, recurrence } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (title.length > 255) {
    return NextResponse.json({ error: 'title too long' }, { status: 400 })
  }
  if (!event_date || !DATE_REGEX.test(event_date as string)) {
    return NextResponse.json({ error: 'invalid event_date format (YYYY-MM-DD)' }, { status: 400 })
  }
  if (description && (typeof description !== 'string' || description.length > 5000)) {
    return NextResponse.json({ error: 'description too long' }, { status: 400 })
  }
  if (start_time && !TIME_REGEX.test(start_time as string)) {
    return NextResponse.json({ error: 'invalid start_time format (HH:MM)' }, { status: 400 })
  }
  if (end_time && !TIME_REGEX.test(end_time as string)) {
    return NextResponse.json({ error: 'invalid end_time format (HH:MM)' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category as string)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }
  if (recurrence && !VALID_RECURRENCES.includes(recurrence as string)) {
    return NextResponse.json({ error: 'invalid recurrence' }, { status: 400 })
  }

  const insertRow = {
    user_id: user.id,
    title: (title as string).trim(),
    description: (description as string | null) || null,
    event_date: event_date as string,
    start_time: (start_time as string | null) || null,
    end_time: (end_time as string | null) || null,
    category: (category as string) || 'work',
    recurrence: (recurrence as string) || 'none',
    source: 'local' as const,
  }

  const admin = createAdminClient()

  const { data: saved, error } = await admin
    .from('events')
    .insert(insertRow)
    .select()
    .single()

  if (error || !saved) return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })

  const { data: profile } = await admin
    .from('profiles')
    .select('google_access_token')
    .eq('id', user.id)
    .single()

  let gcalResult = null
  if (profile?.google_access_token && start_time) {
    gcalResult = await createCalendarEvent(profile.google_access_token, {
      title: title as string, description: description as string,
      date: event_date as string,
      startTime: start_time as string, endTime: (end_time || start_time) as string,
    })
    if (gcalResult) {
      await admin
        .from('events')
        .update({ gcal_event_id: gcalResult.gcalEventId, source: 'gcal' })
        .eq('id', saved.id)
    }
  }

  return NextResponse.json({
    event: { ...saved, gcal_event_id: gcalResult?.gcalEventId },
    synced_to_gcal: !!gcalResult,
  })
}
