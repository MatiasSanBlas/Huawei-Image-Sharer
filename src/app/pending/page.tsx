'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { colors, radius, shadow } from '@/lib/theme'

export default function PendingPage() {
  const router = useRouter()
  const redirected = useRef(false)

  async function checkProfile() {
    if (redirected.current) return
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const token = session.session.access_token
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'approved') { redirected.current = true; router.push('/dashboard'); return }
        if (data.status === 'denied') { redirected.current = true; router.push('/denied'); return }
      }
    } catch {}
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return

      checkProfile()

      channel = supabase
        .channel('own-profile-pending')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => {
            if (redirected.current) return
            const newStatus = payload.new?.status
            if (newStatus === 'approved') { redirected.current = true; router.push('/dashboard') }
            if (newStatus === 'denied') { redirected.current = true; router.push('/denied') }
          }
        )
        .subscribe()

      interval = setInterval(checkProfile, 3000)

      authListener.subscription.unsubscribe()
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (interval) clearInterval(interval)
      authListener.subscription.unsubscribe()
    }
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    router.push('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <div style={{ width: 400, padding: '40px 32px', background: colors.cardBg, borderRadius: radius.lg, boxShadow: shadow.card, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, background: '#FFF3E0', borderRadius: radius.md, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#E65100' }}>
          {'\u23F3'}
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
          Cuenta Pendiente de Aprobacion
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: colors.textSecondary }}>
          Tu solicitud de registro fue recibida. Un administrador revisara tu cuenta y la aprobara a la brevedad.
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: colors.textSecondary }}>
          Esta pagina se actualizara automaticamente cuando tu cuenta sea aprobada.
        </p>
        <button
          onClick={handleLogout}
          style={{ padding: '10px 24px', background: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
        >
          Cerrar Sesion
        </button>
      </div>
    </div>
  )
}
