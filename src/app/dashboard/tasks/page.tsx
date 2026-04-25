'use client'

import { useState, useEffect } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useTaskReminders } from '@/hooks/useTaskReminders'
import type { Task } from '@/types/database'
import ModalPortal from '@/components/ModalPortal'
import { useRouter } from 'next/navigation'
import { Bell, RefreshCw, Calendar, BellRing } from 'lucide-react'

const COLS = [
  { key: 'todo',  label: 'A Fazer',   color: 'var(--text3)' },
  { key: 'doing', label: 'Fazendo',   color: 'var(--amber)' },
  { key: 'done',  label: 'Concluído', color: 'var(--green)' },
] as const

const CAT_COLORS: Record<string, string> = {
  work: '#3B82F6', personal: '#EC4899', gym: '#22C55E', study: '#F59E0B', urgent: '#EF4444'
}
const PRIORITIES = ['high', 'medium', 'low'] as const
const CATEGORIES = ['work', 'personal', 'gym', 'study', 'urgent'] as const

const REMINDER_OPTIONS = [
  { value: 'none',   label: 'Sem lembrete' },
  { value: '15min',  label: '15 minutos antes' },
  { value: '30min',  label: '30 minutos antes' },
  { value: '1h',     label: '1 hora antes' },
  { value: '2h',     label: '2 horas antes' },
  { value: '6h',     label: '6 horas antes' },
  { value: '12h',    label: '12 horas antes' },
  { value: '1day',   label: '1 dia antes' },
  { value: '2days',  label: '2 dias antes' },
  { value: '3days',  label: '3 dias antes' },
  { value: '1week',  label: '1 semana antes' },
]

const RECURRENCE_OPTIONS = [
  { value: 'none',      label: 'Não repetir' },
  { value: 'daily',     label: 'Diariamente' },
  { value: 'weekly',    label: 'Semanalmente' },
  { value: 'biweekly',  label: 'A cada 2 semanas' },
  { value: 'monthly',   label: 'Mensalmente' },
  { value: 'yearly',    label: 'Anualmente' },
]

