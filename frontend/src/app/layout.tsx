import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PumpScanner(beta)',
  description: 'Analyze pump.fun tokens with AI-powered trust scoring',
  icons: {
    icon: '/pumpscanner.png',
    shortcut: '/pumpscanner.png',
    apple: '/pumpscanner.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}