'use client'

import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { colors, radius } from '@/lib/theme'

export default function Header() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    router.push('/auth/login')
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        height: 56,
        background: colors.headerBg,
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: colors.primary,
            borderRadius: radius.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: colors.textWhite,
            fontWeight: 700,
          }}
        >
          H
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, color: colors.textWhite, letterSpacing: -0.3 }}>
          Image Sharer
        </span>
      </div>

      <button
        onClick={handleLogout}
        style={{
          padding: '6px 16px',
          cursor: 'pointer',
          background: 'transparent',
          color: colors.textSecondary,
          border: `1px solid ${colors.textSecondary}`,
          borderRadius: radius.sm,
          fontSize: 13,
          fontWeight: 500,
          transition: 'all 0.2s',
        }}
      >
        Cerrar Sesion
      </button>
    </header>
  )
}
