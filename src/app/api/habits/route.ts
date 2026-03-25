import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowBRT } from '@/lib/date'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: habits }, { data: logs }] = await Promise.all([
    admin.from('habits').select('*').eq('user_id', user.id).eq('active', true).order('sort_order'),
    admin.from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', new Date(nowBRT().getTime() - 7 * 86400000).toISOString().slice(0, 10)),
  ])

  return NextResponse.json({ habits: habits || [], logs: logs || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, icon = '⭐', color = '#6366f1' } = body
  if (!name || typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin.from('habits').select('id').eq('user_id', user.id).eq('active', true)
  const { data } = await admin.from('habits').insert({ user_id: user.id, name: name.trim(), icon, color, sort_order: (existing?.length || 0) }).select().single()
  return NextResponse.json({ habit: data })
}
