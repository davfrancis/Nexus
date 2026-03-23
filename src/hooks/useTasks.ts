// src/hooks/useTasks.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) {
      const json = await res.json()
      setTasks(json.tasks || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, supabase])

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.task) setTasks(prev => [json.task, ...prev])
    return json.task
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) { fetchTasks(); return null } // revert on error
    const json = await res.json()
    if (json.task) setTasks(prev => prev.map(t => t.id === id ? json.task : t))
    return json.task
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const moveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const next = { todo: 'doing', doing: 'done', done: 'todo' } as const
    const status = task.status as keyof typeof next
    await updateTask(id, { status: next[status] })
  }

  return { tasks, loading, addTask, updateTask, deleteTask, moveTask, refresh: fetchTasks }
}
