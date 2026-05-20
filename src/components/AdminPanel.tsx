'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { colors, radius, shadow } from '@/lib/theme'

interface UserProfile {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }, [])

  const fetchUsers = useCallback(async () => {
    const token = await getToken()
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setUsers(data.users || [])
      setMessage(null)
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchUsers()

    const interval = setInterval(fetchUsers, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchUsers])

  async function handleAction(userId: string, action: 'approve' | 'deny') {
    setActing(userId)
    setMessage(null)
    const token = await getToken()

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, action }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setMessage({
        type: 'ok',
        text: `Usuario ${action === 'approve' ? 'aprobado' : 'denegado'} exitosamente`,
      })

      fetchUsers()
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message })
    } finally {
      setActing(null)
    }
  }

  const pending = users.filter((u) => u.status === 'pending')
  const others = users.filter((u) => u.status !== 'pending')

  return (
    <div style={{ marginTop: 32, padding: 24, background: colors.cardBg, borderRadius: radius.md, boxShadow: shadow.card }}>
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 17, fontWeight: 600, color: colors.textPrimary }}>
        Panel de Administracion
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.textSecondary }}>
        {pending.length} usuario{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} de aprobacion
      </p>

      {message && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: radius.sm, background: message.type === 'ok' ? colors.successBg : colors.errorBg, color: message.type === 'ok' ? '#0E7B00' : colors.error, fontSize: 13 }}>
          {message.text}
        </div>
      )}

      {loading && <p style={{ fontSize: 13, color: colors.textSecondary }}>Cargando...</p>}

      {!loading && message?.type === 'err' && (
        <button
          onClick={() => { setLoading(true); fetchUsers() }}
          style={{ marginTop: 8, padding: '6px 16px', background: colors.primary, color: colors.textWhite, border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          Reintentar
        </button>
      )}

      {!loading && pending.length === 0 && (
        <p style={{ fontSize: 13, color: colors.textSecondary }}>No hay usuarios pendientes.</p>
      )}

      {!loading && pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Pendientes</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Email</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Fecha</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 14, color: colors.textPrimary }}>{u.email}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: colors.textSecondary }}>{new Date(u.created_at).toLocaleDateString('es')}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleAction(u.id, 'approve')}
                      disabled={acting === u.id}
                      style={{ padding: '4px 12px', marginRight: 8, background: colors.success, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleAction(u.id, 'deny')}
                      disabled={acting === u.id}
                      style={{ padding: '4px 12px', background: colors.error, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                    >
                      Denegar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && others.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Todos los usuarios</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Email</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Rol</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {others.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 14, color: colors.textPrimary }}>{u.email}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: u.role === 'admin' ? colors.primaryLight : '#F2F3F5', color: u.role === 'admin' ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: 500 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: u.status === 'approved' ? colors.successBg : colors.errorBg, color: u.status === 'approved' ? '#0E7B00' : colors.error, fontSize: 11, fontWeight: 500 }}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
