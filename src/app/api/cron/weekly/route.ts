import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { format, subDays } from 'date-fns'

export async function GET() {
  const admin = createAdminClient()
  const today = new Date()
  const weekStart = format(subDays(today, 6), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: profile } = await admin.from('profiles').select('id, name').limit(1).single()
  if (!profile) return NextResponse.json({ error: 'No user found' }, { status: 404 })

  const userId = profile.id
  const name = (profile.name as string)?.split(' ')[0] || 'Dev'

  const [
    { data: habits },
    { data: habitLogs },
    { data: tasks },
    { data: focusSessions },
    { data: workoutSets },
  ] = await Promise.all([
    admin.from('habits').select('id, name, icon').eq('user_id', userId).eq('active', true),
    admin.from('habit_logs').select('habit_id, log_date, completed').eq('user_id', userId).gte('log_date', weekStart),
    admin.from('tasks').select('id, status, created_at').eq('user_id', userId),
    admin.from('focus_sessions').select('duration_min, started_at').eq('user_id', userId).gte('started_at', `${weekStart}T00:00:00`),
    admin.from('workout_sets').select('workout_date').eq('user_id', userId).gte('workout_date', weekStart),
  ])

  const allHabits = habits || []
  const logs = (habitLogs || []).filter(l => l.completed)
  const totalPossible = allHabits.length * 7
  const totalDone = logs.length
  const habitPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

  const allTasks = tasks || []
  const doneTasks = allTasks.filter(t => t.status === 'done').length
  const pendingTasks = allTasks.filter(t => t.status !== 'done').length

  const focusMin = (focusSessions || []).reduce((a, s) => a + s.duration_min, 0)
  const focusH = Math.floor(focusMin / 60)
  const focusM = focusMin % 60

  const trainDays = new Set((workoutSets || []).map(w => w.workout_date)).size

  // Melhor streak da semana
  let bestStreak = 0
  allHabits.forEach(h => {
    let streak = 0
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd')
      if (logs.some(l => l.habit_id === h.id && l.log_date === d)) streak++
      else break
    }
    if (streak > bestStreak) bestStreak = streak
  })

  // Score geral
  let score = 0
  if (habitPct >= 80) score += 40
  else if (habitPct >= 50) score += 20
  if (doneTasks >= 5) score += 30
  else if (doneTasks >= 2) score += 15
  if (focusMin >= 300) score += 20
  else if (focusMin >= 120) score += 10
  if (trainDays >= 3) score += 10

  const medal = score >= 80 ? '🥇' : score >= 50 ? '🥈' : score >= 30 ? '🥉' : '📊'

  let msg = `${medal} <b>Resumo da semana, ${name}!</b>\n`
  msg += `━━━━━━━━━━━━━━━━━━\n\n`

  msg += `🔥 <b>Hábitos: ${habitPct}%</b> (${totalDone}/${totalPossible} dias)\n`
  if (bestStreak > 0) msg += `  Melhor streak: ${bestStreak} dias seguidos\n`
  msg += '\n'

  msg += `📋 <b>Tarefas: ${doneTasks} concluídas</b>\n`
  if (pendingTasks > 0) msg += `  ${pendingTasks} ainda abertas\n`
  msg += '\n'

  if (focusMin > 0) {
    msg += `⏱ <b>Foco total: ${focusH > 0 ? `${focusH}h ` : ''}${focusM}min</b>\n\n`
  }

  if (trainDays > 0) {
    msg += `💪 <b>Treinos: ${trainDays} dia${trainDays > 1 ? 's' : ''}</b>\n\n`
  }

  // Mensagem baseada no score
  const feedback =
    score >= 80 ? '🏆 Semana excepcional! Continue assim.' :
    score >= 50 ? '💪 Boa semana! Dá pra melhorar ainda mais.' :
    score >= 30 ? '📈 Semana razoável. Foco na próxima!' :
    '🎯 Semana difícil. A próxima começa amanhã — vai com tudo!'

  msg += `${feedback}\n\n`
  msg += `👉 <a href="https://nexus-git-main-davfrancis-projects.vercel.app/dashboard">Ver dashboard</a>`

  await sendTelegram(msg)
  return NextResponse.json({ ok: true })
}
