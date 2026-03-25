import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')
    .order('name')
  return NextResponse.json({ folders: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, parent_id = null, icon = '📁', color = '#6366f1' } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim())
    return NextResponse.json({ error: 'name required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('folders')
    .insert({ user_id: user.id, name: name.trim(), parent_id, icon, color })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ folder: data })
}
