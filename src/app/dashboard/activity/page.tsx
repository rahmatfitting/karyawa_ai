'use client'

import { useEffect, useState } from 'react'
import {
  Activity, Search, Filter, RefreshCw, ChevronDown,
  ChevronRight, Clock, Bot, CheckCircle2, AlertTriangle,
  FileCode, Terminal, ArrowUpRight, Zap, Shield, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

interface ActivityItem {
  id: string
  action: string
  description?: string | null
  metadata?: any
  taskId?: string | null
  userId?: string | null
  createdAt: string
  agent: {
    id: string
    name: string
    code: string
    department: string
    role: string
  }
}

interface AgentOption {
  id: string
  name: string
  code: string
}

const ACTION_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  SYSTEM_STARTUP:   { label: 'System Startup', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  SERVER_CHECK:     { label: 'Server Diagnostic', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  GIT_INSPECT:      { label: 'Git Inspection', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  TELEGRAM_READY:   { label: 'Telegram Bot', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  TASK_EXECUTION:   { label: 'Task Execution', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  TOOL_CALL:        { label: 'Tool Invocation', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  APPROVAL_REQUEST: { label: 'Approval Guard', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  ERROR:            { label: 'Error Exception', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const AGENT_COLORS: Record<string, string> = {
  manager: '#f97316',
  programmer: '#06b6d4',
  monitoring: '#f59e0b',
  finance: '#ec4899',
  sales: '#10b981',
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [total, setTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const fetchActivities = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (agentFilter !== 'ALL') params.set('agentId', agentFilter)
      if (actionFilter !== 'ALL') params.set('action', actionFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/activity?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setTotal(data.total || 0)
        setTodayCount(data.todayCount || 0)
        if (data.agents) setAgents(data.agents)
      }
    } catch {
      if (!silent) toast.error('Gagal memuat log aktivitas')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [agentFilter, actionFilter])

  // Polling for live activity if enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchActivities(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, agentFilter, actionFilter, search])

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const actionOptions = [
    'ALL',
    'SYSTEM_STARTUP',
    'SERVER_CHECK',
    'GIT_INSPECT',
    'TELEGRAM_READY',
    'TASK_EXECUTION',
    'TOOL_CALL',
    'APPROVAL_REQUEST',
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
            }}>
              <Activity size={20} color="white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
              Activity Log & Audit Trail
            </h1>
          </div>
          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14, maxWidth: 680 }}>
            Audit log real-time aktivitas operasional, eksekusi tools, keputusan autonomous agent, dan interaksi bot.
          </p>
        </div>

        {/* Live Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '9px 14px',
              borderRadius: 12,
              background: autoRefresh ? 'rgba(16, 185, 129, 0.15)' : 'rgba(254, 215, 170, 0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
              color: autoRefresh ? '#34d399' : 'rgb(var(--text-muted))',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: autoRefresh ? '#10b981' : '#6b7280',
              boxShadow: autoRefresh ? '0 0 8px #10b981' : 'none',
            }} />
            {autoRefresh ? 'Live Streaming (10s)' : 'Live Paused'}
          </button>

          <button
            onClick={() => fetchActivities()}
            className="btn btn-secondary"
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Recorded Events
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'rgb(var(--text-primary))', marginTop: 4 }}>
            {total}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(251, 146, 60)', marginTop: 4 }}>
            Persisted in MySQL Audit
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Events Today
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
            {todayCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Active sessions today
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Agents
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22d3ee', marginTop: 4 }}>
            {agents.length}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Connected to runtime
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Security Mode
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fb7185', marginTop: 4 }}>
            Enforced
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            High-risk approval active
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 20, marginBottom: 26 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgb(var(--text-muted))',
              }}
            />
            <input
              type="text"
              placeholder="Cari aktivitas, keyword pesan, atau action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchActivities()}
              className="input"
              style={{
                paddingLeft: 42,
                width: '100%',
                background: 'rgba(28, 20, 22, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                height: 44,
                fontSize: 14,
                color: 'rgb(var(--text-primary))',
              }}
            />
          </div>

          {/* Filter by Agent */}
          <div style={{ minWidth: 180 }}>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                borderRadius: 12,
                background: 'rgba(28, 20, 22, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'rgb(var(--text-primary))',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Semua Agent</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Action */}
          <div style={{ minWidth: 180 }}>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                borderRadius: 12,
                background: 'rgba(28, 20, 22, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'rgb(var(--text-primary))',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {actionOptions.map((act) => (
                <option key={act} value={act}>
                  {act === 'ALL' ? 'Semua Action' : act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="card" style={{
          padding: 60,
          textAlign: 'center',
          color: 'rgb(var(--text-muted))',
        }}>
          <Activity size={44} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
            Tidak ada riwayat aktivitas ditemukan
          </h3>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            Aktivitas akan tercatat otomatis saat agent menerima task dari Telegram atau Web.
          </p>
          <button
            onClick={() => { setSearch(''); setAgentFilter('ALL'); setActionFilter('ALL') }}
            className="btn btn-primary"
            style={{ marginTop: 18 }}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical Glowing Connector Line */}
          <div style={{
            position: 'absolute',
            left: 11,
            top: 20,
            bottom: 20,
            width: 2,
            background: 'linear-gradient(to bottom, rgba(249, 115, 22, 0.6), rgba(244, 63, 94, 0.4), rgba(234, 179, 8, 0.2))',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activities.map((act) => {
              const actCfg = ACTION_COLORS[act.action] || {
                label: act.action,
                color: '#f97316',
                bg: 'rgba(249, 115, 22, 0.15)',
              }
              const agentColor = AGENT_COLORS[act.agent?.code] || '#f97316'
              const isExpanded = expandedItems[act.id]
              const hasMetadata = act.metadata && Object.keys(act.metadata).length > 0

              return (
                <div key={act.id} style={{ position: 'relative' }}>
                  {/* Glowing Node Dot */}
                  <div style={{
                    position: 'absolute',
                    left: -20,
                    top: 22,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: actCfg.color,
                    border: '3px solid rgb(28, 20, 22)',
                    boxShadow: `0 0 10px ${actCfg.color}`,
                    zIndex: 2,
                  }} />

                  {/* Activity Card */}
                  <div
                    className="card"
                    style={{
                      borderRadius: 16,
                      padding: '18px 20px',
                      background: 'rgb(var(--bg-surface))',
                      borderColor: 'var(--border-subtle)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginBottom: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Agent Avatar Badge */}
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: `${agentColor}22`,
                          border: `1px solid ${agentColor}50`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          color: agentColor,
                        }}>
                          {act.agent?.name?.charAt(0) || 'A'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: 'rgb(var(--text-primary))',
                            }}>
                              {act.agent?.name || 'System'}
                            </span>
                            <span style={{
                              fontSize: 11,
                              color: 'rgb(var(--text-muted))',
                              fontWeight: 500,
                            }}>
                              • {act.agent?.department || 'Operations'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))' }}>
                            {act.agent?.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Action Badge */}
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: actCfg.color,
                          background: actCfg.bg,
                          border: `1px solid ${actCfg.color}40`,
                          padding: '3px 8px',
                          borderRadius: 8,
                          letterSpacing: '0.02em',
                        }}>
                          {actCfg.label}
                        </span>

                        {/* Timestamp */}
                        <span
                          title={format(new Date(act.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                          style={{
                            fontSize: 12,
                            color: 'rgb(var(--text-muted))',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Description Text */}
                    <p style={{
                      fontSize: 14,
                      color: 'rgb(var(--text-secondary))',
                      lineHeight: 1.5,
                      marginBottom: hasMetadata || act.taskId ? 12 : 0,
                    }}>
                      {act.description}
                    </p>

                    {/* Bottom Metadata & Link */}
                    {(hasMetadata || act.taskId) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 10,
                        marginTop: 6,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {act.taskId && (
                            <Link
                              href="/dashboard/tasks"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'rgb(251, 146, 60)',
                                textDecoration: 'none',
                                background: 'rgba(249, 115, 22, 0.12)',
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                padding: '3px 8px',
                                borderRadius: 6,
                              }}
                            >
                              <span>Task ID: {act.taskId.slice(0, 8)}...</span>
                              <ArrowUpRight size={11} />
                            </Link>
                          )}
                        </div>

                        {hasMetadata && (
                          <button
                            onClick={() => toggleExpand(act.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgb(var(--text-muted))',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 6px',
                            }}
                          >
                            <Terminal size={12} color="#f97316" />
                            {isExpanded ? 'Hide Payload' : 'View Payload Details'}
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expandable JSON viewer */}
                    {hasMetadata && isExpanded && (
                      <pre style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(15, 10, 12, 0.95)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: '#fde68a',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {JSON.stringify(act.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
