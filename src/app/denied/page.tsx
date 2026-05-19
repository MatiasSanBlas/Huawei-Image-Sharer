'use client'

import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { colors, radius, shadow } from '@/lib/theme'

export default function DeniedPage() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    router.push('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <div style={{ width: 400, padding: '40px 32px', background: colors.cardBg, borderRadius: radius.lg, boxShadow: shadow.card, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, background: colors.errorBg, borderRadius: radius.md, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: colors.error }}>
          {'\u2717'}
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
          Cuenta Denegada
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: colors.textSecondary }}>
          Tu solicitud de registro fue revisada y no fue aprobada. Si crees que es un error, contacta a un administrador.
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
