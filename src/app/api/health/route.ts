import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase.from('health_logs').select('*').eq('user_id', user.id).gte('log_date', weekAgo).order('log_date', { ascending: false })
  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const today = new Date().toISOString().slice(0, 10)
  const log_date = body.log_date || today

  const { data } = await supabase.from('health_logs').upsert({ user_id: user.id, log_date, ...body } as any, { onConflict: 'user_id,log_date' }).select().single()
  return NextResponse.json({ log: data })
}
