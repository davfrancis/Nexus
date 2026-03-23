// src/hooks/useEvents.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Event } from '@/types/database'

export function useEvents(month?: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const currentMonth = month || new Date().toISOString().slice(0, 7)

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`/api/calendar/events?month=${currentMonth}`)
    if (res.ok) {
      const json = await res.json()
      setEvents(json.events || [])
    }
    setLoading(false)
  }, [currentMonth])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

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
      setEvents(prev => [...prev, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time || '').localeCompare(b.start_time || '')))
    }
    return data
  }

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.event) setEvents(prev => prev.map(e => e.id === id ? data.event : e))
    return data.event
  }

  const deleteEvent = async (id: string) => {
    await fetch(`/api/calendar/events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const getEventsForDate = (date: string) =>
    events.filter(e => e.event_date === date)

  return {
    events, loading, syncing, lastSync,
    syncWithGoogle, addEvent, updateEvent, deleteEvent,
    getEventsForDate, refresh: fetchEvents
  }
}
