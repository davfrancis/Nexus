// src/hooks/useEvents.ts
// Hook de eventos com sincronização Google Calendar

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/types/database'

export function useEvents(month?: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const supabase = createClient()

  const currentMonth = month || new Date().toISOString().slice(0, 7)

  const fetchEvents = useCallback(async () => {
    const [year, mon] = currentMonth.split('-')
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', `${currentMonth}-01`)
      .lte('event_date', `${year}-${mon}-31`)
      .order('event_date')
      .order('start_time')
    if (data) setEvents(data)
    setLoading(false)
  }, [supabase, currentMonth])

  useEffect(() => {
    fetchEvents()
    const channel = supabase
      .channel('events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchEvents, supabase])

  // Sync com Google Calendar
  const syncWithGoogle = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setLastSync(new Date())
        await fetchEvents()
        return { success: true, synced: data.synced }
      }
      return { success: false, error: data.error, code: data.code }
    } catch (e) {
      return { success: false, error: String(e) }
    } finally {
      setSyncing(false)
    }
  }

  const addEvent = async (event: {
    title: string; description?: string; event_date: string
    start_time?: string; end_time?: string; category?: string; recurrence?: string
  }) => {
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    const data = await res.json()
    if (data.event) {
      setEvents(prev => [...prev, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    }
    return data
  }

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    const { data } = await supabase.from('events').update(updates).eq('id', id).select().single()
    if (data) setEvents(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteEvent = async (id: string) => {
    const event = events.find(e => e.id === id)
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    // Nota: para deletar do GCal tbm, chamar a API de deleção
    return event
  }

  const getEventsForDate = (date: string) =>
    events.filter(e => e.event_date === date)

  return {
    events, loading, syncing, lastSync,
    syncWithGoogle, addEvent, updateEvent, deleteEvent,
    getEventsForDate, refresh: fetchEvents
  }
}
