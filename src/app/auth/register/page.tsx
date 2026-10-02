'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signUp({
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
      router.push('/pending')
    } else {
      setError('Revisa tu email para confirmar tu cuenta.')
    }

    setLoading(false)
  }

  return (
    <AuthLayout title="Crear cuenta" description="Solicitá acceso para compartir imágenes en Huawei Cloud.">
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="register-email">Correo electrónico</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              name="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Ingresá una contraseña"
            />
            <span className="field-help">Usá al menos 6 caracteres.</span>
          </div>

          {error && (
            <div className="form-alert" role="status">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-action"
          >
            {loading ? 'Registrando…' : 'Solicitar acceso'}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tenés cuenta? <a href="/auth/login">Iniciar sesión</a>
        </p>
    </AuthLayout>
  )
}
