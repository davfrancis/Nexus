import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).order('pinned', { ascending: false }).order('updated_at', { ascending: false })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, tag = 'general' } = await req.json()
  if (!title || typeof title !== 'string' || !title.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const { data } = await supabase.from('notes').insert({ user_id: user.id, title: title.trim(), content: content || null, tag, pinned: false } as any).select().single()
  return NextResponse.json({ note: data })
}
