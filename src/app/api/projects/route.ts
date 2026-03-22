import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data } = await admin.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ projects: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, client, description, color = '#6366f1', status = 'active', deadline, tags = [] } = body
  if (!name || typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const admin = createAdminClient()

  const { data } = await admin.from('projects').insert({ user_id: user.id, name: name.trim(), client: client || null, description: description || null, color, status, deadline: deadline || null, tags, progress: 0 }).select().single()
  return NextResponse.json({ project: data })
}
