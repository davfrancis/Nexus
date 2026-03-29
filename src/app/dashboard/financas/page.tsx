'use client'

import { useState, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useFinancas } from '@/hooks/useFinancas'
import type { Transaction, FinancialGoal } from '@/types/database'

// ── Constants ──────────────────────────────────────────────────────
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATS: Record<string, { label: string; icon: string; color: string; budget: number }> = {
  alimentacao: { label: 'Alimentação', icon: '🍽️', color: '#ff6b6b', budget: 800 },
  saude:       { label: 'Saúde',       icon: '🏥', color: '#6bcb77', budget: 300 },
  lazer:       { label: 'Lazer',       icon: '🎮', color: '#c77dff', budget: 300 },
  compras:     { label: 'Compras',     icon: '🛍️', color: '#ffd93d', budget: 400 },
  transporte:  { label: 'Transporte',  icon: '🚗', color: '#4d96ff', budget: 400 },
  servicos:    { label: 'Serviços',    icon: '🔧', color: '#ff9a3c', budget: 350 },
  pix:         { label: 'PIX',         icon: '💸', color: '#00d4aa', budget: 500 },
  camila:      { label: 'Camila',      icon: '👩', color: '#f472b6', budget: 400 },
  david:       { label: 'David',       icon: '👨', color: '#60a5fa', budget: 400 },
  outros:      { label: 'Outros',      icon: '📦', color: '#94a3b8', budget: 300 },
}

