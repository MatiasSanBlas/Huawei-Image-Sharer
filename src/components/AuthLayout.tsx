import type { ReactNode } from 'react'

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
        <div className="brand" aria-label="Huawei Cloud">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HUAWEI <span>CLOUD</span></span>
        </div>
        <div className="auth-story-content">
          <div className="auth-headline">Imágenes listas para <strong>compartir.</strong></div>
          <p>Explorá tus imágenes privadas de Huawei Cloud y compartilas con el proyecto, la cuenta o la organización que las necesita.</p>
        </div>
        <div className="auth-story-foot">Image Management Service · IMS</div>
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
