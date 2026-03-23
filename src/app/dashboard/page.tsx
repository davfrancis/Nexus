// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Carrega dados iniciais no servidor (SSR)
  const [
    { data: tasks },
    { data: events },
    { data: habits },
    { data: habitLogs },
    { data: healthLog },
    { data: focusSessions },
    { data: profile },
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('events').select('*').eq('user_id', user!.id).gte('event_date', today).order('event_date').order('start_time').limit(20),
    supabase.from('habits').select('*').eq('user_id', user!.id).eq('active', true).order('sort_order'),
    supabase.from('habit_logs').select('*').eq('user_id', user!.id).gte('log_date', format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd')),
    supabase.from('health_logs').select('*').eq('user_id', user!.id).eq('log_date', today).maybeSingle(),
    supabase.from('focus_sessions').select('*').eq('user_id', user!.id).gte('started_at', `${today}T00:00:00`),
    supabase.from('profiles').select('name, avatar_url').eq('id', user!.id).single(),
  ])

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <DashboardClient
      initialData={{
        tasks: tasks || [],
        todayEvents: events || [],
        habits: habits || [],
        habitLogs: habitLogs || [],
        healthLog: healthLog,
        focusSessions: focusSessions || [],
        userName: profile?.name || user?.email?.split('@')[0] || 'Dev',
        dateLabel,
        greeting,
        today,
      }}
    />
  )
}
