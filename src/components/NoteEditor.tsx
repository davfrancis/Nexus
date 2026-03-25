'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Note, Folder } from '@/types/database'

const TAGS = ['general', 'work', 'personal', 'study', 'idea']

type SaveStatus = 'idle' | 'saving' | 'saved'

// Preset text colors
const TEXT_COLORS = [
  { label: 'Padrão', value: '' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Amarelo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Roxo', value: '#a855f7' },
  { label: 'Rosa', value: '#ec4899' },
]

// Preset highlight colors
const HIGHLIGHT_COLORS = [
  { label: 'Nenhum', value: '' },
  { label: 'Amarelo', value: '#fef08a' },
  { label: 'Verde', value: '#bbf7d0' },
  { label: 'Azul', value: '#bfdbfe' },
  { label: 'Roxo', value: '#e9d5ff' },
  { label: 'Rosa', value: '#fecaca' },
  { label: 'Laranja', value: '#fed7aa' },
]

export interface NoteEditorProps {
  note: Note
  folders: Folder[]
  onSave: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tag' | 'folder_id'>>) => Promise<Note | null>
  onDelete: (id: string) => void
  onBack: () => void
}

function buildFolderOptions(folders: Folder[], parentId: string | null, depth: number): React.ReactNode[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .flatMap(f => [
      <option key={f.id} value={f.id}>{'\u00a0'.repeat(depth * 3)}{f.icon} {f.name}</option>,
      ...buildFolderOptions(folders, f.id, depth + 1),
    ])
}

export default function NoteEditor({ note, folders, onSave, onDelete, onBack }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [tag, setTag] = useState(note.tag)
  const [folderId, setFolderId] = useState<string | null>(note.folder_id ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [openPicker, setOpenPicker] = useState<'color' | 'highlight' | null>(null)

  const titleRef = useRef(title)
  const tagRef = useRef(tag)
  const folderIdRef = useRef(folderId)
  useEffect(() => { titleRef.current = title }, [title])
  useEffect(() => { tagRef.current = tag }, [tag])
  useEffect(() => { folderIdRef.current = folderId }, [folderId])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Comece a escrever...' }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
    ],
    content: note.content || '',
    immediatelyRender: false,
  })

  const editorRef = useRef(editor)
  useEffect(() => { editorRef.current = editor }, [editor])

  const doSave = useCallback(async () => {
    await onSave(note.id, {
      title: titleRef.current,
      tag: tagRef.current,
      folder_id: folderIdRef.current,
      content: editorRef.current?.getHTML() ?? null,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2500)
  }, [note.id, onSave])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(doSave, 1200)
  }, [doSave])

  useEffect(() => {
    if (!editor) return
    editor.on('update', scheduleSave)
    return () => { editor.off('update', scheduleSave) }
  }, [editor, scheduleSave])

  // Close color pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.color-picker-wrap')) {
        setOpenPicker(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleTitleChange = (v: string) => { setTitle(v); scheduleSave() }
  const handleTagChange = (v: string) => { setTag(v); scheduleSave() }
  const handleFolderChange = (v: string) => { setFolderId(v || null); scheduleSave() }

  const insertLink = () => {
    const prev = editor?.getAttributes('link').href || ''
    const url = window.prompt('URL do link:', prev)
    if (url === null) return
    if (!url) { editor?.chain().focus().unsetLink().run(); return }
    editor?.chain().focus().setLink({ href: url }).run()
  }

  const sel = (style: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '5px 10px', color: 'var(--text)',
    fontSize: 12, outline: 'none', cursor: 'pointer', ...style,
  })

  const currentColor = editor?.getAttributes('textStyle').color || ''
  const currentHighlight = editor?.getAttributes('highlight').color || ''

  return (
    <>
      <style>{`
        .nexus-editor { outline: none; min-height: 50vh; font-size: 15px; line-height: 1.8; color: var(--text); caret-color: var(--accent2); }
        .nexus-editor > * + * { margin-top: 0.4em; }
        .nexus-editor p { margin: 0; min-height: 1.8em; }
        .nexus-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text3); pointer-events: none; float: left; height: 0; }
        .nexus-editor h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.3em; font-family: var(--font-d); line-height: 1.2; }
        .nexus-editor h2 { font-size: 1.45em; font-weight: 700; margin: 0.9em 0 0.25em; font-family: var(--font-d); line-height: 1.3; }
        .nexus-editor h3 { font-size: 1.15em; font-weight: 600; margin: 0.75em 0 0.2em; font-family: var(--font-d); }
        .nexus-editor ul, .nexus-editor ol { padding-left: 1.6em; margin: 0.2em 0 0.4em; }
        .nexus-editor li { margin: 0.15em 0; }
        .nexus-editor li p { margin: 0; }
        .nexus-editor strong { font-weight: 700; }
        .nexus-editor em { font-style: italic; }
        .nexus-editor u { text-decoration: underline; }
        .nexus-editor s { text-decoration: line-through; }
        .nexus-editor code { background: var(--bg4); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 0.85em; font-family: 'Courier New', monospace; color: var(--accent2); }
        .nexus-editor pre { background: var(--bg4); border: 1px solid var(--border); border-radius: 8px; padding: 14px 18px; margin: 0.6em 0; overflow-x: auto; }
        .nexus-editor pre code { background: none; border: none; padding: 0; font-size: 13px; color: var(--text); font-family: 'Courier New', monospace; }
        .nexus-editor a { color: var(--accent2); text-decoration: underline; cursor: pointer; }
        .nexus-editor blockquote { border-left: 3px solid var(--accent); padding-left: 1em; color: var(--text3); margin: 0.5em 0; font-style: italic; }
        .nexus-editor hr { border: none; border-top: 1px solid var(--border); margin: 1.2em 0; }
        /* Task list */
        .nexus-editor ul[data-type="taskList"] { list-style: none; padding-left: 0.25em; }
        .nexus-editor li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; margin: 0.25em 0; }
        .nexus-editor li[data-type="taskItem"] > label { flex-shrink: 0; margin-top: 3px; cursor: pointer; }
        .nexus-editor li[data-type="taskItem"] > label input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent2); cursor: pointer; }
        .nexus-editor li[data-type="taskItem"] > div { flex: 1; }
        .nexus-editor li[data-type="taskItem"][data-checked="true"] > div { text-decoration: line-through; opacity: 0.55; }
        /* Alignment */
        .nexus-editor .is-editor-focused { outline: none; }
        .ProseMirror-focused { outline: none; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg2)', flexWrap: 'wrap', flexShrink: 0,
        }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 6, transition: 'color .15s', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
          >← Voltar</button>

          <input value={title} onChange={e => handleTitleChange(e.target.value)}
            placeholder="Título da nota"
            style={{ flex: 1, minWidth: 120, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 15, fontWeight: 700, outline: 'none', fontFamily: 'var(--font-d)' }}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <select value={folderId || ''} onChange={e => handleFolderChange(e.target.value)} style={sel()}>
              <option value="">📥 Sem pasta</option>
              {buildFolderOptions(folders, null, 0)}
            </select>
            <select value={tag} onChange={e => handleTagChange(e.target.value)} style={sel()}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{
              fontSize: 11, minWidth: 64, textAlign: 'right', transition: 'color .2s',
              color: saveStatus === 'saving' ? 'var(--text3)' : saveStatus === 'saved' ? '#3ECFA0' : 'transparent',
            }}>
              {saveStatus === 'saving' ? '● Salvando' : '✓ Salvo'}
            </span>
            <button onClick={() => { if (window.confirm('Excluir esta nota?')) { onDelete(note.id); onBack() } }}
              title="Excluir nota"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 6, transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
            >🗑</button>
          </div>
        </div>

        {/* ── Format toolbar ────────────────────────────────────── */}
        {editor && (
          <div style={{
            padding: '5px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 2, alignItems: 'center',
            background: 'var(--bg2)', flexWrap: 'wrap', flexShrink: 0,
          }}>
            {/* Text style */}
            <TB active={editor.isActive('bold')} title="Negrito (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></TB>
            <TB active={editor.isActive('italic')} title="Itálico (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></TB>
            <TB active={editor.isActive('underline')} title="Sublinhado (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></TB>
            <TB active={editor.isActive('strike')} title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></TB>

            <Sep />

            {/* Color & Highlight */}
            <div className="color-picker-wrap" style={{ position: 'relative' }}>
              <button
                title="Cor do texto"
                onMouseDown={e => { e.preventDefault(); setOpenPicker(openPicker === 'color' ? null : 'color') }}
                style={{
                  background: 'transparent', border: '1px solid transparent', borderRadius: 5,
                  cursor: 'pointer', padding: '4px 7px', fontSize: 12, color: 'var(--text2)',
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transition: 'all .1s', lineHeight: 1,
                }}
              >
                <span style={{ fontWeight: 700, color: currentColor || 'var(--text)' }}>A</span>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: currentColor || 'var(--text3)' }} />
              </button>
              {openPicker === 'color' && (
                <ColorSwatchPicker
                  colors={TEXT_COLORS}
                  onSelect={v => {
                    if (!v) editor.chain().focus().unsetColor().run()
                    else editor.chain().focus().setColor(v).run()
                    setOpenPicker(null)
                  }}
                />
              )}
            </div>

            <div className="color-picker-wrap" style={{ position: 'relative' }}>
              <button
                title="Destaque (highlight)"
                onMouseDown={e => { e.preventDefault(); setOpenPicker(openPicker === 'highlight' ? null : 'highlight') }}
                style={{
                  background: currentHighlight || 'transparent',
                  border: '1px solid transparent', borderRadius: 5,
                  cursor: 'pointer', padding: '4px 7px', fontSize: 12,
                  color: currentHighlight ? '#1a1a2e' : 'var(--text2)',
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transition: 'all .1s', lineHeight: 1,
                }}
              >
                <span style={{ fontWeight: 700 }}>▌</span>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: currentHighlight || '#fef08a' }} />
              </button>
              {openPicker === 'highlight' && (
                <ColorSwatchPicker
                  colors={HIGHLIGHT_COLORS}
                  onSelect={v => {
                    if (!v) editor.chain().focus().unsetHighlight().run()
                    else editor.chain().focus().setHighlight({ color: v }).run()
                    setOpenPicker(null)
                  }}
                  isHighlight
                />
              )}
            </div>

            <Sep />

            {/* Headings */}
            <TB active={editor.isActive('heading', { level: 1 })} title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</TB>
            <TB active={editor.isActive('heading', { level: 2 })} title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</TB>
            <TB active={editor.isActive('heading', { level: 3 })} title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</TB>

            <Sep />

            {/* Lists */}
            <TB active={editor.isActive('bulletList')} title="Lista com marcador" onClick={() => editor.chain().focus().toggleBulletList().run()}>• Lista</TB>
            <TB active={editor.isActive('orderedList')} title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Lista</TB>
            <TB active={editor.isActive('taskList')} title="Lista de tarefas (checkboxes)" onClick={() => editor.chain().focus().toggleTaskList().run()}>☑ Check</TB>

            <Sep />

            {/* Alignment */}
            <TB active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()}>⬤◻◻</TB>
            <TB active={editor.isActive({ textAlign: 'center' })} title="Centralizar" onClick={() => editor.chain().focus().setTextAlign('center').run()}>◻⬤◻</TB>
            <TB active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita" onClick={() => editor.chain().focus().setTextAlign('right').run()}>◻◻⬤</TB>
            <TB active={editor.isActive({ textAlign: 'justify' })} title="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>⬛</TB>

            <Sep />

            {/* Extra */}
            <TB active={editor.isActive('code')} title="Código inline" onClick={() => editor.chain().focus().toggleCode().run()}>{`<>`}</TB>
            <TB active={editor.isActive('codeBlock')} title="Bloco de código" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{`{ }`}</TB>
            <TB active={editor.isActive('blockquote')} title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</TB>
            <TB active={editor.isActive('link')} title="Inserir link" onClick={insertLink}>🔗</TB>

            <Sep />

            <TB active={false} title="Desfazer (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>↩</TB>
            <TB active={false} title="Refazer (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>↪</TB>
          </div>
        )}

        {/* ── Editor content ────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '36px 48px' }} onClick={() => editor?.chain().focus().run()}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <EditorContent editor={editor} />
          </div>
        </div>

      </div>
    </>
  )
}

// ── Color swatch picker popover ───────────────────────────────────
function ColorSwatchPicker({ colors, onSelect, isHighlight }: {
  colors: { label: string; value: string }[]
  onSelect: (v: string) => void
  isHighlight?: boolean
}) {
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 300,
      background: 'var(--bg4)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: 10, marginTop: 4,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,.45)',
      minWidth: 160,
    }}>
      {colors.map(c => (
        <button
          key={c.value}
          title={c.label}
          onMouseDown={e => { e.preventDefault(); onSelect(c.value) }}
          style={{
            width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
            border: '2px solid rgba(255,255,255,.12)',
            background: c.value || (isHighlight ? 'transparent' : 'var(--text)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, transition: 'transform .1s, border-color .1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.12)' }}
        >
          {!c.value && <span style={{ fontSize: 14, color: 'var(--text3)' }}>✕</span>}
        </button>
      ))}
    </div>
  )
}

// ── Toolbar button ────────────────────────────────────────────────
function TB({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        background: active ? 'rgba(124,111,212,.18)' : 'transparent',
        border: active ? '1px solid rgba(124,111,212,.3)' : '1px solid transparent',
        borderRadius: 5, color: active ? 'var(--accent2)' : 'var(--text2)',
        cursor: 'pointer', padding: '4px 8px', fontSize: 12,
        fontWeight: active ? 700 : 400, minWidth: 28,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .1s', lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

// ── Separator ─────────────────────────────────────────────────────
function Sep() {
  return <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px' }} />
}
