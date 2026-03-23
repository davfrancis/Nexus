// src/components/DashboardClient.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Task, Event, Habit, HabitLog, HealthLog, FocusSession } from '@/types/database'

interface Props {
  initialData: {
    tasks: Task[]
    todayEvents: Event[]
    habits: Habit[]
    habitLogs: HabitLog[]
    healthLog: HealthLog | null
    focusSessions: FocusSession[]
    userName: string
    dateLabel: string
    greeting: string
    today: string
  }
}

const CAT_COLORS: Record<string, string> = {
  work: '#4A9EE8', personal: '#E878B8', gym: '#3ECFA0', study: '#F0A03C', urgent: '#F05C5C'
}
const CAT_TAG: Record<string, string> = {
  work: 'rgba(74,158,232,.15)', personal: 'rgba(232,120,184,.15)', gym: 'rgba(62,207,160,.15)', study: 'rgba(240,160,60,.15)', urgent: 'rgba(240,92,92,.15)'
}

const QUOTES = [
  'Disciplina é fazer o que precisa ser feito, mesmo quando não há vontade.',
  'A diferença entre ordinário e extraordinário é aquele pequeno esforço extra.',
  'Foco não é dizer sim para tudo. É dizer não para quase tudo.',
  'Construa hábitos que trabalhem por você enquanto você dorme.',
  'Cada dia é uma nova oportunidade de melhorar 1%.',
]

