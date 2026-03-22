'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/types/database'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addNote = async (fields: { title: string; content?: string; tag?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: fields.title,
        content: fields.content || null,
        tag: fields.tag || 'general',
        pinned: false,
      })
      .select()
      .single()
    if (data) setNotes(prev => [data, ...prev])
    return data
  }

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tag' | 'pinned'>>) => {
    const { data } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) setNotes(prev => prev.map(n => n.id === id ? data : n))
    return data
  }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    await updateNote(id, { pinned: !note.pinned })
  }

  return { notes, loading, addNote, updateNote, deleteNote, togglePin, refresh: fetchAll }
}
