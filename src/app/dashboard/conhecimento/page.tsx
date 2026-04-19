'use client'

import { useState, useEffect, useMemo } from 'react'
import ModalPortal from '@/components/ModalPortal'

type ItemType   = 'book' | 'course' | 'video' | 'podcast' | 'article'
type ItemStatus = 'wishlist' | 'in_progress' | 'completed' | 'paused'

type LearningItem = {
  id: string
  type: ItemType
  title: string
  author: string | null
  platform: string | null
  status: ItemStatus
  progress_pct: number
  total_units: number | null
  current_unit: number | null
  rating: number | null
  notes: string | null
  category: string | null
  started_at: string | null
  completed_at: string | null
  cover_emoji: string
  created_at: string
}

const TYPE_CONFIG: Record<ItemType, { label: string; icon: string; emojis: string[] }> = {
  book:    { label: 'Livro',    icon: '📚', emojis: ['📚','📖','📕','📗','📘','📙','📓','📔'] },
  course:  { label: 'Curso',   icon: '🎓', emojis: ['🎓','💻','🧑‍💻','🎯','🔬','🎨','🧠','🚀'] },
  video:   { label: 'Vídeo',   icon: '🎥', emojis: ['🎥','📺','🎬','▶️','🎞️'] },
  podcast: { label: 'Podcast', icon: '🎙️', emojis: ['🎙️','🎧','🎵','🎤','📻'] },
  article: { label: 'Artigo',  icon: '📄', emojis: ['📄','📰','✍️','📝','🗒️'] },
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  wishlist:    { label: 'Lista',        color: 'var(--text3)',  bg: 'var(--bg3)' },
  in_progress: { label: 'Em andamento', color: 'var(--accent)', bg: 'var(--accent)20' },
  completed:   { label: 'Concluído',    color: '#6bcb77',      bg: '#6bcb7720' },
  paused:      { label: 'Pausado',      color: '#ffd93d',      bg: '#ffd93d20' },
}

const CATEGORIES = [
  'Programação','Design','Tecnologia','Negócios','Marketing',
  'Data Science','AI / Machine Learning','Idiomas','Ciências','Matemática',
  'Filosofia','Psicologia','Ficção','Não-ficção','Auto-ajuda',
  'Biografia','História','Arte','Música','Outros',
]

const PLATFORMS = [
  'Udemy','Coursera','Alura','YouTube','LinkedIn Learning',
  'Pluralsight','edX','Origamid','Rocketseat','DIO',
  'Hotmart','Amazon Kindle','Físico','Outro',
]

const EMPTY_FORM = {
  type: 'book' as ItemType,
  title: '',
  author: '',
  platform: '',
  status: 'wishlist' as ItemStatus,
  progress_pct: 0,
  total_units: '',
  current_unit: '',
  rating: 0,
  notes: '',
  category: '',
  started_at: '',
  completed_at: '',
  cover_emoji: '📚',
}

