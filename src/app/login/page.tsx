'use client'

import React, { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('admin@karyawan.ai')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl,
      })

      if (res?.error) {
        setError('Email atau password salah. Silakan coba lagi.')
        setLoading(false)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err: any) {
      setError('Terjadi kendala saat login. Silakan hubungi admin.')
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('admin@karyawan.ai')
    setPassword('admin123')
    setError(null)
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 440,
      background: 'rgba(42, 30, 32, 0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(251, 146, 60, 0.25)',
      borderRadius: 24,
      padding: '36px 32px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(249, 115, 22, 0.1)',
      position: 'relative',
    }}>
      {/* Decorative top glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '20%',
        right: '20%',
        height: 2,
        background: 'linear-gradient(90deg, transparent, #f97316, #f43f5e, transparent)',
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 58,
          height: 58,
          background: 'linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #facc15 100%)',
          borderRadius: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.45)',
          marginBottom: 16,
        }}>
          <Bot size={32} color="white" />
        </div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'rgb(var(--text-primary))',
          letterSpacing: '-0.4px',
        }}>
          AI Workforce Portal
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgb(var(--text-muted))',
          marginTop: 6,
          fontWeight: 500,
        }}>
          Autentikasi Akses Digital Office & Multi-Agent System
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          fontSize: 13,
          marginBottom: 20,
        }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: 'rgb(var(--text-secondary))',
            marginBottom: 8,
            letterSpacing: '0.02em',
          }}>
            Email Pengguna
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgb(var(--text-muted))',
              display: 'flex',
            }}>
              <Mail size={17} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@karyawan.ai"
              style={{
                width: '100%',
                padding: '13px 14px 13px 42px',
                borderRadius: 12,
                background: 'rgba(28, 20, 22, 0.65)',
                border: '1px solid rgba(251, 146, 60, 0.25)',
                color: 'rgb(var(--text-primary))',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#f97316'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.2)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.25)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgb(var(--text-secondary))',
              letterSpacing: '0.02em',
            }}>
              Password
            </label>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgb(var(--text-muted))',
              display: 'flex',
            }}>
              <Lock size={17} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '13px 44px 13px 42px',
                borderRadius: 12,
                background: 'rgba(28, 20, 22, 0.65)',
                border: '1px solid rgba(251, 146, 60, 0.25)',
                color: 'rgb(var(--text-primary))',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#f97316'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.2)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.25)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgb(var(--text-muted))',
                cursor: 'pointer',
                display: 'flex',
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f43f5e 100%)',
            border: 'none',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 18px rgba(249, 115, 22, 0.4)',
            opacity: loading ? 0.75 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {loading ? (
            <span>Memverifikasi Akses...</span>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Demo Quick Fill Helper */}
      <div style={{
        marginTop: 24,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(254, 215, 170, 0.05)',
        border: '1px dashed rgba(251, 146, 60, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ fontSize: 12, color: 'rgb(var(--text-secondary))' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={13} color="#f97316" />
            <span>Akun Default Admin:</span>
          </div>
          <div style={{ color: 'rgb(var(--text-muted))', fontSize: 11, marginTop: 2 }}>
            admin@karyawan.ai • admin123
          </div>
        </div>
        <button
          type="button"
          onClick={fillDemo}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(249, 115, 22, 0.18)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            color: '#fb923c',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Isi Otomatis
        </button>
      </div>

      {/* Footer Security Badge */}
      <div style={{
        marginTop: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontSize: 11,
        color: 'rgb(var(--text-muted))',
      }}>
        <ShieldCheck size={14} color="#10b981" />
        <span>Dilindungi Enkripsi Sesi JWT & Multi-Agent RBAC</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '25%',
        width: 380,
        height: 380,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '25%',
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      <Suspense fallback={<div style={{ color: 'white' }}>Memuat Halaman...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
