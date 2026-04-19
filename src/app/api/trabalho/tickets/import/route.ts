import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tickets } = await req.json()
  if (!Array.isArray(tickets) || tickets.length === 0)
    return NextResponse.json({ error: 'No tickets provided' }, { status: 400 })

  const admin = createAdminClient() as any

  // Get existing ticket_refs to avoid duplicates
  const { data: existing } = await admin
    .from('work_tickets')
    .select('ticket_ref')
    .eq('user_id', user.id)
    .not('ticket_ref', 'is', null)

  const existingRefs = new Set((existing ?? []).map((t: any) => String(t.ticket_ref)))

  const toInsert = tickets
    .filter((t: any) => !t.ticket_ref || !existingRefs.has(String(t.ticket_ref)))
    .map((t: any) => ({ ...t, user_id: user.id }))

  const toUpdate = tickets
    .filter((t: any) => t.ticket_ref && existingRefs.has(String(t.ticket_ref)))

  let inserted = 0
  let updated = 0

  if (toInsert.length > 0) {
    const { error } = await admin.from('work_tickets').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = toInsert.length
  }

  // Update status/priority for existing tickets (don't overwrite user notes/drafts)
  for (const t of toUpdate) {
    await admin.from('work_tickets')
      .update({ status: t.status, priority: t.priority, title: t.title, client: t.client, opened_at: t.opened_at })
      .eq('ticket_ref', t.ticket_ref)
      .eq('user_id', user.id)
    updated++
  }

  return NextResponse.json({ inserted, updated })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient() as any
  const { error } = await admin.from('work_tickets').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
