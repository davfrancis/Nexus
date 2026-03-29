import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fix double-encoded UTF-8 strings (localStorage artifact from old HTML app)
function fixEncoding(str: string): string {
  try { return decodeURIComponent(escape(str)) } catch { return str }
}

// Map old HTML-app format → new Supabase schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOldTx(tx: any, userId: string) {
  // Support both old format (desc/val/type:out|inc) and new format (description/amount/type:expense|income)
  const isOld = 'desc' in tx
  return {
    user_id: userId,
    description: fixEncoding(isOld ? tx.desc : tx.description),
    amount: isOld ? tx.val : tx.amount,
    type: isOld
      ? (tx.type === 'out' ? 'expense' : 'income')
      : tx.type,
    category: isOld ? tx.cat : tx.category,
    date: tx.date,
    repeat_type: isOld
      ? (tx.repeat === 'monthly' ? 'monthly' : null)
      : (tx.repeat_type ?? null),
    installment_group: isOld
      ? (tx.parcelGroup ?? null)
      : (tx.installment_group ?? null),
    installment_num: isOld
      ? (tx.parcelNum ?? null)
      : (tx.installment_num ?? null),
    installment_total: isOld
      ? (tx.parcelTotal ?? null)
      : (tx.installment_total ?? null),
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Accept { txs: [...] } (old format) OR { transactions: [...] } (new format)
  const rawList = body.txs ?? body.transactions ?? []

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return NextResponse.json({ error: 'No transactions found in file' }, { status: 400 })
  }

  const rows = rawList.map((tx: Record<string, unknown>) => mapOldTx(tx, user.id))

  // Insert in batches of 500 to avoid payload limits
  const BATCH = 500
  let imported = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await admin.from('transactions').insert(batch)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    imported += batch.length
  }

  return NextResponse.json({ imported })
}
