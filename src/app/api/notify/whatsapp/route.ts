// src/app/api/notify/whatsapp/route.ts
// Envia notificações WhatsApp via Evolution API (self-hosted)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REMINDER_MINUTES: Record<string, number> = {
  '15min': 15, '30min': 30, '1h': 60, '2h': 120,
  '6h': 360, '12h': 720, '1day': 1440, '2days': 2880, '3days': 4320, '1week': 10080,
}

const REMINDER_LABEL: Record<string, string> = {
  '15min': '15 minutos', '30min': '30 minutos', '1h': '1 hora', '2h': '2 horas',
  '6h': '6 horas', '12h': '12 horas', '1day': '1 dia', '2days': '2 dias',
  '3days': '3 dias', '1week': '1 semana',
}

function toMs(date: string, time: string | null): number {
  const t = time || '08:00'
  return new Date(`${date}T${t}:00-03:00`).getTime()
}

function formatDate(date: string, time: string | null): string {
  const [y, m, d] = date.split('-')
  return time ? `${d}/${m}/${y} às ${time}` : `${d}/${m}/${y}`
}

async function sendWhatsApp(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phone: string,
  message: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
        'ngrok-skip-browser-warning': '1',
      },
      body: JSON.stringify({
        number: phone,
        textMessage: { text: message },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evolutionUrl      = process.env.EVOLUTION_API_URL
  const evolutionKey      = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME ?? 'nexus'

  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: 'Evolution API not configured' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('whatsapp_phone')
    .eq('id', user.id)
    .single()

  if (!profile?.whatsapp_phone) {
    return NextResponse.json({ error: 'WhatsApp phone not configured' }, { status: 400 })
  }

  const now = Date.now()
  const sent: string[] = []
  const startIdsToMark: string[] = []
  const dueIdsToMark: string[] = []

  // Lembretes de INÍCIO
  const { data: startTasks } = await admin
    .from('tasks')
    .select('id, title, start_date, start_time, start_reminder_type, start_reminder_sent, status')
    .eq('user_id', user.id)
    .neq('start_reminder_type', 'none')
    .eq('start_reminder_sent', false)
    .neq('status', 'done')
    .not('start_date', 'is', null)

  for (const task of startTasks ?? []) {
    const mins = REMINDER_MINUTES[task.start_reminder_type]
    if (!mins) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifyAt = toMs(task.start_date!, (task as any).start_time ?? null) - mins * 60_000
    if (now >= notifyAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const when = formatDate(task.start_date!, (task as any).start_time ?? null)
      const label = REMINDER_LABEL[task.start_reminder_type] ?? task.start_reminder_type
      const msg = `⏰ *NEXUS — Tarefa iniciando em breve*\n\n📋 ${task.title}\n🕐 Início em ${label} — ${when}`
      await sendWhatsApp(evolutionUrl, evolutionKey, evolutionInstance, profile.whatsapp_phone, msg)
      sent.push(`start:${task.id}`)
      startIdsToMark.push(task.id)
    }
  }

  // Lembretes de CONCLUSÃO
  const { data: dueTasks } = await admin
    .from('tasks')
    .select('id, title, due_date, due_time, reminder_type, reminder_sent, status')
    .eq('user_id', user.id)
    .neq('reminder_type', 'none')
    .eq('reminder_sent', false)
    .neq('status', 'done')
    .not('due_date', 'is', null)

  for (const task of dueTasks ?? []) {
    const mins = REMINDER_MINUTES[task.reminder_type]
    if (!mins) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifyAt = toMs(task.due_date!, (task as any).due_time ?? null) - mins * 60_000
    if (now >= notifyAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const when = formatDate(task.due_date!, (task as any).due_time ?? null)
      const label = REMINDER_LABEL[task.reminder_type] ?? task.reminder_type
      const msg = `🔔 *NEXUS — Prazo se aproximando*\n\n📋 ${task.title}\n⏳ Vence em ${label} — ${when}`
      await sendWhatsApp(evolutionUrl, evolutionKey, evolutionInstance, profile.whatsapp_phone, msg)
      sent.push(`due:${task.id}`)
      dueIdsToMark.push(task.id)
    }
  }

  if (startIdsToMark.length > 0) {
    await admin.from('tasks').update({ start_reminder_sent: true }).in('id', startIdsToMark).eq('user_id', user.id)
  }
  if (dueIdsToMark.length > 0) {
    await admin.from('tasks').update({ reminder_sent: true }).in('id', dueIdsToMark).eq('user_id', user.id)
  }

  return NextResponse.json({ sent })
}
