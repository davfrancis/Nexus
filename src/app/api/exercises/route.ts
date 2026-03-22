import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: exercises }, { data: sets }] = await Promise.all([
    admin.from('exercises').select('*').eq('user_id', user.id).order('day_of_week').order('sort_order'),
    admin.from('workout_sets').select('*').eq('user_id', user.id).eq('workout_date', today),
  ])
  return NextResponse.json({ exercises: exercises || [], sets: sets || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, icon = '🏋️', muscle_group, day_of_week, sets = 3, reps = 10, weight_kg = 0 } = body
  if (!name || typeof name !== 'string') return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (day_of_week === undefined) return NextResponse.json({ error: 'day_of_week required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin.from('exercises').select('id').eq('user_id', user.id).eq('day_of_week', day_of_week)
  const { data } = await admin.from('exercises').insert({ user_id: user.id, name: name.trim(), icon, muscle_group: muscle_group || null, day_of_week, sets, reps, weight_kg, sort_order: existing?.length || 0 }).select().single()
  return NextResponse.json({ exercise: data })
}
