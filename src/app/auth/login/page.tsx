'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'

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
    <AuthLayout title="Iniciar sesión" description="Ingresá para gestionar y compartir tus imágenes privadas.">
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              spellCheck={false}
              placeholder="nombre@empresa.com"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Ingresá tu contraseña"
            />
          </div>

          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-action"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-switch">
          ¿Todavía no tenés cuenta? <a href="/auth/register">Crear cuenta</a>
        </p>
    </AuthLayout>
  )
}