export default function DashboardClient({ initialData }: Props) {
  const { dateLabel, greeting, today } = initialData
  const [liveData, setLiveData] = useState(initialData)
  const [mood, setMood] = useState<string | null>(initialData.healthLog?.mood || null)
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
  const pathname = usePathname()

  const { tasks, habits, habitLogs, focusSessions, userName } = liveData

  const refresh = async () => {
    const res = await fetch('/api/dashboard')
    if (res.ok) {
      const json = await res.json()
      setLiveData(prev => ({ ...prev, ...json }))
    }
  }

  // Atualiza sempre que navegar de volta para o dashboard
  useEffect(() => {
    refresh()
  }, [pathname])

  // Atualiza quando volta para a aba do browser
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const doneTasks    = tasks.filter(t => t.status === 'done').length
  const taskPct      = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0
  const doneHabits   = habits.filter(h => habitLogs.some(l => l.habit_id === h.id && l.log_date === today && l.completed)).length
  const habitPct     = habits.length ? Math.round(doneHabits / habits.length * 100) : 0
  const maxStreak    = habits.length ? Math.max(...habits.map(h => habitLogs.filter(l => l.habit_id === h.id && l.completed).length)) : 0
  const todayPomodoros = focusSessions.length
  const focusMins    = focusSessions.reduce((a, s) => a + s.duration_min, 0)
  const nowTime      = new Date().toTimeString().slice(0, 5)
  const todayEvents  = liveData.todayEvents.filter(e => e.event_date === today)
  const nextEvent    = liveData.todayEvents.find(e =>
    e.event_date === today ? (e.start_time || '00:00') >= nowTime : true
  ) || liveData.todayEvents[0]
  const quote        = QUOTES[new Date().getDate() % QUOTES.length]

  const card = (content: React.ReactNode, style: React.CSSProperties = {}) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, ...style }}>
      {content}
    </div>
  )

  const metricCard = (label: string, value: React.ReactNode, sub: string, color: string, pct?: number) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-d)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700, letterSpacing: -1, color }}>{value}</div>
      {pct !== undefined && (
        <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 4, overflow: 'hidden', margin: '10px 0' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>
    </div>
  )

  const dayLabels = ['D','S','T','Q','Q','S','S']

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>
            {greeting}, <span style={{ color: 'var(--accent2)' }}>{userName}</span> 👋
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, textTransform: 'capitalize' }}>{dateLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 100, fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-m)' }}>
            {clock}
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 13 }}>
            {userName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div style={{ background: 'rgba(124,111,212,.1)', border: '1px solid rgba(124,111,212,.3)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Modo Produtivo Ativo</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {tasks.filter(t => t.status !== 'done').length} tarefas pendentes · {todayEvents.length} eventos hoje
            </div>
          </div>
        </div>
        <Link href="/dashboard/foco" style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          Iniciar Foco ⏱
        </Link>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {metricCard('Tarefas Hoje', <>{doneTasks}<span style={{ fontSize: 16, color: 'var(--text3)' }}>/{tasks.length}</span></>, `${taskPct}% concluído`, 'var(--accent2)', taskPct)}
        {metricCard('Hábitos', <>{doneHabits}<span style={{ fontSize: 16, color: 'var(--text3)' }}>/{habits.length}</span></>, `${habitPct}% de hoje`, 'var(--green)', habitPct)}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-d)', fontWeight: 600 }}>Streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="bounce-y" style={{ fontSize: 24, display: 'inline-block' }}>🔥</span>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700, color: 'var(--amber)' }}>{maxStreak}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>dias consecutivos</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-d)', fontWeight: 600 }}>Próx. Evento</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', margin: '8px 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {nextEvent?.title || 'Nenhum evento'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{nextEvent?.start_time?.slice(0,5) || 'Agenda livre'}</div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 20 }}>
        {card(
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)' }}>Tarefas de Hoje</h3>
              <Link href="/dashboard/tasks" style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 12, textDecoration: 'none' }}>Ver tudo</Link>
            </div>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>📋 Sem tarefas</div>
            ) : tasks.slice(0, 6).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: t.status === 'done' ? 'none' : '1.5px solid var(--border2)', background: t.status === 'done' ? 'var(--green2)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--green)' }}>
                  {t.status === 'done' ? '✓' : ''}
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.priority === 'high' ? 'var(--red)' : t.priority === 'medium' ? 'var(--amber)' : 'var(--green)', flexShrink: 0, marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 14, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text3)' : 'var(--text)' }}>{t.title}</div>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 100, background: CAT_TAG[t.category], color: CAT_COLORS[t.category], fontFamily: 'var(--font-d)', fontWeight: 600, letterSpacing: .4 }}>{t.category}</span>
                </div>
              </div>
            ))}
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {card(
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)' }}>Agenda Hoje</h3>
                <Link href="/dashboard/agenda" style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 12, textDecoration: 'none' }}>Abrir</Link>
              </div>
              {todayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>📅 Nenhum evento hoje</div>
              ) : todayEvents.slice(0, 4).map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-m)', fontSize: 11, color: 'var(--text3)', width: 40, flexShrink: 0 }}>{ev.start_time?.slice(0,5) || '?'}</span>
                  <div style={{ width: 3, borderRadius: 3, background: CAT_COLORS[ev.category] || 'var(--accent)', minHeight: 32, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
                    {ev.end_time && <div style={{ fontSize: 11, color: 'var(--text3)' }}>até {ev.end_time.slice(0,5)}</div>}
                  </div>
                </div>
              ))}
            </>
          )}
          {card(
            <>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text3)', marginBottom: 14 }}>Como você está?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['😄','🙂','😐','😴','😔'].map(e => (
                  <div key={e} onClick={() => setMood(e)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg3)', border: `1.5px solid ${mood === e ? 'var(--accent2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', transition: 'all .2s', transform: mood === e ? 'scale(1.1)' : 'scale(1)' }}>{e}</div>
                ))}
              </div>
              {mood && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Humor registrado: {mood}</div>}
            </>
          )}
        </div>
      </div>

      {/* Habits + Quote */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
        {card(
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)' }}>Hábitos — Semana</h3>
              <Link href="/dashboard/habitos" style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 12, textDecoration: 'none' }}>Detalhes</Link>
            </div>
            {habits.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nenhum hábito cadastrado</div>
            ) : habits.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16, width: 24 }}>{h.icon}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{h.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {dayLabels.map((d, di) => {
                    const date = new Date(); date.setDate(date.getDate() - 6 + di)
                    const dateStr = date.toISOString().split('T')[0]
                    const done = habitLogs.some(l => l.habit_id === h.id && l.log_date === dateStr && l.completed)
                    return <div key={di} style={{ width: 18, height: 18, borderRadius: 3, border: '1px solid var(--border)', background: done ? 'var(--accent)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: done ? '#fff' : 'var(--text3)' }}>{d}</div>
                  })}
                </div>
              </div>
            ))}
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {card(
            <>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)', marginBottom: 12 }}>Foco — Semana</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', background: i < 5 ? 'var(--accent)' : 'var(--bg4)', borderRadius: '3px 3px 0 0', height: i < 5 ? [45,72,60,78,50][i] + 'px' : '15px', transition: 'height .4s ease' }} />
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{d}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                Hoje: <span style={{ color: 'var(--accent2)' }}>{focusMins}min</span> · {todayPomodoros} pomodoros
              </div>
            </>
          )}
          {card(<><div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 16, color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>{quote}</div><div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>— Pensamento do dia</div></>)}
        </div>
      </div>

    </div>
  )
}
