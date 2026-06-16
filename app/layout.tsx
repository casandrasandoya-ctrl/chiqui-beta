import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
const poppins = Poppins({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-poppins' })
export const metadata: Metadata = {
  title: 'CHIQUI Entre Señales',
  description: 'Tu compañero de observación y cuidado.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} font-sans bg-[#0B1020] text-[#F0EEE8] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
