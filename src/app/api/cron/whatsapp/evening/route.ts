import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'

async function sendWhatsApp(url: string, key: string, instance: string, phone: string, message: string) {
  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ number: phone, textMessage: { text: message } }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evolutionUrl      = process.env.EVOLUTION_API_URL
  const evolutionKey      = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME ?? 'nexus'

  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: 'Evolution API not configured' }, { status: 400 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, whatsapp_phone')
    .not('whatsapp_phone', 'is', null)

  for (const profile of profiles ?? []) {
    const userId = profile.id
    const name = (profile.name as string)?.split(' ')[0] || 'você'
    const phone = profile.whatsapp_phone as string

    const [
      { data: habits },
      { data: habitLogs },
      { data: tasks },
      { data: focusSessions },
    ] = await Promise.all([
      admin.from('habits').select('id, name, icon').eq('user_id', userId).eq('active', true),
      admin.from('habit_logs').select('habit_id, completed').eq('user_id', userId).eq('log_date', today),
      admin.from('tasks').select('id, title, status, priority, due_date').eq('user_id', userId),
      admin.from('focus_sessions').select('duration_min').eq('user_id', userId).gte('started_at', `${today}T00:00:00`),
    ])

    const allHabits = habits || []
    const completedLogs = (habitLogs || []).filter(l => l.completed).map(l => l.habit_id)
    const doneHabits = allHabits.filter(h => completedLogs.includes(h.id))
    const pendingHabits = allHabits.filter(h => !completedLogs.includes(h.id))

    const allTasks = tasks || []
    const doneToday = allTasks.filter(t => t.status === 'done')
    const pendingTasks = allTasks.filter(t => t.status !== 'done')
    const atrasadas = pendingTasks.filter(t => t.due_date && t.due_date < today)

    const focusMin = (focusSessions || []).reduce((a: number, s: { duration_min: number }) => a + s.duration_min, 0)
    const habitPct = allHabits.length > 0 ? Math.round((doneHabits.length / allHabits.length) * 100) : 0

    let msg = `🌙 *Check-in noturno, ${name}!*\n`
    msg += `━━━━━━━━━━━━━━━━\n\n`

    // Tarefas
    msg += `📋 *Tarefas hoje:*\n`
    msg += `  ✅ ${doneToday.length} concluídas\n`
    msg += `  📌 ${pendingTasks.length} ainda abertas\n`
    if (atrasadas.length > 0) {
      msg += `  ⚠️ ${atrasadas.length} atrasadas\n`
      atrasadas.slice(0, 3).forEach(t => {
        const flag = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
        msg += `    ${flag} ${t.title}\n`
      })
    }
    msg += '\n'

    // Hábitos
    msg += `🔥 *Hábitos: ${doneHabits.length}/${allHabits.length} (${habitPct}%)*\n`
    if (pendingHabits.length > 0) {
      msg += `Ainda faltam:\n`
      pendingHabits.forEach(h => msg += `  ${h.icon} ${h.name}\n`)
      msg += `⚠️ _Marque antes de dormir para não perder o streak!_\n`
    } else if (allHabits.length > 0) {
      msg += `✅ Todos os hábitos concluídos! Incrível 🎉\n`
    }
    msg += '\n'

    // Foco
    if (focusMin > 0) {
      msg += `⏱ *Foco hoje: ${focusMin} min*\n`
      if (focusMin >= 120) msg += `🏆 Meta batida! Excelente foco.\n`
      else msg += `_Meta: 120 min. Faltaram ${120 - focusMin} min._\n`
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
    msg += `💭 _${motivacao[new Date().getDay() % motivacao.length]}_\n\n`
    msg += `👉 https://nexus-lilac-mu.vercel.app/dashboard`

    await sendWhatsApp(evolutionUrl, evolutionKey, evolutionInstance, phone, msg)
  }

  return NextResponse.json({ ok: true })
}
