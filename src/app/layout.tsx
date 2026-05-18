import type { Metadata } from 'next'

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
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', margin: 0, background: '#F5F7FA', color: '#1D2129', WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </body>
    </html>
  )
}