const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Main Page ──────────────────────────────────────────────────────
export default function FinancasPage() {
  const {
    month, year, prevMonth, nextMonth,
    transactions, goals, loadingTx,
    totalExpense, totalIncome, balance,
    addTransaction, updateTransaction, deleteTransaction,
    addGoal, updateGoal, deleteGoal, addToGoal,
    refresh,
  } = useFinancas()

  const [tab, setTab] = useState<'overview' | 'transactions' | 'goals'>('overview')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  // ── Import / Export ───────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/financas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao importar')
      alert(`✅ ${data.imported} lançamentos importados com sucesso!`)
      await refresh()
    } catch (err: unknown) {
      alert('Erro: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/financas/transactions/all')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao exportar')
      const blob = new Blob([JSON.stringify({ transactions: data.transactions }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financas_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert('Erro: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // ── Derived ──────────────────────────────────────────────────
  const catTotals = useMemo(() => {
    const out: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      out[t.category] = (out[t.category] ?? 0) + Number(t.amount)
    })
    return out
  }, [transactions])

  const maxEntry = useMemo(() => {
    const entries = Object.entries(catTotals)
    if (!entries.length) return null
    return entries.sort((a, b) => b[1] - a[1])[0]
  }, [catTotals])

  const pieData = useMemo(() =>
    Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: CATS[k]?.label ?? k, value: v, color: CATS[k]?.color ?? '#888' }))
  , [catTotals])

  const filteredTx = useMemo(() => {
    let list = transactions
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter)
    if (search) list = list.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, catFilter, search])

  const s: React.CSSProperties = { flexShrink: 0 }

  // ── JSX ──────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .fin-card { border-radius: 12px; padding: 16px 18px; }
        .fin-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; margin-bottom: 14px; }
        .fin-tab { flex: 1; padding: 9px 4px; font-size: 13px; cursor: pointer; border: none; background: none; color: var(--text3); border-radius: 8px; transition: all .2s; font-weight: 500; }
        .fin-tab.active { background: linear-gradient(135deg, rgba(77,150,255,.2), rgba(199,125,255,.2)); color: var(--text); }
        .fin-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px; color: var(--text); font-size: 13px; outline: none; }
        .fin-input:focus { border-color: var(--accent2); }
        .fin-btn-save { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border: none; border-radius: 8px; padding: 9px 22px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .fin-btn-save:hover { opacity: .9; }
        .fin-btn-cancel { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 9px 16px; font-size: 13px; cursor: pointer; color: var(--text3); }
        .tx-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .tx-item:last-child { border-bottom: none; }
        .cat-chip { background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--text3); transition: all .15s; white-space: nowrap; }
        .cat-chip.active { color: #fff; border-color: transparent; font-weight: 600; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: var(--bg2); border: 1px solid var(--border2); border-radius: 14px; padding: 1.5rem; width: 100%; max-width: 480px; }
        .field label { display: block; font-size: 11px; color: var(--text3); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .05em; }
        .parcel-row { display: none; grid-column: 1/-1; background: rgba(199,125,255,.06); border: 1px solid rgba(199,125,255,.2); border-radius: 8px; padding: 10px 12px; gap: 10px; }
        .parcel-row.show { display: grid; grid-template-columns: 1fr 1fr; }
      `}</style>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-d)', color: 'var(--text)', margin: 0 }}>💰 Finanças</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Controle seus gastos e metas</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, textAlign: 'center', color: 'var(--text)' }}>{MONTHS[month - 1]} {year}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>›</button>
            </div>
            <button onClick={() => { setEditingTx(null); setShowForm(true) }}
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Novo lançamento
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {(['overview', 'transactions', 'goals'] as const).map(t => (
            <button key={t} className={`fin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? '📊 Visão Geral' : t === 'transactions' ? '📋 Lançamentos' : '🎯 Metas'}
            </button>
          ))}
        </div>

        {/* ══════ TAB: OVERVIEW ════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
              <div className="fin-card" style={{ background: 'linear-gradient(135deg,rgba(108,203,119,.15),rgba(77,150,255,.08))', border: '1px solid rgba(108,203,119,.25)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Saldo do mês</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: balance >= 0 ? '#6bcb77' : '#ff6b6b' }}>{fmt(balance)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Receitas − Despesas</div>
              </div>
              <div className="fin-card" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,.15),rgba(255,107,107,.05))', border: '1px solid rgba(255,107,107,.25)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total saídas</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b' }}>{fmt(totalExpense)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{transactions.filter(t => t.type === 'expense').length} lançamentos</div>
              </div>
              <div className="fin-card" style={{ background: 'linear-gradient(135deg,rgba(255,217,61,.12),rgba(255,217,61,.04))', border: '1px solid rgba(255,217,61,.25)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total entradas</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ffd93d' }}>{fmt(totalIncome)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{transactions.filter(t => t.type === 'income').length} lançamentos</div>
              </div>
              <div className="fin-card" style={{ background: 'linear-gradient(135deg,rgba(199,125,255,.15),rgba(77,150,255,.08))', border: '1px solid rgba(199,125,255,.25)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Maior gasto</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#c77dff', marginTop: 4 }}>
                  {maxEntry ? `${CATS[maxEntry[0]]?.icon ?? ''} ${CATS[maxEntry[0]]?.label ?? maxEntry[0]}` : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{maxEntry ? fmt(maxEntry[1]) : 'neste mês'}</div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="fin-panel" style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>📈 Por categoria (mês atual)</div>
                {loadingTx ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Carregando...</div> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(catTotals).filter(([,v]) => v > 0).map(([k, v]) => ({ name: CATS[k]?.icon ?? k, value: v, color: CATS[k]?.color ?? '#888' }))} margin={{ left: -20 }}>
                      <XAxis dataKey="name" tick={{ fill: 'rgba(240,240,255,.5)', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(240,240,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => 'R$' + Math.round(v / 1000) + 'k'} />
                      <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {Object.entries(catTotals).filter(([,v]) => v > 0).map(([k], i) => (
                          <Cell key={i} fill={CATS[k]?.color ?? '#888'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="fin-panel" style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>🍩 Distribuição</div>
                {pieData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Sem despesas</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text3)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="fin-panel">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>📊 Detalhamento por categoria</div>
              {Object.entries(CATS).map(([k, c]) => {
                const v = catTotals[k] ?? 0
                if (!v) return null
                const pct = Math.min(100, Math.round((v / c.budget) * 100))
                const over = pct > 90
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{c.icon}</div>
                    <div style={{ flex: 1, fontSize: 13 }}>{c.label}</div>
                    <div style={{ flex: 2, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: over ? '#ef4444' : c.color, borderRadius: 3, transition: 'width .6s' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, minWidth: 110, textAlign: 'right', color: over ? '#ef4444' : 'var(--text)' }}>
                      {fmt(v)} <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>/ {fmt(c.budget)}</span>
                    </div>
                  </div>
                )
              })}
              {Object.values(catTotals).every(v => !v) && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '1rem 0' }}>Nenhuma despesa neste mês</div>
              )}
            </div>
          </>
        )}

        {/* ══════ TAB: TRANSACTIONS ════════════════════════════ */}
        {tab === 'transactions' && (
          <>
            {/* Filter bar */}
            <div className="fin-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Lançamentos de {MONTHS[month - 1]}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                  <button onClick={() => importRef.current?.click()} disabled={importing}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 13px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {importing ? '⏳ Importando...' : '📥 Importar'}
                  </button>
                  <button onClick={handleExport}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 13px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📤 Exportar
                  </button>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }}>🔍</span>
                    <input
                      className="fin-input"
                      placeholder="Buscar..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: 30, width: 200 }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className={`cat-chip${catFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setCatFilter('all')}
                  style={catFilter === 'all' ? { background: 'var(--accent2)' } : {}}>
                  Todas
                </button>
                {Object.entries(CATS).filter(([k]) => transactions.some(t => t.category === k)).map(([k, c]) => (
                  <button key={k} className={`cat-chip${catFilter === k ? ' active' : ''}`}
                    onClick={() => setCatFilter(k)}
                    style={catFilter === k ? { background: c.color } : {}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fin-panel">
              {loadingTx ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: 13 }}>Carregando...</div>
              ) : filteredTx.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: 13 }}>Nenhum lançamento encontrado</div>
              ) : (
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {filteredTx.map(tx => {
                    const c = CATS[tx.category]
                    return (
                      <div key={tx.id} className="tx-item">
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: (c?.color ?? '#888') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                          {c?.icon ?? '💰'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {tx.description}
                            {tx.installment_group && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(199,125,255,.15)', border: '1px solid rgba(199,125,255,.3)', color: '#d8a8ff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, marginLeft: 6 }}>
                                💳 {tx.installment_num}/{tx.installment_total}
                              </span>
                            )}
                            {tx.repeat_type === 'monthly' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(77,150,255,.15)', border: '1px solid rgba(77,150,255,.3)', color: '#93c5fd', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, marginLeft: 6 }}>
                                🔁 recorrente
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                            {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {c?.label ?? tx.category}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'expense' ? '#ff6b6b' : '#6bcb77', flexShrink: 0 }}>
                          {tx.type === 'expense' ? '−' : '+'}{fmt(Number(tx.amount))}
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => { setEditingTx(tx); setShowForm(true) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, padding: '3px 7px', borderRadius: 4, transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
                          >✏️</button>
                          <button onClick={() => handleDeleteTx(tx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, padding: '3px 7px', borderRadius: 4, transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
                          >✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════ TAB: GOALS ═══════════════════════════════════ */}
        {tab === 'goals' && (
          <>
            <div className="fin-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Minhas metas</span>
                <button onClick={() => { setEditingGoal(null); setShowGoalModal(true) }}
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  + Nova meta
                </button>
              </div>

              {goals.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '2rem 0' }}>
                  Nenhuma meta criada. Clique em "+ Nova meta" para começar!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
                  {goals.map(g => {
                    const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
                    const r = 30, circ = 2 * Math.PI * r
                    const dash = circ * (pct / 100), gap = circ - dash
                    return (
                      <div key={g.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 2 }}>
                          <button onClick={() => {
                            const v = parseFloat(window.prompt(`Adicionar à meta "${g.name}"\nSaldo atual: ${fmt(g.current_amount)}`) ?? '')
                            if (v > 0) addToGoal(g.id, v)
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, padding: '2px 5px', borderRadius: 4 }} title="Adicionar valor">+</button>
                          <button onClick={() => { setEditingGoal(g); setShowGoalModal(true) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, padding: '2px 5px', borderRadius: 4 }}>✏️</button>
                          <button onClick={() => { if (window.confirm('Excluir esta meta?')) deleteGoal(g.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, padding: '2px 5px', borderRadius: 4 }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}>✕</button>
                        </div>
                        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 8px' }}>
                          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="36" cy="36" r={r} fill="none" stroke={g.color + '33'} strokeWidth="6" />
                            <circle cx="36" cy="36" r={r} fill="none" stroke={g.color} strokeWidth="6"
                              strokeDasharray={`${dash.toFixed(1)} ${gap.toFixed(1)}`} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 14, fontWeight: 700, color: g.color }}>{pct}%</div>
                        </div>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{g.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, padding: '0 20px', color: 'var(--text)' }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{fmt(g.current_amount)} / {fmt(g.target_amount)}</div>
                        {g.deadline && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>até {new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Budget per category */}
            <div className="fin-panel">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>💼 Orçamento por categoria</div>
              {Object.entries(CATS).map(([k, c]) => {
                const v = catTotals[k] ?? 0
                const bpct = Math.min(100, Math.round((v / c.budget) * 100))
                const over = bpct > 90
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{c.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--text)' }}>{c.label}</div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: bpct + '%', background: over ? '#ef4444' : c.color, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: over ? '#ef4444' : 'var(--text3)', minWidth: 120, textAlign: 'right' }}>{fmt(v)} / {fmt(c.budget)}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ══════ MODAL: TRANSACTION FORM ══════════════════════════════ */}
      {showForm && (
        <TxForm
          initial={editingTx}
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            if (editingTx) {
              await updateTransaction(editingTx.id, data)
            } else {
              await addTransaction(data as unknown as Parameters<typeof addTransaction>[0])
            }
            setShowForm(false)
          }}
        />
      )}

      {/* ══════ MODAL: GOAL FORM ═══════════════════════════════════ */}
      {showGoalModal && (
        <GoalForm
          initial={editingGoal}
          onClose={() => setShowGoalModal(false)}
          onSave={async (data) => {
            if (editingGoal) {
              await updateGoal(editingGoal.id, data)
            } else {
              await addGoal(data as Parameters<typeof addGoal>[0])
            }
            setShowGoalModal(false)
          }}
        />
      )}
    </>
  )

  function handleDeleteTx(tx: Transaction) {
    if (tx.installment_group) {
      const choice = window.confirm(
        `Excluir só esta parcela (${tx.installment_num}/${tx.installment_total})?\n\nOK = só esta   Cancelar = esta e as próximas`
      )
      deleteTransaction(tx.id, !choice)
    } else {
      if (window.confirm('Excluir este lançamento?')) deleteTransaction(tx.id)
    }
  }
}

// ── Transaction Form Modal ─────────────────────────────────────────
function TxForm({ initial, onClose, onSave }: {
  initial: Transaction | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}) {
  const isEdit = !!initial
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [type, setType] = useState<'expense' | 'income'>(initial?.type ?? 'expense')
  const [category, setCategory] = useState(initial?.category ?? 'alimentacao')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [repeatType, setRepeatType] = useState<'none' | 'monthly'>('none')
  const [installCount, setInstallCount] = useState(2)
  const [installAmt, setInstallAmt] = useState('')
  const [saving, setSaving] = useState(false)

  const showParcel = !isEdit && type === 'expense' && repeatType === 'parcel' as string

  async function handleSubmit() {
    if (!desc || !amount || !date) return
    setSaving(true)
    const data: Record<string, unknown> = { description: desc, amount: parseFloat(amount), type, category, date }
    if (!isEdit) {
      if ((repeatType as string) === 'parcel') {
        data.installments = { count: installCount, amount_per: installAmt ? parseFloat(installAmt) : undefined }
      } else {
        data.repeat_type = repeatType
      }
    }
    await onSave(data)
    setSaving(false)
  }

  const perParcel = installAmt ? parseFloat(installAmt) : (parseFloat(amount || '0') / installCount)

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
          {isEdit ? 'Editar lançamento' : 'Novo lançamento'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Descrição</label>
            <input className="fin-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Supermercado, Salário..." />
          </div>
          <div className="field">
            <label>Valor (R$)</label>
            <input className="fin-input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select className="fin-input" value={type} onChange={e => setType(e.target.value as 'expense' | 'income')}>
              <option value="expense">↓ Saída</option>
              <option value="income">↑ Entrada</option>
            </select>
          </div>
          <div className="field">
            <label>Categoria</label>
            <select className="fin-input" value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(CATS).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input className="fin-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {!isEdit && (
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Tipo de lançamento</label>
              <select className="fin-input" value={repeatType} onChange={e => setRepeatType(e.target.value as 'none' | 'monthly')}>
                <option value="none">Único</option>
                <option value="monthly">Recorrente (todo mês)</option>
                <option value="parcel">Parcelado</option>
              </select>
            </div>
          )}
          {showParcel && (
            <div className="parcel-row show" style={{ gridColumn: '1/-1' }}>
              <div className="field">
                <label>Nº de parcelas</label>
                <input className="fin-input" type="number" min="2" max="60" value={installCount} onChange={e => setInstallCount(parseInt(e.target.value) || 2)} />
              </div>
              <div className="field">
                <label>Valor por parcela</label>
                <input className="fin-input" type="number" step="0.01" min="0" placeholder="Auto" value={installAmt} onChange={e => setInstallAmt(e.target.value)} />
              </div>
              {parseFloat(amount || '0') > 0 && (
                <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#c77dff' }}>
                  💳 {installCount}x de {fmt(perParcel)} = {fmt(perParcel * installCount)} total
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="fin-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="fin-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar lançamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Goal Form Modal ────────────────────────────────────────────────
const GOAL_COLORS = [
  { label: 'Verde',    value: '#6bcb77' },
  { label: 'Azul',     value: '#4d96ff' },
  { label: 'Roxo',     value: '#c77dff' },
  { label: 'Amarelo',  value: '#ffd93d' },
  { label: 'Vermelho', value: '#ff6b6b' },
  { label: 'Laranja',  value: '#ff9a3c' },
  { label: 'Rosa',     value: '#f472b6' },
  { label: 'Teal',     value: '#00d4aa' },
]

function GoalForm({ initial, onClose, onSave }: {
  initial: FinancialGoal | null
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [current, setCurrent] = useState(initial?.current_amount ? String(initial.current_amount) : '0')
  const [target, setTarget] = useState(initial?.target_amount ? String(initial.target_amount) : '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6bcb77')
  const [icon, setIcon] = useState(initial?.icon ?? '🎯')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name || !target) return
    setSaving(true)
    await onSave({ name, current_amount: parseFloat(current) || 0, target_amount: parseFloat(target), deadline: deadline || null, color, icon })
    setSaving(false)
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)' }}>
          {initial ? 'Editar meta' : 'Nova meta'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Nome da meta</label>
            <input className="fin-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reserva de emergência, Viagem..." />
          </div>
          <div className="field">
            <label>Valor atual (R$)</label>
            <input className="fin-input" type="number" step="0.01" min="0" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Valor alvo (R$)</label>
            <input className="fin-input" type="number" step="0.01" min="0" value={target} onChange={e => setTarget(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label>Prazo (opcional)</label>
            <input className="fin-input" type="month" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="field">
            <label>Emoji</label>
            <input className="fin-input" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} style={{ fontSize: 20, textAlign: 'center' }} />
          </div>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {GOAL_COLORS.map(c => (
                <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                  style={{ width: 28, height: 28, borderRadius: 7, background: c.value, border: color === c.value ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'all .1s' }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="fin-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="fin-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar meta'}
          </button>
        </div>
      </div>
    </div>
  )
}
