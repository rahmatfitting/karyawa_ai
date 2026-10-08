'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { 
  Users, Activity, CheckCircle2, AlertCircle, 
  Clock, Zap, TrendingUp, Send, ChevronRight, RefreshCw, Sparkles,
  Maximize2, Minimize2, Monitor, Gamepad2
} from 'lucide-react'
import toast from 'react-hot-toast'

// Dynamic import for 3D Office (client-side only)
const Office3D = dynamic(() => import('@/components/office/Office3D'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(28, 20, 22, 0.7)',
      borderRadius: 18,
      color: 'rgb(249, 115, 22)',
      fontSize: 14,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div style={{ marginTop: 10, color: 'rgb(var(--text-secondary))', fontWeight: 600 }}>
          Memuat 3D Office...
        </div>
      </div>
    </div>
  ),
})

// Dynamic import for Gather.town style Pixel Office (client-side only)
const PixelOffice = dynamic(() => import('@/components/office/PixelOffice'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(28, 20, 22, 0.7)',
      borderRadius: 18,
      color: 'rgb(249, 115, 22)',
      fontSize: 14,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 3px' }} />
        <div style={{ marginTop: 10, color: 'rgb(var(--text-secondary))', fontWeight: 600 }}>
          Memuat Pixel Office (Gather Style)...
        </div>
      </div>
    </div>
  ),
})

interface AgentData {
  id: string
  name: string
  code: string
  department: string
  role: string
  status: string
  positionX: number
  positionY: number
  positionZ: number
}

interface TaskData {
  id: string
  prompt: string
  status: string
  priority: string
  agent?: { name: string; code: string }
  createdAt: string
}

