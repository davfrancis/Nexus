// src/app/api/auth/google-token/route.ts
// Salva o provider_token do Google no perfil do usuário
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access_token, refresh_token, expires_in } = await req.json()
  if (!access_token) return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })

  const admin = createAdminClient()
  const updates: Record<string, unknown> = {
    google_access_token: access_token,
    google_token_expiry: new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString(),
  }
  if (refresh_token) updates.google_refresh_token = refresh_token

  const { error } = await admin.from('profiles').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
