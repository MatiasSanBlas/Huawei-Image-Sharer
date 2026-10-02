import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Huawei OS Image Sharer',
  description: 'List and share private OS images across Huawei Cloud accounts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: '"Segoe UI", Arial, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
        <a className="skip-link" href="#main-content">Ir al contenido</a>
        {children}
      </body>
    </html>
  )
}
