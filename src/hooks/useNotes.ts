'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Note } from '@/types/database'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/notes')
    if (res.ok) {
      const json = await res.json()
      setNotes(json.notes || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addNote = async (fields: { title: string; content?: string; tag?: string }) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.note) setNotes(prev => [json.note, ...prev])
    return json.note
  }

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tag' | 'pinned'>>) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.note) setNotes(prev => prev.map(n => n.id === id ? json.note : n))
    return json.note
  }

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    await updateNote(id, { pinned: !note.pinned })
  }

  return { notes, loading, addNote, updateNote, deleteNote, togglePin, refresh: fetchAll }
}
