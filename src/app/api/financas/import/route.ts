import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

// Fix double-encoded UTF-8 strings (localStorage artifact from old HTML app)
function fixEncoding(str: string): string {
  try { return decodeURIComponent(escape(str)) } catch { return str }
}

// Check if a string is already a valid UUID
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

// Map old HTML-app format → new Supabase schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOldTx(tx: any, userId: string, groupMap: Map<string, string>) {
  const isOld = 'desc' in tx

  // Resolve installment_group: old app uses strings like "pg_17742014..."
  // We need to map them to stable UUIDs (same old ID → same new UUID)
  const rawGroup: string | null = isOld
    ? (tx.parcelGroup ?? null)
    : (tx.installment_group ?? null)

  let installment_group: string | null = null
  if (rawGroup) {
    if (isUUID(rawGroup)) {
      installment_group = rawGroup
    } else {
      if (!groupMap.has(rawGroup)) groupMap.set(rawGroup, randomUUID())
      installment_group = groupMap.get(rawGroup)!
    }
  }

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
    installment_group,
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

  // Shared map so all transactions in the same old group get the same new UUID
  const groupMap = new Map<string, string>()
  const rows = rawList.map((tx: Record<string, unknown>) => mapOldTx(tx, user.id, groupMap))

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
