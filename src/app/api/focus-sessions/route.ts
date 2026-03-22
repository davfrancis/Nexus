import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const today = new Date().toISOString().slice(0, 10)
  const { data } = await admin.from('focus_sessions').select('*').eq('user_id', user.id).gte('started_at', `${today}T00:00:00`).order('started_at', { ascending: false })
  return NextResponse.json({ sessions: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_label, duration_min, task_id } = await req.json()
  if (!duration_min || typeof duration_min !== 'number') return NextResponse.json({ error: 'duration_min required' }, { status: 400 })

  const admin = createAdminClient()

  const { data } = await admin.from('focus_sessions').insert({ user_id: user.id, task_label: task_label || null, duration_min, task_id: task_id || null, mode: 'focus', completed: true, ended_at: new Date().toISOString() }).select().single()
  return NextResponse.json({ session: data })
}
