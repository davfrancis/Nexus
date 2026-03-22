import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { habit_id, log_date, completed } = await req.json()
  if (!habit_id || !log_date) return NextResponse.json({ error: 'habit_id and log_date required' }, { status: 400 })

  // Check if log exists
  const { data: existing } = await supabase.from('habit_logs').select('*').eq('habit_id', habit_id).eq('log_date', log_date).single()

  if (existing) {
    const { data } = await supabase.from('habit_logs').update({ completed: !existing.completed } as any).eq('id', existing.id).select().single()
    return NextResponse.json({ log: data, toggled: true })
  } else {
    const { data } = await supabase.from('habit_logs').insert({ habit_id, user_id: user.id, log_date, completed: true } as any).select().single()
    return NextResponse.json({ log: data, toggled: false })
  }
}
