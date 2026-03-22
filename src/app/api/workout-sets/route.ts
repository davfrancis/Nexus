import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exercise_id, set_number, reps_done, weight_done } = await req.json()
  if (!exercise_id || set_number === undefined) return NextResponse.json({ error: 'exercise_id and set_number required' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase.from('workout_sets').select('*').eq('exercise_id', exercise_id).eq('workout_date', today).eq('set_number', set_number).single()

  if (existing) {
    const { data } = await supabase.from('workout_sets').update({ reps_done, weight_done, completed: true } as any).eq('id', existing.id).select().single()
    return NextResponse.json({ set: data })
  } else {
    const { data } = await supabase.from('workout_sets').insert({ user_id: user.id, exercise_id, workout_date: today, set_number, reps_done, weight_done, completed: true } as any).select().single()
    return NextResponse.json({ set: data })
  }
}