function inp(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box', ...extra,
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>
      {children}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card (grid view)
// ─────────────────────────────────────────────────────────────────────────────
function ItemCard({ item, onEdit, onDelete }: {
  item: LearningItem
  onEdit: (i: LearningItem) => void
  onDelete: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const sc = STATUS_CONFIG[item.status]
  const tc = TYPE_CONFIG[item.type]

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(item)}
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${hover ? 'var(--accent)40' : 'var(--border)'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'border-color .15s, transform .1s',
        transform: hover ? 'translateY(-1px)' : 'none',
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      {/* Emoji + type badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 38, lineHeight: 1 }}>{item.cover_emoji}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 9, background: sc.bg, color: sc.color, padding: '3px 7px', borderRadius: 10, fontWeight: 700, letterSpacing: .3 }}>
            {sc.label}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)' }}>{tc.icon} {tc.label}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
        {item.title}
      </div>

      {/* Author / Platform */}
      {(item.author || item.platform) && (
        <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {item.author ?? item.platform}
          {item.author && item.platform && ` · ${item.platform}`}
        </div>
      )}

      {/* Category tag */}
      {item.category && (
        <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 8px', borderRadius: 10, alignSelf: 'flex-start' }}>
          {item.category}
        </span>
      )}

      {/* Progress bar */}
      {item.progress_pct > 0 && (
        <div style={{ marginTop: 2 }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${item.progress_pct}%`, background: item.status === 'completed' ? '#6bcb77' : 'var(--accent)', transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{item.progress_pct}%{item.total_units ? ` · ${item.current_unit ?? 0}/${item.total_units}` : ''}</div>
        </div>
      )}

      {/* Rating */}
      {item.rating ? (
        <div style={{ fontSize: 12, marginTop: 'auto' }}>{'⭐'.repeat(item.rating)}</div>
      ) : null}

      {/* Delete button on hover */}
      {hover && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id) }}
          style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--bg4)', color: 'var(--text3)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────────────
function ListView({ items, onEdit, onDelete }: {
  items: LearningItem[]
  onEdit: (i: LearningItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 110px 110px 80px 36px', gap: 8, padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, fontWeight: 600 }}>
        <div />
        <div>Título</div>
        <div>Tipo · Categoria</div>
        <div>Status</div>
        <div>Progresso</div>
        <div>Nota</div>
        <div />
      </div>
      {items.map((item, idx) => {
        const sc = STATUS_CONFIG[item.status]
        const tc = TYPE_CONFIG[item.type]
        return (
          <div
            key={item.id}
            onClick={() => onEdit(item)}
            style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 110px 110px 80px 36px', gap: 8, padding: '12px 16px', borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', alignItems: 'center', transition: 'background .1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ fontSize: 22, textAlign: 'center' }}>{item.cover_emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
              {(item.author || item.platform) && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                  {item.author ?? ''}{item.author && item.platform ? ' · ' : ''}{item.platform ?? ''}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{tc.icon} {tc.label}</div>
              {item.category && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>{item.category}</div>}
            </div>
            <div>
              <span style={{ fontSize: 11, background: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>{sc.label}</span>
            </div>
            <div>
              {item.progress_pct > 0 ? (
                <>
                  <div style={{ background: 'var(--bg3)', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: 2 }}>
                    <div style={{ height: '100%', borderRadius: 3, background: item.status === 'completed' ? '#6bcb77' : 'var(--accent)', width: `${item.progress_pct}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{item.progress_pct}%</div>
                </>
              ) : <span style={{ fontSize: 11, color: 'var(--text3)' }}>–</span>}
            </div>
            <div style={{ fontSize: 12 }}>
              {item.rating ? '⭐'.repeat(item.rating) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>–</span>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ConhecimentoPage() {
  const [items, setItems]           = useState<LearningItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [view, setView]             = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<LearningItem | null>(null)
  const [form, setForm]             = useState({ ...EMPTY_FORM })

  const fetchItems = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/conhecimento')
      const data = await r.json()
      setItems(data.items ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const filtered = useMemo(() => items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!item.title.toLowerCase().includes(q) &&
          !(item.author?.toLowerCase().includes(q)) &&
          !(item.platform?.toLowerCase().includes(q)) &&
          !(item.category?.toLowerCase().includes(q))) return false
    }
    return true
  }), [items, typeFilter, statusFilter, search])

  const inProgress = useMemo(() => items.filter(i => i.status === 'in_progress'), [items])

  const stats = useMemo(() => {
    const year = new Date().getFullYear().toString()
    const completedYear = items.filter(i => i.status === 'completed' && i.completed_at?.startsWith(year)).length
    const rated = items.filter(i => i.rating)
    const avgRating = rated.length ? (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1) : null
    return { total: items.length, inProgress: inProgress.length, completedYear, avgRating }
  }, [items, inProgress])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (item: LearningItem) => {
    setEditing(item)
    setForm({
      type: item.type,
      title: item.title,
      author: item.author ?? '',
      platform: item.platform ?? '',
      status: item.status,
      progress_pct: item.progress_pct,
      total_units: item.total_units?.toString() ?? '',
      current_unit: item.current_unit?.toString() ?? '',
      rating: item.rating ?? 0,
      notes: item.notes ?? '',
      category: item.category ?? '',
      started_at: item.started_at ?? '',
      completed_at: item.completed_at ?? '',
      cover_emoji: item.cover_emoji,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const payload = {
      type: form.type,
      title: form.title.trim(),
      author: form.author.trim() || null,
      platform: form.platform || null,
      status: form.status,
      progress_pct: form.progress_pct,
      total_units: form.total_units ? parseInt(form.total_units) : null,
      current_unit: form.current_unit ? parseInt(form.current_unit) : null,
      rating: form.rating || null,
      notes: form.notes.trim() || null,
      category: form.category || null,
      started_at: form.started_at || null,
      completed_at: form.completed_at || null,
      cover_emoji: form.cover_emoji,
    }
    if (editing) {
      await fetch('/api/conhecimento', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/conhecimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/conhecimento?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleTypeChange = (type: ItemType) => {
    setForm(p => ({ ...p, type, cover_emoji: TYPE_CONFIG[type].emojis[0] }))
  }

  const showSpotlight = inProgress.length > 0 && typeFilter === 'all' && statusFilter === 'all' && !search

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Conhecimento</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {stats.total} itens · {stats.inProgress} em andamento · {stats.completedYear} concluídos em {new Date().getFullYear()}
          </div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          + Adicionar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',                                     val: stats.total,         color: 'var(--accent)' },
          { label: 'Em andamento',                              val: stats.inProgress,    color: '#4d96ff' },
          { label: `Concluídos em ${new Date().getFullYear()}`, val: stats.completedYear, color: '#6bcb77' },
          { label: 'Nota média',                                val: stats.avgRating ? `⭐ ${stats.avgRating}` : '–', color: '#ffd93d' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'var(--font-d)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {([
            ['all',     '🗂️', 'Todos'],
            ['book',    '📚', 'Livros'],
            ['course',  '🎓', 'Cursos'],
            ['video',   '🎥', 'Vídeos'],
            ['podcast', '🎙️', 'Podcasts'],
            ['article', '📄', 'Artigos'],
          ] as const).map(([val, icon, label]) => (
            <button key={val} onClick={() => setTypeFilter(val as any)}
              style={{ padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: typeFilter === val ? 'var(--accent)' : 'transparent',
                color: typeFilter === val ? '#fff' : 'var(--text3)' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={inp({ width: 'auto', padding: '6px 12px', fontSize: 12, cursor: 'pointer' })}>
          <option value="all">Todos os status</option>
          <option value="wishlist">Lista</option>
          <option value="in_progress">Em andamento</option>
          <option value="completed">Concluído</option>
          <option value="paused">Pausado</option>
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar título, autor..."
          style={inp({ width: 190, padding: '6px 12px', fontSize: 12 })} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {([['grid', '⊞'], ['list', '≡']] as const).map(([v, icon]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ width: 32, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 15,
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text3)' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* In-progress spotlight */}
      {showSpotlight && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            📖 Em andamento
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {inProgress.map(item => {
              const daysAgo = item.started_at
                ? Math.floor((Date.now() - new Date(item.started_at).getTime()) / 86400000)
                : null
              return (
                <div key={item.id} onClick={() => openEdit(item)}
                  style={{ flexShrink: 0, width: 220, background: 'var(--bg2)', border: '1px solid var(--accent)40', borderRadius: 14, padding: 16, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 40, lineHeight: 1 }}>{item.cover_emoji}</span>
                    <span style={{ fontSize: 9, background: 'var(--accent)20', color: 'var(--accent)', padding: '3px 7px', borderRadius: 10, fontWeight: 700 }}>
                      {TYPE_CONFIG[item.type].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  {(item.author || item.platform) && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {item.author ?? item.platform}
                    </div>
                  )}
                  <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: 'var(--accent)', width: `${item.progress_pct}%`, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{item.progress_pct}%</span>
                    {daysAgo !== null && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{daysAgo}d atrás</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, height: 200 }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 10, width: '55%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
          {items.length === 0
            ? 'Nenhum item ainda. Adicione um livro, curso ou vídeo!'
            : 'Nenhum item encontrado com os filtros selecionados.'}
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <ListView items={filtered} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 540, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar item' : 'Novo item'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Type */}
            <div style={{ marginBottom: 16 }}>
              <Label>Tipo</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(Object.entries(TYPE_CONFIG) as [ItemType, typeof TYPE_CONFIG[ItemType]][]).map(([type, cfg]) => (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: `2px solid ${form.type === type ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.type === type ? 'var(--accent)20' : 'var(--bg3)', cursor: 'pointer',
                      fontSize: 11, color: form.type === type ? 'var(--accent)' : 'var(--text3)', fontWeight: 600, lineHeight: 1.5 }}>
                    {cfg.icon}<br />{cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji */}
            <div style={{ marginBottom: 16 }}>
              <Label>Ícone</Label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TYPE_CONFIG[form.type].emojis.map(e => (
                  <button key={e} onClick={() => setForm(p => ({ ...p, cover_emoji: e }))}
                    style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${form.cover_emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.cover_emoji === e ? 'var(--accent)20' : 'var(--bg3)', fontSize: 20, cursor: 'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <Label>Título *</Label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Nome do livro, curso, vídeo..." style={inp()} />
            </div>

            {/* Author + Platform */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <Label>Autor / Instrutor</Label>
                <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                  placeholder="Ex: Robert Martin" style={inp()} />
              </div>
              <div>
                <Label>Plataforma</Label>
                <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} style={inp()}>
                  <option value="">– selecionar –</option>
                  {PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                </select>
              </div>
            </div>

            {/* Category + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <Label>Categoria</Label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                  <option value="">– selecionar –</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ItemStatus }))} style={inp()}>
                  <option value="wishlist">Lista (quero ler/ver)</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluído</option>
                  <option value="paused">Pausado</option>
                </select>
              </div>
            </div>

            {/* Progress + Units */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <Label>Progresso %</Label>
                <input type="number" min={0} max={100} value={form.progress_pct}
                  onChange={e => setForm(p => ({ ...p, progress_pct: Math.min(100, parseInt(e.target.value) || 0) }))}
                  style={inp()} />
              </div>
              <div>
                <Label>Total (pág/aulas)</Label>
                <input type="number" min={0} value={form.total_units}
                  onChange={e => setForm(p => ({ ...p, total_units: e.target.value }))}
                  placeholder="ex: 350" style={inp()} />
              </div>
              <div>
                <Label>Atual</Label>
                <input type="number" min={0} value={form.current_unit}
                  onChange={e => {
                    const cur = parseInt(e.target.value) || 0
                    const tot = parseInt(form.total_units) || 0
                    const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : form.progress_pct
                    setForm(p => ({ ...p, current_unit: e.target.value, progress_pct: pct }))
                  }}
                  placeholder="ex: 120" style={inp()} />
              </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: 14 }}>
              <Label>Avaliação</Label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(p => ({ ...p, rating: p.rating === n ? 0 : n }))}
                    style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', opacity: n <= (form.rating || 0) ? 1 : .25, transition: 'opacity .15s', padding: '0 2px' }}>
                    ⭐
                  </button>
                ))}
                {form.rating > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>{form.rating}/5</span>
                )}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <Label>Data de início</Label>
                <input type="date" value={form.started_at} onChange={e => setForm(p => ({ ...p, started_at: e.target.value }))} style={inp()} />
              </div>
              <div>
                <Label>Data de conclusão</Label>
                <input type="date" value={form.completed_at} onChange={e => setForm(p => ({ ...p, completed_at: e.target.value }))} style={inp()} />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <Label>Notas / Aprendizados</Label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Resumo, insights, citações favoritas..."
                rows={3} style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {editing ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
