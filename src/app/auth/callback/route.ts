// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_REDIRECTS = ['/dashboard', '/dashboard/agenda', '/login']

function safeRedirect(next: string | null): string {
  if (!next) return '/dashboard'
  if (ALLOWED_REDIRECTS.some(allowed => next.startsWith(allowed))) return next
  return '/dashboard'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirect(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Se veio do OAuth do Google, passa pelo google-finish para salvar o provider_token
      const isGoogle = sessionData?.session?.user?.app_metadata?.provider === 'google'
      if (isGoogle) {
        return NextResponse.redirect(`${origin}/auth/google-finish`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
