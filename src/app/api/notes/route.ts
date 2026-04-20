// src/app/api/notes/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const templates = searchParams.get('templates') === 'true'

  const admin = createAdminClient()
  let query = admin.from('notes').select('*').eq('user_id', user.id)

  if (templates) {
    query = query.eq('is_template', true)
  } else {
    query = query.eq('is_template', false)
  }
  if (category && category !== 'all') query = query.eq('category', category)

  const { data, error } = await query
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtrar por busca de texto (no servidor não temos FTS simples, fazemos no resultado)
  let notes = data || []
  if (search) {
    const q = search.toLowerCase()
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.tags || '').toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ notes })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title = 'Sem título', content = null, category = 'geral',
    tags = '', color = 'default', pinned = false,
    is_template = false, template_schedule = 'none',
  } = body

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notes')
    .insert({ user_id: user.id, title, content, category, tags, color, pinned, is_template, template_schedule })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
