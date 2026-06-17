'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/calendario', icon: '📅', label: 'Calendario' },
  { href: '/registro-diario', icon: '✏️', label: '', center: true },
  { href: '/analisis', icon: '📊', label: 'Análisis' },
  { href: '/prevencion', icon: '🐾', label: 'Salud' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px]">
      <div className="bg-[#181C26] border-t border-white/[0.07] flex items-center justify-around px-0 pt-2.5 pb-4">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-[52px] h-[52px] rounded-full bg-[#E8A84C] flex items-center justify-center text-[26px] border-[3px] border-[#0F1117]">
                  {item.icon}
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[52px]"
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className={`text-[10px] font-heading font-semibold ${isActive ? 'text-[#E8A84C]' : 'text-[#8A8FA8]'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
