// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',           icon: '⊞',  label: 'Dashboard'  },
  { href: '/dashboard/tasks',     icon: '✓',   label: 'Tarefas'    },
  { href: '/dashboard/agenda',    icon: '📅',  label: 'Agenda'     },
  { href: '/dashboard/habitos',   icon: '🔥',  label: 'Hábitos'    },
  { divider: true },
  { href: '/dashboard/academia',  icon: '💪',  label: 'Academia'   },
  { href: '/dashboard/projetos',  icon: '🚀',  label: 'Projetos'   },
  { href: '/dashboard/notas',     icon: '📝',  label: 'Notas'      },
  { divider: true },
  { href: '/dashboard/foco',      icon: '⏱',   label: 'Foco'       },
  { href: '/dashboard/saude',     icon: '❤️',  label: 'Saúde'      },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      width: 72, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0', gap: 4, flexShrink: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: 18,
        color: 'var(--accent2)', letterSpacing: -1, marginBottom: 20,
      }}>
        NX
      </div>

      {NAV.map((item, i) => {
        if ('divider' in item) return (
          <div key={i} style={{ width: 32, height: 1, background: 'var(--border)', margin: '4px 0' }} />
        )

        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href!)

        return (
          <Link
            key={item.href}
            href={item.href!}
            title={item.label}
            style={{
              width: 48, height: 48, borderRadius: 'var(--r2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, textDecoration: 'none', transition: 'all .2s',
              background: isActive ? 'rgba(124,111,212,.2)' : 'transparent',
              color: isActive ? 'var(--accent2)' : 'var(--text3)',
              position: 'relative',
            }}
          >
            {item.icon}
          </Link>
        )
      })}

      {/* Logout no fundo */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={logout}
          title="Sair"
          style={{
            width: 48, height: 48, borderRadius: 'var(--r2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, background: 'transparent', border: 'none',
            color: 'var(--text3)', cursor: 'pointer', transition: 'all .2s',
          }}
        >
          ⏻
        </button>
      </div>
    </nav>
  )
}
