// src/hooks/useHabits.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Habit, HabitLog } from '@/types/database'
import { format } from 'date-fns'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs]     = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchAll = useCallback(async () => {
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from('habits').select('*').eq('active', true).order('sort_order'),
      supabase.from('habit_logs').select('*').gte('log_date', format(new Date(new Date().setDate(new Date().getDate() - 6)), 'yyyy-MM-dd')),
    ])
    if (h) setHabits(h)
    if (l) setLogs(l)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleHabit = async (habitId: string, date: string = today) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = logs.find(l => l.habit_id === habitId && l.log_date === date)
    if (existing) {
      const newVal = !existing.completed
      await supabase.from('habit_logs').update({ completed: newVal }).eq('id', existing.id)
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, completed: newVal } : l))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: user.id, log_date: date, completed: true } as any).select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  const addHabit = async (name: string, icon = '⭐') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('habits').insert({ name, icon, color: '#6366f1', user_id: user.id, sort_order: habits.length } as any).select().single()
    if (data) setHabits(prev => [...prev, data])
  }

  const removeHabit = async (id: string) => {
    await supabase.from('habits').update({ active: false }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  // Retorna se um hábito foi completado em uma data
  const isCompleted = (habitId: string, date: string = today) =>
    logs.some(l => l.habit_id === habitId && l.log_date === date && l.completed)

  // Streak atual de um hábito (dias consecutivos até hoje)
  const getStreak = (habitId: string): number => {
    let streak = 0
    const d = new Date()
    while (true) {
      const dateStr = format(d, 'yyyy-MM-dd')
      if (!logs.some(l => l.habit_id === habitId && l.log_date === dateStr && l.completed)) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  // Últimos 7 dias para o tracker semanal
  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      return format(d, 'yyyy-MM-dd')
    })
  }

  return { habits, logs, loading, toggleHabit, addHabit, removeHabit, isCompleted, getStreak, getWeekDays, refresh: fetchAll }
}
