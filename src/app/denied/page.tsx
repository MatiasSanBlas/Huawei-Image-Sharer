'use client'

import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export default function DeniedPage() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; max-age=0'
    router.push('/auth/login')
  }

  return (
    <main className="status-page" id="main-content">
      <div className="status-card">
        <BrandLogo />
        <div className="status-icon denied" aria-hidden="true">×</div>
        <h1>No se aprobó tu cuenta</h1>
        <p>Tu solicitud fue revisada. Si creés que se trata de un error, contactá a un administrador.</p>
        <button
          onClick={handleLogout}
          className="secondary-action"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
