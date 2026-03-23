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
    <>
      <style>{`
        .nav-item {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          text-decoration: none;
          transition: background .15s, transform .1s;
          color: var(--text3);
        }
        .nav-item:hover {
          background: rgba(255,255,255,.06) !important;
          color: var(--text2) !important;
          transform: scale(1.05);
        }
        .nav-item.active {
          background: rgba(124,111,212,.18) !important;
          color: var(--accent2) !important;
        }
        .nav-item::after {
          content: attr(data-label);
          position: absolute;
          left: calc(100% + 14px);
          background: var(--bg4);
          border: 1px solid var(--border2);
          color: var(--text);
          font-size: 12px;
          font-family: var(--font-b);
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 7px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity .15s;
          z-index: 200;
          box-shadow: 0 4px 16px rgba(0,0,0,.4);
        }
        .nav-item:hover::after {
          opacity: 1;
        }
        .nav-active-bar {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 22px;
          background: var(--accent2);
          border-radius: 0 3px 3px 0;
        }
        .logout-btn {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          background: transparent;
          border: none;
          color: var(--text3);
          cursor: pointer;
          transition: background .15s, color .15s;
          position: relative;
        }
        .logout-btn:hover {
          background: rgba(240,92,92,.12);
          color: var(--red);
        }
        .logout-btn::after {
          content: 'Sair';
          position: absolute;
          left: calc(100% + 14px);
          background: var(--bg4);
          border: 1px solid var(--border2);
          color: var(--text);
          font-size: 12px;
          font-family: var(--font-b);
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 7px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity .15s;
          z-index: 200;
          box-shadow: 0 4px 16px rgba(0,0,0,.4);
        }
        .logout-btn:hover::after {
          opacity: 1;
        }
      `}</style>
      <nav style={{
        width: 68,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '18px 0',
        gap: 2,
        flexShrink: 0,
        zIndex: 100,
        overflow: 'visible',
      }}>
        {/* Logo */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-d)',
          fontWeight: 800,
          fontSize: 14,
          color: '#fff',
          letterSpacing: -0.5,
          marginBottom: 18,
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(124,111,212,.35)',
        }}>
          NX
        </div>

        {NAV.map((item, i) => {
          if ('divider' in item) return (
            <div key={i} style={{ width: 28, height: 1, background: 'var(--border)', margin: '6px 0', flexShrink: 0 }} />
          )

          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href!)

          return (
            <div key={item.href} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              {isActive && <div className="nav-active-bar" />}
              <Link
                href={item.href!}
                data-label={item.label}
                className={`nav-item${isActive ? ' active' : ''}`}
              >
                {item.icon}
              </Link>
            </div>
          )
        })}

        {/* Logout */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button className="logout-btn" onClick={logout}>⏻</button>
        </div>
      </nav>
    </>
  )
}
