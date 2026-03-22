'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Exercise, WorkoutSet } from '@/types/database'
import { format } from 'date-fns'

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDow = new Date().getDay() // 0=Sun, 1=Mon...

  const fetchAll = useCallback(async () => {
    const [{ data: ex }, { data: ws }] = await Promise.all([
      supabase.from('exercises').select('*').order('day_of_week').order('sort_order'),
      supabase.from('workout_sets').select('*').eq('workout_date', today),
    ])
    if (ex) setExercises(ex)
    if (ws) setTodaySets(ws)
    setLoading(false)
  }, [supabase, today])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addExercise = async (fields: {
    name: string
    icon?: string
    muscle_group?: string
    day_of_week: number
    sets?: number
    reps?: number
    weight_kg?: number
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const dayExercises = exercises.filter(e => e.day_of_week === fields.day_of_week)
    const { data } = await supabase
      .from('exercises')
      .insert({
        user_id: user.id,
        name: fields.name,
        icon: fields.icon || '🏋️',
        muscle_group: fields.muscle_group || null,
        day_of_week: fields.day_of_week,
        sets: fields.sets || 3,
        reps: fields.reps || 10,
        weight_kg: fields.weight_kg || 0,
        sort_order: dayExercises.length,
      })
      .select()
      .single()
    if (data) setExercises(prev => [...prev, data])
    return data
  }

  const deleteExercise = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  const logSet = async (exerciseId: string, setNumber: number, repsDone: number, weightDone: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const existing = todaySets.find(s => s.exercise_id === exerciseId && s.set_number === setNumber)
    if (existing) {
      const { data } = await supabase
        .from('workout_sets')
        .update({ reps_done: repsDone, weight_done: weightDone, completed: true })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setTodaySets(prev => prev.map(s => s.id === existing.id ? data : s))
      return data
    } else {
      const { data } = await supabase
        .from('workout_sets')
        .insert({ user_id: user.id, exercise_id: exerciseId, workout_date: today, set_number: setNumber, reps_done: repsDone, weight_done: weightDone, completed: true })
        .select()
        .single()
      if (data) setTodaySets(prev => [...prev, data])
      return data
    }
  }

  const isSetDone = (exerciseId: string, setNumber: number) =>
    todaySets.some(s => s.exercise_id === exerciseId && s.set_number === setNumber && s.completed)

  const todayExercises = exercises.filter(e => e.day_of_week === todayDow)

  return { exercises, todaySets, todayExercises, loading, addExercise, deleteExercise, logSet, isSetDone, today, todayDow, refresh: fetchAll }
}
