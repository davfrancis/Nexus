import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { nowBRT } from '@/lib/date'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // Usa a data local do browser para evitar divergência de timezone (Vercel roda em UTC)
  const { searchParams } = new URL(req.url)
  const today = searchParams.get('date') || format(nowBRT(), 'yyyy-MM-dd')
  const d6 = new Date(today + 'T12:00:00')
  d6.setDate(d6.getDate() - 6)
  const weekAgo = d6.toISOString().slice(0, 10)

  const [
    { data: tasks },
    { data: events },
    { data: habits },
    { data: habitLogs },
    { data: healthLog },
    { data: focusSessions },
    { data: profile },
  ] = await Promise.all([
    admin.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    admin.from('events').select('*').eq('user_id', user.id).gte('event_date', today).order('event_date').order('start_time').limit(20),
    admin.from('habits').select('*').eq('user_id', user.id).eq('active', true).order('sort_order'),
    admin.from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', weekAgo),
    admin.from('health_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
    admin.from('focus_sessions').select('*').eq('user_id', user.id).gte('started_at', `${today}T00:00:00`),
    admin.from('profiles').select('name').eq('id', user.id).single(),
  ])

  return NextResponse.json({
    tasks: tasks || [],
    todayEvents: events || [],
    habits: habits || [],
    habitLogs: habitLogs || [],
    healthLog: healthLog || null,
    focusSessions: focusSessions || [],
    userName: profile?.name || user.email?.split('@')[0] || 'Dev',
  })
}
