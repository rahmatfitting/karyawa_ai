'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Zap, TrendingUp, ChevronRight, Plus } from 'lucide-react'

interface Agent {
  id: string
  name: string
  code: string
  department: string
  role: string
  status: string
  agentSkills: Array<{ skill: { name: string; code: string; riskLevel: string } }>
  _count: { tasks: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  IDLE: { label: 'Idle', color: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.15)', emoji: '🟢' },
  WORKING: { label: 'Working', color: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.15)', emoji: '🟡' },
  THINKING: { label: 'Thinking', color: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.15)', emoji: '💭' },
  WAITING_APPROVAL: { label: 'Waiting', color: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.15)', emoji: '🟠' },
  ERROR: { label: 'Error', color: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.15)', emoji: '🔴' },
  OFFLINE: { label: 'Offline', color: 'rgb(156, 122, 112)', bg: 'rgba(156, 122, 112, 0.15)', emoji: '⚫' },
}

const DEPT_EMOJI: Record<string, string> = {
  manager: '🤖', programmer: '👨‍💻', monitoring: '👨‍🔧',
  finance: '👩‍💼', sales: '💼',
  marketing: '🎯', content_creator: '🎬', copywriter: '✍️',
}

const DEPT_COLORS: Record<string, string> = {
  manager: '#f97316', programmer: '#06b6d4',
  monitoring: '#f59e0b', finance: '#ec4899', sales: '#10b981',
  marketing: '#f43f5e', content_creator: '#a855f7', copywriter: '#3b82f6',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => { setAgents(data); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
            👥 AI Agents
          </h1>
          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14 }}>
            Manage and monitor your AI workforce
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
          ))
        ) : (
          agents.map((agent) => {
            const statusCfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.OFFLINE
            const color = DEPT_COLORS[agent.code] || '#818cf8'
            const emoji = DEPT_EMOJI[agent.code] || '🤖'

            return (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: `${color}20`,
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${color}50`
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.boxShadow = `0 8px 30px ${color}20`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${color}20`
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Top color bar */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                  }} />

                  {/* Agent Header */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: `${color}20`,
                      border: `2px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28,
                    }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 17 }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                        {agent.role}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <span className="status-badge"
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.color}30`,
                            padding: '2px 8px',
                            borderRadius: 100,
                            fontSize: 11,
                          }}
                        >
                          {statusCfg.emoji} {statusCfg.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="rgb(var(--text-muted))" />
                  </div>

                  {/* Department Badge */}
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: color,
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    padding: '3px 8px',
                    borderRadius: 6,
                    display: 'inline-block',
                    marginBottom: 12,
                  }}>
                    {agent.department}
                  </div>

                  {/* Skills */}
                  <div>
                    <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginBottom: 6, fontWeight: 600 }}>
                      SKILLS ({agent.agentSkills?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(agent.agentSkills || []).slice(0, 4).map((as) => (
                        <span key={as.skill.code} style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgb(var(--text-secondary))',
                        }}>
                          {as.skill.name}
                        </span>
                      ))}
                      {(agent.agentSkills?.length || 0) > 4 && (
                        <span style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: `${color}10`,
                          color: color,
                        }}>
                          +{agent.agentSkills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task Count */}
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 12, color: 'rgb(var(--text-muted))',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <TrendingUp size={12} />
                    {agent._count?.tasks || 0} total tasks
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
