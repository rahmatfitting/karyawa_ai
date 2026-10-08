'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Brain, Zap, ClipboardList, Activity, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface AgentDetail {
  id: string
  name: string
  code: string
  department: string
  role: string
  personality: string
  status: string
  successRate: number
  completedTasks: number
  failedTasks: number
  agentSkills: Array<{
    permission: string
    skill: { name: string; code: string; riskLevel: string; description: string }
  }>
  memory: Array<{ key: string; value: string; type: string }>
  tasks: Array<{ id: string; prompt: string; status: string; createdAt: string }>
  activities: Array<{ id: string; action: string; description: string; createdAt: string }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  IDLE: { label: 'Idle', color: 'rgb(16, 185, 129)', emoji: '🟢' },
  WORKING: { label: 'Working', color: 'rgb(245, 158, 11)', emoji: '🟡' },
  THINKING: { label: 'Thinking', color: 'rgb(236, 72, 153)', emoji: '💭' },
  WAITING_APPROVAL: { label: 'Waiting', color: 'rgb(249, 115, 22)', emoji: '🟠' },
  ERROR: { label: 'Error', color: 'rgb(239, 68, 68)', emoji: '🔴' },
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'rgb(16, 185, 129)',
  MEDIUM: 'rgb(245, 158, 11)',
  HIGH: 'rgb(249, 115, 22)',
  CRITICAL: 'rgb(239, 68, 68)',
}

const DEPT_COLORS: Record<string, string> = {
  manager: '#f97316', programmer: '#06b6d4',
  monitoring: '#f59e0b', finance: '#ec4899', sales: '#10b981',
}

export default function AgentDetailPage() {
  const params = useParams()
  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('skills')

  useEffect(() => {
    if (params.id) {
      fetch(`/api/agents/${params.id}`)
        .then(r => r.json())
        .then(data => { setAgent(data); setLoading(false) })
    }
  }, [params.id])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[120, 200, 300].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  if (!agent) {
    return <div>Agent not found</div>
  }

  const color = DEPT_COLORS[agent.code] || '#818cf8'
  const statusCfg = STATUS_CONFIG[agent.status] || { label: 'Offline', color: 'rgb(71,85,105)', emoji: '⚫' }

  const tabs = [
    { key: 'skills', label: 'Skills', icon: Zap },
    { key: 'memory', label: 'Memory', icon: Brain },
    { key: 'tasks', label: 'Recent Tasks', icon: ClipboardList },
    { key: 'activity', label: 'Activity', icon: Activity },
  ]

  return (
    <div>
      {/* Back */}
      <Link
        href="/dashboard/agents"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'rgb(var(--text-muted))', textDecoration: 'none',
          fontSize: 13, marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      {/* Agent Header */}
      <div className="card" style={{ borderColor: `${color}30`, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: `${color}20`,
            border: `2px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>{agent.name}</h1>
              <span style={{
                padding: '4px 10px', borderRadius: 100,
                background: statusCfg.color + '20',
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color}30`,
                fontSize: 12, fontWeight: 600,
              }}>
                {statusCfg.emoji} {statusCfg.label}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'rgb(var(--text-muted))', marginBottom: 8 }}>
              {agent.role} • {agent.department}
            </div>
            {agent.personality && (
              <div style={{
                fontSize: 13, color: 'rgb(var(--text-secondary))',
                fontStyle: 'italic', lineHeight: 1.6,
              }}>
                "{agent.personality}"
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Success Rate', value: `${agent.successRate}%`, color: 'rgb(34, 197, 94)' },
              { label: 'Completed', value: agent.completedTasks, color: 'rgb(99, 102, 241)' },
              { label: 'Failed', value: agent.failedTasks, color: 'rgb(239, 68, 68)' },
            ].map((stat) => (
              <div key={stat.label} style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                textAlign: 'center', minWidth: 80,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 1 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? color : 'rgb(var(--text-muted))',
              borderBottom: activeTab === tab.key ? `2px solid ${color}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'skills' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {agent.agentSkills.map((as) => (
            <div key={as.skill.code} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{as.skill.name}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: RISK_COLORS[as.skill.riskLevel],
                  background: RISK_COLORS[as.skill.riskLevel] + '15',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  {as.skill.riskLevel}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', fontFamily: 'monospace', marginBottom: 6 }}>
                {as.skill.code}
              </div>
              <div style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>
                {as.skill.description}
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(99,102,241,0.1)',
                  color: 'rgb(99,102,241)',
                }}>
                  {as.permission}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🧠 Agent Memory</h3>
          {agent.memory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'rgb(var(--text-muted))', fontSize: 13 }}>
              No memory stored yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agent.memory.map((mem) => (
                <div key={mem.key} style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: color,
                    fontFamily: 'monospace', minWidth: 140,
                  }}>
                    {mem.key}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgb(var(--text-primary))' }}>
                    {mem.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agent.tasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/tasks/${task.id}`}
              style={{
                display: 'block', textDecoration: 'none',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 13, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
                {task.prompt.substring(0, 100)}...
              </div>
              <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', display: 'flex', gap: 8 }}>
                <span>{task.status}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {agent.activities.map((act) => (
            <div key={act.id} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, marginTop: 6, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{act.action}</div>
                {act.description && (
                  <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                    {act.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 3 }}>
                  {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
