'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotes } from '@/hooks/useNotes'
import { useFolders } from '@/hooks/useFolders'
import ModalPortal from '@/components/ModalPortal'
import type { Note, Folder } from '@/types/database'

// ── Tags ─────────────────────────────────────────────────────────
const TAGS = ['general', 'work', 'personal', 'study', 'idea']
const TAG_COLORS: Record<string, string> = {
  general: '#6366f1', work: '#4A9EE8', personal: '#E878B8', study: '#F0A03C', idea: '#3ECFA0',
}

// ── Folder icon presets ───────────────────────────────────────────
const FOLDER_ICONS = ['📁', '📓', '📚', '💼', '🏠', '⭐', '🔬', '💡', '🎯', '🧩', '🛠️', '❤️']
const FOLDER_COLORS = ['#6366f1', '#4A9EE8', '#E878B8', '#F0A03C', '#3ECFA0', '#ef4444', '#f97316', '#84cc16']

// ── Empty form ────────────────────────────────────────────────────
const EMPTY_FORM = { title: '', content: '', tag: 'general', folder_id: null as string | null }

// ── View types ────────────────────────────────────────────────────
type ViewState = 'all' | 'none' | string // string = folder id

// ─────────────────────────────────────────────────────────────────
export default function NotasPage() {
  const { notes, loading: notesLoading, addNote, updateNote, deleteNote, togglePin } = useNotes()
  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder } = useFolders()

  // Navigation
  const [view, setView] = useState<ViewState>('all')

  // Note modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // Search
  const [search, setSearch] = useState('')

  // Folder creation
  const [creatingUnder, setCreatingUnder] = useState<string | null | 'root'>( null) // null=closed, 'root'=root, folderId=child
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderIcon, setNewFolderIcon] = useState('📁')
  const [newFolderColor, setNewFolderColor] = useState('#6366f1')

  // Folder rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingName, setRenamingName] = useState('')

  // Delete confirm
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)

  // Hover menu
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Expanded folders in tree
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // ── Derived data ──────────────────────────────────────────────
  const filteredNotes = notes.filter(note => {
    if (view === 'all') { /* no folder filter */ }
    else if (view === 'none') { if (note.folder_id) return false }
    else { if (note.folder_id !== view) return false }

    if (search) {
      const q = search.toLowerCase()
      if (!note.title.toLowerCase().includes(q) && !(note.content || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const pinned = filteredNotes.filter(n => n.pinned)
  const unpinned = filteredNotes.filter(n => !n.pinned)

  const noteCountInFolder = (folderId: string) => notes.filter(n => n.folder_id === folderId).length
  const noteCountUnfoldered = notes.filter(n => !n.folder_id).length

  // Current view label
  const viewLabel = view === 'all' ? 'Segundo Cérebro'
    : view === 'none' ? 'Sem pasta'
    : folders.find(f => f.id === view)?.name || 'Notas'

  // ── Handlers ─────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, folder_id: view !== 'all' && view !== 'none' ? view : null })
    setShowModal(true)
  }

  const openEdit = (n: Note) => {
    setEditing(n)
    setForm({ title: n.title, content: n.content || '', tag: n.tag, folder_id: n.folder_id ?? null })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    if (editing) {
      await updateNote(editing.id, {
        title: form.title,
        content: form.content || null,
        tag: form.tag,
        folder_id: form.folder_id,
      })
    } else {
      await addNote({
        title: form.title,
        content: form.content || undefined,
        tag: form.tag,
        folder_id: form.folder_id,
      })
    }
    setShowModal(false)
  }

  const handleCreateFolder = async (parentId: string | null) => {
    if (!newFolderName.trim()) { setCreatingUnder(null); return }
    await createFolder({ name: newFolderName.trim(), parent_id: parentId, icon: newFolderIcon, color: newFolderColor })
    setNewFolderName('')
    setNewFolderIcon('📁')
    setNewFolderColor('#6366f1')
    setCreatingUnder(null)
    if (parentId) setExpanded(prev => new Set([...prev, parentId]))
  }

  const handleRenameConfirm = async () => {
    if (!renamingId || !renamingName.trim()) { setRenamingId(null); return }
    await renameFolder(renamingId, renamingName.trim())
    setRenamingId(null)
  }

  const handleDeleteFolder = async (id: string) => {
    if (view === id) setView('all')
    await deleteFolder(id)
    setDeletingFolderId(null)
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // ── Styles ────────────────────────────────────────────────────
  const inp = (style: React.CSSProperties = {}): React.CSSProperties => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13,
    outline: 'none', ...style,
  })

  // ── Build folder tree ─────────────────────────────────────────
  const rootFolders = folders.filter(f => !f.parent_id)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left Panel: Folder Tree ────────────────────────────── */}
      <div style={{
        width: 230, flexShrink: 0, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            🧠 Segundo Cérebro
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {/* All notes */}
          <TreeItem
            icon="🗂️" label="Todas as notas" count={notes.length}
            active={view === 'all'} onClick={() => setView('all')}
          />
          {/* Unfoldered */}
          <TreeItem
            icon="📥" label="Sem pasta" count={noteCountUnfoldered}
            active={view === 'none'} onClick={() => setView('none')}
          />

          {/* Divider */}
          {folders.length > 0 && (
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
          )}

          {/* Folder tree */}
          {foldersLoading ? null : rootFolders.map(f => (
            <FolderTreeItem
              key={f.id}
              folder={f}
              allFolders={folders}
              depth={0}
              activeId={view}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onSelect={setView}
              noteCount={noteCountInFolder}
              hoveredId={hoveredFolder}
              setHoveredId={setHoveredFolder}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              renamingId={renamingId}
              renamingName={renamingName}
              setRenamingName={setRenamingName}
              onRenameStart={(id, name) => { setRenamingId(id); setRenamingName(name) }}
              onRenameConfirm={handleRenameConfirm}
              onDeleteRequest={setDeletingFolderId}
              onNewSubfolder={(parentId) => { setCreatingUnder(parentId); setNewFolderName('') }}
              creatingUnder={creatingUnder}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              newFolderIcon={newFolderIcon}
              setNewFolderIcon={setNewFolderIcon}
              newFolderColor={newFolderColor}
              setNewFolderColor={setNewFolderColor}
              onCreateFolder={handleCreateFolder}
            />
          ))}

          {/* Create root folder input */}
          {creatingUnder === 'root' && (
            <FolderCreateInput
              name={newFolderName}
              icon={newFolderIcon}
              color={newFolderColor}
              depth={0}
              setName={setNewFolderName}
              setIcon={setNewFolderIcon}
              setColor={setNewFolderColor}
              onConfirm={() => handleCreateFolder(null)}
              onCancel={() => setCreatingUnder(null)}
            />
          )}
        </div>

        {/* Footer: Nova Pasta button */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { setCreatingUnder('root'); setNewFolderName('') }}
            style={{
              width: '100%', background: 'transparent', border: '1px dashed var(--border2)',
              borderRadius: 7, color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
              padding: '7px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
          >
            + Nova Pasta
          </button>
        </div>
      </div>

      {/* ── Right Panel: Notes ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }} className="page-enter">
        <div style={{ padding: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 700, letterSpacing: -.5 }}>
                {view !== 'all' && view !== 'none' && folders.find(f => f.id === view)
                  ? `${folders.find(f => f.id === view)!.icon} ${viewLabel}`
                  : viewLabel}
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar notas..."
                style={inp({ width: 200, flex: 'none' })}
              />
              <button onClick={openNew}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                + Nova Nota
              </button>
            </div>
          </div>

          {/* Notes grid */}
          {notesLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 11, width: '100%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '80%' }} />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 13 }}>
              {search ? 'Nenhuma nota encontrada.' : view === 'none' ? 'Nenhuma nota sem pasta.' : 'Esta pasta está vazia. Crie a primeira nota!'}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📌 Fixadas</div>
                  <NoteGrid notes={pinned} folders={folders} onEdit={openEdit} onDelete={n => deleteNote(n.id)} onPin={n => togglePin(n.id)} />
                </div>
              )}
              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Outras</div>
                  )}
                  <NoteGrid notes={unpinned} folders={folders} onEdit={openEdit} onDelete={n => deleteNote(n.id)} onPin={n => togglePin(n.id)} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Note Modal ─────────────────────────────────────────── */}
      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 14, padding: 28, width: 560, maxWidth: 'calc(100% - 32px)', margin: '40px auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>
                {editing ? 'Editar Nota' : 'Nova Nota'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Título *</label>
              <input
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Título da nota"
                style={inp()}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Conteúdo</label>
              <textarea
                value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Escreva aqui..." rows={10}
                style={{ ...inp(), resize: 'vertical', minHeight: 200, fontFamily: 'inherit', lineHeight: 1.7 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={labelStyle}>Pasta</label>
                <select value={form.folder_id || ''} onChange={e => setForm(p => ({ ...p, folder_id: e.target.value || null }))} style={inp()}>
                  <option value="">Sem pasta</option>
                  {buildFolderOptions(folders, null, 0)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={labelStyle}>Tag</label>
                <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} style={inp()}>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {editing ? 'Salvar' : 'Criar Nota'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── Delete Folder Confirm ─────────────────────────────── */}
      {deletingFolderId && (
        <ModalPortal onClose={() => setDeletingFolderId(null)}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 14, padding: 28, width: 380, maxWidth: 'calc(100% - 32px)', margin: '40px auto',
          }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Excluir pasta?</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              As notas dentro desta pasta não serão apagadas — elas vão para "Sem pasta". Subpastas também serão excluídas.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingFolderId(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDeleteFolder(deletingFolderId)}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                Excluir
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ── Shared label style ────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text3)', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block',
}

// ── Build <option> list with indentation ─────────────────────────
function buildFolderOptions(folders: Folder[], parentId: string | null, depth: number): React.ReactNode[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .flatMap(f => [
      <option key={f.id} value={f.id}>{'\u00a0'.repeat(depth * 3)}{f.icon} {f.name}</option>,
      ...buildFolderOptions(folders, f.id, depth + 1),
    ])
}

// ── Simple tree item (for "Todas" and "Sem pasta") ────────────────
function TreeItem({ icon, label, count, active, onClick }: {
  icon: string; label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 14px', cursor: 'pointer', borderRadius: 6,
        margin: '1px 8px',
        background: active ? 'rgba(124,111,212,.15)' : 'transparent',
        color: active ? 'var(--accent2)' : 'var(--text2)',
        transition: 'background .12s',
        fontSize: 13,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.04)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 100, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{count}</span>
    </div>
  )
}

// ── Recursive folder tree item ────────────────────────────────────
function FolderTreeItem({
  folder, allFolders, depth, activeId, expanded, onToggleExpand, onSelect,
  noteCount, hoveredId, setHoveredId, openMenuId, setOpenMenuId,
  renamingId, renamingName, setRenamingName, onRenameStart, onRenameConfirm,
  onDeleteRequest, onNewSubfolder,
  creatingUnder, newFolderName, setNewFolderName, newFolderIcon, setNewFolderIcon,
  newFolderColor, setNewFolderColor, onCreateFolder,
}: {
  folder: Folder
  allFolders: Folder[]
  depth: number
  activeId: string
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  noteCount: (id: string) => number
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  renamingId: string | null
  renamingName: string
  setRenamingName: (v: string) => void
  onRenameStart: (id: string, name: string) => void
  onRenameConfirm: () => void
  onDeleteRequest: (id: string) => void
  onNewSubfolder: (parentId: string) => void
  creatingUnder: string | null | 'root'
  newFolderName: string
  setNewFolderName: (v: string) => void
  newFolderIcon: string
  setNewFolderIcon: (v: string) => void
  newFolderColor: string
  setNewFolderColor: (v: string) => void
  onCreateFolder: (parentId: string | null) => void
}) {
  const children = allFolders.filter(f => f.parent_id === folder.id)
  const isExpanded = expanded.has(folder.id)
  const isActive = activeId === folder.id
  const isHovered = hoveredId === folder.id
  const isRenaming = renamingId === folder.id
  const count = noteCount(folder.id)
  const menuRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: `5px 8px 5px ${14 + depth * 14}px`,
          margin: '1px 8px', borderRadius: 6, cursor: 'pointer',
          background: isActive ? 'rgba(124,111,212,.15)' : 'transparent',
          color: isActive ? 'var(--accent2)' : 'var(--text2)',
          position: 'relative',
          transition: 'background .12s',
          fontSize: 13,
        }}
        onMouseEnter={() => setHoveredId(folder.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => onSelect(folder.id)}
      >
        {/* Expand chevron */}
        <span
          onClick={e => { e.stopPropagation(); if (children.length) onToggleExpand(folder.id) }}
          style={{ width: 14, textAlign: 'center', fontSize: 10, color: 'var(--text3)', flexShrink: 0, opacity: children.length ? 1 : 0 }}
        >
          {isExpanded ? '▾' : '▸'}
        </span>

        {/* Icon */}
        <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{folder.icon}</span>

        {/* Name (or rename input) */}
        {isRenaming ? (
          <input
            value={renamingName}
            onChange={e => setRenamingName(e.target.value)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') { setRenamingName(''); } }}
            onBlur={onRenameConfirm}
            autoFocus
            style={{
              flex: 1, background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 4,
              padding: '1px 5px', color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder.name}
          </span>
        )}

        {/* Count badge */}
        {count > 0 && !isRenaming && (
          <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 100, padding: '1px 6px', flexShrink: 0 }}>{count}</span>
        )}

        {/* ⋯ menu button */}
        {(isHovered || openMenuId === folder.id) && !isRenaming && (
          <button
            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === folder.id ? null : folder.id) }}
            style={{
              background: 'var(--bg3)', border: 'none', color: 'var(--text2)',
              borderRadius: 4, padding: '1px 5px', cursor: 'pointer', fontSize: 13,
              flexShrink: 0, lineHeight: 1,
            }}
          >⋯</button>
        )}

        {/* Dropdown menu */}
        {openMenuId === folder.id && (
          <div
            ref={menuRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 200,
              background: 'var(--bg4)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '4px 0', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}
          >
            {[
              { label: '📁 Nova subpasta', action: () => { onNewSubfolder(folder.id); setOpenMenuId(null) } },
              { label: '✏️ Renomear', action: () => { onRenameStart(folder.id, folder.name); setOpenMenuId(null) } },
              { label: '🗑 Excluir', action: () => { onDeleteRequest(folder.id); setOpenMenuId(null) }, danger: true },
            ].map(item => (
              <div
                key={item.label}
                onClick={item.action}
                style={{
                  padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                  color: item.danger ? '#ef4444' : 'var(--text)',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && children.map(child => (
        <FolderTreeItem
          key={child.id}
          folder={child}
          allFolders={allFolders}
          depth={depth + 1}
          activeId={activeId}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          noteCount={noteCount}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          renamingId={renamingId}
          renamingName={renamingName}
          setRenamingName={setRenamingName}
          onRenameStart={onRenameStart}
          onRenameConfirm={onRenameConfirm}
          onDeleteRequest={onDeleteRequest}
          onNewSubfolder={onNewSubfolder}
          creatingUnder={creatingUnder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          newFolderIcon={newFolderIcon}
          setNewFolderIcon={setNewFolderIcon}
          newFolderColor={newFolderColor}
          setNewFolderColor={setNewFolderColor}
          onCreateFolder={onCreateFolder}
        />
      ))}

      {/* Inline folder creation under this folder */}
      {creatingUnder === folder.id && (
        <FolderCreateInput
          name={newFolderName}
          icon={newFolderIcon}
          color={newFolderColor}
          depth={depth + 1}
          setName={setNewFolderName}
          setIcon={setNewFolderIcon}
          setColor={setNewFolderColor}
          onConfirm={() => onCreateFolder(folder.id)}
          onCancel={() => setNewFolderName('')}
        />
      )}
    </div>
  )
}

// ── Inline folder creation input ──────────────────────────────────
function FolderCreateInput({
  name, icon, color, depth, setName, setIcon, setColor, onConfirm, onCancel,
}: {
  name: string; icon: string; color: string; depth: number
  setName: (v: string) => void; setIcon: (v: string) => void; setColor: (v: string) => void
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ padding: `6px 8px 6px ${14 + depth * 14}px`, margin: '1px 8px' }}>
      {/* Icon picker */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        {FOLDER_ICONS.map(ic => (
          <span key={ic} onClick={() => setIcon(ic)}
            style={{ cursor: 'pointer', fontSize: 14, padding: 3, borderRadius: 4, background: ic === icon ? 'var(--bg3)' : 'transparent', border: ic === icon ? '1px solid var(--accent)' : '1px solid transparent' }}>
            {ic}
          </span>
        ))}
      </div>
      {/* Name input */}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome da pasta..."
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
        style={{
          width: '100%', background: 'var(--bg3)', border: '1px solid var(--accent)',
          borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontSize: 12, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button onClick={onConfirm} style={{ flex: 1, padding: '4px 0', background: 'var(--accent)', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, cursor: 'pointer' }}>Criar</button>
        <button onClick={onCancel} style={{ padding: '4px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}

// ── Note grid ────────────────────────────────────────────────────
function NoteGrid({ notes, folders, onEdit, onDelete, onPin }: {
  notes: Note[]; folders: Folder[]
  onEdit: (n: Note) => void; onDelete: (n: Note) => void; onPin: (n: Note) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
      {notes.map(n => <NoteCard key={n.id} note={n} folders={folders} onEdit={onEdit} onDelete={onDelete} onPin={onPin} />)}
    </div>
  )
}

// ── Note card ────────────────────────────────────────────────────
function NoteCard({ note, folders, onEdit, onDelete, onPin }: {
  note: Note; folders: Folder[]
  onEdit: (n: Note) => void; onDelete: (n: Note) => void; onPin: (n: Note) => void
}) {
  const folder = note.folder_id ? folders.find(f => f.id === note.folder_id) : null
  const tagColor = TAG_COLORS[note.tag] || '#6366f1'

  return (
    <div
      onClick={() => onEdit(note)}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120,
        position: 'relative', transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{note.title}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onPin(note) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: note.pinned ? 1 : .25, padding: 0, transition: 'opacity .15s' }}>
            📌
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note) }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .35, padding: 0 }}>
            ✕
          </button>
        </div>
      </div>

      {/* Content preview */}
      {note.content && (
        <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {note.content}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap', gap: 4 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: `${tagColor}20`, color: tagColor, fontWeight: 600 }}>{note.tag}</span>
          {folder && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{folder.icon} {folder.name}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(note.updated_at).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
}
