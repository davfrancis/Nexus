'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Habit, HabitLog } from '@/types/database'
import { format } from 'date-fns'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/habits')
    if (res.ok) {
      const json = await res.json()
      setHabits(json.habits || [])
      setLogs(json.logs || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Detecta virada de dia e atualiza os dados
  useEffect(() => {
    const checkDay = setInterval(() => {
      const newToday = format(new Date(), 'yyyy-MM-dd')
      if (newToday !== today) {
        setToday(newToday)
        fetchAll()
      }
    }, 60_000)
    return () => clearInterval(checkDay)
  }, [today, fetchAll])

  const toggleHabit = async (habitId: string, date: string = today) => {
    // Optimistic update
    const currentlyDone = logs.some(l => l.habit_id === habitId && l.log_date === date && l.completed)
    setLogs(prev => {
      const exists = prev.find(l => l.habit_id === habitId && l.log_date === date)
      if (exists) return prev.map(l => l.habit_id === habitId && l.log_date === date ? { ...l, completed: !currentlyDone } : l)
      return [...prev, { id: 'optimistic', habit_id: habitId, log_date: date, completed: true, user_id: '' } as HabitLog]
    })

    const res = await fetch('/api/habit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, log_date: date }),
    })
    if (!res.ok) { fetchAll(); return } // revert on error
    const json = await res.json()
    if (!json.log) { fetchAll(); return } // revert if insert failed silently
    setLogs(prev => {
      const exists = prev.find(l => l.habit_id === habitId && l.log_date === date)
      if (exists) return prev.map(l => l.habit_id === habitId && l.log_date === date ? json.log : l)
      return [...prev, json.log]
    })
  }

  const addHabit = async (name: string, icon = '⭐') => {
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    })
    if (!res.ok) return
    const json = await res.json()
    if (json.habit) setHabits(prev => [...prev, json.habit])
  }

  const removeHabit = async (id: string) => {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  const isCompleted = (habitId: string, date: string = today) =>
    logs.some(l => l.habit_id === habitId && l.log_date === date && l.completed)

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

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      return format(d, 'yyyy-MM-dd')
    })

  return { habits, logs, loading, toggleHabit, addHabit, removeHabit, isCompleted, getStreak, getWeekDays, refresh: fetchAll }
}
