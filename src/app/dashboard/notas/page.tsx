'use client'

import { useState } from 'react'
import { useNotes } from '@/hooks/useNotes'
import type { Note } from '@/types/database'

const TAGS = ['general', 'work', 'personal', 'study', 'idea']
const TAG_COLORS: Record<string, string> = {
  general: '#6366f1', work: '#4A9EE8', personal: '#E878B8', study: '#F0A03C', idea: '#3ECFA0'
}

const EMPTY_FORM = { title: '', content: '', tag: 'general' }

export default function NotasPage() {
  const { notes, loading, addNote, updateNote, deleteNote, togglePin } = useNotes()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })

  const filtered = notes.filter(n => {
    if (filter !== 'all' && n.tag !== filter) return false
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !(n.content || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true) }
  const openEdit = (n: Note) => {
    setEditing(n)
    setForm({ title: n.title, content: n.content || '', tag: n.tag })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    if (editing) {
      await updateNote(editing.id, { title: form.title, content: form.content || null, tag: form.tag })
    } else {
      await addNote({ title: form.title, content: form.content || undefined, tag: form.tag })
    }
    setShowModal(false)
  }

  const inp = (style: React.CSSProperties = {}) => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', ...style
  })

  const pinned = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Notas</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{notes.length} notas</div>
        </div>
        <button onClick={openNew}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          + Nova Nota
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notas..."
          style={{ ...inp({ width: 'auto', flex: 1, minWidth: 160 }) }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inp({ width: 'auto', padding: '8px 12px' })}>
          <option value="all">Todas</option>
          {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 11, width: '100%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 11, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
          {search || filter !== 'all' ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda. Crie a primeira!'}
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📌 Fixadas</div>
              <NoteGrid notes={pinned} onEdit={openEdit} onDelete={n => deleteNote(n.id)} onPin={n => togglePin(n.id)} />
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Outras</div>}
              <NoteGrid notes={unpinned} onEdit={openEdit} onDelete={n => deleteNote(n.id)} onPin={n => togglePin(n.id)} />
            </div>
          )}
        </>
      )}

      {showModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 520, maxWidth: 'calc(100% - 32px)', margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Nota' : 'Nova Nota'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título da nota" style={inp()} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Conteúdo</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Escreva aqui..." rows={8}
                style={{ ...inp(), resize: 'vertical', minHeight: 160, fontFamily: 'inherit', lineHeight: 1.6 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Tag</label>
              <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} style={inp()}>
                {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {editing ? 'Salvar' : 'Criar Nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteGrid({ notes, onEdit, onDelete, onPin }: {
  notes: Note[]
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
  onPin: (n: Note) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {notes.map(n => (
        <div key={n.id} onClick={() => onEdit(n)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{n.title}</span>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={e => { e.stopPropagation(); onPin(n) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: n.pinned ? 1 : .3, padding: 0 }}>📌</button>
              <button onClick={e => { e.stopPropagation(); onDelete(n) }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4, padding: 0 }}>✕</button>
            </div>
          </div>
          {n.content && (
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
              {n.content}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${TAG_COLORS[n.tag] || '#6366f1'}20`, color: TAG_COLORS[n.tag] || '#6366f1', fontWeight: 600 }}>{n.tag}</span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(n.updated_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
