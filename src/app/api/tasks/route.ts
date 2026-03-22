// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_STATUSES = ['todo', 'doing', 'done']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, description, category, priority, status, due_date } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (title.length > 255) {
    return NextResponse.json({ error: 'title too long' }, { status: 400 })
  }
  if (description && (typeof description !== 'string' || description.length > 5000)) {
    return NextResponse.json({ error: 'description too long' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category as string)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }
  if (priority && !VALID_PRIORITIES.includes(priority as string)) {
    return NextResponse.json({ error: 'invalid priority' }, { status: 400 })
  }
  if (status && !VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description || null,
      category: (category as string) || 'work',
      priority: (priority as string) || 'medium',
      status: (status as string) || 'todo',
      due_date: due_date || null,
    } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  return NextResponse.json({ task: data })
}
