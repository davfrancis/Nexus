import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function POST(req: Request) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evolutionUrl      = process.env.EVOLUTION_API_URL
  const evolutionKey      = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME ?? 'nexus'

  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: 'Evolution API not configured' }, { status: 400 })
  }

  const body = await req.json()
  const message = body?.message as string
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Envia para todos os usuários com whatsapp_phone configurado
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('whatsapp_phone')
    .not('whatsapp_phone', 'is', null)

  const sent: boolean[] = []
  for (const profile of profiles ?? []) {
    const res = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
        'ngrok-skip-browser-warning': '1',
      },
      body: JSON.stringify({ number: profile.whatsapp_phone, textMessage: { text: message } }),
    })
    sent.push(res.ok)
  }

  return NextResponse.json({ ok: true, sent: sent.length })
}
