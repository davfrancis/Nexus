import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { format } from 'date-fns'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: profile } = await admin.from('profiles').select('id, name').limit(1).single()
  if (!profile) return NextResponse.json({ error: 'No user found' }, { status: 404 })

  const userId = profile.id
  const name = (profile.name as string)?.split(' ')[0] || 'Dev'

  const [
    { data: habits },
    { data: habitLogs },
    { data: tasks },
    { data: focusSessions },
  ] = await Promise.all([
    admin.from('habits').select('id, name, icon').eq('user_id', userId).eq('active', true),
    admin.from('habit_logs').select('habit_id, completed').eq('user_id', userId).eq('log_date', today),
    admin.from('tasks').select('id, title, status').eq('user_id', userId),
    admin.from('focus_sessions').select('duration_min').eq('user_id', userId).gte('started_at', `${today}T00:00:00`),
  ])

  const allHabits = habits || []
  const completedLogs = (habitLogs || []).filter(l => l.completed).map(l => l.habit_id)
  const doneHabits = allHabits.filter(h => completedLogs.includes(h.id))
  const pendingHabits = allHabits.filter(h => !completedLogs.includes(h.id))

  const allTasks = tasks || []
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const pendingTasks = allTasks.filter(t => t.status !== 'done')

  const focusMin = (focusSessions || []).reduce((a, s) => a + s.duration_min, 0)

  const habitPct = allHabits.length > 0 ? Math.round((doneHabits.length / allHabits.length) * 100) : 0
  const streakRisk = pendingHabits.length > 0

  let msg = `🌙 <b>Check-in noturno, ${name}!</b>\n`
  msg += `━━━━━━━━━━━━━━━━━━\n\n`

  // Hábitos
  msg += `🔥 <b>Hábitos: ${doneHabits.length}/${allHabits.length} (${habitPct}%)</b>\n`
  if (pendingHabits.length > 0) {
    msg += `Ainda faltam:\n`
    pendingHabits.forEach(h => msg += `  ${h.icon} ${h.name}\n`)
    if (streakRisk) msg += `⚠️ <i>Marque antes de dormir para não perder o streak!</i>\n`
  } else if (allHabits.length > 0) {
    msg += `✅ Todos os hábitos concluídos! Incrível 🎉\n`
  }
  msg += '\n'

  // Tarefas
  msg += `📋 <b>Tarefas: ${doneTasks.length} concluídas</b>\n`
  if (pendingTasks.length > 0) {
    msg += `${pendingTasks.length} ainda abertas para amanhã\n`
  }
  msg += '\n'

  // Foco
  if (focusMin > 0) {
    msg += `⏱ <b>Foco hoje: ${focusMin} min</b>\n`
    if (focusMin >= 120) msg += `🏆 Meta batida! Excelente foco.\n`
    else msg += `<i>Meta: 120 min. Faltaram ${120 - focusMin} min.</i>\n`
    msg += '\n'
  } else {
    msg += `⏱ Nenhuma sessão de foco hoje.\n\n`
  }

  // Motivação
  const motivacao = [
    'Descanso é parte do processo. Durma bem! 😴',
    'Amanhã é uma nova chance de ser 1% melhor. 💪',
    'Consistência bate talento. Continue! 🔥',
    'Cada dia conta. Você está no caminho certo. ⭐',
  ]
  msg += `💭 <i>${motivacao[new Date().getDay() % motivacao.length]}</i>\n\n`

  msg += `👉 <a href="https://nexus-git-main-davfrancis-projects.vercel.app/dashboard/habitos">Marcar hábitos</a>`

  await sendTelegram(msg)
  return NextResponse.json({ ok: true })
}