const EMPTY_FORM = {
  title: '', description: '', category: 'work', priority: 'medium',
  status: 'todo',
  start_date: '', start_time: '', start_reminder_type: 'none',
  due_date: '', due_time: '', calendar_linked: false,
  reminder_type: 'none', recurrence: 'none', recurrence_end: '',
}

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask, moveTask } = useTasks()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [filter, setFilter] = useState<string>('all')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const router = useRouter()

  const { requestPermission } = useTaskReminders(notifPermission === 'granted')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const handleEnableNotifications = async () => {
    const result = await requestPermission()
    setNotifPermission(result as NotificationPermission)
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true) }
  const openEdit = (t: Task) => {
    setEditing(t)
    setForm({
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      status: t.status,
      start_date: t.start_date || '',
      start_time: t.start_time || '',
      start_reminder_type: t.start_reminder_type || 'none',
      due_date: t.due_date || '',
      due_time: t.due_time || '',
      calendar_linked: t.calendar_linked ?? false,
      reminder_type: t.reminder_type || 'none',
      recurrence: t.recurrence || 'none',
      recurrence_end: t.recurrence_end || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      description: form.description || null,
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      start_reminder_type: form.start_date ? form.start_reminder_type : 'none',
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      calendar_linked: form.calendar_linked && !!form.due_date,
      reminder_type: form.due_date ? form.reminder_type : 'none',
      recurrence_end: form.recurrence_end || null,
    }
    if (editing) {
      await updateTask(editing.id, payload as any)
    } else {
      await addTask(payload as any)
    }
    setShowModal(false)
  }

  const inp = (style: React.CSSProperties = {}) => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', ...style
  })

  const goToCalendar = (dueDate: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('agenda_focus_date', dueDate)
    }
    router.push('/dashboard/agenda')
  }

  const reminderBadge = (t: Task) => {
    if (!t.reminder_type || t.reminder_type === 'none') return null
    const opt = REMINDER_OPTIONS.find(o => o.value === t.reminder_type)
    return opt?.label.replace(' antes', '') ?? null
  }

  const recurrenceBadge = (t: Task) => {
    if (!t.recurrence || t.recurrence === 'none') return null
    const opt = RECURRENCE_OPTIONS.find(o => o.value === t.recurrence)
    return opt?.label ?? null
  }

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5 }}>Tarefas</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {tasks.filter(t => t.status !== 'done').length} pendentes · {tasks.filter(t => t.status === 'done').length} concluídas
            {tasks.filter(t => t.calendar_linked).length > 0 && (
              <span style={{ marginLeft: 10, color: 'var(--accent2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} strokeWidth={1.75} /> {tasks.filter(t => t.calendar_linked).length} no calendário
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Botão ativar notificações do browser */}
          {notifPermission !== 'granted' && notifPermission !== 'denied' && (
            <button onClick={handleEnableNotifications}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={13} strokeWidth={1.75} /> Ativar alertas
            </button>
          )}
          {notifPermission === 'granted' && (
            <span style={{ fontSize: 11, color: 'var(--green)', padding: '5px 10px', borderRadius: 8, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <BellRing size={12} strokeWidth={1.75} /> Alertas ativos
            </span>
          )}
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
                      style={{
                        background: 'var(--bg3)',
                        border: `1px solid ${t.calendar_linked ? 'rgba(124,111,212,.35)' : 'var(--border)'}`,
                        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                        position: 'relative',
                      }}
                      onClick={() => openEdit(t)}
                    >
                      {t.calendar_linked && (
                        <div style={{
                          position: 'absolute', top: 8, right: 34,
                          fontSize: 10, padding: '1px 7px', borderRadius: 100,
                          background: 'rgba(99,102,241,.12)', color: 'var(--accent2)',
                          fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <Calendar size={10} strokeWidth={1.75} /> agenda
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1, paddingRight: t.calendar_linked ? 64 : 0 }}>{t.title}</span>
                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, flexShrink: 0, opacity: .5, padding: 0 }}>✕</button>
                      </div>
                      {t.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>{t.description}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${CAT_COLORS[t.category]}20`, color: CAT_COLORS[t.category], fontWeight: 600 }}>{t.category}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--bg4)', color: t.priority === 'high' ? 'var(--red)' : t.priority === 'medium' ? 'var(--amber)' : 'var(--green)' }}>{t.priority}</span>
                        {t.start_date && <span style={{ fontSize: 10, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><span style={{ opacity: .5 }}>desde</span> {t.start_date}</span>}
                        {t.due_date && (
                          <span style={{ fontSize: 10, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={9} strokeWidth={1.75} /> {t.due_date}{t.due_time ? ` ${t.due_time}` : ''}
                          </span>
                        )}
                        {reminderBadge(t) && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(245,158,11,.1)', color: 'var(--amber)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Bell size={9} strokeWidth={1.75} /> {reminderBadge(t)}
                          </span>
                        )}
                        {recurrenceBadge(t) && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(59,130,246,.1)', color: 'var(--blue)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <RefreshCw size={9} strokeWidth={1.75} /> {recurrenceBadge(t)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {col.key !== 'done' && (
                          <button onClick={e => { e.stopPropagation(); moveTask(t.id) }}
                            style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>
                            Mover →
                          </button>
                        )}
                        {t.calendar_linked && t.due_date && (
                          <button onClick={e => { e.stopPropagation(); goToCalendar(t.due_date!) }}
                            style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid rgba(124,111,212,.4)', background: 'rgba(124,111,212,.08)', color: 'var(--accent2)', fontSize: 11, cursor: 'pointer' }}>
                            Ver na Agenda
                          </button>
                        )}
                      </div>
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
        <ModalPortal onClose={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 28, width: 520, maxWidth: 'calc(100% - 32px)', margin: '40px auto' }}>
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

            {/* Data de início + Horário de início */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Data de início</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp()} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Horário</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                  disabled={!form.start_date}
                  style={{ ...inp(), opacity: form.start_date ? 1 : 0.5 }}
                />
              </div>
            </div>

            {/* Lembrete de início */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Bell size={11} strokeWidth={1.75} /> Lembrete de início
              </label>
              <select
                value={form.start_reminder_type}
                onChange={e => setForm(p => ({ ...p, start_reminder_type: e.target.value }))}
                disabled={!form.start_date}
                style={{ ...inp(), opacity: form.start_date ? 1 : 0.5 }}
              >
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!form.start_date && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Defina uma data de início para ativar</div>
              )}
            </div>

            {/* Data de conclusão + Horário */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Data de conclusão</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inp()} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Horário</label>
                <input
                  type="time"
                  value={form.due_time}
                  onChange={e => setForm(p => ({ ...p, due_time: e.target.value }))}
                  disabled={!form.due_date}
                  style={{ ...inp(), opacity: form.due_date ? 1 : 0.5 }}
                />
              </div>
            </div>

            {/* Lembrete */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Bell size={11} strokeWidth={1.75} /> Lembrete
              </label>
              <select
                value={form.reminder_type}
                onChange={e => setForm(p => ({ ...p, reminder_type: e.target.value }))}
                disabled={!form.due_date}
                style={{ ...inp(), opacity: form.due_date ? 1 : 0.5 }}
              >
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!form.due_date && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Defina uma data limite para ativar lembretes
                </div>
              )}
              {form.due_date && form.reminder_type !== 'none' && notifPermission !== 'granted' && (
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Notificações do navegador não autorizadas.{' '}
                  <button onClick={handleEnableNotifications}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                    Ativar agora
                  </button>
                </div>
              )}
            </div>

            {/* Recorrência */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={11} strokeWidth={1.75} /> Repetição
              </label>
              <select
                value={form.recurrence}
                onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}
                style={inp()}
              >
                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {form.recurrence !== 'none' && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Repetir até (opcional)</label>
                  <input type="date" value={form.recurrence_end}
                    onChange={e => setForm(p => ({ ...p, recurrence_end: e.target.value }))}
                    style={inp()} />
                </div>
              )}
            </div>

            {/* Toggle Vincular ao Calendário */}
            <div
              onClick={() => setForm(p => ({ ...p, calendar_linked: !p.calendar_linked }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: form.calendar_linked ? 'rgba(124,111,212,.1)' : 'var(--bg3)',
                border: `1px solid ${form.calendar_linked ? 'rgba(124,111,212,.4)' : 'var(--border)'}`,
                transition: 'all .2s',
              }}
            >
              <div style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: form.calendar_linked ? 'var(--accent)' : 'var(--bg4)',
                position: 'relative', transition: 'background .2s',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: form.calendar_linked ? 18 : 3,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: form.calendar_linked ? 'var(--accent2)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} strokeWidth={1.75} /> Vincular ao Calendário
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {form.calendar_linked
                    ? form.due_date
                      ? 'Evento será criado na data limite'
                      : '⚠️ Defina uma data limite para vincular'
                    : 'Criar evento espelho na Agenda'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                {editing ? 'Salvar' : form.calendar_linked && form.due_date ? 'Criar e Vincular' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
