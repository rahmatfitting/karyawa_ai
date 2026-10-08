'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, ChevronRight, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Task {
  id: string
  prompt: string
  status: string
  priority: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  agent?: { name: string; code: string }
  user?: { name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING:          { label: 'Pending', color: 'rgb(185,145,135)', icon: Clock, bg: 'rgba(185,145,135,0.12)' },
  RUNNING:          { label: 'Running', color: 'rgb(245,158,11)', icon: Loader2, bg: 'rgba(245,158,11,0.15)' },
  WAITING_APPROVAL: { label: 'Approval', color: 'rgb(249,115,22)', icon: Clock, bg: 'rgba(249,115,22,0.15)' },
  COMPLETED:        { label: 'Done', color: 'rgb(16,185,129)', icon: CheckCircle2, bg: 'rgba(16,185,129,0.15)' },
  FAILED:           { label: 'Failed', color: 'rgb(239,68,68)', icon: XCircle, bg: 'rgba(239,68,68,0.15)' },
  CANCELLED:        { label: 'Cancelled', color: 'rgb(156,122,112)', icon: XCircle, bg: 'rgba(156,122,112,0.12)' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'rgb(185,145,135)' },
  NORMAL: { label: 'Normal', color: 'rgb(249,115,22)' },
  HIGH: { label: 'High', color: 'rgb(245,158,11)' },
  URGENT: { label: 'Urgent', color: 'rgb(244,63,94)' },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20', page: page.toString() })
      if (statusFilter) params.set('status', statusFilter)
      
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [statusFilter, page])

  const statuses = ['', 'PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED']

  const filteredTasks = search
    ? tasks.filter(t => t.prompt.toLowerCase().includes(search.toLowerCase()))
    : tasks

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📋 Task Center</h1>
        <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14 }}>
          All tasks assigned to AI agents — {total} total
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgb(var(--text-muted))',
          }} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {statuses.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              style={{
                padding: '8px 12px',
                borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                background: statusFilter === s ? 'rgba(249,115,22,0.2)' : 'rgba(254,215,170,0.04)',
                border: `1px solid ${statusFilter === s ? 'rgba(249,115,22,0.5)' : 'var(--border-subtle)'}`,
                color: statusFilter === s ? 'rgb(249,115,22)' : 'rgb(var(--text-muted))',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 100px 120px 40px',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11, fontWeight: 700,
          color: 'rgb(var(--text-muted))',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <span>Task</span>
          <span>Agent</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Created</span>
          <span></span>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgb(var(--text-muted))', fontSize: 14 }}>
            No tasks found
          </div>
        ) : (
          filteredTasks.map((task, i) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.NORMAL
            const StatusIcon = statusCfg.icon

            return (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px 100px 120px 40px',
                    gap: 12,
                    padding: '14px 20px',
                    borderBottom: i < filteredTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: 'rgb(var(--text-primary))',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: 400,
                    }}>
                      {task.prompt}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 2, fontFamily: 'monospace' }}>
                      {task.id.substring(0, 12)}...
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>
                    {task.agent?.name || '—'}
                  </div>

                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 6,
                      background: statusCfg.bg,
                      color: statusCfg.color,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      <StatusIcon size={10} className={task.status === 'RUNNING' ? 'animate-spin' : ''} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: priorityCfg.color }}>
                    {priorityCfg.label}
                  </div>

                  <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))' }}>
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </div>

                  <ChevronRight size={14} color="rgb(var(--text-muted))" />
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            ← Prev
          </button>
          <span style={{ padding: '8px 16px', fontSize: 13, color: 'rgb(var(--text-muted))' }}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="btn btn-secondary"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
