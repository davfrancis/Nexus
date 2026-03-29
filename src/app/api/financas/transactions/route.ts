import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // 1-12
  const year  = searchParams.get('year')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  let query = admin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (month && year) {
    const m = String(month).padStart(2, '0')
    const from = `${year}-${m}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const to = `${year}-${m}-${lastDay}`
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, amount, type, category, date, repeat_type, installments } = body

  if (!description || !amount || !type || !category || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const rows = []

  if (installments && installments.count >= 2) {
    // Parcelado: criar N registros
    const groupId = randomUUID()
    const perInstallment = installments.amount_per || parseFloat((amount / installments.count).toFixed(2))
    for (let i = 0; i < installments.count; i++) {
      const d = new Date(date + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      rows.push({
        user_id: user.id,
        description,
        amount: perInstallment,
        type,
        category,
        date: d.toISOString().slice(0, 10),
        repeat_type: null,
        installment_group: groupId,
        installment_num: i + 1,
        installment_total: installments.count,
      })
    }
  } else if (repeat_type === 'monthly') {
    // Recorrente: criar 24 meses
    for (let i = 0; i < 24; i++) {
      const d = new Date(date + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      rows.push({
        user_id: user.id,
        description,
        amount,
        type,
        category,
        date: d.toISOString().slice(0, 10),
        repeat_type: 'monthly',
        installment_group: null,
        installment_num: null,
        installment_total: null,
      })
    }
  } else {
    rows.push({
      user_id: user.id,
      description,
      amount,
      type,
      category,
      date,
      repeat_type: null,
      installment_group: null,
      installment_num: null,
      installment_total: null,
    })
  }

  const { data, error } = await (admin as any).from('transactions').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data })
}
