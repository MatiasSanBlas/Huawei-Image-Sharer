'use client'

import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import BrandLogo from './BrandLogo'

export default function Header() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    router.push('/auth/login')
  }

  return (
    <header className="site-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <BrandLogo />
        <span className="header-product">Image Sharer</span>
      </div>

      <button
        onClick={handleLogout}
        className="header-logout"
      >
        Cerrar sesión
      </button>
    </header>
  )
}
