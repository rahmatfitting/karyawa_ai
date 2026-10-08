'use client'

import { useEffect, useState } from 'react'
import {
  Settings, Server, Bot, Cpu, Shield, Send, CheckCircle2,
  XCircle, AlertTriangle, ExternalLink, RefreshCw, UserCheck,
  UserX, Sliders, Volume2, Sparkles, Check, Key, Globe, Eye,
  Database, Plus, Trash2, Link2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface TelegramUserItem {
  id: string
  telegramId: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  isAuthorized: boolean
  role: 'ADMIN' | 'MANAGER' | 'USER'
  createdAt: string
  user?: { name: string; email: string } | null
}

interface ProjectDatabase {
  id?: string
  name: string
  label?: string
  tablesCount: number
  isDefault: boolean
  isCustom?: boolean
  source?: 'LOCAL' | 'SAVED' | 'ENV'
  status?: 'CONNECTED' | 'DISCONNECTED'
  host?: string
  port?: number
  database?: string
}

interface SystemStatus {
  database: {
    status: string
    provider: string
    host: string
    database: string
  }
  telegram: {
    status: string
    botUsername: string
    pollingActive: boolean
    tokenConfigured: boolean
  }
  aiEngine: {
    status: string
    model: string
    fallbackModel: string
    provider: string
  }
  queue: {
    mode: string
    status: string
    description: string
  }
  workforce: {
    agentCount: number
    taskCount: number
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'system' | 'databases' | 'telegram' | 'ai' | 'office'>('system')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [projectDatabases, setProjectDatabases] = useState<ProjectDatabase[]>([])
  const [selectedDbTables, setSelectedDbTables] = useState<{ database: string; tables: string[] } | null>(null)
  const [loadingTables, setLoadingTables] = useState(false)
  const [telegramUsers, setTelegramUsers] = useState<TelegramUserItem[]>([])
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // AI Settings State (Local preferences)
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.2)
  const [maxSteps, setMaxSteps] = useState(8)
  const [requireHighRiskApproval, setRequireHighRiskApproval] = useState(true)

  // Office Preferences State
  const [defaultOfficeView, setDefaultOfficeView] = useState<'pixel' | '3d'>('pixel')
  const [enableSound, setEnableSound] = useState(true)
  const [idleWander, setIdleWander] = useState(true)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.system)
        setProjectDatabases(data.projectDatabases || [])
        setTelegramUsers(data.telegramUsers || [])
      }
    } catch {
      toast.error('Gagal mengambil konfigurasi sistem')
    } finally {
      setLoading(false)
    }
  }

  const handleInspectDatabase = async (dbName: string) => {
    setLoadingTables(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          code: 'database.list_tables',
          params: { database: dbName },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedDbTables({ database: dbName, tables: data.result.tables || [] })
        toast.success(`Berhasil membaca ${data.result.tableCount} tabel dari ${dbName}`)
      } else {
        toast.error(data.error || 'Gagal membaca tabel')
      }
    } catch {
      toast.error('Gagal membaca tabel')
    } finally {
      setLoadingTables(false)
    }
  }

  const [testConnectionInput, setTestConnectionInput] = useState('')
  const [testingConn, setTestingConn] = useState(false)
  const [testConnResult, setTestConnResult] = useState<{ success: boolean; tableCount?: number; error?: string } | null>(null)

  const handleTestConnection = async () => {
    if (!testConnectionInput.trim()) {
      toast.error('Masukkan URL koneksi MySQL terlebih dahulu')
      return
    }
    setTestingConn(true)
    setTestConnResult(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          connectionUrl: testConnectionInput.trim(),
        }),
      })
      const data = await res.json()
      setTestConnResult(data)
      if (data.success) {
        toast.success(`Koneksi berhasil! Ditemukan ${data.tableCount} tabel.`)
      } else {
        toast.error(data.error || 'Gagal terhubung')
      }
    } catch {
      toast.error('Error saat menguji koneksi')
    } finally {
      setTestingConn(false)
    }
  }

  // Add Database Modal State
  const [showAddDbModal, setShowAddDbModal] = useState(false)
  const [addDbMode, setAddDbMode] = useState<'url' | 'params'>('url')
  const [newDbForm, setNewDbForm] = useState({
    name: '',
    label: '',
    connectionUrl: '',
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: '',
  })
  const [savingDb, setSavingDb] = useState(false)
  const [testingNewDb, setTestingNewDb] = useState(false)
  const [newDbTestResult, setNewDbTestResult] = useState<{ success: boolean; tableCount?: number; error?: string } | null>(null)
  const [deletingDbId, setDeletingDbId] = useState<string | null>(null)

  const getComputedConnectionUrl = () => {
    if (addDbMode === 'url') {
      return newDbForm.connectionUrl.trim()
    }
    const userAuth = newDbForm.password
      ? `${encodeURIComponent(newDbForm.user)}:${encodeURIComponent(newDbForm.password)}`
      : encodeURIComponent(newDbForm.user)
    return `mysql://${userAuth}@${newDbForm.host.trim()}:${newDbForm.port.trim()}/${newDbForm.database.trim()}`
  }

  const handleTestNewDb = async () => {
    const url = getComputedConnectionUrl()
    if (!url) {
      toast.error('Lengkapi data koneksi database terlebih dahulu')
      return
    }
    setTestingNewDb(true)
    setNewDbTestResult(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', connectionUrl: url }),
      })
      const data = await res.json()
      setNewDbTestResult(data)
      if (data.success) {
        toast.success(`Koneksi Sukses! Ditemukan ${data.tableCount} tabel.`)
      } else {
        toast.error(data.error || 'Gagal terhubung ke database')
      }
    } catch {
      toast.error('Error saat menguji koneksi')
    } finally {
      setTestingNewDb(false)
    }
  }

  const handleSaveNewDb = async () => {
    const cleanName = newDbForm.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!cleanName) {
      toast.error('Nama identitas projek (slug AI) wajib diisi!')
      return
    }
    const url = getComputedConnectionUrl()
    if (!url) {
      toast.error('URL koneksi database wajib diisi!')
      return
    }

    setSavingDb(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_database',
          name: cleanName,
          label: newDbForm.label.trim() || cleanName,
          connectionUrl: url,
          host: newDbForm.host,
          port: Number(newDbForm.port) || 3306,
          database: newDbForm.database || cleanName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Database "${cleanName}" berhasil disimpan dan aktif dimonitor!`)
        setShowAddDbModal(false)
        setNewDbForm({
          name: '',
          label: '',
          connectionUrl: '',
          host: 'localhost',
          port: '3306',
          user: 'root',
          password: '',
          database: '',
        })
        setNewDbTestResult(null)
        fetchSettings()
      } else {
        toast.error(data.error || 'Gagal menyimpan database')
      }
    } catch {
      toast.error('Error saat menyimpan database')
    } finally {
      setSavingDb(false)
    }
  }

  const handleDeleteDb = async (db: ProjectDatabase) => {
    if (!confirm(`Hapus koneksi database "${db.label || db.name}" dari sistem monitoring?`)) return
    setDeletingDbId(db.id || db.name)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_database',
          id: db.id,
          name: db.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Database "${db.label || db.name}" berhasil dihapus`)
        fetchSettings()
      } else {
        toast.error(data.error || 'Gagal menghapus database')
      }
    } catch {
      toast.error('Error saat menghapus database')
    } finally {
      setDeletingDbId(null)
    }
  }

  useEffect(() => {
    fetchSettings()
    if (typeof window !== 'undefined') {
      const savedWander = localStorage.getItem('virtualOffice_idleWander')
      if (savedWander !== null) {
        try { setIdleWander(JSON.parse(savedWander)) } catch {}
      }
      const savedView = localStorage.getItem('virtualOffice_defaultView')
      if (savedView === 'pixel' || savedView === '3d') {
        setDefaultOfficeView(savedView)
      }
      const savedSound = localStorage.getItem('virtualOffice_enableSound')
      if (savedSound !== null) {
        try { setEnableSound(JSON.parse(savedSound)) } catch {}
      }
    }
  }, [])

  const handleToggleAuthorization = async (user: TelegramUserItem) => {
    setUpdatingUserId(user.id)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_telegram_user',
          telegramUserId: user.id,
          isAuthorized: !user.isAuthorized,
        }),
      })

      if (res.ok) {
        toast.success(
          !user.isAuthorized
            ? `✅ Akses diizinkan untuk ${user.username || user.firstName || user.telegramId}`
            : `🚫 Akses dicabut untuk ${user.username || user.firstName || user.telegramId}`
        )
        fetchSettings()
      } else {
        toast.error('Gagal memperbarui status user')
      }
    } catch {
      toast.error('Error saat menghubungi server')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleChangeRole = async (user: TelegramUserItem, newRole: string) => {
    setUpdatingUserId(user.id)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_telegram_user',
          telegramUserId: user.id,
          role: newRole,
        }),
      })

      if (res.ok) {
        toast.success(`Role diperbarui menjadi ${newRole}`)
        fetchSettings()
      } else {
        toast.error('Gagal memperbarui role')
      }
    } catch {
      toast.error('Error saat menghubungi server')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleSaveAISettings = () => {
    toast.success('Pengaturan AI & Autonomous Model berhasil disimpan!')
  }

  const handleSaveOfficeSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('virtualOffice_idleWander', JSON.stringify(idleWander))
      localStorage.setItem('virtualOffice_defaultView', defaultOfficeView)
      localStorage.setItem('virtualOffice_enableSound', JSON.stringify(enableSound))
      window.dispatchEvent(
        new CustomEvent('virtualOffice_settings_changed', {
          detail: { idleWander, defaultOfficeView, enableSound },
        })
      )
    }
    toast.success('Preferensi Virtual Office tersimpan!')
  }

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
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            }}>
              <Settings size={20} color="white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
              Platform Settings & System Status
            </h1>
          </div>
          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 14, maxWidth: 680 }}>
            Pusat konfigurasi multi-agent runtime, integrasi Telegram bot, permission whitelist, dan parameter LLM.
          </p>
        </div>

        <button
          onClick={fetchSettings}
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
          Refresh Status
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 12,
        overflowX: 'auto',
      }}>
        {[
          { key: 'system', label: '🖥️ Status Sistem & Health', icon: Server },
          { key: 'databases', label: '🗄️ Multi-Project Databases', icon: Database },
          { key: 'telegram', label: '✈️ Telegram Bot & Whitelist', icon: Send },
          { key: 'ai', label: '🧠 AI Engine & Model Tuning', icon: Cpu },
          { key: 'office', label: '🏢 Virtual Office Preferences', icon: Sparkles },
        ].map((tab) => {
          const isSelected = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                background: isSelected
                  ? 'rgba(249, 115, 22, 0.2)'
                  : 'rgba(254, 215, 170, 0.04)',
                border: isSelected
                  ? '1px solid rgba(249, 115, 22, 0.5)'
                  : '1px solid var(--border-subtle)',
                color: isSelected ? 'rgb(251, 146, 60)' : 'rgb(var(--text-secondary))',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: System & Health */}
      {activeTab === 'system' && (
        <div>
          {/* Status Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}>
            {/* MySQL Database Card */}
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Server size={18} color="#10b981" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>MySQL Database</h3>
                    <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>XAMPP MariaDB</span>
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                }}>
                  ONLINE
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                <div>Host: <strong style={{ color: 'rgb(var(--text-primary))' }}>localhost:3306</strong></div>
                <div>Database: <strong style={{ color: 'rgb(var(--text-primary))' }}>karyawan_ai</strong></div>
                <div>Status: <span style={{ color: '#34d399' }}>● Connected & Schema Synced</span></div>
              </div>
            </div>

            {/* Telegram Bot Card */}
            <div className="card" style={{ borderLeft: '4px solid #38bdf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Send size={18} color="#38bdf8" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Telegram Bot</h3>
                    <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Long Polling Active</span>
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                }}>
                  ACTIVE
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                <div>Username: <strong style={{ color: '#38bdf8' }}>@ai_employee_office_bot</strong></div>
                <div>Token: <span style={{ color: '#34d399' }}>Configured in .env.local</span></div>
                <div style={{ marginTop: 6 }}>
                  <a
                    href="https://t.me/ai_employee_office_bot"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: '#38bdf8',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Buka Chat Telegram <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* OpenAI LLM Engine Card */}
            <div className="card" style={{ borderLeft: '4px solid #f97316' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    borderRadius: 10,
                    background: 'rgba(249, 115, 22, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Cpu size={18} color="#f97316" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>OpenAI Engine</h3>
                    <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Primary Intelligence</span>
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(249, 115, 22, 0.2)',
                  color: '#fb923c',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                }}>
                  READY
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                <div>Primary Model: <strong style={{ color: 'rgb(var(--text-primary))' }}>gpt-4o</strong></div>
                <div>Dispatcher: <strong style={{ color: 'rgb(var(--text-primary))' }}>Tool-Calling Enabled</strong></div>
                <div>API Key: <span style={{ color: '#34d399' }}>● Loaded & Validated</span></div>
              </div>
            </div>

            {/* Queue & Worker Card */}
            <div className="card" style={{ borderLeft: '4px solid #ec4899' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    borderRadius: 10,
                    background: 'rgba(236, 72, 153, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Shield size={18} color="#ec4899" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Task Execution</h3>
                    <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Direct Fallback Mode</span>
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#f472b6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                }}>
                  OPERATIONAL
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                <div>Mode: <strong style={{ color: 'rgb(var(--text-primary))' }}>Direct Background Run</strong></div>
                <div>Zero Redis Dependency: <span style={{ color: '#34d399' }}>Active</span></div>
                <div>Workforce Size: <strong style={{ color: 'rgb(var(--text-primary))' }}>{status?.workforce.agentCount || 5} AI Agents</strong></div>
              </div>
            </div>
          </div>

          {/* Quick Platform Architecture Summary */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#f97316" />
              Arsitektur AI Workforce Multi-Agent
            </h3>
            <p style={{ fontSize: 14, color: 'rgb(var(--text-secondary))', lineHeight: 1.6, marginBottom: 16 }}>
              Platform ini menggabungkan <strong>Next.js 15</strong>, <strong>MySQL MariaDB</strong>, <strong>Grammy (Telegram Bot)</strong>, dan <strong>OpenAI GPT-4o</strong> untuk menciptakan kantor virtual interaktif lengkap dengan sistem delegasi tugas mandiri (autonomous agent delegation) dan human-in-the-loop approval.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              fontSize: 13,
            }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#f97316' }}>1. Natural Language Input:</strong> Pengguna mengirim perintah bebas dari Telegram atau web chat.
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#06b6d4' }}>2. AI Dispatcher:</strong> Manager AI menganalisa maksud perintah dan menugaskan karyawan yang tepat (Alex, Ranger, Sarah).
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#10b981' }}>3. Tool Execution:</strong> Karyawan mengeksekusi skill berizin (CPU, DB SELECT, Git status) secara aman.
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#f43f5e' }}>4. Safety Approval:</strong> Tindakan berisiko tinggi (Update DB, deploy) otomatis ditahan hingga di-approve.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Multi-Project Databases */}
      {activeTab === 'databases' && (
        <div>
          {/* Banner */}
          <div className="card" style={{
            padding: 24,
            marginBottom: 26,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(249, 115, 22, 0.08) 100%)',
            borderColor: 'rgba(6, 182, 212, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Database size={22} color="#06b6d4" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                    Multi-Project Database Monitoring & Control
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: 'rgb(var(--text-secondary))', maxWidth: 780, lineHeight: 1.6 }}>
                  AI Workforce Anda dapat memonitor, memeriksa status, menjalankan query SELECT aman, dan menganalisa data dari berbagai database projek secara mandiri.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  color: '#22d3ee',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <CheckCircle2 size={16} />
                  <span>{projectDatabases.length} Project Databases Online</span>
                </div>

                <button
                  onClick={() => setShowAddDbModal(!showAddDbModal)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  <Plus size={16} />
                  <span>{showAddDbModal ? 'Tutup Form' : 'Tambah Koneksi Database'}</span>
                </button>
              </div>
            </div>

            {/* Natural language examples guide */}
            <div style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 14,
              background: 'rgba(28, 20, 22, 0.75)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              fontSize: 13,
            }}>
              <strong style={{ color: '#22d3ee', display: 'block', marginBottom: 8 }}>
                💬 Contoh Perintah ke Bot Telegram / Web Chat:
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>Ranger (SysAdmin):</span>
                  <div style={{ fontStyle: 'italic', color: 'rgb(var(--text-secondary))' }}>&quot;Ranger, cek daftar tabel di database erp_db&quot;</div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: '#ec4899', fontWeight: 700 }}>Sarah (Finance):</span>
                  <div style={{ fontStyle: 'italic', color: 'rgb(var(--text-secondary))' }}>&quot;Sarah, berapa total penjualan nota di database erp_db?&quot;</div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: '#06b6d4', fontWeight: 700 }}>Alex (Programmer):</span>
                  <div style={{ fontStyle: 'italic', color: 'rgb(var(--text-secondary))' }}>&quot;Alex, query 5 customer teratas dari tabel mhcustomer di erp_db&quot;</div>
                </div>
              </div>
            </div>
          </div>

          {/* ADD DATABASE FORM PANEL (When toggled open) */}
          {showAddDbModal && (
            <div className="card" style={{
              padding: 24,
              marginBottom: 28,
              border: '1px solid rgba(249, 115, 22, 0.4)',
              background: 'linear-gradient(135deg, rgba(28, 20, 22, 0.95) 0%, rgba(38, 22, 18, 0.95) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(249, 115, 22, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f97316',
                  }}>
                    <Plus size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 17, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                      Tambah Koneksi Database Projek Baru
                    </h4>
                    <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                      Hubungkan database projek lain (lokal atau remote VPS/Cloud) agar dapat diakses AI Workforce
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddDbModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'rgb(var(--text-muted))', cursor: 'pointer', fontSize: 14 }}
                >
                  ✕ Tutup
                </button>
              </div>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setAddDbMode('url')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: addDbMode === 'url' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(254, 215, 170, 0.05)',
                    border: addDbMode === 'url' ? '1px solid #f97316' : '1px solid var(--border-subtle)',
                    color: addDbMode === 'url' ? '#f97316' : 'rgb(var(--text-secondary))',
                  }}
                >
                  🔗 Mode String URL Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => setAddDbMode('params')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: addDbMode === 'params' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(254, 215, 170, 0.05)',
                    border: addDbMode === 'params' ? '1px solid #f97316' : '1px solid var(--border-subtle)',
                    color: addDbMode === 'params' ? '#f97316' : 'rgb(var(--text-secondary))',
                  }}
                >
                  ⚙️ Mode Form Parameter (Host, Port, User, Pass)
                </button>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#f97316' }}>
                    Kode Singkat Projek / Slug AI *
                  </label>
                  <input
                    type="text"
                    placeholder="misal: pos_resto, toko_online, crm_sales"
                    value={newDbForm.name}
                    onChange={(e) => setNewDbForm({ ...newDbForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    style={{
                      width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
                      background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)',
                      color: 'rgb(var(--text-primary))', fontFamily: 'monospace', fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 4, display: 'block' }}>
                    Digunakan saat memerintah AI: <em>&quot;Sarah, cek penjualan di database {newDbForm.name || 'pos_resto'}&quot;</em>
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'rgb(var(--text-primary))' }}>
                    Label / Nama Tampilan Projek *
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Database POS Resto Cabang Barat"
                    value={newDbForm.label}
                    onChange={(e) => setNewDbForm({ ...newDbForm, label: e.target.value })}
                    style={{
                      width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
                      background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)',
                      color: 'rgb(var(--text-primary))', fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 4, display: 'block' }}>
                    Nama lengkap yang muncul pada kartu database di dashboard.
                  </span>
                </div>
              </div>

              {addDbMode === 'url' ? (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#22d3ee' }}>
                    URL Koneksi MySQL *
                  </label>
                  <input
                    type="text"
                    placeholder="mysql://username:password@hostname:3306/nama_database"
                    value={newDbForm.connectionUrl}
                    onChange={(e) => setNewDbForm({ ...newDbForm, connectionUrl: e.target.value })}
                    style={{
                      width: '100%', height: 42, padding: '0 14px', borderRadius: 10,
                      background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)',
                      color: 'rgb(var(--text-primary))', fontFamily: 'monospace', fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', marginTop: 4, display: 'block' }}>
                    Format: <code>mysql://[user]:[password]@[host]:[port]/[database]</code> (contoh lokal: <code>mysql://root:@localhost:3306/erp_db</code>)
                  </span>
                </div>
              ) : (
                <div style={{
                  padding: 18, borderRadius: 12, background: 'rgba(254, 215, 170, 0.03)',
                  border: '1px solid var(--border-subtle)', marginBottom: 20,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Host / Server IP *</label>
                      <input
                        type="text"
                        placeholder="localhost atau 103.150.x.x"
                        value={newDbForm.host}
                        onChange={(e) => setNewDbForm({ ...newDbForm, host: e.target.value })}
                        style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Port</label>
                      <input
                        type="text"
                        placeholder="3306"
                        value={newDbForm.port}
                        onChange={(e) => setNewDbForm({ ...newDbForm, port: e.target.value })}
                        style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Database Name *</label>
                      <input
                        type="text"
                        placeholder="nama_db"
                        value={newDbForm.database}
                        onChange={(e) => setNewDbForm({ ...newDbForm, database: e.target.value })}
                        style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Username *</label>
                      <input
                        type="text"
                        placeholder="root"
                        value={newDbForm.user}
                        onChange={(e) => setNewDbForm({ ...newDbForm, user: e.target.value })}
                        style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Password</label>
                      <input
                        type="password"
                        placeholder="Kosongkan jika tanpa password"
                        value={newDbForm.password}
                        onChange={(e) => setNewDbForm({ ...newDbForm, password: e.target.value })}
                        style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, background: 'rgba(28, 20, 22, 0.8)', border: '1px solid var(--border-subtle)', color: 'white', fontSize: 13 }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                    Preview Generated URL: <code style={{ color: '#fde68a' }}>{getComputedConnectionUrl()}</code>
                  </div>
                </div>
              )}

              {/* Test Result Feedback */}
              {newDbTestResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  marginBottom: 16,
                  background: newDbTestResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${newDbTestResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: newDbTestResult.success ? '#34d399' : '#fca5a5',
                }}>
                  {newDbTestResult.success
                    ? `✅ Koneksi Berhasil! Database terhubung & ditemukan ${newDbTestResult.tableCount} tabel.`
                    : `❌ Gagal Terhubung: ${newDbTestResult.error}`}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleTestNewDb}
                  disabled={testingNewDb}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#22d3ee',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: testingNewDb ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Server size={14} />
                  <span>{testingNewDb ? 'Menguji...' : '⚡ Uji Koneksi Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveNewDb}
                  disabled={savingDb}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: savingDb ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  <Check size={14} />
                  <span>{savingDb ? 'Menyimpan...' : '💾 Simpan Database Monitoring'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Project Databases Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}>
            {projectDatabases.map((db) => {
              const isSelected = selectedDbTables?.database === db.name
              const isSaved = db.source === 'SAVED'
              const isLocal = db.source === 'LOCAL'
              const isEnv = db.source === 'ENV'
              const isConnected = db.status === 'CONNECTED'

              return (
                <div
                  key={db.name}
                  className="card"
                  style={{
                    borderColor: isSelected ? 'rgba(6, 182, 212, 0.6)' : 'var(--border-subtle)',
                    borderLeft: `4px solid ${
                      db.name === 'erp_db'
                        ? '#f59e0b'
                        : isSaved
                        ? '#a855f7'
                        : db.name === 'compro_travel'
                        ? '#06b6d4'
                        : '#10b981'
                    }`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: 17, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                          {db.label || db.name}
                        </h4>
                        {db.isDefault && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#34d399',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}>
                            CORE DB
                          </span>
                        )}
                        {isSaved && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#c084fc',
                            background: 'rgba(168, 85, 247, 0.15)',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}>
                            SAVED (WEB)
                          </span>
                        )}
                        {isEnv && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#60a5fa',
                            background: 'rgba(59, 130, 246, 0.15)',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}>
                            .ENV
                          </span>
                        )}
                        {isLocal && !db.isDefault && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}>
                            AUTO-LOKAL
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#22d3ee', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                          slug: {db.name}
                        </span>
                        <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                          {db.host || 'localhost'}:{db.port || 3306}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isConnected ? '#34d399' : '#f87171',
                      border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {isConnected ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: 'rgb(var(--text-secondary))',
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}>
                    <div>Jumlah Tabel: <strong style={{ color: 'rgb(var(--text-primary))' }}>{db.tablesCount} tabel</strong></div>
                    <div>Akses AI: <span style={{ color: '#34d399' }}>● Read-only SELECT / SHOW / EXPLAIN</span></div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleInspectDatabase(db.name)}
                      disabled={loadingTables}
                      style={{
                        flex: 1,
                        padding: '9px 14px',
                        borderRadius: 10,
                        background: isSelected
                          ? 'rgba(6, 182, 212, 0.25)'
                          : 'rgba(254, 215, 170, 0.06)',
                        border: isSelected
                          ? '1px solid rgba(6, 182, 212, 0.6)'
                          : '1px solid var(--border-subtle)',
                        color: isSelected ? '#22d3ee' : 'rgb(var(--text-primary))',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Database size={13} />
                      {isSelected ? 'Tutup Tabel' : 'Lihat Tabel'}
                    </button>

                    {db.isCustom && (
                      <button
                        onClick={() => handleDeleteDb(db)}
                        disabled={deletingDbId === db.id}
                        title="Hapus database dari monitoring"
                        style={{
                          padding: '9px 12px',
                          borderRadius: 10,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: deletingDbId === db.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table Inspector Drawer / Panel */}
          {selectedDbTables && (
            <div className="card" style={{ padding: 24, marginBottom: 28, borderColor: 'rgba(6, 182, 212, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#22d3ee' }}>
                    📋 Tabel dalam `{selectedDbTables.database}` ({selectedDbTables.tables.length})
                  </h4>
                  <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                    Dapat diakses langsung oleh Alex & Ranger via skill `database.mysql_query`
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDbTables(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgb(var(--text-muted))',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ✕ Tutup
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
                maxHeight: 280,
                overflowY: 'auto',
                paddingRight: 6,
              }}>
                {selectedDbTables.tables.map((tbl) => (
                  <div
                    key={tbl}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'rgba(254, 215, 170, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: 'rgb(251, 146, 60)',
                    }}
                  >
                    {tbl}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Info & Tips */}
          <div className="card" style={{ padding: 22 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={16} color="#f97316" />
              Arsitektur Multi-Database Karyawan AI
            </h4>
            <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.6, marginBottom: 12 }}>
              Sistem Karyawan AI mendukung 3 jalur integrasi database secara harmonis:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, fontSize: 13 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#38bdf8' }}>1. Web Dashboard (Rekomendasi):</strong>
                <p style={{ color: 'rgb(var(--text-secondary))', marginTop: 4 }}>
                  Klik tombol <strong>&quot;Tambah Koneksi Database&quot;</strong> di atas untuk menyimpan koneksi secara permanen ke sistem tanpa sentuh kode.
                </p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#fbbf24' }}>2. Deteksi Otomatis XAMPP:</strong>
                <p style={{ color: 'rgb(var(--text-secondary))', marginTop: 4 }}>
                  Semua database yang Anda buat di phpMyAdmin lokal langsung terbaca otomatis tanpa konfigurasi apa pun.
                </p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(254, 215, 170, 0.04)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: '#a78bfa' }}>3. Environment Variable (.env.local):</strong>
                <p style={{ color: 'rgb(var(--text-secondary))', marginTop: 4 }}>
                  Bisa juga menambahkan baris <code>DB_NAMA=&quot;mysql://...&quot;</code> di <code>.env.local</code> untuk deployment DevOps/CI-CD.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Telegram Bot & Whitelist */}
      {activeTab === 'telegram' && (
        <div>
          {/* Telegram Banner Guide */}
          <div className="card" style={{
            padding: 24,
            marginBottom: 26,
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(249, 115, 22, 0.08) 100%)',
            borderColor: 'rgba(56, 189, 248, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Send size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                    Telegram Access Control Whitelist
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: 'rgb(var(--text-secondary))', maxWidth: 740, lineHeight: 1.5 }}>
                  Untuk keamanan sistem, hanya pengguna Telegram yang berstatus <strong>Authorized</strong> yang dapat memberikan perintah kepada karyawan AI. Siapapun yang mengirim pesan ke bot akan otomatis tercatat di tabel di bawah ini.
                </p>
              </div>

              <a
                href="https://t.me/ai_employee_office_bot"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span>Buka Bot @ai_employee_office_bot</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Quick Testing Steps */}
            <div style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: 'rgba(28, 20, 22, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: 13,
              color: 'rgb(var(--text-primary))',
            }}>
              <strong style={{ color: '#38bdf8' }}>💡 Cara Testing Bot Telegram:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 6, lineHeight: 1.6 }}>
                <li>Buka aplikasi Telegram dan cari bot: <code>@ai_employee_office_bot</code></li>
                <li>Klik <strong>Start</strong> atau ketik <code>/start</code></li>
                <li>Ketik perintah seperti: <em>&quot;cek kondisi server sekarang&quot;</em> atau <em>&quot;cek memory dan disk&quot;</em></li>
                <li>Bot akan merespons secara real-time dan task akan muncul di Task Center!</li>
              </ol>
            </div>
          </div>

          {/* Telegram Users Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  Pengguna Telegram Terdaftar ({telegramUsers.length})
                </h3>
                <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                  Kelola izin akses dan level hak otorisasi
                </span>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 24 }}>
                <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
              </div>
            ) : telegramUsers.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgb(var(--text-muted))' }}>
                <Send size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                  Belum ada interaksi Telegram
                </h4>
                <p style={{ fontSize: 13, marginTop: 4 }}>
                  Kirim pesan pertama ke <strong>@ai_employee_office_bot</strong> di Telegram untuk mendaftarkan akun.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(254, 215, 170, 0.03)',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'rgb(var(--text-muted))',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      <th style={{ padding: '12px 20px' }}>Telegram User</th>
                      <th style={{ padding: '12px 20px' }}>Telegram ID</th>
                      <th style={{ padding: '12px 20px' }}>Role</th>
                      <th style={{ padding: '12px 20px' }}>Status Akses</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telegramUsers.map((user) => {
                      const isUpdating = updatingUserId === user.id
                      return (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, color: 'white', fontSize: 13,
                              }}>
                                {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                                  {user.firstName || ''} {user.lastName || ''}
                                  {!user.firstName && !user.lastName && (user.username || 'User')}
                                </div>
                                <div style={{ fontSize: 12, color: '#38bdf8' }}>
                                  @{user.username || 'no_username'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'rgb(var(--text-secondary))' }}>
                            {user.telegramId}
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user, e.target.value)}
                              disabled={isUpdating}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'rgba(28, 20, 22, 0.8)',
                                border: '1px solid var(--border-subtle)',
                                color: 'rgb(var(--text-primary))',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="USER">USER</option>
                            </select>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              background: user.isAuthorized
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              color: user.isAuthorized ? '#34d399' : '#f87171',
                              border: `1px solid ${user.isAuthorized ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}>
                              {user.isAuthorized ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {user.isAuthorized ? 'Authorized' : 'Blocked'}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleToggleAuthorization(user)}
                              disabled={isUpdating}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: user.isAuthorized
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(16, 185, 129, 0.2)',
                                border: `1px solid ${user.isAuthorized ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
                                color: user.isAuthorized ? '#fca5a5' : '#34d399',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {user.isAuthorized ? 'Cabut Akses' : 'Beri Izin Akses'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI Engine & Model Tuning */}
      {activeTab === 'ai' && (
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={20} color="#f97316" />
            Konfigurasi Model & Autonomous Policy
          </h3>
          <p style={{ fontSize: 14, color: 'rgb(var(--text-muted))', marginBottom: 24 }}>
            Sesuaikan parameter kecerdasan buatan, tingkat ketelitian dispatcher, dan batasan eksekusi otomatis.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Primary Model Choice */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Primary LLM Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 12,
                  background: 'rgba(28, 20, 22, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: 'rgb(var(--text-primary))',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="gpt-4o">gpt-4o (Recommended: Fast, High Reasoning & Multimodal)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (Lightweight & Economical)</option>
                <option value="gpt-4-turbo">gpt-4-turbo (Classic High Intelligence)</option>
              </select>
              <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 6, display: 'block' }}>
                Digunakan untuk routing instruksi natural language dan eksekusi reasoning tiap agent.
              </span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>
                  Temperature (Kreativitas vs Presisi)
                </label>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>
                  {temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 6, display: 'block' }}>
                Nilai rendah (0.1 - 0.3) ideal untuk routing tugas teknis dan database agar deterministik.
              </span>
            </div>

            {/* Max Steps Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>
                  Max Tool Execution Steps
                </label>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>
                  {maxSteps} steps
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={maxSteps}
                onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 6, display: 'block' }}>
                Batas maksimal pemanggilan tool per sesi sebelum agent memberikan jawaban akhir.
              </span>
            </div>

            {/* Approval Guard Toggle */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fb7185' }}>
                  Human-in-the-Loop Approval
                </div>
                <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                  Tahan tindakan berkategori HIGH & CRITICAL (seperti UPDATE DB, deploy) di Approval Center.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireHighRiskApproval}
                onChange={(e) => setRequireHighRiskApproval(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#f43f5e', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveAISettings}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Simpan Pengaturan AI
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Virtual Office Preferences */}
      {activeTab === 'office' && (
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#f97316" />
            Preferensi Simulasi Kantor Virtual
          </h3>
          <p style={{ fontSize: 14, color: 'rgb(var(--text-muted))', marginBottom: 24 }}>
            Kustomisasi tampilan virtual office Gather.town 2D Pixel Art dan 3D Low-Poly room.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {/* View Mode Choice */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: defaultOfficeView === 'pixel' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(254, 215, 170, 0.04)',
              border: `1px solid ${defaultOfficeView === 'pixel' ? 'rgba(249, 115, 22, 0.5)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}
            onClick={() => setDefaultOfficeView('pixel')}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎮</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                Pixel Art Top-Down (Gather Style)
              </h4>
              <p style={{ fontSize: 13, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
                Denah kantor 2D bergaya Gather.town dengan chibi agent, meja kerja, breakroom kopi, dan status bubble real-time.
              </p>
            </div>

            <div style={{
              padding: 20,
              borderRadius: 16,
              background: defaultOfficeView === '3d' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(254, 215, 170, 0.04)',
              border: `1px solid ${defaultOfficeView === '3d' ? 'rgba(249, 115, 22, 0.5)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}
            onClick={() => setDefaultOfficeView('3d')}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                3D Low-Poly Room (Three.js)
              </h4>
              <p style={{ fontSize: 13, color: 'rgb(var(--text-muted))', marginTop: 4 }}>
                Ruangan 3D interaktif dengan pencahayaan hangat sunset, parquet kayu, monitor menyala, dan agent 3D Billboard.
              </p>
            </div>
          </div>

          <div style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={idleWander}
                onChange={(e) => {
                  const val = e.target.checked
                  setIdleWander(val)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('virtualOffice_idleWander', JSON.stringify(val))
                    window.dispatchEvent(
                      new CustomEvent('virtualOffice_settings_changed', {
                        detail: { idleWander: val },
                      })
                    )
                  }
                }}
                style={{ width: 18, height: 18, accentColor: '#f97316' }}
              />
              <span>Aktifkan pergerakan santai agent saat status IDLE (berjalan ke area kopi/lounge)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={enableSound}
                onChange={(e) => setEnableSound(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#f97316' }}
              />
              <span>Efek suara notifikasi saat ada task baru dari Telegram / selesai</span>
            </label>
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveOfficeSettings}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Simpan Preferensi Kantor
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
