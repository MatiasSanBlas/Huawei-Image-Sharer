import type { ReactNode } from 'react'
import BrandLogo from './BrandLogo'

export default function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="auth-page" id="main-content">
      <section className="auth-story" aria-label="Huawei Cloud Image Management Service">
        <BrandLogo />
        <div className="auth-story-content">
          <div className="auth-headline">Tus imágenes, listas para compartir.</div>
          <p>Explorá tus imágenes privadas de Huawei Cloud y compartilas con el proyecto, la cuenta o la organización que las necesita.</p>
        </div>
        <div className="auth-story-foot">
          <span>Seleccioná imágenes</span>
          <span>Elegí un destino</span>
          <span>Compartí</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-content">
          <h1>{title}</h1>
          <p className="auth-lede">{description}</p>
          {children}
        </div>
      </section>
    </main>
  )
}
