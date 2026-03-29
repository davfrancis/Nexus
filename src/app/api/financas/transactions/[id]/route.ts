import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['description', 'amount', 'type', 'category', 'date']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]

  // apply_to_group: update this and all future installments in same group
  const { apply_to_group } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (apply_to_group) {
    // Get current tx to find group and num
    const { data: tx } = await admin.from('transactions').select('*').eq('id', id).eq('user_id', user.id).single()
    if (!tx?.installment_group) {
      // Just update single
    } else {
      await admin.from('transactions')
        .update(updates)
        .eq('user_id', user.id)
        .eq('installment_group', tx.installment_group)
        .gte('installment_num', tx.installment_num)
      return NextResponse.json({ ok: true })
    }
  }

  const { data, error } = await admin
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const deleteGroup = searchParams.get('group') === '1'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (deleteGroup) {
    const { data: tx } = await admin.from('transactions').select('*').eq('id', id).eq('user_id', user.id).single()
    if (tx?.installment_group) {
      await admin.from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('installment_group', tx.installment_group)
        .gte('installment_num', tx.installment_num)
      return NextResponse.json({ ok: true })
    }
  }

  const { error } = await admin.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