interface StatsData {
  totalAgents: number
  runningTasks: number
  waitingApprovals: number
  completedToday: number
  failedToday: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  IDLE: { label: 'Idle', color: 'rgb(16, 185, 129)', emoji: '🟢' },
  WORKING: { label: 'Working', color: 'rgb(245, 158, 11)', emoji: '🟡' },
  THINKING: { label: 'Thinking', color: 'rgb(236, 72, 153)', emoji: '💭' },
  WAITING_APPROVAL: { label: 'Waiting', color: 'rgb(249, 115, 22)', emoji: '🟠' },
  ERROR: { label: 'Error', color: 'rgb(239, 68, 68)', emoji: '🔴' },
  OFFLINE: { label: 'Offline', color: 'rgb(156, 122, 112)', emoji: '⚫' },
}

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Pending', color: 'rgb(185, 145, 135)', dot: '⚪' },
  RUNNING: { label: 'Running', color: 'rgb(245, 158, 11)', dot: '🟡' },
  WAITING_APPROVAL: { label: 'Approval', color: 'rgb(249, 115, 22)', dot: '🟠' },
  COMPLETED: { label: 'Done', color: 'rgb(16, 185, 129)', dot: '🟢' },
  FAILED: { label: 'Failed', color: 'rgb(239, 68, 68)', dot: '🔴' },
  CANCELLED: { label: 'Cancelled', color: 'rgb(156, 122, 112)', dot: '⚫' },
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [stats, setStats] = useState<StatsData>({
    totalAgents: 0, runningTasks: 0, waitingApprovals: 0,
    completedToday: 0, failedToday: 0,
  })
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)

  // Office View & Fullscreen state
  const [officeView, setOfficeView] = useState<'pixel' | '3d'>('pixel') // Gather.town pixel style by default!
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes, statsRes] = await Promise.allSettled([
        fetch('/api/agents'),
        fetch('/api/tasks?limit=10'),
        fetch('/api/stats'),
      ])
      
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        try {
          const agentsData = await agentsRes.value.json()
          if (Array.isArray(agentsData)) setAgents(agentsData)
        } catch {
          // ignore json parse error
        }
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        try {
          const data = await tasksRes.value.json()
          setTasks(data.tasks || [])
        } catch {
          // ignore json parse error
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        try {
          const statsData = await statsRes.value.json()
          if (statsData) setStats(statsData)
        } catch {
          // ignore json parse error
        }
      }
    } catch (error) {
      console.warn('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, source: 'DASHBOARD' }),
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(`Task dibuat! Agent ${data.agentCode} sedang memproses...`)
        setPrompt('')
        setTimeout(fetchData, 2000)
      } else {
        toast.error('Gagal membuat task')
      }
    } catch {
      toast.error('Error saat mengirim task')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Warm, cheerful stats cards with distinct vibrant colors
  const statsCards = [
    { label: 'Total AI Agents', value: stats.totalAgents, icon: Users, color: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.15)' },
    { label: 'Running Tasks', value: stats.runningTasks, icon: Activity, color: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.15)' },
    { label: 'Waiting Approval', value: stats.waitingApprovals, icon: Clock, color: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.15)' },
    { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle2, color: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.15)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      
      {/* ─── Warm & Cheerful Stats Row ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ 
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgb(var(--bg-surface))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: stat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px ${stat.color.replace('rgb', 'rgba').replace(')', ', 0.25)')}`,
            }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'rgb(var(--text-primary))' }}>
                {loading ? (
                  <div className="skeleton" style={{ width: 32, height: 28 }} />
                ) : stat.value}
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', marginTop: 4, fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Grid ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px', gap: 24 }}>
        
        {/* Left: Office Simulation + Quick Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Virtual Office Simulation Container */}
          <div className="card gradient-border" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(28, 20, 22, 0.5)',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              {/* Header Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #f97316, #facc15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
                }}>
                  <Sparkles size={17} color="white" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                      {officeView === 'pixel' ? '🎮 Pixel Virtual Office' : '🏢 3D Low-Poly Office'}
                    </h2>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 100, background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}>
                      LIVE
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 1, fontWeight: 500 }}>
                    {officeView === 'pixel' ? 'Tema Gather.town Top-Down Pixel Art' : 'Visualisasi 3D WebGL'}
                  </p>
                </div>
              </div>

              {/* View Switcher & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Switcher Toggle: Pixel vs 3D */}
                <div style={{
                  display: 'flex', background: 'rgba(42, 30, 32, 0.8)',
                  borderRadius: 10, padding: 3, border: '1px solid var(--border-subtle)',
                }}>
                  <button
                    onClick={() => setOfficeView('pixel')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: 'none',
                      background: officeView === 'pixel' ? 'linear-gradient(135deg, #f97316, #f43f5e)' : 'transparent',
                      color: officeView === 'pixel' ? '#ffffff' : 'rgb(var(--text-muted))',
                      boxShadow: officeView === 'pixel' ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Gamepad2 size={13} />
                    <span>Pixel (Gather)</span>
                  </button>
                  <button
                    onClick={() => setOfficeView('3d')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: 'none',
                      background: officeView === '3d' ? 'linear-gradient(135deg, #f97316, #f43f5e)' : 'transparent',
                      color: officeView === '3d' ? '#ffffff' : 'rgb(var(--text-muted))',
                      boxShadow: officeView === '3d' ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Monitor size={13} />
                    <span>3D</span>
                  </button>
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 700,
                    background: 'rgba(249, 115, 22, 0.15)',
                    borderColor: 'rgba(249, 115, 22, 0.4)',
                    color: '#fb923c',
                  }}
                  title="Tampilkan Full Screen"
                >
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchData()}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  title="Refresh status"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
            
            {/* Embedded Office Simulation Canvas */}
            <div style={{ height: 420, position: 'relative' }}>
              {officeView === 'pixel' ? (
                <PixelOffice
                  agents={agents}
                  onAgentClick={(a: any) => setSelectedAgent(a)}
                  isFullscreen={false}
                  onToggleFullscreen={() => setIsFullscreen(true)}
                />
              ) : (
                <Office3D agents={agents} onAgentClick={setSelectedAgent} />
              )}
            </div>
            
            {/* Agent Status Strip */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', gap: 10, flexWrap: 'wrap',
              background: 'rgba(28, 20, 22, 0.5)',
            }}>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: 110, height: 28 }} />
                ))
              ) : (
                agents.map((agent) => {
                  const statusCfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.OFFLINE
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: `${statusCfg.color.replace('rgb', 'rgba').replace(')', ', 0.16)')}`,
                        border: `1px solid ${statusCfg.color.replace('rgb', 'rgba').replace(')', ', 0.4)')}`,
                        cursor: 'pointer',
                        fontSize: 12, fontWeight: 700,
                        color: statusCfg.color,
                        transition: 'all 0.2s',
                        boxShadow: `0 2px 8px ${statusCfg.color.replace('rgb', 'rgba').replace(')', ', 0.15)')}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <span>{statusCfg.emoji}</span>
                      <span>{agent.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Task Input */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                Beri Perintah ke AI Workforce
              </h3>
            </div>
            <form onSubmit={handleSubmitTask}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Contoh instruksi:\n• "Tolong cek kenapa server ERP lambat."\n• "Berapa laba penjualan bulan September?"\n• "Cek error pada module pembelian."`}
                className="input"
                style={{
                  minHeight: 110, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.6,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleSubmitTask(e as any)
                }}
              />
              <div style={{
                marginTop: 12, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  Tekan <kbd style={{ padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: 4 }}>Ctrl+Enter</kbd> untuk kirim instan
                </span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isSubmitting}
                  className="btn btn-primary"
                  style={{ opacity: (!prompt.trim() || isSubmitting) ? 0.6 : 1 }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[0,1,2].map(i => (
                          <div key={i} className="typing-dot" style={{ width: 5, height: 5 }} />
                        ))}
                      </div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Tugaskan AI
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Task Center + Agent Detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Agent Detail Panel (when clicked) */}
          {selectedAgent && (
            <div className="card animate-slide-in" style={{
              borderColor: 'rgba(249, 115, 22, 0.4)',
              background: 'rgba(249, 115, 22, 0.08)',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                  Detail AI Employee
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', 
                    color: 'rgb(var(--text-muted))', fontSize: 20, lineHeight: 1 
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #f97316, #f43f5e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                }}>
                  🤖
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'rgb(var(--text-primary))' }}>
                    {selectedAgent.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', fontWeight: 600 }}>
                    {selectedAgent.role}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgb(var(--text-muted))' }}>Department</span>
                  <span style={{ fontWeight: 600 }}>{selectedAgent.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgb(var(--text-muted))' }}>Status</span>
                  <span style={{ color: STATUS_CONFIG[selectedAgent.status]?.color, fontWeight: 700 }}>
                    {STATUS_CONFIG[selectedAgent.status]?.emoji} {STATUS_CONFIG[selectedAgent.status]?.label}
                  </span>
                </div>
              </div>

              <a
                href={`/dashboard/agents/${selectedAgent.id}`}
                className="btn btn-secondary"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}
              >
                Lihat Profil Lengkap <ChevronRight size={14} />
              </a>
            </div>
          )}

          {/* Task Center */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 18,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                📋 Task Center
              </h2>
              <a
                href="/dashboard/tasks"
                style={{ 
                  fontSize: 12, fontWeight: 700, 
                  color: 'rgb(249, 115, 22)', textDecoration: 'none' 
                }}
              >
                Semua Task →
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
                ))
              ) : tasks.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '36px 16px',
                  color: 'rgb(var(--text-muted))', fontSize: 13,
                }}>
                  <Zap size={34} color="#f97316" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
                    Belum ada antrean task
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Ketik perintah di sebelah kiri untuk menugaskan agent
                  </div>
                </div>
              ) : (
                tasks.slice(0, 8).map((task) => {
                  const statusCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.PENDING
                  return (
                    <a
                      key={task.id}
                      href={`/dashboard/tasks/${task.id}`}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 11,
                        padding: '11px 14px',
                        borderRadius: 12,
                        background: 'rgba(254, 215, 170, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(254, 215, 170, 0.09)'
                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)'
                        e.currentTarget.style.transform = 'translateX(2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(254, 215, 170, 0.04)'
                        e.currentTarget.style.borderColor = 'var(--border-subtle)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1, marginTop: 2 }}>
                        {statusCfg.dot}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: 'rgb(var(--text-primary))',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {task.prompt.substring(0, 60)}{task.prompt.length > 60 ? '...' : ''}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 3,
                          display: 'flex', gap: 8, fontWeight: 500,
                        }}>
                          <span style={{ color: 'rgb(var(--text-secondary))' }}>
                            {task.agent?.name || 'Unassigned'}
                          </span>
                          <span>•</span>
                          <span style={{ color: statusCfg.color, fontWeight: 700 }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── FULLSCREEN MODAL OVERLAY ────────────────────────────────────── */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(24, 16, 18, 0.96)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Fullscreen Top Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 14,
              borderBottom: '1px solid rgba(251, 146, 60, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316, #facc15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(249, 115, 22, 0.4)',
              }}>
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff8f0' }}>
                    {officeView === 'pixel' ? '🎮 Pixel Virtual Office (Gather Style)' : '🏢 3D Low-Poly Office'}
                  </h2>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '3px 10px',
                    borderRadius: 100, background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)',
                  }}>
                    FULLSCREEN LIVE
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#fed7aa', marginTop: 2 }}>
                  Klik avatar agent untuk melihat detail tugas atau berinteraksi
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Switch View in Fullscreen */}
              <div style={{
                display: 'flex', background: 'rgba(42, 30, 32, 0.9)',
                borderRadius: 10, padding: 3, border: '1px solid rgba(251, 146, 60, 0.3)',
              }}>
                <button
                  onClick={() => setOfficeView('pixel')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', border: 'none',
                    background: officeView === 'pixel' ? 'linear-gradient(135deg, #f97316, #f43f5e)' : 'transparent',
                    color: officeView === 'pixel' ? '#ffffff' : 'rgb(var(--text-muted))',
                  }}
                >
                  <Gamepad2 size={15} />
                  <span>Pixel (Gather)</span>
                </button>
                <button
                  onClick={() => setOfficeView('3d')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', border: 'none',
                    background: officeView === '3d' ? 'linear-gradient(135deg, #f97316, #f43f5e)' : 'transparent',
                    color: officeView === '3d' ? '#ffffff' : 'rgb(var(--text-muted))',
                  }}
                >
                  <Monitor size={15} />
                  <span>3D</span>
                </button>
              </div>

              {/* Close / Exit Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
              >
                <Minimize2 size={16} />
                <span>Keluar Fullscreen (Esc)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Viewport Area */}
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(251, 146, 60, 0.25)',
            }}
          >
            {officeView === 'pixel' ? (
              <PixelOffice
                agents={agents}
                onAgentClick={(a: any) => setSelectedAgent(a)}
                isFullscreen={true}
                onToggleFullscreen={() => setIsFullscreen(false)}
              />
            ) : (
              <Office3D agents={agents} onAgentClick={setSelectedAgent} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
