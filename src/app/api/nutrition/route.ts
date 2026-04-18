import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = () => createAdminClient() as any

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date  = searchParams.get('date')
  const range = searchParams.get('range')  // e.g. "30" → last 30 days

  if (range) {
    // Return aggregated daily totals for the last N days
    const days = Math.min(parseInt(range) || 30, 90)
    const from = new Date()
    from.setDate(from.getDate() - days + 1)
    const fromStr = from.toISOString().slice(0, 10)

    const { data, error } = await admin()
      .from('food_logs')
      .select('log_date, calories_kcal, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .gte('log_date', fromStr)
      .order('log_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Aggregate by date
    const byDate: Record<string, { kcal: number; protein: number; carbs: number; fat: number }> = {}
    for (const row of data ?? []) {
      if (!byDate[row.log_date]) byDate[row.log_date] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      byDate[row.log_date].kcal    += Number(row.calories_kcal)
      byDate[row.log_date].protein += Number(row.protein_g)
      byDate[row.log_date].carbs   += Number(row.carbs_g)
      byDate[row.log_date].fat     += Number(row.fat_g)
    }

    const daily = Object.entries(byDate).map(([date, v]) => ({ date, ...v }))
    return NextResponse.json({ daily })
  }

  // Single-day query (default: today)
  const queryDate = date ?? new Date().toISOString().slice(0, 10)
  const { data, error } = await admin()
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', queryDate)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { food_name, portion_g, calories_kcal, protein_g, carbs_g, fat_g, log_date } = body

  const { data, error } = await admin()
    .from('food_logs')
    .insert({
      user_id: user.id,
      log_date: log_date ?? new Date().toISOString().slice(0, 10),
      food_name, portion_g, calories_kcal, protein_g, carbs_g, fat_g,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin()
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
