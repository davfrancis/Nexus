'use client'

import { useState } from 'react'
import { useHealth } from '@/hooks/useHealth'

const MOODS = [
  { value: '😤', label: 'Estressado' },
  { value: '😔', label: 'Triste' },
  { value: '😐', label: 'Neutro' },
  { value: '🙂', label: 'Bem' },
  { value: '😄', label: 'Ótimo' },
]

function ScaleInput({ label, value, onChange, max = 5, color = 'var(--accent)' }: {
  label: string
  value: number | null
  onChange: (v: number) => void
  max?: number
  color?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value ?? '—'}/{max}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onChange(n)}
            style={{ flex: 1, height: 32, borderRadius: 6, border: `2px solid ${(value ?? 0) >= n ? color : 'var(--border)'}`,
              background: (value ?? 0) >= n ? `${color}30` : 'var(--bg3)', cursor: 'pointer',
              color: (value ?? 0) >= n ? color : 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SaudePage() {
  const { todayLog, weekLogs, upsertToday, addWater } = useHealth()
  const [saving, setSaving] = useState(false)
  const [sleepVal, setSleepVal] = useState('')

  const handleSaveSleep = async () => {
    const h = parseFloat(sleepVal)
    if (!isNaN(h) && h > 0) {
      setSaving(true)
      await upsertToday({ sleep_hours: h })
      setSaving(false)
      setSleepVal('')
    }
  }

  const handleSaveScale = async (field: string, value: number) => {
    await upsertToday({ [field]: value } as any)
  }

  const waterGoal = todayLog?.water_goal ?? 2500
  const waterMl = todayLog?.water_ml ?? 0
  const waterPct = Math.min((waterMl / waterGoal) * 100, 100)

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Saúde</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Acompanhe seu bem-estar diário</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>

        {/* Água */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>💧 Água</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{waterMl}ml / {waterGoal}ml</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{Math.round(waterPct)}%</span>
          </div>

          {/* Progress */}
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${waterPct}%`, background: '#4A9EE8', borderRadius: 100, transition: 'width .3s' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[150, 250, 350, 500].map(ml => (
              <button key={ml} onClick={() => addWater(ml)}
                style={{ flex: 1, minWidth: 60, padding: '8px 4px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                +{ml}ml
              </button>
            ))}
          </div>
          {waterMl > 0 && (
            <button onClick={() => upsertToday({ water_ml: 0 })}
              style={{ marginTop: 8, width: '100%', padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
              Resetar
            </button>
          )}
        </div>

        {/* Sono */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>😴 Sono</div>
            {todayLog?.sleep_hours ? (
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber)', marginTop: 8, fontFamily: 'var(--font-d)' }}>
                {todayLog.sleep_hours}h
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Não registrado hoje</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" min={0} max={24} step={0.5} value={sleepVal}
              onChange={e => setSleepVal(e.target.value)}
              placeholder="Horas dormidas"
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            <button onClick={handleSaveSleep} disabled={saving}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Salvar
            </button>
          </div>
        </div>

        {/* Humor */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>😊 Humor</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {MOODS.map(m => (
              <button key={m.value} onClick={() => upsertToday({ mood: m.value, mood_label: m.label })}
                title={m.label}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: `2px solid ${todayLog?.mood === m.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: todayLog?.mood === m.value ? 'var(--accent)20' : 'var(--bg3)', cursor: 'pointer', fontSize: 20, textAlign: 'center' }}>
                {m.value}
              </button>
            ))}
          </div>
          {todayLog?.mood_label && (
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>{todayLog.mood_label}</div>
          )}
        </div>

        {/* Métricas */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>📊 Métricas</div>
          <ScaleInput label="Energia" value={todayLog?.energy ?? null} onChange={v => handleSaveScale('energy', v)} color="var(--amber)" />
          <ScaleInput label="Estresse" value={todayLog?.stress ?? null} onChange={v => handleSaveScale('stress', v)} color="var(--red)" />
          <ScaleInput label="Motivação" value={todayLog?.motivation ?? null} onChange={v => handleSaveScale('motivation', v)} color="var(--green)" />
        </div>

        {/* Histórico semanal */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>📅 Últimos 7 dias</div>
          {weekLogs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>Nenhum registro ainda</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Data', 'Água', 'Sono', 'Humor', 'Energia', 'Estresse', 'Motivação'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekLogs.slice(0, 7).map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '8px 12px', color: 'var(--text3)' }}>{new Date(log.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                      <td style={{ padding: '8px 12px' }}>{log.water_ml ? `${log.water_ml}ml` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{log.sleep_hours ? `${log.sleep_hours}h` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{log.mood || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--amber)' }}>{log.energy ?? '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--red)' }}>{log.stress ?? '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--green)' }}>{log.motivation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
