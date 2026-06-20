import type { Metadata, Viewport } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import './globals.css'
import RegistrarServiceWorker from '@/components/RegistrarServiceWorker'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-nunito-sans',
})

export const metadata: Metadata = {
  title: 'CHIQUI Entre Señales',
  description: 'Tu compañero de observación y cuidado.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CHIQUI',
  },
  icons: {
    icon: '/icon-512x512.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#8C572F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} ${nunitoSans.variable} font-body bg-[#F5EDE3] text-[#3D2B1F] min-h-screen`}>
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  )
}
