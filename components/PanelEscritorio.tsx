'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { determinarMascotaActiva, obtenerMascotaActivaId } from '@/utils/mascotaActiva'

// ============================================================
// PANEL ESCRITORIO — la navegación lateral
// ============================================================
// En el teléfono CHIQUI se navega con el menú de abajo y está bien: el
// pulgar llega solo. En un monitor ese mismo menú queda lejos de donde
// está mirando la persona, y toda la mitad izquierda de la pantalla
// sobra.
//
// Este panel existe SOLO desde 1024px (`hidden lg:flex`). El teléfono no
// lo ve nunca, y no hay que tocar ninguna pantalla para que aparezca: se
// dibuja una sola vez desde app/layout.tsx, igual que MenuFlotante.
//
// Es `fixed`, así que NO ocupa lugar en el flujo. El sitio se lo reserva
// el padding-left del body en globals.css, enganchado con
// :has(.panel-escritorio). POR ESO LA CLASE DEL <aside> IMPORTA: si se
// renombra, el contenido se mete por debajo del panel.
//
// NO aparece en las pantallas sin sesión ni en la vista del veterinario,
// que no es del tutor y tiene su propio ancho.
//
// z-30: por debajo de MenuFlotante (z-40) y de los modales (z-60).

const SIN_PANEL = ['/login', '/registro', '/bienvenida', '/vet', '/privacidad', '/links']

// Las cinco secciones que YA existen. "Salud" es solo la etiqueta: la
// ruta real es /prevencion, que es donde viven vacunas,
// antiparasitarios, medicamentos y exámenes.
const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icono: '🏠' },
  { href: '/calendario', label: 'Calendario', icono: '📅' },
  { href: '/prevencion', label: 'Salud', icono: '🩺' },
  { href: '/analisis', label: 'Análisis', icono: '📊' },
  { href: '/perfil', label: 'Perfil', icono: '👤' },
]

type MascotaPanel = { id: string; nombre: string; especie: string; edad: string }

// Edad en texto corto. Antes de los dos años se cuenta en meses: la
// diferencia entre un cachorro de 3 meses y uno de 10 es enorme, y
// "0 años" no dice nada.
function edadTexto(nacimiento: string | null | undefined): string {
  if (!nacimiento) return ''
  const n = new Date(String(nacimiento).slice(0, 10) + 'T12:00:00')
  if (isNaN(n.getTime())) return ''
  // Mediodía y hora de Chile, igual que en el resto de la app: calcular
  // sobre medianoche se rompe en los cambios de horario de verano.
  const hoyISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const hoy = new Date(hoyISO + 'T12:00:00')
  let meses = (hoy.getFullYear() - n.getFullYear()) * 12 + (hoy.getMonth() - n.getMonth())
  if (hoy.getDate() < n.getDate()) meses--
  if (meses < 0) return ''
  if (meses < 24) return meses <= 1 ? '1 mes' : meses + ' meses'
  const anios = Math.floor(meses / 12)
  return anios + (anios === 1 ? ' año' : ' años')
}

export default function PanelEscritorio() {
  const pathname = usePathname()
  const ruta = pathname || ''
  const [mascota, setMascota] = useState<MascotaPanel | null>(null)
  // La mascota activa vive en localStorage, y cambiarla NO cambia la
  // ruta: no hay evento al que engancharse dentro de la misma pestaña.
  // Se revisa cada segundo y medio, igual que ChiquiFlotante, y con el
  // MISMO helper. Dos lecturas distintas se desincronizan y el panel
  // terminaría mostrando un animal mientras el chat habla de otro.
  const [idActivo, setIdActivo] = useState<string | null>(null)

  useEffect(() => {
    const revisar = () => {
      const id = obtenerMascotaActivaId()
      setIdActivo(prev => (prev === id ? prev : id))
    }
    revisar()
    const t = setInterval(revisar, 1500)
    return () => clearInterval(t)
  }, [])

  const oculto = !ruta || SIN_PANEL.some(r => ruta === r || ruta.startsWith(r + '/'))

  useEffect(() => {
    if (oculto) return
    let vivo = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        // Solo lo imprescindible. Pedir columnas de más acá es peligroso:
        // si una no existe, falla TODA la consulta y la tarjeta de abajo
        // se queda vacía.
        const { data: mascotas } = await supabase
          .from('mascotas')
          .select('id, nombre, especie')
          .eq('user_id', user.id)
          .is('archivada_en', null)
        if (!mascotas || mascotas.length === 0) return
        const m = determinarMascotaActiva(mascotas)
        // El id guardado podría ser de otra cuenta si alguien cambió de
        // sesión en el mismo equipo: se comprueba contra la lista real.
        if (!m || !mascotas.some((x: any) => x.id === m.id)) return

        // La fecha de nacimiento va aparte y protegida: si falta, el
        // panel muestra la especie sin la edad en vez de no mostrar nada.
        let edad = ''
        try {
          const { data } = await supabase
            .from('mascotas')
            .select('fecha_nacimiento')
            .eq('id', m.id)
            .single()
          if (data) edad = edadTexto((data as any).fecha_nacimiento)
        } catch {
          // Sin fecha de nacimiento: se omite la edad.
        }

        if (!vivo) return
        setMascota({ id: m.id, nombre: m.nombre || 'Tu peludo', especie: m.especie || '', edad })
      } catch (e) {
        // El panel es navegación: tiene que aparecer aunque los datos de
        // la mascota fallen. Lo único que se pierde es la tarjeta.
        console.error('PanelEscritorio:', e)
      }
    })()
    return () => { vivo = false }
  }, [oculto, idActivo])

  if (oculto) return null

  // Se marca el ítem activo por prefijo para que las subpáginas
  // (/calendario/algo) sigan iluminando su sección.
  const esActivo = (href: string) => ruta === href || ruta.startsWith(href + '/')

  return (
    <aside className="panel-escritorio hidden lg:flex fixed left-0 top-0 bottom-0 w-60 z-30 flex-col bg-[#FFFCF8] border-r border-[#EEE2D4]">
      <div className="px-5 py-4 bg-[#8C572F] flex items-center gap-2">
        <span className="text-lg leading-none">🐾</span>
        <span className="font-heading font-extrabold text-white text-lg leading-none">Entre Señales</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-5">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#B5A38F]">
          Menú principal
        </p>
        {ITEMS.map(it => {
          const on = esActivo(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 mb-1 px-3 py-2.5 rounded-xl transition-colors ${
                on
                  ? 'bg-[#F0E2CE] text-[#8C572F] font-bold'
                  : 'text-[#3D2B1F] hover:bg-[#F5EDE3]'
              }`}
            >
              <span className="text-base leading-none">{it.icono}</span>
              <span className="text-sm">{it.label}</span>
            </Link>
          )
        })}
      </nav>

      {mascota && (
        <div className="m-3 p-3 rounded-2xl bg-[#F5EDE3]">
          <p className="text-[11px] font-semibold text-[#B5A38F] mb-2">Tus Peludos</p>
          <div className="flex items-center gap-3">
            {/* Círculo con la inicial. La foto real vendrá cuando esté
                confirmado el nombre de la columna en la tabla mascotas:
                pedir una columna que no existe rompe la consulta entera. */}
            <div className="w-9 h-9 shrink-0 rounded-full bg-[#FFBD59] flex items-center justify-center font-heading font-extrabold text-sm text-[#8C572F]">
              {mascota.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#3D2B1F] truncate">{mascota.nombre}</p>
              <p className="text-[11px] text-[#8A7560] truncate">
                {[mascota.especie, mascota.edad].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
