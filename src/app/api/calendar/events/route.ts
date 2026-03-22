// src/app/api/calendar/events/route.ts
// GET  /api/calendar/events?month=YYYY-MM  — lista eventos do mês
// POST /api/calendar/events                 — cria evento (local + GCal)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_date', `${month}-01`)
    .lte('event_date', `${month}-31`)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, event_date, start_time, end_time, category, recurrence } = body

  if (!title || !event_date) {
    return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 })
  }

  // 1. Salva no Supabase
  const { data: saved, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      title, description, event_date, start_time, end_time,
      category: category || 'work',
      recurrence: recurrence || 'none',
      source: 'local',
    })
    .select()
    .single()

  if (error || !saved) return NextResponse.json({ error: error?.message }, { status: 500 })

  // 2. Tenta criar no Google Calendar
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token')
    .eq('id', user.id)
    .single()

  let gcalResult = null
  if (profile?.google_access_token && start_time) {
    gcalResult = await createCalendarEvent(profile.google_access_token, {
      title, description, date: event_date,
      startTime: start_time, endTime: end_time || start_time,
    })
    if (gcalResult) {
      await supabase
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
