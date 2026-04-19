'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ModalPortal from '@/components/ModalPortal'

// ─── Types ──────────────────────────────────────────────────────────────────

type TicketStatus   = 'open' | 'in_progress' | 'waiting_client' | 'waiting_vendor' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

interface Ticket {
  id: string; ticket_ref: string | null; title: string; client: string | null
  category: string | null; priority: TicketPriority; status: TicketStatus
  description: string | null; resolution: string | null; draft_response: string | null
  notes: string | null; drive_link: string | null
  opened_at: string; resolved_at: string | null; created_at: string; updated_at: string
}
interface KBItem {
  id: string; title: string; client: string | null; category: string | null
  content: string; tags: string | null; drive_link: string | null
  created_at: string; updated_at: string
}
interface Script {
  id: string; title: string; language: string; category: string | null
  description: string | null; content: string; tags: string | null
  created_at: string; updated_at: string
}
interface Template {
  id: string; title: string; content: string; category: string | null; created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TICKET_STATUS: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:           { label: 'Aberto',         color: '#4d96ff',       bg: '#4d96ff20' },
  in_progress:    { label: 'Em andamento',    color: 'var(--accent)',  bg: 'var(--accent)20' },
  waiting_client: { label: 'Ag. cliente',     color: '#ffd93d',       bg: '#ffd93d20' },
  waiting_vendor: { label: 'Ag. fornecedor',  color: '#ff9500',       bg: '#ff950020' },
  resolved:       { label: 'Resolvido',       color: '#6bcb77',       bg: '#6bcb7720' },
  closed:         { label: 'Encerrado',       color: 'var(--text3)',  bg: 'var(--bg3)' },
}

const TICKET_PRIORITY: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: 'Baixa',   color: 'var(--text3)' },
  medium:   { label: 'Média',   color: '#4d96ff' },
  high:     { label: 'Alta',    color: '#ffd93d' },
  critical: { label: 'Crítico', color: '#ff6b6b' },
}

const TICKET_CATS = ['M365', 'Infraestrutura', 'DevOps', 'Scripts', 'Segurança', 'Redes', 'Outros']
const KB_CATS     = ['M365', 'Infraestrutura', 'DevOps', 'Scripts', 'Segurança', 'Redes', 'Geral']

const SCRIPT_LANGS = [
  { id: 'powershell',  label: 'PowerShell',  color: '#4d96ff' },
  { id: 'bash',        label: 'Bash',        color: '#6bcb77' },
  { id: 'python',      label: 'Python',      color: '#ffd93d' },
  { id: 'sql',         label: 'SQL',         color: '#ff9500' },
  { id: 'cmd',         label: 'CMD',         color: 'var(--text3)' },
  { id: 'javascript',  label: 'JavaScript',  color: '#f7a800' },
  { id: 'outros',      label: 'Outros',      color: 'var(--text3)' },
]

const DEFAULT_TEMPLATES = [
  { title: 'Análise em andamento',       category: 'Abertura',     content: 'Olá,\n\nRecebemos seu chamado e estamos analisando a situação. Retornaremos em breve com mais informações.\n\nAtenciosamente,\nSuporte de TI' },
  { title: 'Solicitação de informações', category: 'Andamento',    content: 'Olá,\n\nPara prosseguir com a análise, precisamos das seguintes informações:\n\n- [ ] \n- [ ] \n\nAguardamos seu retorno.\n\nAtenciosamente,\nSuporte de TI' },
  { title: 'Aguardando retorno',         category: 'Andamento',    content: 'Olá,\n\nEntramos em contato anteriormente porém ainda não recebemos as informações necessárias para prosseguir.\n\nPor favor, retorne assim que possível para que possamos dar continuidade ao seu atendimento.\n\nAtenciosamente,\nSuporte de TI' },
  { title: 'Solução implementada',       category: 'Encerramento', content: 'Olá,\n\nA solução foi implementada com sucesso. Segue abaixo um resumo do que foi realizado:\n\n[Descrever o que foi feito]\n\nPor favor, confirme se o problema foi resolvido para que possamos encerrar o chamado.\n\nAtenciosamente,\nSuporte de TI' },
  { title: 'Encerramento do ticket',     category: 'Encerramento', content: 'Olá,\n\nComo não recebemos retorno confirmando a resolução do problema, estamos encerrando este chamado.\n\nCaso o problema persista, por favor abra um novo chamado e teremos prazer em ajudá-lo.\n\nAtenciosamente,\nSuporte de TI' },
  { title: 'Ag. fornecedor externo',     category: 'Andamento',    content: 'Olá,\n\nO chamado foi escalado para o fornecedor [FORNECEDOR] e estamos aguardando posição deles.\n\nAssim que tivermos uma atualização, entraremos em contato.\n\nAtenciosamente,\nSuporte de TI' },
]

// ─── CSV Import Helpers ──────────────────────────────────────────────────────

const CSV_STATUS_MAP: Record<string, TicketStatus> = {
  'novo': 'open', 'new': 'open', 'aberto': 'open', 'open': 'open',
  'em andamento': 'in_progress', 'andamento': 'in_progress', 'in progress': 'in_progress',
  'pausado': 'waiting_vendor', 'paused': 'waiting_vendor',
  'aguardando': 'waiting_client', 'aguardando cliente': 'waiting_client',
  'ag. cliente': 'waiting_client', 'ag cliente': 'waiting_client',
  'aguardando fornecedor': 'waiting_vendor', 'ag. fornecedor': 'waiting_vendor',
  'resolvido': 'resolved', 'resolved': 'resolved', 'solucionado': 'resolved',
  'encerrado': 'closed', 'closed': 'closed', 'cancelado': 'closed',
}

