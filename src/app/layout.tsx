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
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
