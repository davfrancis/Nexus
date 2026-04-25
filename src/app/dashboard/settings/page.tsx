'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Calendar, Check, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [phone, setPhone]   = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [hasGcal, setHasGcal] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles')
        .select('whatsapp_phone, whatsapp_api_key, google_access_token')
        .eq('id', user.id).single()
      if (data) {
        setPhone(data.whatsapp_phone ?? '')
        setApiKey(data.whatsapp_api_key ?? '')
        setHasGcal(!!data.google_access_token)
      }
    }
    load()
  }, [])

  const saveWhatsApp = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      whatsapp_phone: phone.trim() || null,
      whatsapp_api_key: apiKey.trim() || null,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const testWhatsApp = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      const encoded = encodeURIComponent('✅ *NEXUS* — Teste de notificação WhatsApp funcionando!')
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`
      const res = await fetch(url)
      setTestMsg(res.ok ? 'Mensagem enviada! Verifique seu WhatsApp.' : 'Falha ao enviar. Verifique o número e a API key.')
    } catch {
      setTestMsg('Erro de rede ao tentar enviar.')
    }
    setTesting(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
  }
  const label: React.CSSProperties = {
    fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 6, display: 'block',
  }

  return (
    <div className="page-enter" style={{ padding: 28, maxWidth: 600 }}>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, letterSpacing: -.5, marginBottom: 6 }}>Configurações</h1>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 32 }}>Integrações e notificações</p>

      {/* Google Calendar */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Calendar size={18} strokeWidth={1.75} color="var(--accent)" />
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Google Calendar</h2>
          {hasGcal && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', padding: '2px 10px', borderRadius: 100 }}>
              Conectado
            </span>
          )}
        </div>
        {hasGcal ? (
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Sua conta Google está conectada. Tarefas com "Vincular ao Calendário" ativado serão criadas automaticamente no Google Calendar.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
              Faça login novamente com sua conta Google para conectar o Google Calendar.
            </p>
            <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Reconectar Google <ExternalLink size={13} />
            </a>
          </>
        )}
      </div>

      {/* WhatsApp via CallMeBot */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <MessageSquare size={18} strokeWidth={1.75} color="#25D366" />
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Notificações WhatsApp</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          Usa o CallMeBot (gratuito). Para ativar:{' '}
          <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent2)' }}>
            envie "I allow callmebot to send me messages" para +34 644 36 04 52 no WhatsApp
          </a>{' '}
          e aguarde a API key chegar.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Seu número (com código do país, sem +)</label>
          <input
            style={inp} placeholder="5511999999999"
            value={phone} onChange={e => setPhone(e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Ex: 5511999999999 (Brasil +55, DDD, número)</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={label}>API Key do CallMeBot</label>
          <input
            style={inp} placeholder="123456"
            value={apiKey} onChange={e => setApiKey(e.target.value)}
          />
        </div>

        {testMsg && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: testMsg.includes('enviada') ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${testMsg.includes('enviada') ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
            color: testMsg.includes('enviada') ? 'var(--green)' : 'var(--red)' }}>
            {testMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveWhatsApp} disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saved ? <><Check size={13} /> Salvo!</> : saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={testWhatsApp} disabled={testing || !phone || !apiKey}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer', opacity: (!phone || !apiKey) ? 0.5 : 1 }}>
            {testing ? 'Enviando...' : 'Testar'}
          </button>
        </div>
      </div>
    </div>
  )
}
