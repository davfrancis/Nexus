// src/app/api/calendar/sync/route.ts
// POST /api/calendar/sync — sincroniza GCal → Supabase

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  listCalendarEvents,
  parseGCalEvent,
  refreshGoogleToken,
} from '@/lib/google-calendar'

export async function POST(req: Request) {
  const supabase = await createClient()

  // Verifica auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Busca tokens Google salvos no profile
  const { data: profile } = await admin
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google not connected', code: 'NO_GOOGLE_TOKEN' }, { status: 400 })
  }

  let accessToken = profile.google_access_token

  // Refresh token se expirado
  if (profile.google_token_expiry && new Date(profile.google_token_expiry) < new Date()) {
    if (!profile.google_refresh_token) {
      return NextResponse.json({ error: 'Token expired, reconnect Google' }, { status: 400 })
    }
    const refreshed = await refreshGoogleToken(profile.google_refresh_token)
    if (!refreshed) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 400 })
    }
    accessToken = refreshed.access_token
    await admin.from('profiles').update({
      google_access_token: accessToken,
      google_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq('id', user.id)
  }

  // Define janela de sincronização (mês atual + próximo)
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

  try {
    const gcalEvents = await listCalendarEvents(accessToken, timeMin, timeMax)

    // Upsert eventos no Supabase (não duplica)
    const rows = gcalEvents.map(ev => ({
      ...parseGCalEvent(ev),
      user_id: user.id,
      category: 'work', // pode ser refinado via ML depois
    }))

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from('events')
        .upsert(rows, {
          onConflict: 'gcal_event_id',
          ignoreDuplicates: false,
        })
      if (upsertError) throw upsertError
    }

    return NextResponse.json({
      success: true,
      synced: rows.length,
      message: `${rows.length} eventos sincronizados`,
    })
  } catch (err) {
    console.error('GCal sync error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
