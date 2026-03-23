import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET() {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const dow = new Date().getDay()

  const { data: profile } = await admin.from('profiles').select('id, name').limit(1).single()
  if (!profile) return NextResponse.json({ error: 'No user found' }, { status: 404 })

  const userId = profile.id
  const name = (profile.name as string)?.split(' ')[0] || 'Dev'

  const [
    { data: tasks },
    { data: habits },
    { data: events },
    { data: exercises },
    { data: focusSessions },
  ] = await Promise.all([
    admin.from('tasks').select('id, title, priority, status, due_date').eq('user_id', userId).neq('status', 'done'),
    admin.from('habits').select('id, name, icon').eq('user_id', userId).eq('active', true),
    admin.from('events').select('title, start_time').eq('user_id', userId).eq('event_date', today).order('start_time'),
    admin.from('exercises').select('name').eq('user_id', userId).eq('day_of_week', dow),
    admin.from('focus_sessions').select('duration_min').eq('user_id', userId).gte('started_at', `${today}T00:00:00`),
  ])

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const hour = new Date().getHours()
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  let msg = `${hour < 12 ? '☀️' : '🌤'} <b>${saudacao}, ${name}!</b>\n`
  msg += `📅 ${dateLabel[0].toUpperCase() + dateLabel.slice(1)}\n`
  msg += `━━━━━━━━━━━━━━━━━━\n\n`

  // Tarefas
  const pendentes = tasks || []
  const urgentes = pendentes.filter(t => t.priority === 'high')
  const vencendoHoje = pendentes.filter(t => t.due_date === today)

  if (pendentes.length > 0) {
    msg += `📋 <b>Tarefas abertas: ${pendentes.length}</b>\n`
    if (urgentes.length) msg += `  🔴 ${urgentes.length} de alta prioridade\n`
    if (vencendoHoje.length) msg += `  ⏰ ${vencendoHoje.length} vencem hoje\n`
    pendentes.slice(0, 3).forEach(t => {
      const flag = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
      msg += `  ${flag} ${t.title}\n`
    })
    if (pendentes.length > 3) msg += `  <i>...e mais ${pendentes.length - 3}</i>\n`
    msg += '\n'
  } else {
    msg += `📋 Nenhuma tarefa pendente — arrase! 🎉\n\n`
  }

  // Hábitos
  if ((habits || []).length > 0) {
    msg += `🔥 <b>${habits!.length} hábito${habits!.length > 1 ? 's' : ''} para marcar hoje:</b>\n`
    habits!.forEach(h => msg += `  ${h.icon} ${h.name}\n`)
    msg += '\n'
  }

  // Agenda
  if ((events || []).length > 0) {
    msg += `📅 <b>Agenda de hoje:</b>\n`
    events!.slice(0, 4).forEach(ev => {
      msg += `  ${ev.start_time?.slice(0, 5) || '?'} — ${ev.title}\n`
    })
    msg += '\n'
  }

  // Treino
  if ((exercises || []).length > 0) {
    msg += `💪 <b>Treino de hoje:</b> ${exercises!.map(e => e.name).slice(0, 3).join(', ')}\n\n`
  }

  // Foco de ontem
  const focusMin = (focusSessions || []).reduce((a, s) => a + s.duration_min, 0)
  if (focusMin > 0) msg += `⏱ Foco de ontem: <b>${focusMin} min</b>\n\n`

  msg += `👉 <a href="https://nexus-git-main-davfrancis-projects.vercel.app/dashboard">Abrir Nexus</a>`

  await sendTelegram(msg)
  return NextResponse.json({ ok: true })
}
