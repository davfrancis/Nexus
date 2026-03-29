// src/app/api/claude/task/route.ts
// Endpoint exclusivo para o Claude criar tarefas via automação
// Autenticação por Bearer token (CRON_SECRET) — não requer sessão do usuário

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_STATUSES = ['todo', 'doing', 'done']

export async function POST(req: Request) {
  // ── Autenticação via Bearer token ──────────────────────────
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Leitura do body ────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, description, category, priority, status, due_date, user_email } = body

  // ── Validações ─────────────────────────────────────────────
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
    return NextResponse.json({ error: `invalid category. Use: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
  }
  if (priority && !VALID_PRIORITIES.includes(priority as string)) {
    return NextResponse.json({ error: `invalid priority. Use: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
  }
  if (status && !VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: `invalid status. Use: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Busca o usuário por e-mail ─────────────────────────────
  const email = (user_email as string) || process.env.DEFAULT_USER_EMAIL
  if (!email) {
    return NextResponse.json({ error: 'user_email is required or set DEFAULT_USER_EMAIL in env' }, { status: 400 })
  }

  const { data: userList, error: userError } = await admin.auth.admin.listUsers()
  if (userError) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const targetUser = userList.users.find(u => u.email === email)
  if (!targetUser) {
    return NextResponse.json({ error: `User not found for email: ${email}` }, { status: 404 })
  }

  // ── Cria a tarefa ──────────────────────────────────────────
  const { data, error } = await admin
    .from('tasks')
    .insert({
      user_id: targetUser.id,
      title: (title as string).trim(),
      description: (description as string | null) || null,
      category: (category as string) || 'work',
      priority: (priority as string) || 'medium',
      status: (status as string) || 'todo',
      due_date: (due_date as string | null) || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create task', details: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    task: data,
    message: `Tarefa "${data.title}" criada com sucesso no Nexus!`
  })
}
