'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const router = useRouter()
  const redirected = useRef(false)
  const [checking, setChecking] = useState(false)

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

  async function handleManualCheck() {
    setChecking(true)
    await checkProfile()
    setChecking(false)
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[pending] Realtime subscribed')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[pending] Realtime issue:', status, '- falling back to polling')
          }
        })

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
    <main className="status-page" id="main-content">
      <div className="status-card">
        <div className="brand" aria-label="Huawei Cloud">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HUAWEI <span>CLOUD</span></span>
        </div>
        <div className="status-icon" aria-hidden="true">⌛</div>
        <h1>Tu cuenta está pendiente de aprobación</h1>
        <p>Recibimos tu solicitud. Un administrador revisará tu cuenta para habilitar el acceso.</p>
        <p>Esta página se actualizará automáticamente cuando cambie el estado de tu cuenta.</p>
        <div className="status-actions">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="primary-action"
          >
            {checking ? 'Verificando…' : 'Verificar estado'}
          </button>
          <button
            onClick={handleLogout}
            className="secondary-action"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}
