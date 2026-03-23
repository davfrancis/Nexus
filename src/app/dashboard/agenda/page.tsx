// src/app/dashboard/agenda/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CAT_COLORS: Record<string, string> = {
  work: '#4A9EE8', personal: '#E878B8', gym: '#3ECFA0',
  study: '#F0A03C', health: '#F05C5C',
}

export default function AgendaPage() {
  const [viewDate, setViewDate]     = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [showModal, setShowModal]   = useState(false)
  const [editingEvent, setEditingEvent] = useState<null | any>(null)
  const [form, setForm] = useState({ title: '', description: '', start_time: '09:00', end_time: '10:00', category: 'work', recurrence: 'none' })

  const month = format(viewDate, 'yyyy-MM')
  const { events, loading, syncing, lastSync, syncWithGoogle, addEvent, updateEvent, deleteEvent, getEventsForDate } = useEvents(month)

  // Sync automático ao montar
  useEffect(() => { syncWithGoogle() }, [])

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) })
  const firstDayOffset = getDay(startOfMonth(viewDate))

  const handleSave = async () => {
    if (!form.title.trim()) return
    const dateStr = format(selectedDay, 'yyyy-MM-dd')
    if (editingEvent) {
      await updateEvent(editingEvent.id, { title: form.title, description: form.description, start_time: form.start_time, end_time: form.end_time, category: form.category })
    } else {
      await addEvent({ ...form, event_date: dateStr })
    }
    setShowModal(false)
    setEditingEvent(null)
    setForm({ title: '', description: '', start_time: '09:00', end_time: '10:00', category: 'work', recurrence: 'none' })
  }

  const openEdit = (ev: any) => {
    setEditingEvent(ev)
    setForm({ title: ev.title, description: ev.description || '', start_time: ev.start_time || '09:00', end_time: ev.end_time || '10:00', category: ev.category || 'work', recurrence: ev.recurrence || 'none' })
    setShowModal(true)
  }

  const selectedDayEvents = getEventsForDate(format(selectedDay, 'yyyy-MM-dd'))

  return (
    <div style={{ padding: 28 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>
            Agenda <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>Google Calendar</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastSync && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sync: {format(lastSync, 'HH:mm')}</span>}
          <button
            onClick={() => syncWithGoogle()}
            disabled={syncing}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: syncing ? 'var(--text3)' : 'var(--text)', fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', animation: syncing ? 'spin .8s linear infinite' : 'none' }}>🔄</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button
            onClick={() => { setShowModal(true); setEditingEvent(null) }}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            + Novo Evento
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        {/* Calendar Grid */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>
              {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {/* Offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`off-${i}`} />)}
            {days.map(day => {
              const dateStr  = format(day, 'yyyy-MM-dd')
              const dayEvts  = getEventsForDate(dateStr)
              const isTodayD = isToday(day)
              const isSel    = isSameDay(day, selectedDay)

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    borderRadius: 8, padding: '4px 2px 2px', cursor: 'pointer',
                    minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: isTodayD ? 'var(--accent)' : isSel ? 'rgba(124,111,212,.15)' : 'transparent',
                    border: isSel && !isTodayD ? '1px solid var(--accent2)' : '1px solid transparent',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-d)', fontWeight: 600, color: isTodayD ? '#fff' : 'var(--text2)', lineHeight: 1 }}>
                    {day.getDate()}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', marginTop: 3 }}>
                    {dayEvts.slice(0, 2).map(ev => (
                      <div key={ev.id} style={{ fontSize: 9, padding: '1px 3px', borderRadius: 2, background: `${CAT_COLORS[ev.category] || 'var(--accent)'}30`, color: CAT_COLORS[ev.category] || 'var(--accent2)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvts.length > 2 && <div style={{ fontSize: 9, color: 'var(--text3)', paddingLeft: 3 }}>+{dayEvts.length - 2}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selected day events */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)' }}>
                {format(selectedDay, "d 'de' MMM", { locale: ptBR })}
              </h3>
              <button onClick={() => { setShowModal(true); setEditingEvent(null) }} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 12 }}>Nenhum evento</div>
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => openEdit(ev)}>
                    <span style={{ fontFamily: 'var(--font-m)', fontSize: 11, color: 'var(--text3)', width: 44, flexShrink: 0, paddingTop: 2 }}>{ev.start_time?.slice(0,5) || '--'}</span>
                    <div style={{ width: 3, borderRadius: 3, background: CAT_COLORS[ev.category] || 'var(--accent)', minHeight: 36, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
                      {ev.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{ev.description}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        {ev.end_time && <span style={{ fontSize: 10, color: 'var(--text3)' }}>até {ev.end_time.slice(0,5)}</span>}
                        {ev.gcal_event_id && <span style={{ fontSize: 9, color: 'var(--green)' }}>✓ GCal</span>}
                        {ev.source === 'gcal' && <span style={{ fontSize: 9, color: 'var(--blue)' }}>● importado</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, opacity: .5, padding: 2 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)', marginBottom: 12 }}>Este Mês</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--bg3)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>{events.length}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Total eventos</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--bg3)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>
                  {events.filter(e => e.source === 'gcal').length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Do Google</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 440, maxWidth: 'calc(100% - 32px)', margin: '40px auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {[
              { label: 'Título', key: 'title', type: 'text', placeholder: 'Reunião, consulta, aniversário...' },
              { label: 'Descrição', key: 'description', type: 'text', placeholder: 'Detalhes opcionais...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[{ label: 'Início', key: 'start_time', type: 'time' }, { label: 'Fim', key: 'end_time', type: 'time' }].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Categoria</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                <option value="work">💼 Trabalho</option>
                <option value="personal">🏠 Pessoal</option>
                <option value="gym">💪 Academia</option>
                <option value="study">📚 Estudo</option>
                <option value="health">❤️ Saúde</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                📅 {editingEvent ? 'Salvar' : 'Criar e Sincronizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
