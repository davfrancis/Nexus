'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts'

type DayData = {
  date: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

type Targets = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

type Props = {
  targets: Targets | null
  todayKcal: number
  todayProtein: number
}

const SHORT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return `${SHORT_DAYS[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}`
}

function isMet(day: DayData, targets: Targets, tolerance = 0.1) {
  // Goal met = within 10% above target kcal AND at least 90% of protein target
  const kcalOk    = day.kcal >= targets.kcal * 0.7 && day.kcal <= targets.kcal * (1 + tolerance)
  const proteinOk = day.protein >= targets.protein * 0.85
  return kcalOk && proteinOk
}

// Custom bar label showing kcal
function CustomTooltip({ active, payload, label, targets }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DayData & { met: boolean }
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{fmtDate(d.date)}</div>
      <div style={{ color: d.met ? '#6bcb77' : '#ff6b6b', fontWeight: 600, marginBottom: 4 }}>
        {d.met ? '✓ Meta cumprida' : '✗ Meta não cumprida'}
      </div>
      <div>🔥 {Math.round(d.kcal)} / {targets?.kcal} kcal</div>
      <div>🥩 {Math.round(d.protein)} / {targets?.protein}g prot.</div>
      <div>🌾 {Math.round(d.carbs)} / {targets?.carbs}g carb.</div>
      <div>🫒 {Math.round(d.fat)} / {targets?.fat}g gord.</div>
    </div>
  )
}

