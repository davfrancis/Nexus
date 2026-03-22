// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const supabase = createClient()

  async function loginWithGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: [
          'openid email profile',
          'https://www.googleapis.com/auth/calendar',           // leitura + escrita
          'https://www.googleapis.com/auth/calendar.events',
        ].join(' '),
        queryParams: {
          access_type: 'offline',   // recebe refresh_token
          prompt: 'consent',        // garante refresh_token sempre
        },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0C0C0F', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{
        background: '#131318', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '48px 40px', width: 380, textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: '#9B8FE8', letterSpacing: -2, marginBottom: 8 }}>
          NEXUS
        </div>
        <div style={{ fontSize: 13, color: '#5E5A78', marginBottom: 40 }}>
          Seu centro de controle pessoal e profissional
        </div>

        {/* Google Login */}
        <button
          onClick={loginWithGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 10,
            background: loading ? '#1A1A22' : '#7C6FD4',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background .2s',
          }}
        >
          {loading ? (
            <>⟳ Conectando...</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </>
          )}
        </button>

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(240,92,92,.1)', border: '1px solid rgba(240,92,92,.3)', borderRadius: 8, color: '#F05C5C', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 32, fontSize: 11, color: '#5E5A78', lineHeight: 1.6 }}>
          Ao entrar, você autoriza o NEXUS a ler e criar<br />
          eventos no seu Google Calendar.
        </div>
      </div>
    </div>
  )
}
