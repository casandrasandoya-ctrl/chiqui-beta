import type { Metadata } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import './globals.css'

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
  manifest: '/manifest.json',
  themeColor: '#0F1117',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} ${nunitoSans.variable} font-body bg-[#0F1117] text-[#F0EEE8] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
