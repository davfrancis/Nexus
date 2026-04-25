// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Flame,
  Monitor,
  Dumbbell,
  FolderKanban,
  BookOpen,
  Timer,
  Heart,
  Wallet,
  LogOut,
} from 'lucide-react'

type NavItem =
  | { href: string; icon: React.ReactNode; label: string }
  | { divider: true }

const NAV: NavItem[] = [
  { href: '/dashboard',              icon: <LayoutDashboard size={18} strokeWidth={1.75} />, label: 'Dashboard'    },
  { href: '/dashboard/tasks',        icon: <CheckSquare     size={18} strokeWidth={1.75} />, label: 'Tarefas'      },
  { href: '/dashboard/agenda',       icon: <CalendarDays    size={18} strokeWidth={1.75} />, label: 'Agenda'       },
  { href: '/dashboard/habitos',      icon: <Flame           size={18} strokeWidth={1.75} />, label: 'Hábitos'      },
  { divider: true },
  { href: '/dashboard/trabalho',     icon: <Monitor         size={18} strokeWidth={1.75} />, label: 'Trabalho'     },
  { href: '/dashboard/academia',     icon: <Dumbbell        size={18} strokeWidth={1.75} />, label: 'Academia'     },
  { href: '/dashboard/projetos',     icon: <FolderKanban    size={18} strokeWidth={1.75} />, label: 'Projetos'     },
  { href: '/dashboard/conhecimento', icon: <BookOpen        size={18} strokeWidth={1.75} />, label: 'Conhecimento' },
  { divider: true },
  { href: '/dashboard/foco',         icon: <Timer           size={18} strokeWidth={1.75} />, label: 'Foco'         },
  { href: '/dashboard/saude',        icon: <Heart           size={18} strokeWidth={1.75} />, label: 'Saúde'        },
  { href: '/dashboard/financas',     icon: <Wallet          size={18} strokeWidth={1.75} />, label: 'Finanças'     },
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
          width: 42px;
          height: 42px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: background .15s, color .15s;
          color: var(--text3);
        }
        .nav-item:hover {
          background: rgba(255,255,255,.05) !important;
          color: var(--text2) !important;
        }
        .nav-item.active {
          background: rgba(99,102,241,.15) !important;
          color: var(--accent2) !important;
        }
        .nav-item::after {
          content: attr(data-label);
          position: absolute;
          left: calc(100% + 12px);
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
          transition: opacity .12s;
          z-index: 200;
          box-shadow: 0 4px 14px rgba(0,0,0,.45);
        }
        .nav-item:hover::after { opacity: 1; }
        .nav-active-bar {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 2.5px;
          height: 20px;
          background: var(--accent2);
          border-radius: 0 3px 3px 0;
        }
        .logout-btn {
          width: 42px;
          height: 42px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text3);
          cursor: pointer;
          transition: background .15s, color .15s;
          position: relative;
        }
        .logout-btn:hover {
          background: rgba(239,68,68,.1);
          color: var(--red);
        }
        .logout-btn::after {
          content: 'Sair';
          position: absolute;
          left: calc(100% + 12px);
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
          transition: opacity .12s;
          z-index: 200;
          box-shadow: 0 4px 14px rgba(0,0,0,.45);
        }
        .logout-btn:hover::after { opacity: 1; }
      `}</style>
      <nav style={{
        width: 66,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: 2,
        flexShrink: 0,
        zIndex: 100,
        overflow: 'visible',
      }}>
        {/* Logo */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-d)',
          fontWeight: 800,
          fontSize: 13,
          color: '#fff',
          letterSpacing: -0.5,
          marginBottom: 16,
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(99,102,241,.3)',
        }}>
          NX
        </div>

        {NAV.map((item, i) => {
          if ('divider' in item) return (
            <div key={i} style={{ width: 26, height: 1, background: 'var(--border)', margin: '5px 0', flexShrink: 0 }} />
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
          <button className="logout-btn" onClick={logout}>
            <LogOut size={17} strokeWidth={1.75} />
          </button>
        </div>
      </nav>
    </>
  )
}
