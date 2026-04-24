// src/app/api/tasks/reminders/route.ts
// Returns tasks whose reminder window has arrived (used by client polling)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Maps reminder_type to minutes before due_date (tasks without time use 08:00)
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch tasks with reminders not yet sent and not done
  const { data: tasks, error } = await admin
    .from('tasks')
    .select('id, title, due_date, reminder_type, reminder_sent, status')
    .eq('user_id', user.id)
    .neq('reminder_type', 'none')
    .eq('reminder_sent', false)
    .neq('status', 'done')
    .not('due_date', 'is', null)

  if (error) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })

  const now = Date.now()
  const due: typeof tasks = []

  for (const task of tasks ?? []) {
    const minutesBefore = REMINDER_MINUTES[task.reminder_type]
    if (!minutesBefore) continue

    // due_date is YYYY-MM-DD; assume 08:00 local (America/Sao_Paulo = UTC-3)
    const dueMs = new Date(`${task.due_date}T08:00:00-03:00`).getTime()
    const notifyAt = dueMs - minutesBefore * 60 * 1000

    if (now >= notifyAt) {
      due.push(task)
    }
  }

  // Mark matched tasks as reminder_sent = true
  if (due.length > 0) {
    const ids = due.map(t => t.id)
    await admin
      .from('tasks')
      .update({ reminder_sent: true })
      .in('id', ids)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ reminders: due })
}