const CSV_PRIORITY_MAP: Record<string, TicketPriority> = {
  'urgente': 'critical', 'critico': 'critical', 'critica': 'critical',
  'alta': 'high', 'alto': 'high', 'high': 'high',
  'media': 'medium', 'medio': 'medium', 'normal': 'medium', 'medium': 'medium',
  'baixa': 'low', 'baixo': 'low', 'low': 'low',
}

function normStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function findCol(headers: string[], ...candidates: string[]): number {
  const normed = headers.map(normStr)
  for (const c of candidates) {
    const cn = normStr(c)
    const i = normed.findIndex(h => h === cn || h.includes(cn))
    if (i >= 0) return i
  }
  return -1
}

function parseBRDate(s: string): string {
  const m = s.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (!m) return new Date().toISOString().slice(0, 10)
  const [, d, mo, y] = m
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const content = text.replace(/^\uFEFF/, '') // Remove UTF-8 BOM
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const firstLine = lines[0]
  const semis  = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  const delim  = semis >= commas ? ';' : ','

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let cell = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++ }
        else inQ = !inQ
      } else if (c === delim && !inQ) {
        result.push(cell.trim()); cell = ''
      } else cell += c
    }
    result.push(cell.trim())
    return result
  }

  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) }
}

function csvToTickets(headers: string[], rows: string[][]): Partial<Ticket>[] {
  const cRef  = findCol(headers, 'numero', 'número', 'nº', 'n°', 'id', 'ticket', '#', 'cod', 'codigo')
  const cSubj = findCol(headers, 'assunto', 'titulo', 'título', 'subject', 'title', 'assunto do ticket', 'descricao', 'descrição')
  const cStat = findCol(headers, 'status', 'situacao', 'situação', 'estado')
  const cCli  = findCol(headers, 'empresa', 'solicitante', 'cliente', 'company', 'organizacao', 'organização', 'nome empresa', 'razao social', 'razão social')
  const cDate = findCol(headers, 'abertura', 'data abertura', 'data de abertura', 'data criacao', 'criado em', 'criado', 'created', 'date', 'data')
  const cPri  = findCol(headers, 'urgencia', 'urgência', 'prioridade', 'urgency', 'priority')
  const cCat  = findCol(headers, 'categoria', 'category', 'tipo', 'type', 'servico', 'serviço')
  const cNotes = findCol(headers, 'observacao', 'observação', 'notas', 'notes', 'obs')

  return rows
    .filter(r => r.some(c => c.trim()))
    .map(r => {
      const title = cSubj >= 0 ? r[cSubj] : ''
      if (!title) return null

      const rawStatus = cStat >= 0 ? normStr(r[cStat]) : ''
      const status: TicketStatus = CSV_STATUS_MAP[rawStatus] ?? 'open'

      const rawPri = cPri >= 0 ? normStr(r[cPri]) : ''
      const priority: TicketPriority = CSV_PRIORITY_MAP[rawPri] ?? 'medium'

      const rawDate = cDate >= 0 ? r[cDate] : ''

      return {
        ticket_ref:     cRef >= 0   ? (r[cRef]   || null) : null,
        title,
        client:         cCli >= 0   ? (r[cCli]   || null) : null,
        category:       cCat >= 0   ? (r[cCat]   || null) : null,
        notes:          cNotes >= 0 ? (r[cNotes] || null) : null,
        status,
        priority,
        opened_at:      rawDate ? parseBRDate(rawDate) : new Date().toISOString().slice(0, 10),
        description:    null,
        resolution:     null,
        draft_response: null,
        drive_link:     null,
        resolved_at:    null,
      } as Partial<Ticket>
    })
    .filter(Boolean) as Partial<Ticket>[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysOpen(openedAt: string): number {
  return Math.floor((Date.now() - new Date(openedAt + 'T12:00:00').getTime()) / 86400000)
}

function agingBorderColor(days: number, status: TicketStatus): string {
  if (status === 'resolved' || status === 'closed') return '#6bcb77'
  if (status === 'waiting_client' || status === 'waiting_vendor') return '#ffd93d'
  if (days >= 8) return '#ff6b6b'
  if (days >= 5) return '#ff9500'
  if (days >= 3) return '#ffd93d'
  return 'var(--border)'
}

function inp(extra: React.CSSProperties = {}): React.CSSProperties {
  return { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, ...extra }
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>{children}</label>
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1800)
    })
  }, [])
  return { copied, copy }
}

// ─── Tickets Tab ─────────────────────────────────────────────────────────────

const EMPTY_TICKET = {
  ticket_ref: '', title: '', client: '', category: '', priority: 'medium' as TicketPriority,
  status: 'open' as TicketStatus, description: '', resolution: '', draft_response: '',
  notes: '', drive_link: '', opened_at: new Date().toISOString().slice(0, 10), resolved_at: '',
}

