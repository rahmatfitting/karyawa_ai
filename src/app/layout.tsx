import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Workforce — Digital Office Platform',
  description: 'Platform AI Workforce dengan struktur organisasi virtual. Kelola AI Employee seperti karyawan sungguhan.',
  keywords: ['AI Workforce', 'AI Employee', 'Digital Office', 'AI Automation'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#2d1b1f',
              color: '#fff7ed',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.25)',
              borderRadius: '12px',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  )
}
