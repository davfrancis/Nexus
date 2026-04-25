'use client'
// src/hooks/useTaskReminders.ts
import { useEffect, useRef, useCallback } from 'react'
import type { ReminderItem } from '@/app/api/tasks/reminders/route'

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes

const REMINDER_LABEL: Record<string, string> = {
  '15min': '15 minutos',
  '30min': '30 minutos',
  '1h':    '1 hora',
  '2h':    '2 horas',
  '6h':    '6 horas',
  '12h':   '12 horas',
  '1day':  '1 dia',
  '2days': '2 dias',
  '3days': '3 dias',
  '1week': '1 semana',
}

function formatDate(date: string, time: string | null): string {
  const [y, m, d] = date.split('-')
  const dateStr = `${d}/${m}/${y}`
  return time ? `${dateStr} às ${time}` : dateStr
}

function buildNotification(item: ReminderItem): { title: string; body: string } {
  const label = REMINDER_LABEL[item.reminder_type] ?? item.reminder_type
  const when  = formatDate(item.date, item.time)

  if (item.kind === 'start') {
    return {
      title: 'Tarefa iniciando em breve',
      body:  `${item.title}\nInício em ${label} — ${when}`,
    }
  }
  return {
    title: 'Prazo se aproximando',
    body:  `${item.title}\nVence em ${label} — ${when}`,
  }
}

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
      const { reminders } = await res.json() as { reminders: ReminderItem[] }
      for (const item of reminders ?? []) {
        const { title, body } = buildNotification(item)
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `task-reminder-${item.id}-${item.kind}`,
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
    checkReminders()
    const interval = setInterval(checkReminders, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled, checkReminders])

  return { requestPermission }
}
