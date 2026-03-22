'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addProject = async (fields: {
    name: string
    client?: string
    description?: string
    color?: string
    status?: string
    deadline?: string
    tags?: string[]
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: fields.name,
        client: fields.client || null,
        description: fields.description || null,
        color: fields.color || '#6366f1',
        status: fields.status || 'active',
        deadline: fields.deadline || null,
        tags: fields.tags || [],
        progress: 0,
      } as any)
      .select()
      .single()
    if (data) setProjects(prev => [data, ...prev])
    return data
  }

  const updateProject = async (id: string, updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    const { data } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) setProjects(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  const deleteProject = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return { projects, loading, addProject, updateProject, deleteProject, refresh: fetchAll }
}
