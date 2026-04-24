'use client'
// src/hooks/useTaskReminders.ts
// Polls /api/tasks/reminders every 2 minutes and fires browser notifications
import { useEffect, useRef, useCallback } from 'react'

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes

export function useTaskReminders(enabled: boolean) {
  const permissionRef = useRef<NotificationPermission>('default')

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted'
      return 'granted'
    }
    if (Notification.permission === 'denied') {
      permissionRef.current = 'denied'
      return 'denied'
    }
    const result = await Notification.requestPermission()
    permissionRef.current = result
    return result
  }, [])

  const checkReminders = useCallback(async () => {
    if (permissionRef.current !== 'granted') return
    try {
      const res = await fetch('/api/tasks/reminders')
      if (!res.ok) return
      const { reminders } = await res.json() as { reminders: Array<{ id: string; title: string; due_date: string; reminder_type: string }> }
      for (const task of reminders ?? []) {
        const label = formatReminderLabel(task.reminder_type, task.due_date)
        new Notification('⏰ Lembrete de Tarefa', {
          body: `${task.title}\n${label}`,
          icon: '/favicon.ico',
          tag: `task-reminder-${task.id}`,
        })
      }
    } catch {
      // silently ignore network errors
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || !('Notification' in window)) return

    permissionRef.current = Notification.permission

    // Check immediately on mount, then poll
    checkReminders()
    const interval = setInterval(checkReminders, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled, checkReminders])

  return { requestPermission }
}

function formatReminderLabel(reminderType: string, dueDate: string): string {
  const map: Record<string, string> = {
    '15min': '15 minutos para o prazo',
    '30min': '30 minutos para o prazo',
    '1h':    '1 hora para o prazo',
    '2h':    '2 horas para o prazo',
    '6h':    '6 horas para o prazo',
    '12h':   '12 horas para o prazo',
    '1day':  '1 dia para o prazo',
    '2days': '2 dias para o prazo',
    '3days': '3 dias para o prazo',
    '1week': '1 semana para o prazo',
  }
  const [year, month, day] = dueDate.split('-')
  const formatted = `${day}/${month}/${year}`
  return `${map[reminderType] ?? reminderType} — vence em ${formatted}`
}
