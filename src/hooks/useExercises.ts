'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Exercise, WorkoutSet } from '@/types/database'

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([])
  const [loading, setLoading] = useState(true)
  const todayDow = new Date().getDay()

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/exercises')
    if (res.ok) {
      const json = await res.json()
      setExercises(json.exercises || [])
      setTodaySets(json.sets || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addExercise = async (fields: {
    name: string; icon?: string; muscle_group?: string
    day_of_week: number; sets?: number; reps?: number; weight_kg?: number
  }) => {
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.exercise) setExercises(prev => [...prev, json.exercise])
    return json.exercise
  }

  const deleteExercise = async (id: string) => {
    await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  const logSet = async (exerciseId: string, setNumber: number, repsDone: number, weightDone: number) => {
    const res = await fetch('/api/workout-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: exerciseId, set_number: setNumber, reps_done: repsDone, weight_done: weightDone }),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.set) {
      setTodaySets(prev => {
        const exists = prev.find(s => s.exercise_id === exerciseId && s.set_number === setNumber)
        if (exists) return prev.map(s => s.exercise_id === exerciseId && s.set_number === setNumber ? json.set : s)
        return [...prev, json.set]
      })
    }
    return json.set
  }

  const isSetDone = (exerciseId: string, setNumber: number) =>
    todaySets.some(s => s.exercise_id === exerciseId && s.set_number === setNumber && s.completed)

  const todayExercises = exercises.filter(e => e.day_of_week === todayDow)

  return { exercises, todaySets, todayExercises, loading, addExercise, deleteExercise, logSet, isSetDone, todayDow, refresh: fetchAll }
}
