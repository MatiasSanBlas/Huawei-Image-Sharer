'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { colors, radius, shadow, inputStyle, primaryBtn } from '@/lib/theme'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; samesite=lax`

      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        })
        if (res.ok) {
          const profile = await res.json()
          if (profile.status === 'pending') { router.push('/pending'); setLoading(false); return }
          if (profile.status === 'denied') { router.push('/denied'); setLoading(false); return }
        }
      } catch {}

      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <div style={{ width: 400, padding: '40px 32px', background: colors.cardBg, borderRadius: radius.lg, boxShadow: shadow.card }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: colors.primary, borderRadius: radius.md, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: colors.textWhite, fontWeight: 700 }}>
            H
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, color: colors.textPrimary }}>Iniciar Sesión</h1>
          <p style={{ margin: 0, fontSize: 14, color: colors.textSecondary }}>Huawei OS Image Sharer</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={{ ...inputStyle, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              style={{ ...inputStyle, boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: radius.sm, background: colors.errorBg, color: colors.error, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: colors.textSecondary }}>
          No tienes cuenta?{' '}
          <a href="/auth/register" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>Registrate</a>
        </p>
      </div>
    </div>
  )
}
