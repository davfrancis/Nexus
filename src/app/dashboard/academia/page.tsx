'use client'

import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import ModalPortal from '@/components/ModalPortal'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MUSCLE_GROUPS = ['peito', 'costas', 'ombros', 'bíceps', 'tríceps', 'pernas', 'glúteos', 'abdômen', 'cardio']
const ICONS = ['🏋️', '💪', '🦵', '🦾', '🏃', '🚴', '🤸', '🧗']

const EMPTY_FORM = { name: '', icon: '🏋️', muscle_group: 'peito', day_of_week: 1, sets: 3, reps: 10, weight_kg: 0 }

export default function AcademiaPage() {
  const { exercises, todayExercises, loading, addExercise, deleteExercise, logSet, isSetDone, todayDow, refresh } = useExercises()
  const [selectedDay, setSelectedDay] = useState(todayDow)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM, day_of_week: todayDow })
  const [expanded, setExpanded] = useState<string | null>(null)

  const dayExercises = exercises.filter(e => e.day_of_week === selectedDay)
  const isToday = selectedDay === todayDow

  const handleAdd = async () => {
    if (!form.name.trim()) return
    await addExercise(form)
    setForm({ ...EMPTY_FORM, day_of_week: selectedDay })
    setShowModal(false)
  }

  const inp = (style: React.CSSProperties = {}) => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', ...style
  })

  // Count completed sets for today
  const totalSets = todayExercises.reduce((a, e) => a + e.sets, 0)
  const doneSets = todayExercises.reduce((a, e) => {
    let count = 0
    for (let i = 1; i <= e.sets; i++) if (isSetDone(e.id, i)) count++
    return a + count
  }, 0)

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Academia</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {isToday ? `${doneSets}/${totalSets} sets concluídos hoje` : `${dayExercises.length} exercícios no dia`}
          </div>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM, day_of_week: selectedDay }); setShowModal(true) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          + Adicionar
        </button>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
        {DAYS.map((d, i) => {
          const count = exercises.filter(e => e.day_of_week === i).length
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'center',
                background: selectedDay === i ? 'var(--accent)' : 'transparent',
                color: selectedDay === i ? '#fff' : i === todayDow ? 'var(--accent)' : 'var(--text3)' }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{d}</div>
              {count > 0 && <div style={{ fontSize: 9, marginTop: 2, opacity: .7 }}>{count}</div>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
              {[0,1].map(j => <div key={j} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />)}
            </div>
          ))}
        </div>
      ) : dayExercises.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
          Nenhum exercício para {DAYS[selectedDay]}. Adicione um!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayExercises.map(ex => {
            const isOpen = expanded === ex.id
            const setsArr = Array.from({ length: ex.sets }, (_, i) => i + 1)
            const exDone = setsArr.filter(i => isSetDone(ex.id, i)).length

            return (
              <div key={ex.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div onClick={() => setExpanded(isOpen ? null : ex.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 22 }}>{ex.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {ex.sets} sets × {ex.reps} reps
                      {ex.weight_kg > 0 ? ` · ${ex.weight_kg}kg` : ''}
                      {ex.muscle_group ? ` · ${ex.muscle_group}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isToday && (
                      <span style={{ fontSize: 11, color: exDone === ex.sets ? 'var(--green)' : 'var(--text3)' }}>
                        {exDone}/{ex.sets}
                      </span>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteExercise(ex.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4 }}>✕</button>
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && isToday && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, marginBottom: 8 }}>Marcar sets concluídos</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {setsArr.map(setNum => {
                        const done = isSetDone(ex.id, setNum)
                        return (
                          <button key={setNum} onClick={() => logSet(ex.id, setNum, ex.reps, ex.weight_kg)}
                            style={{ width: 44, height: 44, borderRadius: 8, border: `2px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                              background: done ? 'var(--green)20' : 'var(--bg3)', cursor: 'pointer',
                              color: done ? 'var(--green)' : 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
                            {setNum}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {isOpen && !isToday && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
                    Selecione hoje para registrar os sets.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 460, maxWidth: 'calc(100% - 32px)', margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>Novo Exercício</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Nome *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Supino reto, Agachamento..." style={inp()} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Ícone</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(p => ({ ...p, icon }))}
                    style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${form.icon === icon ? 'var(--accent)' : 'var(--border)'}`, background: form.icon === icon ? 'var(--accent)20' : 'var(--bg3)', fontSize: 18, cursor: 'pointer' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Grupo muscular</label>
                <select value={form.muscle_group} onChange={e => setForm(p => ({ ...p, muscle_group: e.target.value }))} style={inp()}>
                  {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Dia da semana</label>
                <select value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: parseInt(e.target.value) }))} style={inp()}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Sets', key: 'sets' },
                { label: 'Reps', key: 'reps' },
                { label: 'Peso (kg)', key: 'weight_kg' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{f.label}</label>
                  <input type="number" min={0} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                    style={inp()} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAdd} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                Adicionar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
