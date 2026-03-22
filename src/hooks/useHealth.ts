'use client'

import { useEffect, useState, useCallback } from 'react'
import type { HealthLog } from '@/types/database'
import { format } from 'date-fns'

export function useHealth() {
  const [todayLog, setTodayLog] = useState<HealthLog | null>(null)
  const [weekLogs, setWeekLogs] = useState<HealthLog[]>([])
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/health')
    if (res.ok) {
      const json = await res.json()
      setWeekLogs(json.logs || [])
      setTodayLog(json.logs?.find((l: HealthLog) => l.log_date === today) || null)
    }
  }, [today])

  useEffect(() => { fetchAll() }, [fetchAll])

  const upsertToday = async (updates: Partial<HealthLog>) => {
    const res = await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_date: today, ...updates }),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.log) {
      setTodayLog(json.log)
      setWeekLogs(prev => [json.log, ...prev.filter((l: HealthLog) => l.log_date !== today)])
    }
    return json.log
  }

  const addWater = async (ml: number) => {
    const current = todayLog?.water_ml || 0
    return upsertToday({ water_ml: current + ml })
  }

  return { todayLog, weekLogs, upsertToday, addWater, refresh: fetchAll }
}

export function useFocus() {
  const [sessions, setSessions] = useState<{ id: string; task_label: string | null; duration_min: number; started_at: string }[]>([])
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/focus-sessions')
    if (res.ok) {
      const json = await res.json()
      setSessions(json.sessions || [])
    }
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  const saveSession = async (taskLabel: string, durationMin: number, taskId?: string) => {
    const res = await fetch('/api/focus-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_label: taskLabel, duration_min: durationMin, task_id: taskId }),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.session) setSessions(prev => [json.session, ...prev])
    return json.session
  }

  const todayPomodoros = sessions.length
  const todayMinutes = sessions.reduce((a, s) => a + s.duration_min, 0)

  return { sessions, todayPomodoros, todayMinutes, saveSession, refresh: fetchToday }
}
