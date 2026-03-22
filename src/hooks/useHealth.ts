// src/hooks/useHealth.ts
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HealthLog } from '@/types/database'
import { format } from 'date-fns'

export function useHealth() {
  const [todayLog, setTodayLog] = useState<HealthLog | null>(null)
  const [weekLogs, setWeekLogs] = useState<HealthLog[]>([])
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetch = useCallback(async () => {
    const weekAgo = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
    const { data } = await supabase.from('health_logs').select('*').gte('log_date', weekAgo).order('log_date', { ascending: false })
    if (data) {
      setWeekLogs(data)
      setTodayLog(data.find(l => l.log_date === today) || null)
    }
  }, [supabase, today])

  useEffect(() => { fetch() }, [fetch])

  const upsertToday = async (updates: Partial<HealthLog>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('health_logs').upsert({ user_id: user.id, log_date: today, ...updates }, { onConflict: 'user_id,log_date' }).select().single()
    if (data) { setTodayLog(data); setWeekLogs(prev => [data, ...prev.filter(l => l.log_date !== today)]) }
    return data
  }

  const addWater = async (ml: number) => {
    const current = todayLog?.water_ml || 0
    return upsertToday({ water_ml: current + ml })
  }

  return { todayLog, weekLogs, upsertToday, addWater, refresh: fetch }
}

// ── NOTES ─────────────────────────────────────────────────────────
// src/hooks/useNotes.ts
export function useNotes() {
  // (mesmo padrão — ver useTasks.ts para referência)
  // Implementação completa omitida por brevidade, segue o mesmo padrão
}

// ── FOCUS SESSIONS ────────────────────────────────────────────────
export function useFocus() {
  const [sessions, setSessions] = useState<{ id: string; task_label: string | null; duration_min: number; started_at: string }[]>([])
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchToday = useCallback(async () => {
    const { data } = await supabase.from('focus_sessions').select('*').gte('started_at', `${today}T00:00:00`).order('started_at', { ascending: false })
    if (data) setSessions(data)
  }, [supabase, today])

  useEffect(() => { fetchToday() }, [fetchToday])

  const saveSession = async (taskLabel: string, durationMin: number, taskId?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('focus_sessions').insert({
      user_id: user.id, task_label: taskLabel, duration_min: durationMin, task_id: taskId || null,
      mode: 'focus', completed: true, ended_at: new Date().toISOString()
    } as any).select().single()
    if (data) setSessions(prev => [data, ...prev])
    return data
  }

  const todayPomodoros = sessions.length
  const todayMinutes   = sessions.reduce((a, s) => a + s.duration_min, 0)

  return { sessions, todayPomodoros, todayMinutes, saveSession, refresh: fetchToday }
}
