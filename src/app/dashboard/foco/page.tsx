'use client'

import { useState, useEffect, useRef } from 'react'
import { useFocus } from '@/hooks/useHealth'

const MODES = [
  { key: 'focus',  label: 'Foco',       minutes: 25, color: 'var(--accent)' },
  { key: 'short',  label: 'Pausa curta', minutes: 5,  color: 'var(--green)' },
  { key: 'long',   label: 'Pausa longa', minutes: 15, color: 'var(--amber)' },
]

export default function FocoPage() {
  const { sessions, todayPomodoros, todayMinutes, saveSession } = useFocus()
  const [modeIdx, setModeIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].minutes * 60)
  const [running, setRunning] = useState(false)
  const [taskLabel, setTaskLabel] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const mode = MODES[modeIdx]
  const totalSecs = mode.minutes * 60
  const progress = 1 - timeLeft / totalSecs
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference * (1 - progress)

  // Reset timer when mode changes
  useEffect(() => {
    setRunning(false)
    setTimeLeft(MODES[modeIdx].minutes * 60)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [modeIdx])

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            // Save session if it was a focus session
            if (MODES[modeIdx].key === 'focus') {
              saveSession(taskLabel || 'Sessão de foco', MODES[modeIdx].minutes)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, modeIdx, taskLabel, saveSession])

  const toggleTimer = () => {
    if (timeLeft === 0) {
      // Reset
      setTimeLeft(mode.minutes * 60)
    } else {
      setRunning(prev => !prev)
    }
  }

  const resetTimer = () => {
    setRunning(false)
    setTimeLeft(mode.minutes * 60)
  }

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Foco</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          {todayPomodoros} pomodoros hoje · {todayMinutes} min focado
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Timer */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg3)', borderRadius: 10, padding: 4 }}>
            {MODES.map((m, i) => (
              <button key={m.key} onClick={() => setModeIdx(i)}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  background: modeIdx === i ? 'var(--bg2)' : 'transparent',
                  color: modeIdx === i ? m.color : 'var(--text3)' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* SVG Circle Timer */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={100} cy={100} r={radius} fill="none" stroke="var(--bg3)" strokeWidth={8} />
              <circle cx={100} cy={100} r={radius} fill="none" stroke={mode.color} strokeWidth={8}
                strokeDasharray={circumference} strokeDashoffset={strokeDash}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s linear' }} />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>
                {mins}:{secs}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{mode.label}</div>
            </div>
          </div>

          {/* Task label */}
          <input value={taskLabel} onChange={e => setTaskLabel(e.target.value)}
            placeholder="Em que você vai focar? (opcional)"
            disabled={running}
            style={{ width: '100%', maxWidth: 280, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', textAlign: 'center' }} />

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={resetTimer}
              style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 16, cursor: 'pointer' }}>↺</button>
            <button onClick={toggleTimer}
              style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: mode.color, color: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {timeLeft === 0 ? '↺' : running ? '⏸' : '▶'}
            </button>
            <div style={{ width: 44, height: 44 }} />
          </div>
        </div>

        {/* Session history */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Hoje
          </h3>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Pomodoros', value: todayPomodoros, color: 'var(--accent)' },
              { label: 'Minutos', value: todayMinutes, color: 'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'var(--font-d)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sessions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>
                Nenhuma sessão hoje ainda
              </div>
            ) : sessions.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.task_label || 'Sessão de foco'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {new Date(s.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{s.duration_min}min</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
