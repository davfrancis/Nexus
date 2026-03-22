'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Project } from '@/types/database'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/projects')
    if (res.ok) {
      const json = await res.json()
      setProjects(json.projects || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addProject = async (fields: {
    name: string; client?: string; description?: string
    color?: string; status?: string; deadline?: string; tags?: string[]
  }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.project) setProjects(prev => [json.project, ...prev])
    return json.project
  }

  const updateProject = async (id: string, updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.project) setProjects(prev => prev.map(p => p.id === id ? json.project : p))
    return json.project
  }

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return { projects, loading, addProject, updateProject, deleteProject, refresh: fetchAll }
}
