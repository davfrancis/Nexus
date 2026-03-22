// src/hooks/useTasks.ts
// Hook de tarefas com CRUD e realtime updates

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTasks()

    // Realtime: atualiza automaticamente quando qualquer cliente muda dados
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, () => fetchTasks())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, supabase])

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data } = await supabase.from('tasks').insert(task).select().single()
    if (data) setTasks(prev => [data, ...prev])
    return data
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
    if (data) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return data
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const moveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const next = { todo: 'doing', doing: 'done', done: 'todo' } as const
    await updateTask(id, { status: next[task.status] })
  }

  return { tasks, loading, addTask, updateTask, deleteTask, moveTask, refresh: fetchTasks }
}
