'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, ChevronRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface Approval {
  id: string
  action: string
  description: string
  status: string
  createdAt: string
  task: { prompt: string; source: string; createdAt: string }
  agent: { name: string; code: string; department: string }
  approvedBy?: { name: string }
  approvedAt?: string
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`/api/approvals?status=${activeTab}`)
      if (res.ok) setApprovals(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [activeTab])

  const handleAction = async (approvalId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(approvalId)
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      })
      if (res.ok) {
        toast.success(action === 'APPROVE' ? '✅ Action approved!' : '❌ Action rejected')
        fetchApprovals()
      }
    } catch {
      toast.error('Gagal memproses approval')
    } finally {
      setProcessingId(null)
    }
  }

  const tabs = [
    { key: 'PENDING', label: 'Pending', color: 'rgb(249, 115, 22)' },
    { key: 'APPROVED', label: 'Approved', color: 'rgb(16, 185, 129)' },
    { key: 'REJECTED', label: 'Rejected', color: 'rgb(239, 68, 68)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          ✅ Approval Center
        </h1>
        <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14 }}>
          Review and approve/reject actions requested by AI agents
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === tab.key ? `${tab.color}20` : 'rgba(254,215,170,0.04)',
              border: `1px solid ${activeTab === tab.key ? `${tab.color}50` : 'var(--border-subtle)'}`,
              color: activeTab === tab.key ? tab.color : 'rgb(var(--text-secondary))',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <CheckCircle2 size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No {activeTab.toLowerCase()} approvals</div>
          <div style={{ fontSize: 13, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            AI agents are operating within safe boundaries
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="card"
              style={{
                borderColor: activeTab === 'PENDING' ? 'rgba(249, 115, 22, 0.3)' : 'var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Agent Info */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  🤖
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{approval.agent.name}</span>
                      <span style={{ 
                        marginLeft: 8, fontSize: 12,
                        color: 'rgb(var(--text-muted))',
                      }}>
                        {approval.agent.department}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                      {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    marginBottom: 8,
                    fontSize: 13,
                  }}>
                    <div style={{ color: 'rgb(var(--text-muted))', fontSize: 11, marginBottom: 3 }}>
                      REQUESTED ACTION
                    </div>
                    <div style={{ fontWeight: 500, color: 'rgb(249, 115, 22)' }}>
                      ⚠️ {approval.action}
                    </div>
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: 'rgb(var(--text-secondary))',
                    lineHeight: 1.6,
                    marginBottom: 8,
                  }}>
                    {approval.description.substring(0, 200)}
                    {approval.description.length > 200 ? '...' : ''}
                  </div>

                  <div style={{
                    fontSize: 11, color: 'rgb(var(--text-muted))',
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 6, display: 'inline-block',
                    marginBottom: 12,
                  }}>
                    📋 {approval.task.prompt.substring(0, 80)}...
                  </div>

                  {activeTab === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-success"
                        disabled={processingId === approval.id}
                        onClick={() => handleAction(approval.id, 'APPROVE')}
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={processingId === approval.id}
                        onClick={() => handleAction(approval.id, 'REJECT')}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}

                  {activeTab !== 'PENDING' && approval.approvedBy && (
                    <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                      {activeTab === 'APPROVED' ? '✅' : '❌'} By {approval.approvedBy.name}
                      {approval.approvedAt && ` • ${formatDistanceToNow(new Date(approval.approvedAt), { addSuffix: true })}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
