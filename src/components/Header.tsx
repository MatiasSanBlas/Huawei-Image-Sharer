'use client'

import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

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
        padding: '12px 24px',
        borderBottom: '1px solid #e0e0e0',
        background: '#1a1a2e',
        color: '#fff',
      }}
    >
      <h2 style={{ margin: 0 }}>Huawei OS Image Sharer</h2>
      <button
        onClick={handleLogout}
        style={{
          padding: '6px 16px',
          cursor: 'pointer',
          background: '#e94560',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
        }}
      >
        Cerrar Sesion
      </button>
    </header>
  )
}
