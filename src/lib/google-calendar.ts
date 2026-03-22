// src/lib/google-calendar.ts
// Integração com Google Calendar API

export interface GCalEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
  colorId?: string
  calendarId?: string
  calendarName?: string
  htmlLink?: string
}

// Mapa de cores do Google Calendar → nossa paleta
const GCAL_COLORS: Record<string, string> = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
}

// ── LIST eventos do mês ──────────────────────────────────────────
export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  })

  // Busca todos os calendários do usuário
  const calsRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const calsData = await calsRes.json()
  const calendars = calsData.items || []

  const allEvents: GCalEvent[] = []

  // Busca eventos de cada calendário
  await Promise.all(
    calendars.map(async (cal: { id: string; summary: string }) => {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      if (data.items) {
        allEvents.push(
          ...data.items.map((ev: GCalEvent) => ({
            ...ev,
            calendarId: cal.id,
            calendarName: cal.summary,
          }))
        )
      }
    })
  )

  return allEvents
}

// ── CREATE evento ────────────────────────────────────────────────
export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string
    description?: string
    date: string
    startTime: string
    endTime: string
    calendarId?: string
  }
): Promise<{ gcalEventId: string; htmlLink: string } | null> {
  const calendarId = event.calendarId || 'primary'
  const body = {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: `${event.date}T${event.startTime}:00`,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${event.date}T${event.endTime}:00`,
      timeZone: 'America/Sao_Paulo',
    },
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  return { gcalEventId: data.id, htmlLink: data.htmlLink }
}

// ── UPDATE evento ────────────────────────────────────────────────
export async function updateCalendarEvent(
  accessToken: string,
  gcalEventId: string,
  calendarId: string,
  updates: Partial<{
    title: string
    description: string
    date: string
    startTime: string
    endTime: string
  }>
): Promise<boolean> {
  const body: Record<string, unknown> = {}
  if (updates.title) body.summary = updates.title
  if (updates.description) body.description = updates.description
  if (updates.date && updates.startTime) {
    body.start = { dateTime: `${updates.date}T${updates.startTime}:00`, timeZone: 'America/Sao_Paulo' }
    body.end   = { dateTime: `${updates.date}T${updates.endTime || updates.startTime}:00`, timeZone: 'America/Sao_Paulo' }
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${gcalEventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return res.ok
}

// ── DELETE evento ────────────────────────────────────────────────
export async function deleteCalendarEvent(
  accessToken: string,
  gcalEventId: string,
  calendarId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${gcalEventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  return res.status === 204
}

// ── REFRESH token ────────────────────────────────────────────────
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
} | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

// ── PARSE evento do GCal → formato local ────────────────────────
export function parseGCalEvent(ev: GCalEvent): {
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
  gcal_event_id: string
  gcal_calendar_id: string | null
  source: 'gcal'
} {
  const startDateTime = ev.start.dateTime || ev.start.date || ''
  const endDateTime   = ev.end.dateTime   || ev.end.date   || ''

  return {
    title: ev.summary || 'Sem título',
    event_date: startDateTime.split('T')[0],
    start_time: ev.start.dateTime
      ? ev.start.dateTime.split('T')[1]?.substring(0, 5) || null
      : null,
    end_time: ev.end.dateTime
      ? ev.end.dateTime.split('T')[1]?.substring(0, 5) || null
      : null,
    description: ev.description || null,
    gcal_event_id: ev.id,
    gcal_calendar_id: ev.calendarId || null,
    source: 'gcal',
  }
}
