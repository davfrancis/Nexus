'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import ModalPortal from '@/components/ModalPortal'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MovideskTicket {
  id: number
  subject: string
  createdDate: string
  lastUpdate: string
  statusId: number
  statusName: string
  urgencyId: number
  urgencyName: string
  clientName: string
  lastResponder: 'agent' | 'client' | 'none'
  lastActionDate: string | null
  lastActionPreview: string | null
  daysOpen: number
  url: string
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

const MV_STATUS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Novo',          color: '#4d96ff',       bg: '#4d96ff20' },
  2: { label: 'Em andamento',  color: 'var(--accent)',  bg: 'var(--accent)20' },
  3: { label: 'Pausado',       color: '#ff9500',        bg: '#ff950020' },
  4: { label: 'Cancelado',     color: 'var(--text3)',   bg: 'var(--bg3)' },
  5: { label: 'Resolvido',     color: '#6bcb77',        bg: '#6bcb7720' },
  6: { label: 'Encerrado',     color: 'var(--text3)',   bg: 'var(--bg3)' },
}

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function mvBorderColor(t: MovideskTicket): string {
  if (t.lastResponder === 'client') return '#ff6b6b'
  if (t.daysOpen >= 8) return '#ff6b6b'
  if (t.daysOpen >= 5) return '#ff9500'
  if (t.daysOpen >= 3) return '#ffd93d'
  return 'var(--border)'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
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

// ─── Tickets Tab (Movidesk) ──────────────────────────────────────────────────

type MvGroup = 'all' | 'needs_response' | 'overdue' | 'waiting'

function TicketsTab() {
  const [token, setToken]               = useState('')
  const [tokenInput, setTokenInput]     = useState('')
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [tickets, setTickets]           = useState<MovideskTicket[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [lastFetched, setLastFetched]   = useState<Date | null>(null)
  const [group, setGroup]               = useState<MvGroup>('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<MovideskTicket | null>(null)
  const [draft, setDraft]               = useState('')
  const [templates, setTemplates]       = useState<Template[]>([])
  const [showTplPicker, setShowTplPicker] = useState(false)
  const [cobrarTicket, setCobrarTicket] = useState<MovideskTicket | null>(null)
  const [cobrarText, setCobrarText]     = useState('')
  const { copied, copy }                = useCopy()

  useEffect(() => {
    try {
      const t = localStorage.getItem('nexus_movidesk_token') ?? ''
      setToken(t)
      setTokenInput(t)
    } catch {}
    fetch('/api/trabalho/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { if (token) fetchTickets() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTickets = async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/trabalho/movidesk', {
        headers: { 'x-movidesk-token': token },
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setTickets(d.tickets ?? [])
      setLastFetched(new Date())
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const saveToken = () => {
    const t = tokenInput.trim()
    try { localStorage.setItem('nexus_movidesk_token', t) } catch {}
    setToken(t)
    setShowTokenForm(false)
  }

  const needsResp = useMemo(() => tickets.filter(t => t.lastResponder === 'client'), [tickets])
  const overdue   = useMemo(() => tickets.filter(t => t.daysOpen >= 5 && ![3, 4, 5, 6].includes(t.statusId)), [tickets])
  const waiting   = useMemo(() => tickets.filter(t => t.lastResponder === 'agent'), [tickets])

  const filtered = useMemo(() => {
    const base = group === 'needs_response' ? needsResp
      : group === 'overdue' ? overdue
      : group === 'waiting' ? waiting
      : tickets
    if (!search) return base
    const q = search.toLowerCase()
    return base.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    )
  }, [tickets, group, search, needsResp, overdue, waiting])

  const openCobrar = (t: MovideskTicket, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(null)
    setCobrarTicket(t)
    setCobrarText(
      `Olá, ${t.clientName},\n\nPassamos para dar um retorno sobre o chamado #${t.id} - ${t.subject}.\n\nGostaríamos de confirmar se ainda precisam de auxílio ou se o problema foi resolvido.\n\nPor favor, retorne assim que possível para darmos continuidade ao seu atendimento.\n\nAtenciosamente,\nSuporte de TI`
    )
  }

  // ── No token ──────────────────────────────────────────────────────────────
  if (!token && !showTokenForm) {
    return (
      <div style={{ maxWidth: 380, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎫</div>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Conectar ao Movidesk</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
          Configure seu token de API para visualizar e gerenciar seus tickets do Movidesk diretamente aqui.
        </div>
        <button onClick={() => setShowTokenForm(true)}
          style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          Configurar token
        </button>
      </div>
    )
  }

  // ── Token form ────────────────────────────────────────────────────────────
  if (showTokenForm) {
    return (
      <div style={{ maxWidth: 420, margin: '40px auto' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 17, fontWeight: 700 }}>Token do Movidesk</div>
            {token && (
              <button onClick={() => setShowTokenForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            )}
          </div>
          <Lbl>Token de API</Lbl>
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveToken()}
            placeholder="Cole seu token do Movidesk aqui"
            style={{ ...inp(), marginBottom: 8 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
            Movidesk → Configurações → Conta → Integração → Token de API Pessoal
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {token && (
              <button onClick={() => setShowTokenForm(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
            <button onClick={saveToken}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Conectar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total abertos',   val: tickets.length,   color: 'var(--text)' },
          { label: 'Resp. pendente',  val: needsResp.length, color: needsResp.length > 0 ? '#ff6b6b' : 'var(--text3)' },
          { label: 'Em atraso (+5d)', val: overdue.length,   color: overdue.length > 0  ? '#ff9500' : 'var(--text3)' },
          { label: 'Ag. cliente',     val: waiting.length,   color: '#ffd93d' },
          { label: 'Atualizado',      val: lastFetched
              ? lastFetched.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—',
            color: 'var(--text3)', small: true },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: (s as any).small ? 17 : 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-d)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Alert: client responded */}
      {needsResp.length > 0 && (
        <div style={{ background: '#ff6b6b12', border: '1px solid #ff6b6b35', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#ff6b6b', flex: 1 }}>
            🗣️ <strong>{needsResp.length}</strong> ticket{needsResp.length > 1 ? 's' : ''} com resposta do cliente aguardando sua atenção
          </span>
          <button onClick={() => setGroup('needs_response')}
            style={{ fontSize: 12, color: '#ff6b6b', background: '#ff6b6b20', border: '1px solid #ff6b6b40', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
            Ver todos
          </button>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {([
            { id: 'all'            as MvGroup, label: `Todos (${tickets.length})` },
            { id: 'needs_response' as MvGroup, label: `Responder (${needsResp.length})`, alert: needsResp.length > 0 },
            { id: 'overdue'        as MvGroup, label: `Atrasados (${overdue.length})`,   warn: overdue.length > 0 },
            { id: 'waiting'        as MvGroup, label: `Ag. cliente (${waiting.length})` },
          ]).map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              style={{
                padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: group === g.id
                  ? ((g as any).alert ? '#ff6b6b' : (g as any).warn ? '#ff9500' : 'var(--accent)')
                  : 'transparent',
                color: group === g.id ? '#fff'
                  : (g as any).alert ? '#ff6b6b' : (g as any).warn ? '#ff9500' : 'var(--text3)',
              }}>
              {g.label}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, cliente, nº..."
          style={inp({ width: 220, padding: '6px 10px', fontSize: 12 })}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={fetchTickets} disabled={loading}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: loading ? 'var(--text3)' : 'var(--text)', fontSize: 12, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? '↻ Carregando…' : '↻ Atualizar'}
          </button>
          <button onClick={() => setShowTokenForm(true)} title="Alterar token Movidesk"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#ff6b6b12', border: '1px solid #ff6b6b35', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#ff6b6b' }}>
          ⚠️ Erro: {error}
          <button onClick={fetchTickets}
            style={{ marginLeft: 12, fontSize: 12, color: '#ff6b6b', background: '#ff6b6b20', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>
          {tickets.length === 0
            ? 'Nenhum ticket aberto no Movidesk.'
            : 'Nenhum ticket encontrado com os filtros selecionados.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => {
            const bc = mvBorderColor(t)
            const st = MV_STATUS[t.statusId] ?? { label: t.statusName, color: 'var(--text3)', bg: 'var(--bg3)' }
            const isClient = t.lastResponder === 'client'
            return (
              <div key={t.id} onClick={() => { setSelected(t); setDraft('') }}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `4px solid ${bc}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <a href={t.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent)15', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', flexShrink: 0, textDecoration: 'none', fontWeight: 600 }}>
                    #{t.id}
                  </a>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 120 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{t.clientName}</span>
                  <span style={{ fontSize: 10, background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 8, fontWeight: 600, flexShrink: 0 }}>{st.label}</span>
                  <span style={{ fontSize: 11, color: bc === 'var(--border)' ? 'var(--text3)' : bc, fontWeight: t.daysOpen >= 5 ? 700 : 400, flexShrink: 0 }}>
                    {t.daysOpen}d
                  </span>
                  {isClient && (
                    <button onClick={e => openCobrar(t, e)}
                      style={{ fontSize: 10, color: '#ff6b6b', background: '#ff6b6b15', border: '1px solid #ff6b6b40', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                      Cobrar
                    </button>
                  )}
                </div>
                {t.lastActionPreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: isClient ? '#ff6b6b' : 'var(--text3)', fontWeight: 700, flexShrink: 0 }}>
                      {isClient ? '🗣️ Cliente:' : '✓ Agente:'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                      {t.lastActionPreview}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, opacity: .7 }}>
                      {timeAgo(t.lastActionDate)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Ticket detail modal ── */}
      {selected && (
        <ModalPortal onClose={() => setSelected(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 620, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: '#fff', background: 'var(--accent)', padding: '4px 12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontFamily: 'monospace' }}>
                    #{selected.id} ↗
                  </a>
                  {(() => {
                    const st = MV_STATUS[selected.statusId] ?? { label: selected.statusName, color: 'var(--text3)', bg: 'var(--bg3)' }
                    return <span style={{ fontSize: 11, background: st.bg, color: st.color, padding: '3px 9px', borderRadius: 8, fontWeight: 600 }}>{st.label}</span>
                  })()}
                  <span style={{ fontSize: 11, color: selected.daysOpen >= 5 ? '#ff9500' : 'var(--text3)', fontWeight: selected.daysOpen >= 5 ? 700 : 400 }}>
                    {selected.daysOpen}d aberto
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>{selected.subject}</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>👤 {selected.clientName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>⚡ {selected.urgencyName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>📅 {new Date(selected.createdDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>

            {/* Last action */}
            {selected.lastActionPreview && (
              <div style={{
                background: selected.lastResponder === 'client' ? '#ff6b6b0e' : 'var(--bg3)',
                border: `1px solid ${selected.lastResponder === 'client' ? '#ff6b6b30' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: selected.lastResponder === 'client' ? '#ff6b6b' : 'var(--text3)', marginBottom: 4 }}>
                  {selected.lastResponder === 'client' ? '🗣️ Última resposta: CLIENTE' : '✓ Última resposta: AGENTE'}
                  {selected.lastActionDate && (
                    <span style={{ fontWeight: 400, marginLeft: 8, opacity: .7 }}>{timeAgo(selected.lastActionDate)}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{selected.lastActionPreview}</div>
              </div>
            )}

            {/* Draft response */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Lbl>Rascunho de resposta</Lbl>
                <button onClick={() => setShowTplPicker(true)}
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent)15', border: 'none', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontWeight: 600 }}>
                  Usar template
                </button>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="Escreva aqui sua resposta para o cliente..." rows={4}
                style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
              {draft && (
                <button onClick={() => copy('draft', draft)}
                  style={{ marginTop: 6, fontSize: 11, color: copied === 'draft' ? '#6bcb77' : 'var(--text3)', background: copied === 'draft' ? '#6bcb7715' : 'var(--bg3)', border: `1px solid ${copied === 'draft' ? '#6bcb7730' : 'var(--border)'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                  {copied === 'draft' ? '✓ Copiado!' : '📋 Copiar resposta'}
                </button>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={e => openCobrar(selected, e)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ff6b6b35', background: '#ff6b6b12', color: '#ff6b6b', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                📢 Cobrar cliente
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={selected.url} target="_blank" rel="noreferrer"
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)35', background: 'var(--accent)15', color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Abrir no Movidesk ↗
                </a>
                <button onClick={() => setSelected(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Template picker */}
      {showTplPicker && (
        <ModalPortal onClose={() => setShowTplPicker(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 24, width: 480, maxWidth: 'calc(100% - 32px)', margin: '100px auto', maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Selecionar template</div>
              <button onClick={() => setShowTplPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {templates.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                Nenhum template. Crie na aba Templates.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(tpl => (
                  <button key={tpl.id} onClick={() => { setDraft(tpl.content); setShowTplPicker(false) }}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tpl.title}</div>
                    {tpl.category && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{tpl.category}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {tpl.content.split('\n')[0]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Cobrar modal */}
      {cobrarTicket && (
        <ModalPortal onClose={() => setCobrarTicket(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 500, maxWidth: 'calc(100% - 32px)', margin: '80px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>📢 Cobrar cliente</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>#{cobrarTicket.id} — {cobrarTicket.clientName}</div>
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
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setLang('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: langFilter === 'all' ? 'var(--accent)' : 'transparent', color: langFilter === 'all' ? '#fff' : 'var(--text3)' }}>
            Todos
          </button>
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar scripts..."
          style={inp({ width: 180, padding: '6px 10px', fontSize: 12 })} />
        <button onClick={openAdd}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          + Novo script
        </button>
      </div>

      {/* Script list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}
        </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : s.id)}>
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
                  <button onClick={e => { e.stopPropagation(); openEdit(s) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .6 }}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, opacity: .4 }}>✕</button>
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    <pre style={{ margin: 0, padding: '14px 16px', fontSize: 12, lineHeight: 1.6, color: 'var(--text)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 400, overflow: 'auto' }}>
                      {s.content}
                    </pre>
                  </div>
                )}
                {!isOpen && (
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

      {/* Script modal */}
      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 600, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar script' : 'Novo script'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Título *</Lbl>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do script" style={inp()} />
              </div>
              <div><Lbl>Linguagem</Lbl>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} style={inp()}>
                  {SCRIPT_LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Categoria</Lbl>
                <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: AD, Exchange, Backup..." style={inp()} />
              </div>
              <div><Lbl>Tags</Lbl>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="ex: usuario, senha, reset" style={inp()} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Lbl>Descrição</Lbl>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="O que esse script faz..." style={inp()} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Lbl>Código *</Lbl>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Cole ou escreva o script aqui..." rows={10}
                style={{ ...inp(), fontFamily: 'monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {editing ? 'Salvar' : 'Adicionar'}
              </button>
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
    try {
      const r = await fetch('/api/trabalho/kb').then(r => r.json())
      setItems(r.items ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const filtered = useMemo(() => items.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.title.toLowerCase().includes(q) &&
          !(i.client?.toLowerCase().includes(q)) &&
          !(i.tags?.toLowerCase().includes(q)) &&
          !i.content.toLowerCase().includes(q)) return false
    }
    return true
  }), [items, catFilter, search])

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_KB }); setShowModal(true) }
  const openEdit = (k: KBItem) => {
    setEditing(k)
    setForm({ title: k.title, client: k.client ?? '', category: k.category ?? '', content: k.content, tags: k.tags ?? '', drive_link: k.drive_link ?? '' })
    setViewing(null); setShowModal(true)
  }
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = { ...form, client: form.client || null, category: form.category || null, tags: form.tags || null, drive_link: form.drive_link || null }
    if (editing) {
      await fetch('/api/trabalho/kb', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/trabalho/kb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
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
          <button onClick={() => setCat('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === 'all' ? 'var(--accent)' : 'transparent', color: catFilter === 'all' ? '#fff' : 'var(--text3)' }}>
            Todos
          </button>
          {KB_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === c ? 'var(--accent)' : 'transparent', color: catFilter === c ? '#fff' : 'var(--text3)' }}>
              {c}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar procedimentos..."
          style={inp({ width: 200, padding: '6px 10px', fontSize: 12 })} />
        <button onClick={openAdd}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          + Novo procedimento
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>
          {items.length === 0 ? 'Nenhum procedimento ainda. Documente o que fez nos clientes para reutilizar depois.' : 'Nenhum procedimento encontrado.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(k => (
            <div key={k.id} onClick={() => setViewing(k)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)40')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
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
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>
                {k.content}
              </div>
              {k.tags && (
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)' }}>
                  {k.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 6, marginRight: 4 }}>#{t}</span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)' }}>
                {new Date(k.updated_at).toLocaleDateString('pt-BR')}
                {k.drive_link && <a href={k.drive_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ marginLeft: 8, color: 'var(--accent)' }}>📁 Drive</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <ModalPortal onClose={() => setViewing(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 640, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{viewing.title}</div>
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
            {viewing.tags && (
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
                {viewing.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: 8, marginRight: 4 }}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 580, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar procedimento' : 'Novo procedimento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Título *</Lbl>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ex: Reset de senha no AD" style={inp()} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Cliente</Lbl>
                <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Nome do cliente ou 'Geral'" style={inp()} />
              </div>
              <div><Lbl>Categoria</Lbl>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                  <option value="">–</option>
                  {KB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}><Lbl>Conteúdo / Procedimento *</Lbl>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Descreva passo a passo o que foi feito..." rows={10} style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div><Lbl>Tags</Lbl>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="ex: AD, senha, usuario" style={inp()} />
              </div>
              <div><Lbl>Link Drive (evidências)</Lbl>
                <input value={form.drive_link} onChange={e => setForm(p => ({ ...p, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." style={inp()} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {editing ? 'Salvar' : 'Adicionar'}
              </button>
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
    try {
      const r = await fetch('/api/trabalho/templates').then(r => r.json())
      setItems(r.items ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  const seedDefaults = async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await fetch('/api/trabalho/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
    }
    setSeeded(true)
    fetch_()
  }

  const filtered = useMemo(() => items.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.title.toLowerCase().includes(q) && !i.content.toLowerCase().includes(q)) return false
    }
    return true
  }), [items, catFilter, search])

  const openAdd = () => { setEditing(null); setForm({ title: '', content: '', category: '' }); setShowModal(true) }
  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({ title: t.title, content: t.content, category: t.category ?? '' })
    setShowModal(true)
  }
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = { ...form, category: form.category || null }
    if (editing) {
      await fetch('/api/trabalho/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/trabalho/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
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
          <button onClick={() => setCat('all')} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === 'all' ? 'var(--accent)' : 'transparent', color: catFilter === 'all' ? '#fff' : 'var(--text3)' }}>
            Todos
          </button>
          {TEMPLATE_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: catFilter === c ? 'var(--accent)' : 'transparent', color: catFilter === c ? '#fff' : 'var(--text3)' }}>
              {c}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar templates..."
          style={inp({ width: 180, padding: '6px 10px', fontSize: 12 })} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {items.length === 0 && !seeded && (
            <button onClick={seedDefaults}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)15', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ✨ Carregar templates padrão
            </button>
          )}
          <button onClick={openAdd}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            + Novo template
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', fontSize: 13 }}>
          {items.length === 0 ? 'Nenhum template ainda. Crie templates de resposta para usar nos tickets.' : 'Nenhum template encontrado.'}
        </div>
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
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any, flex: 1 }}>
                {t.content}
              </div>
              <button onClick={() => copy(t.id, t.content)}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${copied === t.id ? '#6bcb77' : 'var(--border)'}`, background: copied === t.id ? '#6bcb7720' : 'var(--bg3)', color: copied === t.id ? '#6bcb77' : 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all .15s', marginTop: 'auto' }}>
                {copied === t.id ? '✓ Copiado!' : '📋 Copiar template'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 520, maxWidth: 'calc(100% - 32px)', margin: '32px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar template' : 'Novo template'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><Lbl>Título *</Lbl>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do template" style={inp()} />
              </div>
              <div><Lbl>Categoria</Lbl>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp()}>
                  <option value="">–</option>
                  {TEMPLATE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}><Lbl>Conteúdo *</Lbl>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Texto do template de resposta..." rows={10} style={{ ...inp(), resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {editing ? 'Salvar' : 'Adicionar'}
              </button>
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
  const [tab, setTab]         = useState<Tab>('tickets')
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Trabalho</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Movidesk · Scripts · Base de Conhecimento · Templates</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {showDriveInput ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input defaultValue={driveUrl} id="drive-input" placeholder="URL da pasta do Drive"
                style={{ ...inp({ width: 280, padding: '6px 10px', fontSize: 12 }) }} />
              <button onClick={() => { const v = (document.getElementById('drive-input') as HTMLInputElement).value; saveDriveUrl(v) }}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                Salvar
              </button>
              <button onClick={() => setShowDriveInput(false)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <>
              {driveUrl ? (
                <a href={driveUrl} target="_blank" rel="noreferrer"
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📁 Abrir Drive
                </a>
              ) : null}
              <button onClick={() => setShowDriveInput(true)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
                title={driveUrl ? 'Alterar URL do Drive' : 'Configurar pasta do Drive'}>
                {driveUrl ? '⚙️' : '📁 Configurar Drive'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      {tab === 'tickets'   && <TicketsTab />}
      {tab === 'scripts'   && <ScriptsTab />}
      {tab === 'kb'        && <KBTab />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  )
}
