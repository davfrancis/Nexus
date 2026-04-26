// src/app/api/notify/whatsapp/test/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const evolutionUrl      = process.env.EVOLUTION_API_URL
  const evolutionKey      = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME ?? 'nexus'

  if (!evolutionUrl || !evolutionKey) {
    return NextResponse.json({ error: 'Evolution API não configurada no servidor.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('whatsapp_phone')
    .eq('id', user.id)
    .single()

  if (!profile?.whatsapp_phone) {
    return NextResponse.json({ error: 'Número de WhatsApp não configurado.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
        'ngrok-skip-browser-warning': '1',
      },
      body: JSON.stringify({
        number: profile.whatsapp_phone,
        textMessage: { text: '✅ *NEXUS* — Teste de notificação WhatsApp funcionando!' },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({ error: `Evolution API retornou ${res.status}: ${body}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: `Erro de rede: ${err}` }, { status: 502 })
  }
}
