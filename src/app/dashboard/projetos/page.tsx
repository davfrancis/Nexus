'use client'

import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import ModalPortal from '@/components/ModalPortal'
import type { Project } from '@/types/database'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Ativo',     color: 'var(--green)' },
  paused:    { label: 'Pausado',   color: 'var(--amber)' },
  done:      { label: 'Concluído', color: 'var(--accent)' },
  cancelled: { label: 'Cancelado', color: 'var(--text3)' },
}
const COLORS = ['#6366f1', '#4A9EE8', '#E878B8', '#3ECFA0', '#F0A03C', '#F05C5C', '#8B5CF6', '#10B981']
const EMPTY_FORM = { name: '', client: '', description: '', color: '#6366f1', status: 'active', deadline: '', progress: 0 }

export default function ProjetosPage() {
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true) }
  const openEdit = (p: Project) => {
    setEditing(p)
    setForm({ name: p.name, client: p.client || '', description: p.description || '', color: p.color, status: p.status, deadline: p.deadline || '', progress: p.progress })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editing) {
      await updateProject(editing.id, { name: form.name, client: form.client || null, description: form.description || null, color: form.color, status: form.status, deadline: form.deadline || null, progress: form.progress })
    } else {
      await addProject({ name: form.name, client: form.client || undefined, description: form.description || undefined, color: form.color, status: form.status, deadline: form.deadline || undefined })
    }
    setShowModal(false)
  }

  const inp = (style: React.CSSProperties = {}) => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', ...style
  })

  const active = projects.filter(p => p.status === 'active').length
  const done = projects.filter(p => p.status === 'done').length

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Projetos</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {active} ativos · {done} concluídos
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={inp({ width: 'auto', padding: '7px 12px' })}>
            <option value="all">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={openNew}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            + Novo Projeto
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 6, borderRadius: 100 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
          {filter !== 'all' ? 'Nenhum projeto com esse status.' : 'Nenhum projeto ainda. Crie o primeiro!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(p => {
            const st = STATUS_LABELS[p.status] || STATUS_LABELS.active
            return (
              <div key={p.id} onClick={() => openEdit(p)}
                style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderRadius: 14, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, borderTop: `3px solid ${p.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                    {p.client && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.client}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${st.color}20`, color: st.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                    <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4, padding: 0 }}>✕</button>
                  </div>
                </div>

                {p.description && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                    <span>Progresso</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.color, borderRadius: 100, transition: 'width .3s' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {p.tags.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 100, background: 'var(--bg3)', color: 'var(--text3)' }}>{tag}</span>
                      ))}
                    </div>
                  ) : <span />}
                  {p.deadline && <span style={{ fontSize: 11, color: 'var(--text3)' }}>📅 {p.deadline}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 500, maxWidth: 'calc(100% - 32px)', margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Projeto' : 'Novo Projeto'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {[
              { label: 'Nome *', key: 'name', placeholder: 'Nome do projeto' },
              { label: 'Cliente', key: 'client', placeholder: 'Nome do cliente (opcional)' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp()} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Descrição</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição do projeto..."
                style={{ ...inp(), resize: 'vertical', minHeight: 80 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inp()}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Prazo</label>
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} style={inp()} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>
                Progresso — {form.progress}%
              </label>
              <input type="range" min={0} max={100} value={form.progress}
                onChange={e => setForm(p => ({ ...p, progress: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: form.color }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Cor</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`, background: c, cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {editing ? 'Salvar' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
