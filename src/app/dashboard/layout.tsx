'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, ListTodo, Zap, CheckSquare,
  Activity, Settings, Bot, ChevronRight, Bell, Shield, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/agents', icon: Users, label: 'AI Agents' },
  { href: '/dashboard/tasks', icon: ListTodo, label: 'Task Center' },
  { href: '/dashboard/approvals', icon: CheckSquare, label: 'Approvals' },
  { href: '/dashboard/skills', icon: Zap, label: 'Skill Registry' },
  { href: '/dashboard/activity', icon: Activity, label: 'Activity Log' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #facc15 100%)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
            }}>
              <Bot size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: 'rgb(var(--text-primary))' }}>
                AI Workforce
              </div>
              <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                🏢 Digital 3D Office
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '14px 12px', flex: 1 }}>
          <div style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            color: 'rgb(var(--text-muted))', 
            padding: '8px 10px 6px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  marginBottom: 3,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'rgb(251, 146, 60)' : 'rgb(var(--text-secondary))',
                  background: isActive ? 'rgba(249, 115, 22, 0.16)' : 'transparent',
                  border: isActive ? '1px solid rgba(249, 115, 22, 0.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 10px rgba(249, 115, 22, 0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(254, 215, 170, 0.08)'
                    e.currentTarget.style.color = 'rgb(var(--text-primary))'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgb(var(--text-secondary))'
                  }
                }}
              >
                <item.icon size={17} color={isActive ? '#f97316' : undefined} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} style={{ opacity: 0.8 }} color="#f97316" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Status */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px',
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: 'rgb(16, 185, 129)',
              animation: 'pulse-ring 2s infinite',
            }} />
            <span style={{ fontSize: 12, color: 'rgb(52, 211, 153)', fontWeight: 600 }}>
              Workforce Active
            </span>
          </div>
          
          <div style={{
            marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'rgb(var(--text-muted))',
          }}>
            <Shield size={13} color="#f97316" />
            <span>Multi-Agent RBAC Protected</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header style={{
          height: 68,
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'rgba(28, 20, 22, 0.85)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
              {navItems.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'}
            </h1>
            <p style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 1, fontWeight: 500 }}>
              Virtual Organization & Task Control
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Notification bell */}
            <button style={{
              width: 38, height: 38,
              borderRadius: 11,
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgb(var(--text-secondary))',
              position: 'relative',
              transition: 'all 0.2s',
            }}>
              <Bell size={17} />
              <span style={{
                position: 'absolute',
                top: 7, right: 7,
                width: 8, height: 8,
                borderRadius: '50%',
                background: 'rgb(244, 63, 94)',
                border: '2px solid rgb(28, 20, 22)',
              }} />
            </button>

            {/* User profile & Logout */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 6px 4px 12px',
              borderRadius: 14,
              background: 'rgba(254, 215, 170, 0.05)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgb(var(--text-primary))',
                  lineHeight: 1.2,
                }}>
                  {session?.user?.name || 'Admin'}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#fb923c',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {((session?.user as any)?.role as string) || 'ADMIN'}
                </div>
              </div>

              <div style={{
                width: 32, height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316, #f43f5e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'white',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.35)',
              }}>
                {(session?.user?.name || session?.user?.email || 'A')[0].toUpperCase()}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Keluar / Logout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 10px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginLeft: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
                }}
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
