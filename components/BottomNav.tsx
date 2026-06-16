'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/calendario', icon: '📅', label: 'Calendario' },
  { href: '/registro-diario', icon: '✏️', label: 'Registrar', center: true },
  { href: '/prevencion', icon: '🛡️', label: 'Salud' },
  { href: '/perfil', icon: '🐾', label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[480px] bg-[#111830] border-t border-white/8 flex items-center justify-around px-2 pb-safe pt-2">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-[#E3A84A] flex items-center justify-center text-2xl shadow-lg border-4 border-[#0B1020]">
                  {item.icon}
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[52px] py-1"
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-[#E3A84A]' : 'text-[#8A8FA8]'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
