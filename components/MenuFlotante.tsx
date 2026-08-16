'use client'
import { usePathname } from 'next/navigation'
import MenuCuenta from '@/components/MenuCuenta'

// ============================================================
// MENU FLOTANTE — presente en todas las pantallas
// ============================================================
// Cada pantalla tiene su propio encabezado, con distinta estructura:
// el calendario tiene flechas de mes, el perfil tiene el logo, el
// dashboard tiene la marca. Insertar el menu dentro de cada uno
// significaria acertar seis anclajes distintos.
//
// Va flotante en posicion fija arriba a la derecha. Se dibuja una sola
// vez, desde el layout, y aparece en todas.
//
// NO se muestra en el dashboard, que ya lo tiene en su encabezado, ni
// en las pantallas sin sesion (login, registro, bienvenida) ni en la
// vista del veterinario, que no es del tutor.
//
// El z-40 lo deja bajo los modales (z-60) para que no se superponga a
// una ventana abierta, y sobre el contenido normal.

const SIN_MENU = ['/login', '/registro', '/bienvenida', '/vet', '/dashboard', '/privacidad', '/links']

export default function MenuFlotante() {
  const pathname = usePathname()

  if (!pathname) return null
  if (SIN_MENU.some(r => pathname === r || pathname.startsWith(r + '/'))) return null

  return (
    <div className="fixed top-3 right-3 z-40">
      <div className="bg-[#F5EDE3]/85 rounded-full backdrop-blur-sm">
        <MenuCuenta />
      </div>
    </div>
  )
}
