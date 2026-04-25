// src/app/api/tasks/reminders/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REMINDER_MINUTES: Record<string, number> = {
  '15min': 15,
  '30min': 30,
  '1h':    60,
  '2h':    120,
  '6h':    360,
  '12h':   720,
  '1day':  1440,
  '2days': 2880,
  '3days': 4320,
  '1week': 10080,
}

function toMs(date: string, time: string | null): number {
  const t = time || '08:00'
  return new Date(`${date}T${t}:00-03:00`).getTime()
}

export type ReminderItem = {
  id: string
  title: string
  kind: 'start' | 'due'
  date: string
  time: string | null
  reminder_type: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const now = Date.now()
  const due: ReminderItem[] = []
  const startIdsToMark: string[] = []
  const dueIdsToMark:   string[] = []

  // ── Lembretes de INÍCIO ──────────────────────────────────────────
  const { data: startTasks } = await admin
    .from('tasks')
    .select('id, title, start_date, start_time, start_reminder_type, start_reminder_sent, status')
    .eq('user_id', user.id)
    .neq('start_reminder_type', 'none')
    .eq('start_reminder_sent', false)
    .neq('status', 'done')
    .not('start_date', 'is', null)

  for (const task of startTasks ?? []) {
    const mins = REMINDER_MINUTES[task.start_reminder_type]
    if (!mins) continue
    const notifyAt = toMs(task.start_date!, (task as { start_time?: string | null }).start_time ?? null) - mins * 60_000
    if (now >= notifyAt) {
      due.push({ id: task.id, title: task.title, kind: 'start', date: task.start_date!, time: (task as { start_time?: string | null }).start_time ?? null, reminder_type: task.start_reminder_type })
      startIdsToMark.push(task.id)
    }
  }

  // ── Lembretes de CONCLUSÃO ───────────────────────────────────────
  const { data: dueTasks } = await admin
    .from('tasks')
    .select('id, title, due_date, due_time, reminder_type, reminder_sent, status')
    .eq('user_id', user.id)
    .neq('reminder_type', 'none')
    .eq('reminder_sent', false)
    .neq('status', 'done')
    .not('due_date', 'is', null)

  for (const task of dueTasks ?? []) {
    const mins = REMINDER_MINUTES[task.reminder_type]
    if (!mins) continue
    const notifyAt = toMs(task.due_date!, (task as { due_time?: string | null }).due_time ?? null) - mins * 60_000
    if (now >= notifyAt) {
      due.push({ id: task.id, title: task.title, kind: 'due', date: task.due_date!, time: (task as { due_time?: string | null }).due_time ?? null, reminder_type: task.reminder_type })
      dueIdsToMark.push(task.id)
    }
  }

  // Marca como enviados
  if (startIdsToMark.length > 0) {
    await admin.from('tasks').update({ start_reminder_sent: true }).in('id', startIdsToMark).eq('user_id', user.id)
  }
  if (dueIdsToMark.length > 0) {
    await admin.from('tasks').update({ reminder_sent: true }).in('id', dueIdsToMark).eq('user_id', user.id)
  }

  return NextResponse.json({ reminders: due })
}