function TicketsTab({ driveUrl }: { driveUrl: string }) {
  const [items, setItems]           = useState<Ticket[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatus]   = useState<TicketStatus | 'all'>('all')
  const [catFilter, setCat]         = useState('all')
  const [priFilter, setPri]         = useState('all')
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Ticket | null>(null)
  const [form, setForm]             = useState({ ...EMPTY_TICKET })
  const [showReport, setShowReport] = useState(false)
  const [copiedReport, setCopiedReport] = useState(false)
  const [templatePicker, setTemplatePicker] = useState(false)
  const [templates, setTemplates]   = useState<Template[]>([])
  // Cobrar
  const [cobrarTicket, setCobrarTicket] = useState<Ticket | null>(null)
  const [cobrarText, setCobrarText] = useState('')
  // CSV Import
  const [showImport, setShowImport]   = useState(false)
  const [csvParsed, setCsvParsed]     = useState<Partial<Ticket>[]>([])
  const [parseError, setParseError]   = useState<string | null>(null)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useCopy()

  const fetch_ = async () => {
    setLoading(true)
    try {
      const [tr, tt] = await Promise.all([
        fetch('/api/trabalho/tickets').then(r => r.json()),
        fetch('/api/trabalho/templates').then(r => r.json()),
      ])
      setItems(tr.items ?? [])
      setTemplates(tt.items ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const filtered = useMemo(() => items.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (catFilter !== 'all' && t.category !== catFilter) return false
    if (priFilter !== 'all' && t.priority !== priFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.title.toLowerCase().includes(q) &&
          !(t.client?.toLowerCase().includes(q)) &&
          !(t.ticket_ref?.toLowerCase().includes(q))) return false
    }
    return true
  }), [items, statusFilter, catFilter, priFilter, search])

  const stats = useMemo(() => {
    const active = items.filter(t => t.status !== 'resolved' && t.status !== 'closed')
    const overdue = active.filter(t => daysOpen(t.opened_at) >= 5)
    const critical = active.filter(t => t.priority === 'critical' || t.priority === 'high')
    const waiting  = items.filter(t => t.status === 'waiting_client')
    const today = new Date().toISOString().slice(0, 10)
    const resolvedToday = items.filter(t => t.resolved_at === today || (t.status === 'resolved' && t.updated_at?.startsWith(today)))
    return { active: active.length, overdue: overdue.length, critical: critical.length, waiting: waiting.length, resolvedToday: resolvedToday.length }
  }, [items])

  const overdueItems = useMemo(() =>
    items.filter(t => t.status !== 'resolved' && t.status !== 'closed' && daysOpen(t.opened_at) >= 5)
      .sort((a, b) => daysOpen(b.opened_at) - daysOpen(a.opened_at)),
    [items]
  )

  const reportText = useMemo(() => {
    if (!overdueItems.length) return ''
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const lines = [`RELATÓRIO DE TICKETS EM ATRASO — ${date}`, `${'='.repeat(50)}`, '']
    overdueItems.forEach((t, i) => {
      const days = daysOpen(t.opened_at)
      lines.push(`${i + 1}. [${t.ticket_ref ?? 'SEM REF'}] ${t.title}`)
      lines.push(`   Cliente:    ${t.client ?? '—'}`)
      lines.push(`   Categoria:  ${t.category ?? '—'}`)
      lines.push(`   Prioridade: ${TICKET_PRIORITY[t.priority].label}`)
      lines.push(`   Status:     ${TICKET_STATUS[t.status].label}`)
      lines.push(`   Em aberto:  ${days} dia${days !== 1 ? 's' : ''}`)
      if (t.notes) lines.push(`   Notas:      ${t.notes}`)
      lines.push('')
    })
    return lines.join('\n')
  }, [overdueItems])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_TICKET, opened_at: new Date().toISOString().slice(0, 10) })
    setShowModal(true)
  }
  const openEdit = (t: Ticket) => {
    setEditing(t)
    setForm({
      ticket_ref: t.ticket_ref ?? '', title: t.title, client: t.client ?? '',
      category: t.category ?? '', priority: t.priority, status: t.status,
      description: t.description ?? '', resolution: t.resolution ?? '',
      draft_response: t.draft_response ?? '', notes: t.notes ?? '',
      drive_link: t.drive_link ?? '', opened_at: t.opened_at,
      resolved_at: t.resolved_at ?? '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      ticket_ref: form.ticket_ref || null, client: form.client || null,
      category: form.category || null, description: form.description || null,
      resolution: form.resolution || null, draft_response: form.draft_response || null,
      notes: form.notes || null, drive_link: form.drive_link || null,
      resolved_at: form.resolved_at || null,
    }
    if (editing) {
      await fetch('/api/trabalho/tickets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/trabalho/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false)
    fetch_()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/trabalho/tickets?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(t => t.id !== id))
  }

  const applyTemplate = (tpl: Template) => {
    setForm(p => ({ ...p, draft_response: tpl.content }))
    setTemplatePicker(false)
  }

  const openCobrar = (t: Ticket, e: React.MouseEvent) => {
    e.stopPropagation()
    setCobrarTicket(t)
    setCobrarText(
      `Olá, ${t.client ?? 'cliente'},\n\nPassamos para dar um retorno sobre o chamado${t.ticket_ref ? ` #${t.ticket_ref}` : ''} - ${t.title}.\n\nGostaríamos de confirmar se ainda precisam de auxílio ou se o problema foi resolvido.\n\nPor favor, retorne assim que possível para darmos continuidade ao seu atendimento.\n\nAtenciosamente,\nSuporte de TI`
    )
  }

  // ── CSV Import ──────────────────────────────────────────────────────────
  const handleCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSVText(text)
      if (headers.length === 0) {
        setParseError('Arquivo inválido. Verifique se é um CSV exportado do Movidesk.')
        return
      }
      const tickets = csvToTickets(headers, rows)
      if (tickets.length === 0) {
        setParseError('Nenhum ticket válido detectado. Verifique o arquivo.')
        return
      }
      setCsvParsed(tickets)
      setParseError(null)
    }
    reader.readAsText(file, 'windows-1252')
  }

  const handleImport = async () => {
    if (!csvParsed.length) return
    setImporting(true)
    setParseError(null)
    try {
      const r = await fetch('/api/trabalho/tickets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: csvParsed }),
      })
      const text = await r.text()
      window.alert(`Status: ${r.status}\nResposta: ${text.slice(0, 500)}`)
      const d = JSON.parse(text)
      if (d.error) {
        setParseError(`Erro ao importar: ${d.error}`)
      } else {
        setImportResult(d)
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (e: any) {
      setParseError(`Erro: ${e.message}`)
    }
    setImporting(false)
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div>
        <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum ticket ainda</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28, lineHeight: 1.7 }}>
            Exporte seus tickets do Movidesk e importe aqui para acompanhar aging, cobrar clientes e gerenciar respostas.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setShowImport(true)}
              style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
              📥 Importar CSV do Movidesk
            </button>
            <button onClick={openAdd}
              style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              + Adicionar manual
            </button>
          </div>
        </div>

        {/* modals when empty too */}
        {showModal && renderTicketModal()}
        {showImport && renderImportModal()}
      </div>
    )
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  function renderTicketModal() {
    return (
      <ModalPortal onClose={() => setShowModal(false)}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 600, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar ticket' : 'Novo ticket'}</h2>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, marginBottom: 12 }}>
            <div><Lbl>Nº do ticket</Lbl>
              <input value={form.ticket_ref} onChange={e => setForm(p => ({ ...p, ticket_ref: e.target.value }))} placeholder="ex: 40144" style={inp()} />
            </div>
            <div><Lbl>Título *</Lbl>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Resumo do problema" style={inp()} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><Lbl>Cliente</Lbl>
              <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Empresa" style={inp()} />
            </div>
            <div><Lbl>Categoria</Lbl>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                <option value="">–</option>
                {TICKET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Lbl>Prioridade</Lbl>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TicketPriority }))} style={inp()}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
            <div><Lbl>Status</Lbl>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TicketStatus }))} style={inp()}>
                <option value="open">Aberto</option>
                <option value="in_progress">Em andamento</option>
                <option value="waiting_client">Ag. cliente</option>
                <option value="waiting_vendor">Ag. fornecedor</option>
                <option value="resolved">Resolvido</option>
                <option value="closed">Encerrado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><Lbl>Data de abertura</Lbl>
              <input type="date" value={form.opened_at} onChange={e => setForm(p => ({ ...p, opened_at: e.target.value }))} style={inp()} />
            </div>
            <div><Lbl>Data de resolução</Lbl>
              <input type="date" value={form.resolved_at} onChange={e => setForm(p => ({ ...p, resolved_at: e.target.value }))} style={inp()} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Lbl>Descrição</Lbl>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o problema..." rows={2} style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Lbl>Rascunho de resposta ao cliente</Lbl>
              <button onClick={() => setTemplatePicker(true)}
                style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent)15', border: 'none', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontWeight: 600 }}>
                Usar template
              </button>
            </div>
            <textarea value={form.draft_response} onChange={e => setForm(p => ({ ...p, draft_response: e.target.value }))}
              placeholder="Rascunhe aqui sua resposta ao cliente..." rows={3} style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
            {form.draft_response && (
              <button onClick={() => navigator.clipboard.writeText(form.draft_response)}
                style={{ marginTop: 6, fontSize: 11, color: '#6bcb77', background: '#6bcb7715', border: '1px solid #6bcb7730', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                📋 Copiar resposta
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div><Lbl>Notas internas</Lbl>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Anotações..." style={{ ...inp(), resize: 'none', lineHeight: 1.4 }} />
            </div>
            <div><Lbl>Link Drive</Lbl>
              <input value={form.drive_link} onChange={e => setForm(p => ({ ...p, drive_link: e.target.value }))}
                placeholder="https://drive.google.com/..." style={inp()} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {editing ? 'Salvar' : 'Criar ticket'}
            </button>
          </div>
        </div>
      </ModalPortal>
    )
  }

  function renderImportModal() {
    return (
      <ModalPortal onClose={() => { setShowImport(false); setCsvParsed([]); setParseError(null); setImportResult(null) }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 660, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>📥 Importar tickets do Movidesk</h2>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                Exporte o CSV do Movidesk e faça upload aqui
              </div>
            </div>
            <button onClick={() => { setShowImport(false); setCsvParsed([]); setParseError(null); setImportResult(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Steps */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Como exportar do Movidesk</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                'Abra a lista de tickets não resolvidos',
                'Clique em "Opções" (ícone no topo direito)',
                'Selecione "Exportar todos os tickets"',
                'Faça upload do arquivo .csv abaixo',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)20', color: 'var(--accent)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* File upload */}
          {csvParsed.length === 0 ? (
            <div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); e.target.value = '' }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'var(--border)'
                  const f = e.dataTransfer.files[0]
                  if (f) handleCSVFile(f)
                }}
                style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Arraste o arquivo CSV aqui ou clique para selecionar</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Arquivos .csv exportados do Movidesk</div>
              </div>
              {parseError && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#ff6b6b', background: '#ff6b6b12', border: '1px solid #ff6b6b30', borderRadius: 8, padding: '8px 12px' }}>
                  ⚠️ {parseError}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: 'var(--accent)' }}>{csvParsed.length}</span> tickets detectados no arquivo
                </div>
                <button onClick={() => { setCsvParsed([]); setParseError(null); setImportResult(null) }}
                  style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Trocar arquivo
                </button>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      {['Nº', 'Assunto', 'Cliente', 'Status', 'Prioridade', 'Abertura'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvParsed.slice(0, 15).map((t, i) => {
                      const sc = TICKET_STATUS[t.status!]
                      const pc = TICKET_PRIORITY[t.priority!]
                      return (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--text3)' }}>{t.ticket_ref ?? '—'}</td>
                          <td style={{ padding: '6px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--text3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.client ?? '—'}</td>
                          <td style={{ padding: '6px 10px' }}><span style={{ color: sc.color, fontWeight: 600 }}>{sc.label}</span></td>
                          <td style={{ padding: '6px 10px' }}><span style={{ color: pc.color }}>{pc.label}</span></td>
                          <td style={{ padding: '6px 10px', color: 'var(--text3)' }}>{t.opened_at}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {csvParsed.length > 15 && (
                  <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', textAlign: 'center' }}>
                    …e mais {csvParsed.length - 15} tickets
                  </div>
                )}
              </div>
            </div>
          )}

          {parseError && csvParsed.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#ff6b6b', background: '#ff6b6b12', border: '1px solid #ff6b6b30', borderRadius: 8, padding: '8px 12px' }}>
              ⚠️ {parseError}
            </div>
          )}

          {importResult && !importResult.error && (
            <div style={{ marginTop: 14, background: '#6bcb7715', border: '1px solid #6bcb7730', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6bcb77' }}>
              ✅ {importResult.inserted ?? 0} ticket{(importResult.inserted ?? 0) !== 1 ? 's' : ''} importado{(importResult.inserted ?? 0) !== 1 ? 's' : ''}
              {(importResult.updated ?? 0) > 0 && `, ${importResult.updated} atualizado${importResult.updated !== 1 ? 's' : ''}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Tickets já existentes (mesmo nº) terão o status atualizado
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowImport(false); setCsvParsed([]); setParseError(null); setImportResult(null) }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleImport} disabled={csvParsed.length === 0 || importing}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: csvParsed.length === 0 ? 'var(--bg3)' : 'var(--accent)', color: csvParsed.length === 0 ? 'var(--text3)' : '#fff', fontSize: 13, cursor: csvParsed.length === 0 ? 'default' : 'pointer', fontWeight: 600 }}>
                {importing ? 'Importando…' : csvParsed.length > 0 ? `Importar ${csvParsed.length} tickets` : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Ativos',          val: stats.active,        color: '#4d96ff' },
          { label: 'Crítico/Alto',    val: stats.critical,      color: '#ff6b6b' },
          { label: 'Venc. +5 dias',   val: stats.overdue,       color: stats.overdue > 0 ? '#ff9500' : '#6bcb77' },
          { label: 'Ag. cliente',     val: stats.waiting,       color: '#ffd93d' },
          { label: 'Resolvidos hoje', val: stats.resolvedToday, color: '#6bcb77' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-d)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {stats.overdue > 0 && (
        <div style={{ background: '#ff950015', border: '1px solid #ff950040', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#ff9500' }}>
            ⚠️ <strong>{stats.overdue}</strong> ticket{stats.overdue > 1 ? 's' : ''} com mais de 5 dias sem resolução
          </span>
          <button onClick={() => setShowReport(true)}
            style={{ fontSize: 12, color: '#ff9500', background: '#ff950020', border: '1px solid #ff950040', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
            Ver relatório
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatus(e.target.value as any)} style={inp({ width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer' })}>
          <option value="all">Todos os status</option>
          {(Object.entries(TICKET_STATUS) as [TicketStatus, typeof TICKET_STATUS[TicketStatus]][]).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <select value={catFilter} onChange={e => setCat(e.target.value)} style={inp({ width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer' })}>
          <option value="all">Todas as categorias</option>
          {TICKET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priFilter} onChange={e => setPri(e.target.value)} style={inp({ width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer' })}>
          <option value="all">Todas as prioridades</option>
          {(Object.entries(TICKET_PRIORITY) as [TicketPriority, typeof TICKET_PRIORITY[TicketPriority]][]).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ref, título, cliente..."
          style={inp({ width: 200, padding: '6px 10px', fontSize: 12 })} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => { setCsvParsed([]); setShowImport(true) }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)40', background: 'var(--accent)15', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            📥 Importar CSV
          </button>
          <button onClick={openAdd}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            + Novo ticket
          </button>
        </div>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>
          Nenhum ticket com os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => {
            const days = daysOpen(t.opened_at)
            const borderColor = agingBorderColor(days, t.status)
            const sc = TICKET_STATUS[t.status]
            const pc = TICKET_PRIORITY[t.priority]
            const isActive = t.status !== 'resolved' && t.status !== 'closed'
            const isWaiting = t.status === 'waiting_client'
            return (
              <div key={t.id} onClick={() => openEdit(t)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {t.ticket_ref && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0 }}>
                      #{t.ticket_ref}
                    </span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 120 }}>{t.title}</span>
                  {t.client && <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{t.client}</span>}
                  {t.category && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 7px', borderRadius: 8, flexShrink: 0 }}>{t.category}</span>}
                  <span style={{ fontSize: 11, color: pc.color, fontWeight: 700, flexShrink: 0 }}>{pc.label}</span>
                  <span style={{ fontSize: 11, background: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: 8, fontWeight: 600, flexShrink: 0 }}>{sc.label}</span>
                  {isActive && (
                    <span style={{ fontSize: 11, color: borderColor === 'var(--border)' ? 'var(--text3)' : borderColor, fontWeight: days >= 5 ? 700 : 400, flexShrink: 0 }}>
                      {days}d
                    </span>
                  )}
                  {isWaiting && (
                    <button onClick={e => openCobrar(t, e)}
                      style={{ fontSize: 10, color: '#ffd93d', background: '#ffd93d15', border: '1px solid #ffd93d40', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                      Cobrar
                    </button>
                  )}
                  {t.drive_link && (
                    <a href={t.drive_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }} title="Drive">📁</a>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4, flexShrink: 0, padding: '0 2px' }}>✕</button>
                </div>
                {t.notes && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {t.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ticket modal */}
      {showModal && renderTicketModal()}

      {/* Template picker */}
      {templatePicker && (
        <ModalPortal onClose={() => setTemplatePicker(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 24, width: 480, maxWidth: 'calc(100% - 32px)', margin: '100px auto', maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Selecionar template</div>
              <button onClick={() => setTemplatePicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {templates.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhum template. Crie na aba Templates.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.title}</div>
                    {t.category && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{t.category}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.content.split('\n')[0]}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Overdue report */}
      {showReport && (
        <ModalPortal onClose={() => setShowReport(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 600, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 17, fontWeight: 700 }}>⚠️ Tickets em atraso</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{overdueItems.length} ticket{overdueItems.length > 1 ? 's' : ''} com mais de 5 dias</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(reportText); setCopiedReport(true); setTimeout(() => setCopiedReport(false), 2000) }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: copiedReport ? '#6bcb77' : 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {copiedReport ? '✓ Copiado!' : '📋 Copiar relatório'}
                </button>
                <button onClick={() => setShowReport(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdueItems.map(t => {
                const days = daysOpen(t.opened_at)
                const pc = TICKET_PRIORITY[t.priority]
                const sc = TICKET_STATUS[t.status]
                return (
                  <div key={t.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', borderLeft: `4px solid ${days >= 8 ? '#ff6b6b' : '#ff9500'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {t.ticket_ref && <span style={{ fontFamily: 'monospace', color: 'var(--text3)', marginRight: 8 }}>#{t.ticket_ref}</span>}
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                          {t.client && <span style={{ marginRight: 10 }}>{t.client}</span>}
                          {t.category && <span style={{ color: 'var(--accent)', marginRight: 10 }}>{t.category}</span>}
                          <span style={{ color: pc.color, fontWeight: 600 }}>{pc.label}</span>
                        </div>
                        {t.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: days >= 8 ? '#ff6b6b' : '#ff9500', fontFamily: 'var(--font-d)' }}>{days}d</div>
                        <div style={{ fontSize: 10, color: sc.color }}>{sc.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 16, background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Prévia para copiar</div>
              <pre style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0, maxHeight: 180, overflow: 'auto' }}>{reportText}</pre>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Import modal */}
      {showImport && renderImportModal()}

      {/* Cobrar modal */}
      {cobrarTicket && (
        <ModalPortal onClose={() => setCobrarTicket(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 500, maxWidth: 'calc(100% - 32px)', margin: '80px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>📢 Cobrar cliente</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {cobrarTicket.ticket_ref && `#${cobrarTicket.ticket_ref} — `}{cobrarTicket.client ?? cobrarTicket.title}
                </div>
              </div>
              <button onClick={() => setCobrarTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <textarea value={cobrarText} onChange={e => setCobrarText(e.target.value)} rows={10}
              style={{ ...inp(), resize: 'vertical', lineHeight: 1.6, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCobrarTicket(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => { copy('cobrar', cobrarText); setTimeout(() => setCobrarTicket(null), 1300) }}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: copied === 'cobrar' ? '#6bcb77' : 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'background .15s' }}>
                {copied === 'cobrar' ? '✓ Copiado!' : '📋 Copiar e fechar'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Scripts Tab ─────────────────────────────────────────────────────────────

const EMPTY_SCRIPT = { title: '', language: 'powershell', category: '', description: '', content: '', tags: '' }

function ScriptsTab() {
  const [items, setItems]       = useState<Script[]>([])
  const [loading, setLoading]   = useState(true)
  const [langFilter, setLang]   = useState('all')
  const [catFilter, setCat]     = useState('all')
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<Script | null>(null)
  const [form, setForm]         = useState({ ...EMPTY_SCRIPT })
  const [expanded, setExpanded] = useState<string | null>(null)
  const { copied, copy }        = useCopy()

  const fetch_ = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/trabalho/scripts').then(r => r.json())
      setItems(r.items ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const usedCats = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))], [items])

  const filtered = useMemo(() => items.filter(i => {
    if (langFilter !== 'all' && i.language !== langFilter) return false
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.title.toLowerCase().includes(q) &&
          !(i.description?.toLowerCase().includes(q)) &&
          !i.content.toLowerCase().includes(q)) return false
    }
    return true
  }), [items, langFilter, catFilter, search])

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_SCRIPT }); setShowModal(true) }
  const openEdit = (s: Script) => {
    setEditing(s)
    setForm({ title: s.title, language: s.language, category: s.category ?? '', description: s.description ?? '', content: s.content, tags: s.tags ?? '' })
    setShowModal(true)
  }
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = { ...form, category: form.category || null, description: form.description || null, tags: form.tags || null }
    if (editing) {
      await fetch('/api/trabalho/scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/trabalho/scripts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setShowModal(false); fetch_()
  }
  const handleDelete = async (id: string) => {
    await fetch(`/api/trabalho/scripts?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(s => s.id !== id))
  }

  const langConfig = (lang: string) => SCRIPT_LANGS.find(l => l.id === lang) ?? { label: lang, color: 'var(--text3)' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setLang('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: langFilter === 'all' ? 'var(--accent)' : 'transparent', color: langFilter === 'all' ? '#fff' : 'var(--text3)' }}>Todos</button>
          {SCRIPT_LANGS.map(l => (
            <button key={l.id} onClick={() => setLang(l.id)}
              style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: langFilter === l.id ? l.color : 'transparent', color: langFilter === l.id ? '#fff' : 'var(--text3)' }}>
              {l.label}
            </button>
          ))}
        </div>
        {usedCats.length > 0 && (
          <select value={catFilter} onChange={e => setCat(e.target.value)} style={inp({ width: 'auto', padding: '6px 10px', fontSize: 12, cursor: 'pointer' })}>
            <option value="all">Todas as categorias</option>
            {usedCats.map(c => <option key={c as string} value={c as string}>{c}</option>)}
          </select>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar scripts..." style={inp({ width: 180, padding: '6px 10px', fontSize: 12 })} />
        <button onClick={openAdd} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Novo script</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>
          {items.length === 0 ? 'Nenhum script ainda. Armazene seus scripts PowerShell, Bash, etc.' : 'Nenhum script encontrado.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => {
            const lc = langConfig(s.language)
            const isOpen = expanded === s.id
            const preview = s.content.split('\n').slice(0, 4).join('\n')
            return (
              <div key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `3px solid ${lc.color}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <span style={{ fontSize: 10, background: lc.color + '25', color: lc.color, padding: '3px 8px', borderRadius: 6, fontWeight: 700, flexShrink: 0 }}>{lc.label}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    {s.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{s.description}</div>}
                  </div>
                  {s.category && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 7px', borderRadius: 8 }}>{s.category}</span>}
                  <button onClick={e => { e.stopPropagation(); copy(s.id, s.content) }}
                    style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${copied === s.id ? '#6bcb77' : 'var(--border)'}`, background: copied === s.id ? '#6bcb7720' : 'var(--bg3)', color: copied === s.id ? '#6bcb77' : 'var(--text3)', fontSize: 11, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                    {copied === s.id ? '✓ Copiado!' : '📋 Copiar'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEdit(s) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .6 }}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4 }}>✕</button>
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen ? (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, lineHeight: 1.6, color: 'var(--text)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>{s.content}</pre>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)', padding: '8px 16px' }}>
                    <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--text3)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', opacity: .7 }}>
                      {preview}{s.content.split('\n').length > 4 ? '\n...' : ''}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 600, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar script' : 'Novo script'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Título *</Lbl><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do script" style={inp()} /></div>
              <div><Lbl>Linguagem</Lbl>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} style={inp()}>
                  {SCRIPT_LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Categoria</Lbl><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: AD, Exchange, Backup..." style={inp()} /></div>
              <div><Lbl>Tags</Lbl><input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="ex: usuario, senha, reset" style={inp()} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Descrição</Lbl><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="O que esse script faz..." style={inp()} /></div>
            <div style={{ marginBottom: 20 }}><Lbl>Código *</Lbl>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Cole ou escreva o script aqui..." rows={10} style={{ ...inp(), fontFamily: 'monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ─── KB Tab ──────────────────────────────────────────────────────────────────

const EMPTY_KB = { title: '', client: '', category: '', content: '', tags: '', drive_link: '' }

function KBTab() {
  const [items, setItems]         = useState<KBItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [catFilter, setCat]       = useState('all')
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<KBItem | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_KB })
  const [viewing, setViewing]     = useState<KBItem | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    try { const r = await fetch('/api/trabalho/kb').then(r => r.json()); setItems(r.items ?? []) } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const filtered = useMemo(() => items.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.title.toLowerCase().includes(q) && !(i.client?.toLowerCase().includes(q)) && !(i.tags?.toLowerCase().includes(q)) && !i.content.toLowerCase().includes(q)) return false
    }
    return true
  }), [items, catFilter, search])

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_KB }); setShowModal(true) }
  const openEdit = (k: KBItem) => {
    setEditing(k); setViewing(null)
    setForm({ title: k.title, client: k.client ?? '', category: k.category ?? '', content: k.content, tags: k.tags ?? '', drive_link: k.drive_link ?? '' })
    setShowModal(true)
  }
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = { ...form, client: form.client || null, category: form.category || null, tags: form.tags || null, drive_link: form.drive_link || null }
    if (editing) await fetch('/api/trabalho/kb', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    else await fetch('/api/trabalho/kb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setShowModal(false); fetch_()
  }
  const handleDelete = async (id: string) => {
    await fetch(`/api/trabalho/kb?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(k => k.id !== id))
    if (viewing?.id === id) setViewing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setCat('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === 'all' ? 'var(--accent)' : 'transparent', color: catFilter === 'all' ? '#fff' : 'var(--text3)' }}>Todos</button>
          {KB_CATS.map(c => (<button key={c} onClick={() => setCat(c)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === c ? 'var(--accent)' : 'transparent', color: catFilter === c ? '#fff' : 'var(--text3)' }}>{c}</button>))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar procedimentos..." style={inp({ width: 200, padding: '6px 10px', fontSize: 12 })} />
        <button onClick={openAdd} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Novo procedimento</button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>{[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 10 }} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>{items.length === 0 ? 'Nenhum procedimento ainda.' : 'Nenhum procedimento encontrado.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(k => (
            <div key={k.id} onClick={() => setViewing(k)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)40')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{k.title}</div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(k) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .6 }}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(k.id) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4 }}>✕</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {k.client && <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 8 }}>{k.client}</span>}
                {k.category && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 7px', borderRadius: 8 }}>{k.category}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>{k.content}</div>
              {k.tags && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)' }}>{k.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (<span key={t} style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 6, marginRight: 4 }}>#{t}</span>))}</div>}
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)' }}>{new Date(k.updated_at).toLocaleDateString('pt-BR')}{k.drive_link && <a href={k.drive_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ marginLeft: 8, color: 'var(--accent)' }}>📁 Drive</a>}</div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <ModalPortal onClose={() => setViewing(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 640, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{viewing.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {viewing.client && <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 8 }}>{viewing.client}</span>}
                  {viewing.category && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 8px', borderRadius: 8 }}>{viewing.category}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {viewing.drive_link && <a href={viewing.drive_link} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>📁 Drive</a>}
                <button onClick={() => openEdit(viewing)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent)20', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>✏️ Editar</button>
                <button onClick={() => setViewing(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 16, maxHeight: 500, overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{viewing.content}</pre>
            </div>
            {viewing.tags && <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>{viewing.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (<span key={t} style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: 8, marginRight: 4 }}>#{t}</span>))}</div>}
          </div>
        </ModalPortal>
      )}

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 580, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar procedimento' : 'Novo procedimento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Título *</Lbl><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ex: Reset de senha no AD" style={inp()} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Cliente</Lbl><input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Nome do cliente ou 'Geral'" style={inp()} /></div>
              <div><Lbl>Categoria</Lbl>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                  <option value="">–</option>{KB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Conteúdo *</Lbl><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Descreva passo a passo..." rows={10} style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div><Lbl>Tags</Lbl><input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="ex: AD, senha, usuario" style={inp()} /></div>
              <div><Lbl>Link Drive</Lbl><input value={form.drive_link} onChange={e => setForm(p => ({ ...p, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." style={inp()} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

const TEMPLATE_CATS = ['Abertura', 'Andamento', 'Ag. cliente', 'Encerramento', 'Escalação', 'Outros']

function TemplatesTab() {
  const [items, setItems]         = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [catFilter, setCat]       = useState('all')
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Template | null>(null)
  const [form, setForm]           = useState({ title: '', content: '', category: '' })
  const { copied, copy }          = useCopy()
  const [seeded, setSeeded]       = useState(false)

  const fetch_ = async () => {
    setLoading(true)
    try { const r = await fetch('/api/trabalho/templates').then(r => r.json()); setItems(r.items ?? []) } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const seedDefaults = async () => {
    for (const t of DEFAULT_TEMPLATES) await fetch('/api/trabalho/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
    setSeeded(true); fetch_()
  }

  const filtered = useMemo(() => items.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (search) { const q = search.toLowerCase(); if (!i.title.toLowerCase().includes(q) && !i.content.toLowerCase().includes(q)) return false }
    return true
  }), [items, catFilter, search])

  const openAdd = () => { setEditing(null); setForm({ title: '', content: '', category: '' }); setShowModal(true) }
  const openEdit = (t: Template) => { setEditing(t); setForm({ title: t.title, content: t.content, category: t.category ?? '' }); setShowModal(true) }
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = { ...form, category: form.category || null }
    if (editing) await fetch('/api/trabalho/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    else await fetch('/api/trabalho/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setShowModal(false); fetch_()
  }
  const handleDelete = async (id: string) => {
    await fetch(`/api/trabalho/templates?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(t => t.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setCat('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === 'all' ? 'var(--accent)' : 'transparent', color: catFilter === 'all' ? '#fff' : 'var(--text3)' }}>Todos</button>
          {TEMPLATE_CATS.map(c => (<button key={c} onClick={() => setCat(c)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === c ? 'var(--accent)' : 'transparent', color: catFilter === c ? '#fff' : 'var(--text3)' }}>{c}</button>))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar templates..." style={inp({ width: 180, padding: '6px 10px', fontSize: 12 })} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {items.length === 0 && !seeded && (
            <button onClick={seedDefaults} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)15', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✨ Carregar templates padrão</button>
          )}
          <button onClick={openAdd} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Novo template</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>{items.length === 0 ? 'Nenhum template ainda.' : 'Nenhum template encontrado.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
                  {t.category && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 7px', borderRadius: 8, marginTop: 3, display: 'inline-block' }}>{t.category}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .6 }}>✏️</button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4 }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any, flex: 1 }}>{t.content}</div>
              <button onClick={() => copy(t.id, t.content)}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${copied === t.id ? '#6bcb77' : 'var(--border)'}`, background: copied === t.id ? '#6bcb7720' : 'var(--bg3)', color: copied === t.id ? '#6bcb77' : 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all .15s', marginTop: 'auto' }}>
                {copied === t.id ? '✓ Copiado!' : '📋 Copiar template'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 520, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar template' : 'Novo template'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Título *</Lbl><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do template" style={inp()} /></div>
              <div><Lbl>Categoria</Lbl>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                  <option value="">–</option>{TEMPLATE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}><Lbl>Conteúdo *</Lbl><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Texto do template..." rows={10} style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'tickets' | 'scripts' | 'kb' | 'templates'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'tickets',   label: 'Tickets',             icon: '🎫' },
  { id: 'scripts',   label: 'Scripts',              icon: '⚡' },
  { id: 'kb',        label: 'Base de Conhecimento', icon: '📖' },
  { id: 'templates', label: 'Templates',            icon: '📝' },
]

export default function TrabalhoPage() {
  const [tab, setTab]           = useState<Tab>('tickets')
  const [driveUrl, setDriveUrl] = useState('')
  const [showDriveInput, setShowDriveInput] = useState(false)

  useEffect(() => {
    try { setDriveUrl(localStorage.getItem('nexus_drive_url') ?? '') } catch {}
  }, [])

  const saveDriveUrl = (url: string) => {
    setDriveUrl(url)
    try { localStorage.setItem('nexus_drive_url', url) } catch {}
    setShowDriveInput(false)
  }

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Trabalho</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Tickets · Scripts · Base de Conhecimento · Templates</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {showDriveInput ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input defaultValue={driveUrl} id="drive-input" placeholder="URL da pasta do Drive" style={{ ...inp({ width: 280, padding: '6px 10px', fontSize: 12 }) }} />
              <button onClick={() => { const v = (document.getElementById('drive-input') as HTMLInputElement).value; saveDriveUrl(v) }} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Salvar</button>
              <button onClick={() => setShowDriveInput(false)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <>
              {driveUrl && <a href={driveUrl} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>📁 Abrir Drive</a>}
              <button onClick={() => setShowDriveInput(true)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }} title={driveUrl ? 'Alterar URL do Drive' : 'Configurar pasta do Drive'}>
                {driveUrl ? '⚙️' : '📁 Configurar Drive'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent', transition: 'color .15s',
              color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'tickets'   && <TicketsTab driveUrl={driveUrl} />}
      {tab === 'scripts'   && <ScriptsTab />}
      {tab === 'kb'        && <KBTab />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  )
}
