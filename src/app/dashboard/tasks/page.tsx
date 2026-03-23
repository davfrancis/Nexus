'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types/database'

const COLS = [
  { key: 'todo',  label: 'A Fazer',   color: 'var(--text3)' },
  { key: 'doing', label: 'Fazendo',   color: 'var(--amber)' },
  { key: 'done',  label: 'Concluído', color: 'var(--green)' },
] as const

const CAT_COLORS: Record<string, string> = {
  work: '#4A9EE8', personal: '#E878B8', gym: '#3ECFA0', study: '#F0A03C', urgent: '#F05C5C'
}
const PRIORITIES = ['high', 'medium', 'low'] as const
const CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent'] as const

const EMPTY_FORM = { title: '', description: '', category: 'work', priority: 'medium', status: 'todo', due_date: '' }

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask, moveTask } = useTasks()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true) }
  const openEdit = (t: Task) => {
    setEditing(t)
    setForm({ title: t.title, description: t.description || '', category: t.category, priority: t.priority, status: t.status, due_date: t.due_date || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    if (editing) {
      await updateTask(editing.id, { ...form, description: form.description || null, due_date: form.due_date || null })
    } else {
      await addTask({ ...form, description: form.description || null, due_date: form.due_date || null } as any)
    }
    setShowModal(false)
  }

  const inp = (style: React.CSSProperties = {}) => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', ...style
  })

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Tarefas</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {tasks.filter(t => t.status !== 'done').length} pendentes · {tasks.filter(t => t.status === 'done').length} concluídas
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ ...inp({ width: 'auto', padding: '7px 12px' }) }}>
            <option value="all">Todas</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={openNew}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            + Nova Tarefa
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 16 }} />
              {[0,1,2].map(j => <div key={j} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 8 }} />)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {COLS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key)
            return (
              <div key={col.key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text3)' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 8px', borderRadius: 100, color: 'var(--text3)' }}>{colTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                  {colTasks.map(t => (
                    <div key={t.id}
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
                      onClick={() => openEdit(t)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{t.title}</span>
                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, flexShrink: 0, opacity: .5, padding: 0 }}>✕</button>
                      </div>
                      {t.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>{t.description}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${CAT_COLORS[t.category]}20`, color: CAT_COLORS[t.category], fontWeight: 600 }}>{t.category}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--bg4)', color: t.priority === 'high' ? 'var(--red)' : t.priority === 'medium' ? 'var(--amber)' : 'var(--green)' }}>{t.priority}</span>
                        {t.due_date && <span style={{ fontSize: 10, color: 'var(--text3)' }}>📅 {t.due_date}</span>}
                      </div>
                      {col.key !== 'done' && (
                        <button onClick={e => { e.stopPropagation(); moveTask(t.id) }}
                          style={{ marginTop: 8, width: '100%', padding: '5px 0', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
                          Mover →
                        </button>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 480, maxWidth: '100%', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="O que precisa ser feito?" style={inp()} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Descrição</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes opcionais..."
                style={{ ...inp(), resize: 'vertical', minHeight: 80 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Categoria', key: 'category', opts: CATEGORIES.map(c => ({ value: c, label: c })) },
                { label: 'Prioridade', key: 'priority', opts: PRIORITIES.map(p => ({ value: p, label: p })) },
                { label: 'Status', key: 'status', opts: COLS.map(c => ({ value: c.key, label: c.label })) },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{f.label}</label>
                  <select value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp()}>
                    {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Data limite</label>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inp()} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {editing ? 'Salvar' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
