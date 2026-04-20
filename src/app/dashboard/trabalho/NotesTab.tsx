'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

type Note = {
  id: string; title: string; content: any; category: string | null
  tags: string | null; color: string | null; pinned: boolean
  is_template: boolean; template_schedule: string | null
  last_applied_at: string | null; created_at: string; updated_at: string
}

const CAT_OPTS = ['geral','reuniao','daily','projeto','pessoal']
const CAT_LABELS: Record<string,string> = { geral:'Geral', reuniao:'Reunião', daily:'Daily', projeto:'Projeto', pessoal:'Pessoal' }
const NOTE_COLORS: Record<string,string> = {
  default:'var(--accent)', blue:'#4d96ff', green:'#6bcb77',
  yellow:'#ffd93d', red:'#ff6b6b', purple:'#b48fff'
}
const SCHED_LABELS: Record<string,string> = { none:'Manual', daily:'Diário', weekly:'Semanal', monthly:'Mensal' }

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button key={label} onClick={onClick} title={label}
      style={{ padding: '4px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        background: active ? 'var(--accent)' : 'var(--bg3)', color: active ? '#fff' : 'var(--text2)' }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'U')}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'S')}
      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
      {btn(editor.isActive('heading',{level:1}), () => editor.chain().focus().toggleHeading({level:1}).run(), 'H1')}
      {btn(editor.isActive('heading',{level:2}), () => editor.chain().focus().toggleHeading({level:2}).run(), 'H2')}
      {btn(editor.isActive('heading',{level:3}), () => editor.chain().focus().toggleHeading({level:3}).run(), 'H3')}
      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '•')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.')}
      {btn(editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run(), '☑')}
      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '❝')}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), '</>')}
      {btn(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), '✦')}
      <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
      {btn(false, () => editor.chain().focus().setTextAlign('left').run(), '⬛')}
      {btn(false, () => editor.chain().focus().setTextAlign('center').run(), '▣')}
      {btn(false, () => editor.chain().focus().undo().run(), '↩')}
      {btn(false, () => editor.chain().focus().redo().run(), '↪')}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotesTab() {
  const [notes, setNotes]           = useState<Note[]>([])
  const [templates, setTemplates]   = useState<Note[]>([])
  const [active, setActive]         = useState<Note | null>(null)
  const [search, setSearch]         = useState('')
  const [catFilter, setCat]         = useState('all')
  const [showTemplates, setShowTpl] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [editTitle, setEditTitle]   = useState('')
  const [tagInput, setTagInput]     = useState('')
  const [loading, setLoading]       = useState(true)
  const saveRef = useRef<ReturnType<typeof setTimeout>>()
  const processedTplRef = useRef(false)
  const activeRef = useRef<Note | null>(null)

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Comece a escrever sua nota...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
  })

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const currentActive = activeRef.current
      if (!currentActive) return
      clearTimeout(saveRef.current)
      setSaving(true)
      
      const json = editor.getJSON()
      
      saveRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/notes/${currentActive.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: json }),
          })
          if (!res.ok) {
            console.error('Save failed:', await res.text())
          } else {
            // Atualiza o estado local para garantir que a cópia em memória também tem o novo conteúdo
            setNotes(p => p.map(n => n.id === currentActive.id ? { ...n, content: json } : n))
            setTemplates(p => p.map(n => n.id === currentActive.id ? { ...n, content: json } : n))
          }
        } catch (err) {
          console.error(err)
        } finally {
          setSaving(false)
        }
      }, 1000) // Reduzi de 1.5s para 1s pra salvar mais rápido
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  // ── Fetch notes ────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const [nr, tr] = await Promise.all([
      fetch('/api/notes').then(r => r.json()),
      fetch('/api/notes?templates=true').then(r => r.json()),
    ])
    setNotes(nr.notes || [])
    setTemplates(tr.notes || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // ── Apply daily/weekly templates on mount ─────────────────────────────────
  useEffect(() => {
    if (!templates.length || processedTplRef.current) return
    processedTplRef.current = true // Garante que só roda 1x por sessão para evitar loop infinito

    const processTemplates = async () => {
      const today = new Date().toISOString().split('T')[0]
      const dow   = new Date().getDay() // 1 = Monday
      let appliedAny = false

      for (const tpl of templates) {
        const sched = tpl.template_schedule
        if (!sched || sched === 'none') continue
        if (tpl.last_applied_at === today) continue
        if (sched === 'weekly' && dow !== 1) continue
        if (sched === 'monthly' && new Date().getDate() !== 1) continue

        appliedAny = true
        // Criar cópia a partir do template
        const dateLabel = new Date().toLocaleDateString('pt-BR')
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${tpl.title} — ${dateLabel}`,
            content: tpl.content,
            category: tpl.category,
            tags: tpl.tags,
            color: tpl.color,
          }),
        })
        // Marcar template como aplicado hoje
        await fetch(`/api/notes/${tpl.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_applied_at: today }),
        })
      }

      if (appliedAny) {
        fetchNotes()
      }
    }

    processTemplates()
  }, [templates, fetchNotes])

  // ── Select note ────────────────────────────────────────────────────────────
  const selectNote = (note: Note) => {
    setActive(note)
    activeRef.current = note
    setEditTitle(note.title)
    setTagInput(note.tags || '')
    editor?.commands.setContent(note.content || '')
  }

  const saveTitle = async () => {
    if (!active || editTitle === active.title) return
    await fetch(`/api/notes/${active.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle }),
    })
    setNotes(p => p.map(n => n.id === active.id ? { ...n, title: editTitle } : n))
    setTemplates(p => p.map(n => n.id === active.id ? { ...n, title: editTitle } : n))
    setActive(p => p ? { ...p, title: editTitle } : p)
    activeRef.current = activeRef.current ? { ...activeRef.current, title: editTitle } : null
  }

  const saveTags = async () => {
    if (!active) return
    await fetch(`/api/notes/${active.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagInput }),
    })
    setNotes(p => p.map(n => n.id === active.id ? { ...n, tags: tagInput } : n))
    setActive(p => p ? { ...p, tags: tagInput } : p)
  }

  const newNote = async (fromTemplate?: Note) => {
    const today = new Date().toLocaleDateString('pt-BR')
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fromTemplate ? `${fromTemplate.title} — ${today}` : 'Nova nota',
        content: fromTemplate?.content || null,
        category: fromTemplate?.category || 'geral',
      }),
    })
    const { note } = await res.json()
    if (note) { setNotes(p => [note, ...p]); selectNote(note) }
  }

  const togglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation()
    const pinned = !note.pinned
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    setNotes(p => p.map(n => n.id === note.id ? { ...n, pinned } : n).sort((a,b) => Number(b.pinned) - Number(a.pinned)))
  }

  const deleteNote = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Excluir "${note.title}"?`)) return
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    setNotes(p => p.filter(n => n.id !== note.id))
    setTemplates(p => p.filter(n => n.id !== note.id))
    if (active?.id === note.id) {
      setActive(null)
      activeRef.current = null
      editor?.commands.setContent('')
    }
  }

  const updateProp = async (key: string, val: any) => {
    if (!active) return
    await fetch(`/api/notes/${active.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: val }),
    })
    setNotes(p => p.map(n => n.id === active.id ? { ...n, [key]: val } : n))
    setTemplates(p => p.map(n => n.id === active.id ? { ...n, [key]: val } : n))
    setActive(p => p ? { ...p, [key]: val } : p)
    activeRef.current = activeRef.current ? { ...activeRef.current, [key]: val } : null
  }

  const filtered = notes.filter(n => {
    if (catFilter !== 'all' && n.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return n.title.toLowerCase().includes(q) || (n.tags || '').toLowerCase().includes(q)
    }
    return true
  })

  const accent = NOTE_COLORS[active?.color || 'default']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* ── Sidebar ── */}
      <div style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={() => newNote()}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              + Nova nota
            </button>
            <button onClick={() => setShowTpl(p => !p)}
              title="Templates"
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: showTemplates ? 'var(--accent)20' : 'transparent', color: showTemplates ? 'var(--accent)' : 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
              📋
            </button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          <select value={catFilter} onChange={e => setCat(e.target.value)}
            style={{ width: '100%', marginTop: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', color: 'var(--text)', fontSize: 11, outline: 'none' }}>
            <option value="all">Todas as categorias</option>
            {CAT_OPTS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {loading ? (
            <div style={{ padding: 20, color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>Carregando...</div>
          ) : (showTemplates ? templates : filtered).length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
              {showTemplates ? 'Nenhum template ainda.' : 'Nenhuma nota encontrada.'}
            </div>
          ) : (showTemplates ? templates : filtered).map(note => (
            <div key={note.id} onClick={() => selectNote(note)}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderLeft: `3px solid ${NOTE_COLORS[note.color || 'default']}`,
                background: active?.id === note.id ? 'var(--bg3)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'var(--bg3)40' }}
              onMouseLeave={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {note.pinned && <span style={{ marginRight: 4, fontSize: 10 }}>📌</span>}
                  {note.title}
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={e => togglePin(note, e)} title={note.pinned ? 'Desafixar' : 'Fixar'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: note.pinned ? 'var(--accent)' : 'var(--text3)', padding: '0 2px', opacity: .7 }}>
                    {note.pinned ? '📌' : '📍'}
                  </button>
                  <button onClick={e => deleteNote(note, e)} title="Excluir"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text3)', padding: '0 2px', opacity: .5 }}>✕</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
                {note.category && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: 'var(--accent)15', color: 'var(--accent)' }}>{CAT_LABELS[note.category] || note.category}</span>}
                {note.template_schedule && note.template_schedule !== 'none' && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: '#ffd93d15', color: '#ffd93d' }}>⏰ {SCHED_LABELS[note.template_schedule]}</span>
                )}
                <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                  {new Date(note.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {note.tags && (
                <div style={{ marginTop: 3, fontSize: 9, color: 'var(--text3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  🏷 {note.tags}
                </div>
              )}
              {/* Usar template para criar nova nota */}
              {showTemplates && (
                <button onClick={e => { e.stopPropagation(); newNote(note) }}
                  style={{ marginTop: 6, width: '100%', padding: '4px', borderRadius: 6, border: '1px solid var(--accent)30', background: 'var(--accent)10', color: 'var(--accent)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                  + Criar nota a partir deste template
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Editor ── */}
      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 28, borderRadius: 3, background: accent, flexShrink: 0 }} />
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                style={{ flex: 1, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-d)', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)' }}
              />
              {saving && <span style={{ fontSize: 10, color: 'var(--text3)' }}>salvando...</span>}
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Category */}
              <select value={active.category || 'geral'} onChange={e => updateProp('category', e.target.value)}
                style={{ fontSize: 11, padding: '3px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                {CAT_OPTS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>

              {/* Color dots */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.entries(NOTE_COLORS).map(([k, v]) => (
                  <button key={k} title={k} onClick={() => updateProp('color', k)}
                    style={{ width: 14, height: 14, borderRadius: '50%', background: v, border: active.color === k ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>

              {/* Template toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={active.is_template} onChange={e => updateProp('is_template', e.target.checked)} />
                Template
              </label>

              {/* Schedule (se template) */}
              {active.is_template && (
                <select value={active.template_schedule || 'none'} onChange={e => updateProp('template_schedule', e.target.value)}
                  style={{ fontSize: 11, padding: '3px 7px', borderRadius: 7, border: '1px solid #ffd93d40', background: '#ffd93d10', color: '#ffd93d', outline: 'none', cursor: 'pointer' }}>
                  {Object.entries(SCHED_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )}

              {/* Tags */}
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onBlur={saveTags}
                placeholder="🏷 tags (separadas por vírgula)"
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', outline: 'none', minWidth: 160 }} />
            </div>
          </div>

          {/* TipTap toolbar */}
          <Toolbar editor={editor} />

          {/* Editor area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
            <style>{`
              .ProseMirror { outline: none; min-height: 300px; font-size: 14px; line-height: 1.8; color: var(--text); }
              .ProseMirror h1 { font-size: 24px; font-weight: 700; margin: 20px 0 10px; }
              .ProseMirror h2 { font-size: 19px; font-weight: 600; margin: 16px 0 8px; }
              .ProseMirror h3 { font-size: 15px; font-weight: 600; margin: 12px 0 6px; }
              .ProseMirror p { margin: 6px 0; }
              .ProseMirror ul, .ProseMirror ol { padding-left: 22px; margin: 6px 0; }
              .ProseMirror blockquote { border-left: 3px solid var(--accent); padding-left: 14px; color: var(--text3); margin: 10px 0; }
              .ProseMirror pre { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 12px; margin: 10px 0; }
              .ProseMirror code { background: var(--bg3); padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: monospace; }
              .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
              .ProseMirror ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
              .ProseMirror ul[data-type="taskList"] li input { margin-top: 4px; cursor: pointer; }
              .ProseMirror mark { background: #ffd93d40; border-radius: 3px; padding: 0 2px; }
              .ProseMirror a { color: var(--accent); text-decoration: underline; }
              .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text3); pointer-events: none; float: left; height: 0; }
            `}</style>
            <EditorContent editor={editor} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text3)' }}>
          <div style={{ fontSize: 48 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione ou crie uma nota</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Use templates com agendamento para criar notas automaticamente</div>
          <button onClick={() => newNote()}
            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            + Nova nota
          </button>
        </div>
      )}
    </div>
  )
}