export function NutritionHistory({ targets, todayKcal, todayProtein }: Props) {
  const [history, setHistory] = useState<DayData[]>([])
  const [view, setView]       = useState<'7' | '30'>('7')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/nutrition?range=30`)
      .then(r => r.json())
      .then(json => { setHistory(json.daily ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [todayKcal]) // refresh when today's intake changes

  // Build full date range (fill missing days with 0)
  const filledData = useMemo(() => {
    const days = parseInt(view)
    const result: (DayData & { met: boolean; hasData: boolean })[] = []
    const byDate = Object.fromEntries(history.map(d => [d.date, d]))

    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date()
      dt.setDate(dt.getDate() - i)
      const dateStr = dt.toISOString().slice(0, 10)
      const day = byDate[dateStr] ?? { date: dateStr, kcal: 0, protein: 0, carbs: 0, fat: 0 }
      const hasData = !!byDate[dateStr]
      const met = hasData && targets ? isMet(day, targets) : false
      result.push({ ...day, met, hasData })
    }
    return result
  }, [history, view, targets])

  // Stats
  const stats = useMemo(() => {
    if (!targets) return null
    const withData = filledData.filter(d => d.hasData)
    const metDays  = withData.filter(d => d.met).length
    const adherence = withData.length ? Math.round((metDays / withData.length) * 100) : 0

    // Current streak (consecutive days met, going backwards from yesterday)
    let streak = 0
    const yesterday = filledData.slice(0, -1).reverse() // exclude today
    for (const d of yesterday) {
      if (!d.hasData) break
      if (d.met) streak++
      else break
    }

    // Weekly avg kcal
    const last7 = filledData.slice(-7).filter(d => d.hasData)
    const avgKcal = last7.length ? Math.round(last7.reduce((s, d) => s + d.kcal, 0) / last7.length) : 0
    const avgProtein = last7.length ? Math.round(last7.reduce((s, d) => s + d.protein, 0) / last7.length) : 0

    return { adherence, streak, metDays, total: withData.length, avgKcal, avgProtein }
  }, [filledData, targets])

  // Today's goal check
  const todayCheck = useMemo(() => {
    if (!targets) return null
    const kcalPct    = Math.round((todayKcal / targets.kcal) * 100)
    const proteinPct = Math.round((todayProtein / targets.protein) * 100)
    return {
      kcal:    { pct: kcalPct,    ok: kcalPct >= 70 && kcalPct <= 110 },
      protein: { pct: proteinPct, ok: proteinPct >= 85 },
    }
  }, [targets, todayKcal, todayProtein])

  if (!targets) return null

  const today = new Date().toISOString().slice(0, 10)
  const todayFmt = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: '1 / -1' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📈 Histórico Nutricional</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Hoje: <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{todayFmt}</span>
            &nbsp;·&nbsp; os dados resetam automaticamente a cada novo dia
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['7', '30'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`,
                background: view === v ? 'var(--accent)20' : 'var(--bg3)', color: view === v ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {v === '7' ? 'Últimos 7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* Today check */}
      {todayCheck && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>Hoje:</div>
          {[
            { label: 'Calorias',  data: todayCheck.kcal,    icon: '🔥' },
            { label: 'Proteína',  data: todayCheck.protein, icon: '🥩' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
              background: item.data.ok ? '#6bcb7720' : '#ff6b6b20',
              border: `1px solid ${item.data.ok ? '#6bcb7740' : '#ff6b6b40'}` }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: item.data.ok ? '#6bcb77' : '#ff6b6b' }}>
                {item.label}: {item.data.pct}%
              </span>
              <span style={{ fontSize: 13 }}>{item.data.ok ? '✓' : '✗'}</span>
            </div>
          ))}
          {todayKcal === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
              Nenhum alimento registrado ainda hoje
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Aderência', val: `${stats.adherence}%`, sub: `${stats.metDays}/${stats.total} dias`, color: stats.adherence >= 70 ? '#6bcb77' : stats.adherence >= 40 ? '#ffd93d' : '#ff6b6b' },
            { label: 'Sequência', val: `${stats.streak}d`,    sub: 'dias seguidos',        color: stats.streak >= 5 ? '#6bcb77' : stats.streak >= 2 ? '#ffd93d' : 'var(--text3)' },
            { label: 'Média kcal',    val: stats.avgKcal,     sub: 'últimos 7 dias',       color: 'var(--accent)' },
            { label: 'Média prot.',   val: `${stats.avgProtein}g`, sub: 'últimos 7 dias',  color: '#4d96ff' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: 'var(--font-d)' }}>{c.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart */}
      {loading ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Carregando...
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
            Calorias por dia vs meta ({targets.kcal} kcal) —
            <span style={{ color: '#6bcb77', marginLeft: 6 }}>■ meta cumprida</span>
            <span style={{ color: '#ff6b6b', marginLeft: 8 }}>■ abaixo/acima</span>
            <span style={{ color: 'var(--bg3)', marginLeft: 8 }}>■ sem registro</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={filledData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={view === '7' ? 28 : 12}>
              <XAxis dataKey="date" tickFormatter={d => {
                const dt = new Date(d + 'T12:00:00')
                return view === '7' ? SHORT_DAYS[dt.getDay()] : `${dt.getDate()}/${dt.getMonth() + 1}`
              }} tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, Math.max(targets.kcal * 1.3, 500)]} tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip targets={targets} />} cursor={{ fill: 'var(--bg3)', radius: 4 }} />
              <ReferenceLine y={targets.kcal} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                {filledData.map((entry, i) => (
                  <Cell key={i} fill={!entry.hasData ? '#ffffff10' : entry.met ? '#6bcb77' : '#ff6b6b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Monthly dots (only for 30d view) */}
          {view === '30' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Calendário de aderência (últimos 30 dias)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {filledData.map((d, i) => {
                  const dt = new Date(d.date + 'T12:00:00')
                  return (
                    <div key={i} title={`${fmtDate(d.date)} — ${d.hasData ? (d.met ? 'Meta cumprida ✓' : `${Math.round(d.kcal)} kcal ✗`) : 'Sem registro'}`}
                      style={{ width: 24, height: 24, borderRadius: 4, cursor: 'default',
                        background: !d.hasData ? 'var(--bg3)' : d.met ? '#6bcb77' : '#ff6b6b',
                        opacity: !d.hasData ? 0.4 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: d.hasData ? '#fff' : 'var(--text3)', fontWeight: 700 }}>
                      {dt.getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
