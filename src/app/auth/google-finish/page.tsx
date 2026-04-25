'use client'
// Captura provider_token do Google após OAuth e salva no perfil
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GoogleFinish() {
  const router = useRouter()

  useEffect(() => {
    async function save() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.provider_token) {
        await fetch('/api/auth/google-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token ?? null,
            expires_in: 3600,
          }),
        })
      }

      router.replace('/dashboard')
    }
    save()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
      Conectando ao Google Calendar...
    </div>
  )
}
