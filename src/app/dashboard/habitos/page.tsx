'use client'

import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICONS = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🎵']

export default function HabitosPage() {
  const { habits, loading, toggleHabit, addHabit, removeHabit, isCompleted, getStreak, getWeekDays } = useHabits()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')

  const weekDays = getWeekDays()
  const today = format(new Date(), 'yyyy-MM-dd')

  const completedToday = habits.filter(h => isCompleted(h.id)).length
  const totalToday = habits.length

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addHabit(newName.trim(), newIcon)
    setNewName('')
    setNewIcon('⭐')
    setShowAdd(false)
  }

  const inp = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Hábitos</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {completedToday}/{totalToday} concluídos hoje
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          + Novo Hábito
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Carregando...</div>
      ) : (
        <>
          {/* Progress bar */}
          {totalToday > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Progresso do dia</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{Math.round((completedToday / totalToday) * 100)}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(completedToday / totalToday) * 100}%`, background: 'var(--green)', borderRadius: 100, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {/* Week grid */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 48px)', gap: 0, borderBottom: '1px solid var(--border)', padding: '12px 16px', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Hábito</span>
              {weekDays.map(d => {
                const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                const dow = new Date(d + 'T12:00:00').getDay()
                return (
                <div key={d} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                    {DAY_ABBR[dow]}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: d === today ? 700 : 400, color: d === today ? 'var(--accent)' : 'var(--text3)' }}>
                    {format(new Date(d + 'T12:00:00'), 'd')}
                  </div>
                </div>
                )
              })}
            </div>

            {habits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text3)', fontSize: 13 }}>
                Nenhum hábito ainda. Adicione um para começar!
              </div>
            ) : (
              habits.map((habit, idx) => {
                const streak = getStreak(habit.id)
                return (
                  <div key={habit.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 48px)', gap: 0, padding: '12px 16px', alignItems: 'center', borderBottom: idx < habits.length - 1 ? '1px solid var(--border)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: 18 }}>{habit.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</div>
                        {streak > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--amber)' }}>🔥 {streak} dias</div>
                        )}
                      </div>
                      <button onClick={() => removeHabit(habit.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4, padding: '0 4px', flexShrink: 0 }}>✕</button>
                    </div>
                    {weekDays.map(d => {
                      const done = isCompleted(habit.id, d)
                      const isFuture = d > today
                      return (
                        <div key={d} style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => !isFuture && toggleHabit(habit.id, d)}
                            disabled={isFuture}
                            style={{
                              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: isFuture ? 'default' : 'pointer',
                              background: done ? habit.color : 'var(--bg3)',
                              opacity: isFuture ? .3 : 1,
                              fontSize: 12,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all .15s',
                              outline: d === today ? `2px solid ${habit.color}40` : 'none',
                            }}>
                            {done ? '✓' : ''}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Add modal */}
      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 380, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>Novo Hábito</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Nome</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Ex: Beber água, Meditação..." style={inp} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Ícone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setNewIcon(icon)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${newIcon === icon ? 'var(--accent)' : 'var(--border)'}`, background: newIcon === icon ? 'var(--accent)20' : 'var(--bg3)', fontSize: 18, cursor: 'pointer' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAdd} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                Criar Hábito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
