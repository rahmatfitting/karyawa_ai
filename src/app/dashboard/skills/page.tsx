'use client'

import { useEffect, useState } from 'react'
import {
  Zap, Search, Server, Database, GitBranch,
  DollarSign, Code2, Rocket, Play, CheckCircle2,
  AlertTriangle, ShieldAlert, Cpu, Activity,
  Clock, X, Copy, Check, Terminal
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AgentSkillItem {
  id: string
  permission: string
  agent: {
    id: string
    name: string
    code: string
    department: string
  }
}

interface SkillItem {
  id: string
  name: string
  code: string
  category: string
  description: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isActive: boolean
  isExecutable: boolean
  hasHandler: boolean
  agentSkills: AgentSkillItem[]
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  server:   { label: 'Server & Infra', icon: Server, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  database: { label: 'Database', icon: Database, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  git:      { label: 'Git & VCS', icon: GitBranch, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  finance:  { label: 'Finance & Sales', icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  code:     { label: 'Code Analysis', icon: Code2, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  deploy:   { label: 'Deployment', icon: Rocket, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  LOW:      { label: 'LOW RISK', color: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.12)', icon: CheckCircle2 },
  MEDIUM:   { label: 'MEDIUM RISK', color: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.12)', icon: AlertTriangle },
  HIGH:     { label: 'HIGH RISK', color: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.15)', icon: AlertTriangle },
  CRITICAL: { label: 'CRITICAL', color: 'rgb(244, 63, 94)', bg: 'rgba(244, 63, 94, 0.15)', icon: ShieldAlert },
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')

  // Test Runner Modal State
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testingSkill, setTestingSkill] = useState<SkillItem | null>(null)
  const [testParams, setTestParams] = useState('{}')
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/skills')
      if (res.ok) {
        const data = await res.json()
        setSkills(data)
      }
    } catch {
      toast.error('Gagal mengambil daftar skills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  const handleOpenTest = (skill: SkillItem) => {
    setTestingSkill(skill)
    setTestResult(null)
    if (skill.code === 'server.logs') {
      setTestParams(JSON.stringify({ app: '', lines: 20 }, null, 2))
    } else if (skill.code === 'database.mysql_query') {
      setTestParams(JSON.stringify({ query: 'SELECT 1 as ping' }, null, 2))
    } else {
      setTestParams('{}')
    }
    setTestModalOpen(true)
  }

  const handleExecuteTest = async () => {
    if (!testingSkill) return
    setIsRunningTest(true)
    setTestResult(null)

    try {
      let parsedParams = {}
      try {
        parsedParams = JSON.parse(testParams)
      } catch {
        toast.error('Parameter harus format JSON valid')
        setIsRunningTest(false)
        return
      }

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          code: testingSkill.code,
          params: parsedParams,
        }),
      })

      const data = await res.json()
      setTestResult(data)
      if (data.success) {
        toast.success(`Berhasil mengeksekusi ${testingSkill.code}!`)
      } else {
        toast.error(data.error || 'Eksekusi gagal')
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal memanggil API test')
    } finally {
      setIsRunningTest(false)
    }
  }

  const handleCopyResult = () => {
    if (!testResult) return
    navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Hasil disalin ke clipboard')
  }

  // Filter logic
  const filteredSkills = skills.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter
    const matchesRisk = riskFilter === 'ALL' || item.riskLevel === riskFilter

    return matchesSearch && matchesCategory && matchesRisk
  })

  // Quick metrics
  const totalCount = skills.length
  const executableCount = skills.filter(s => s.isExecutable).length
  const lowRiskCount = skills.filter(s => s.riskLevel === 'LOW').length
  const highRiskCount = skills.filter(s => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL').length

  const categories = ['ALL', 'server', 'database', 'git', 'finance', 'code', 'deploy']
  const riskLevels = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

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
              background: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
            }}>
              <Zap size={20} color="white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
              Skill Registry
            </h1>
          </div>
          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14, maxWidth: 680 }}>
            Katalog kapabilitas, API tools, dan fungsi operasional yang diotorisasi untuk dieksekusi oleh tim AI Employee.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchSkills}
            className="btn btn-secondary"
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Activity size={15} />
            Refresh Registry
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
            Total Registered Skills
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'rgb(var(--text-primary))', marginTop: 4 }}>
            {totalCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(251, 146, 60)', marginTop: 4 }}>
            6 Core Categories
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Live Executable Tools
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
            {executableCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Direct engine executors ready
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Autonomous Safe (Low Risk)
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22d3ee', marginTop: 4 }}>
            {lowRiskCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Auto-approved executions
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>
            Approval Guarded
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fb7185', marginTop: 4 }}>
            {highRiskCount}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Requires human manager sign-off
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
              placeholder="Cari skill berdasarkan nama, kode (mis: server.cpu), deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Risk Level Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {riskLevels.map((r) => {
              const isSelected = riskFilter === r
              return (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected
                      ? 'rgba(249, 115, 22, 0.2)'
                      : 'rgba(254, 215, 170, 0.04)',
                    border: isSelected
                      ? '1px solid rgba(249, 115, 22, 0.6)'
                      : '1px solid var(--border-subtle)',
                    color: isSelected ? 'rgb(251, 146, 60)' : 'rgb(var(--text-secondary))',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {r === 'ALL' ? 'Semua Risk' : r}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat
            const cfg = CATEGORY_CONFIG[cat]
            const Icon = cfg?.icon || Zap

            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isSelected
                    ? 'rgba(249, 115, 22, 0.22)'
                    : 'rgba(254, 215, 170, 0.04)',
                  border: isSelected
                    ? '1px solid rgba(249, 115, 22, 0.6)'
                    : '1px solid var(--border-subtle)',
                  color: isSelected ? 'rgb(255, 248, 240)' : 'rgb(var(--text-muted))',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isSelected ? '#f97316' : undefined} />
                <span>{cat === 'ALL' ? 'Semua Kategori' : cfg?.label || cat}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
        }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: 18 }} />
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="card" style={{
          padding: 60,
          textAlign: 'center',
          color: 'rgb(var(--text-muted))',
        }}>
          <Zap size={44} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
            Tidak ada skill yang cocok
          </h3>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            Coba ubah kata kunci pencarian atau reset filter kategori/risk level.
          </p>
          <button
            onClick={() => { setSearch(''); setCategoryFilter('ALL'); setRiskFilter('ALL') }}
            className="btn btn-primary"
            style={{ marginTop: 18 }}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
        }}>
          {filteredSkills.map((skill) => {
            const catCfg = CATEGORY_CONFIG[skill.category] || {
              label: skill.category,
              icon: Zap,
              color: '#f97316',
              bg: 'rgba(249, 115, 22, 0.15)',
            }
            const riskCfg = RISK_CONFIG[skill.riskLevel] || RISK_CONFIG.LOW
            const CategoryIcon = catCfg.icon
            const RiskIcon = riskCfg.icon

            return (
              <div
                key={skill.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 18,
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: skill.isExecutable
                    ? 'rgba(249, 115, 22, 0.3)'
                    : 'var(--border-subtle)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.6)'
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(249, 115, 22, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = skill.isExecutable
                    ? 'rgba(249, 115, 22, 0.3)'
                    : 'var(--border-subtle)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36,
                        borderRadius: 10,
                        background: catCfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${catCfg.color}40`,
                      }}>
                        <CategoryIcon size={18} color={catCfg.color} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: catCfg.color,
                          letterSpacing: '0.05em',
                        }}>
                          {catCfg.label}
                        </div>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'rgb(var(--text-primary))',
                          lineHeight: 1.2,
                        }}>
                          {skill.name}
                        </h3>
                      </div>
                    </div>

                    {/* Risk Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: riskCfg.bg,
                      border: `1px solid ${riskCfg.color}40`,
                      color: riskCfg.color,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}>
                      <RiskIcon size={12} />
                      {riskCfg.label}
                    </div>
                  </div>

                  {/* Code Tag */}
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'rgb(251, 146, 60)',
                    background: 'rgba(249, 115, 22, 0.08)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    display: 'inline-block',
                    marginBottom: 10,
                    border: '1px solid rgba(249, 115, 22, 0.2)',
                  }}>
                    {skill.code}
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: 13,
                    color: 'rgb(var(--text-secondary))',
                    lineHeight: 1.5,
                    marginBottom: 16,
                  }}>
                    {skill.description}
                  </p>
                </div>

                {/* Bottom Section: Authorized Agents & Test Button */}
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 14,
                  marginTop: 6,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgb(var(--text-muted))' }}>
                      Authorized Agents:
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: skill.isExecutable ? '#34d399' : 'rgb(var(--text-muted))',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {skill.isExecutable ? (
                        <>
                          <CheckCircle2 size={12} color="#10b981" />
                          Executable Handler
                        </>
                      ) : (
                        'Standard Action'
                      )}
                    </span>
                  </div>

                  {/* Assigned Agents Badges */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 14,
                  }}>
                    {skill.agentSkills && skill.agentSkills.length > 0 ? (
                      skill.agentSkills.map((as) => (
                        <div
                          key={as.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 8,
                            background: 'rgba(254, 215, 170, 0.06)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: 11,
                            color: 'rgb(var(--text-primary))',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{as.agent.name}</span>
                          <span style={{
                            fontSize: 9,
                            color: 'rgb(251, 146, 60)',
                            background: 'rgba(249, 115, 22, 0.15)',
                            padding: '1px 4px',
                            borderRadius: 4,
                            fontWeight: 700,
                          }}>
                            {as.permission}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', fontStyle: 'italic' }}>
                        Belum ada agent yang di-assign
                      </span>
                    )}
                  </div>

                  {/* Test Runner Action */}
                  {skill.isExecutable ? (
                    <button
                      onClick={() => handleOpenTest(skill)}
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(244, 63, 94, 0.2))',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        color: 'rgb(255, 248, 240)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249, 115, 22, 0.35), rgba(244, 63, 94, 0.35))'
                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.7)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(244, 63, 94, 0.2))'
                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)'
                      }}
                    >
                      <Play size={13} fill="#f97316" color="#f97316" />
                      Test Run Live
                    </button>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'rgb(var(--text-muted))',
                      padding: '6px 0',
                    }}>
                      Dispatched via Agent Engine
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Test Runner Modal */}
      {testModalOpen && testingSkill && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div className="card glass-elevated" style={{
            maxWidth: 620,
            width: '100%',
            borderRadius: 20,
            padding: 24,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Terminal size={18} color="#f97316" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                    Test Skill Execution
                  </h3>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: 'rgb(251, 146, 60)',
                }}>
                  {testingSkill.code}
                </div>
              </div>

              <button
                onClick={() => setTestModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgb(var(--text-muted))',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{
              fontSize: 13,
              color: 'rgb(var(--text-secondary))',
              marginBottom: 16,
              lineHeight: 1.4,
            }}>
              {testingSkill.description}
            </p>

            {/* Parameter Input */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgb(var(--text-muted))',
                marginBottom: 6,
              }}>
                Input Parameters (JSON):
              </label>
              <textarea
                value={testParams}
                onChange={(e) => setTestParams(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(20, 14, 16, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: 'rgb(255, 248, 240)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Execute Button */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <button
                onClick={handleExecuteTest}
                disabled={isRunningTest}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: isRunningTest ? 0.7 : 1,
                  cursor: isRunningTest ? 'not-allowed' : 'pointer',
                }}
              >
                {isRunningTest ? (
                  <>
                    <Activity size={16} className="animate-spin" />
                    Executing Live...
                  </>
                ) : (
                  <>
                    <Play size={15} fill="white" />
                    Run Executor
                  </>
                )}
              </button>
            </div>

            {/* Test Result Output */}
            {testResult && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                    <span style={{
                      color: testResult.success ? '#34d399' : '#f87171',
                    }}>
                      {testResult.success ? '● Success' : '● Error'}
                    </span>
                    {testResult.durationMs && (
                      <span style={{ color: 'rgb(var(--text-muted))' }}>
                        ({testResult.durationMs}ms)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleCopyResult}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: 'rgb(var(--text-muted))',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <pre style={{
                  background: 'rgba(15, 10, 12, 0.95)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: testResult.success ? '#fef08a' : '#fca5a5',
                  maxHeight: 260,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {JSON.stringify(testResult.result || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
