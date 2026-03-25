'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Folder } from '@/types/database'

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/folders')
    if (res.ok) {
      const json = await res.json()
      setFolders(json.folders || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createFolder = async (fields: { name: string; parent_id?: string | null; icon?: string; color?: string }) => {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.folder) setFolders(prev => [...prev, json.folder])
    return json.folder as Folder
  }

  const renameFolder = async (id: string, name: string) => {
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.folder) setFolders(prev => prev.map(f => f.id === id ? json.folder : f))
    return json.folder as Folder
  }

  const deleteFolder = async (id: string) => {
    await fetch(`/api/folders/${id}`, { method: 'DELETE' })
    // Refresh to capture cascade deletes of child folders
    await fetchAll()
  }

  return { folders, loading, createFolder, renameFolder, deleteFolder, refresh: fetchAll }
}
