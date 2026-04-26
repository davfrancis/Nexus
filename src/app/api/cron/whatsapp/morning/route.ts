import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const dow = new Date().getDay()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, whatsapp_phone')
    .not('whatsapp_phone', 'is', null)

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  for (const profile of profiles ?? []) {
    const userId = profile.id
    const name = (profile.name as string)?.split(' ')[0] || 'você'
    const phone = profile.whatsapp_phone as string

    const [
      { data: tasks },
      { data: habits },
      { data: events },
      { data: exercises },
    ] = await Promise.all([
      admin.from('tasks')
        .select('id, title, priority, status, due_date, due_time')
        .eq('user_id', userId)
        .neq('status', 'done'),
      admin.from('habits').select('id, name, icon').eq('user_id', userId).eq('active', true),
      admin.from('events').select('title, start_time').eq('user_id', userId).eq('event_date', today).order('start_time'),
      admin.from('exercises').select('name').eq('user_id', userId).eq('day_of_week', dow),
    ])

    const pendentes = tasks || []
    const urgentes = pendentes.filter(t => t.priority === 'high')
    const vencendoHoje = pendentes.filter(t => t.due_date === today)
    const vencendoAmanha = pendentes.filter(t => {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      return t.due_date === amanha.toISOString().slice(0, 10)
    })

    let msg = `☀️ *Bom dia, ${name}!*\n`
    msg += `📅 ${dateLabel[0].toUpperCase() + dateLabel.slice(1)}\n`
    msg += `━━━━━━━━━━━━━━━━\n\n`

    // Tarefas
    if (pendentes.length > 0) {
      msg += `📋 *Tarefas abertas: ${pendentes.length}*\n`
      if (urgentes.length) msg += `  🔴 ${urgentes.length} de alta prioridade\n`
      if (vencendoHoje.length) msg += `  ⚠️ ${vencendoHoje.length} vencem *hoje*\n`
      if (vencendoAmanha.length) msg += `  ⏰ ${vencendoAmanha.length} vencem amanhã\n`
      msg += '\n'

      if (vencendoHoje.length > 0) {
        msg += `*Vencem hoje:*\n`
        vencendoHoje.slice(0, 3).forEach(t => {
          const flag = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
          const hora = t.due_time ? ` às ${t.due_time.slice(0, 5)}` : ''
          msg += `  ${flag} ${t.title}${hora}\n`
        })
        msg += '\n'
      }

      const outras = pendentes.filter(t => t.due_date !== today).slice(0, 3)
      if (outras.length > 0) {
        msg += `*Outras pendentes:*\n`
        outras.forEach(t => {
          const flag = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
          msg += `  ${flag} ${t.title}\n`
        })
        if (pendentes.length > 6) msg += `  _...e mais ${pendentes.length - 6}_\n`
        msg += '\n'
      }
    } else {
      msg += `📋 Nenhuma tarefa pendente — arrase! 🎉\n\n`
    }

    // Hábitos
    if ((habits || []).length > 0) {
      msg += `🔥 *${habits!.length} hábito${habits!.length > 1 ? 's' : ''} para hoje:*\n`
      habits!.forEach(h => msg += `  ${h.icon} ${h.name}\n`)
      msg += '\n'
    }

    // Agenda
    if ((events || []).length > 0) {
      msg += `📆 *Agenda de hoje:*\n`
      events!.slice(0, 4).forEach(ev => {
        msg += `  ${ev.start_time?.slice(0, 5) || '?'} — ${ev.title}\n`
      })
      msg += '\n'
    }

    // Treino
    if ((exercises || []).length > 0) {
      msg += `💪 *Treino de hoje:* ${exercises!.map((e: { name: string }) => e.name).slice(0, 3).join(', ')}\n\n`
    }

    msg += `👉 https://nexus-lilac-mu.vercel.app/dashboard`

    await sendWhatsApp(evolutionUrl, evolutionKey, evolutionInstance, phone, msg)
  }

  return NextResponse.json({ ok: true })
}
