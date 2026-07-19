'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { guardarMascotaActivaId } from '@/utils/mascotaActiva'
import { iconoPorEspecie } from '@/utils/iconoEspecie'
import UnirseComoCotutor from '@/components/UnirseComoCotutor'

interface Mascota {
  id: string
  nombre: string
  especie: string
  raza?: string
  foto_url?: string
}

// Chip verde "Perfil activo": se muestra tanto en la tarjeta cerrada
// como en la mascota seleccionada del desplegable, generando
// continuidad visual — el tutor siempre sabe con qué mascota está
// trabajando, incluso antes de abrir el selector.
function ChipActivo() {
  return (
    <span className="inline-flex items-center gap-1 bg-[#4CAF7D]/12 rounded-full px-1.5 py-0.5 flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF7D]" />
      <span className="text-[9px] font-bold text-[#3A8A62]">Perfil activo</span>
    </span>
  )
}

export default function SelectorMascota({
  mascotas,
  mascotaActiva,
  onCambiar,
}: {
  mascotas: Mascota[]
  mascotaActiva: Mascota
  onCambiar: (mascota: Mascota) => void
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)

  function elegir(m: Mascota) {
    guardarMascotaActivaId(m.id)
    onCambiar(m)
    setAbierto(false)
  }

  const icono = iconoPorEspecie

  return (
    <div className="px-4 pb-3 relative">
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
      >
        {/* Avatar con más presencia: la foto es la forma más rápida de
            reconocer a la mascota */}
        <div className="w-10 h-10 rounded-full bg-[#FBEAD9] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
          {mascotaActiva.foto_url ? (
            <img src={mascotaActiva.foto_url} alt={mascotaActiva.nombre} className="w-full h-full object-cover" />
          ) : (
            icono(mascotaActiva.especie)
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-[15px] text-[#3D2B1F] truncate">{mascotaActiva.nombre}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ChipActivo />
            <p className="text-[11px] text-[#8A7560] truncate">
              {mascotaActiva.especie}{mascotaActiva.raza ? ` · ${mascotaActiva.raza}` : ''}
            </p>
          </div>
        </div>

        {mascotas.length > 1 && (
          <span className={`text-[#8A7560] text-base transition-transform ${abierto ? 'rotate-180' : ''}`}>⌄</span>
        )}
      </button>

      {abierto && (
        <>
          {/* Capa invisible para cerrar el menu al tocar fuera */}
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute left-4 right-4 mt-1.5 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl overflow-hidden z-40 shadow-sm">
            {/* Encabezado simple: la mascota activa YA se ve en la
                tarjeta superior y en la lista — repetirla aquí por
                tercera vez era redundancia visual. En su lugar, la
                acción de perfil gana protagonismo. */}
            <Link href="/perfil" onClick={() => setAbierto(false)}
              className="w-full px-3 py-2.5 flex items-center justify-between border-b border-[#EEE2D4] bg-[#FBEAD9]">
              <span className="text-xs font-semibold text-[#8A7560]">Mi compañero/a</span>
              <span className="text-xs font-bold text-[#CD7421]">Editar perfil →</span>
            </Link>
            {/* Lista de mascotas: la ACTIVA destaca con borde dorado de
                2px, fondo cálido, insignia "Perfil activo" y check en
                círculo verde sólido. El resto queda neutro para que el
                contraste haga el trabajo. */}
            <div className="p-2 space-y-1.5">
              {mascotas.map(m => {
                const activa = m.id === mascotaActiva.id
                return (
                  <button
                    key={m.id}
                    onClick={() => elegir(m)}
                    className="w-full px-2.5 py-2.5 flex items-center gap-2.5 text-left rounded-xl"
                    style={activa
                      ? { border: '2px solid #FFBD59', background: '#FBEAD9' }
                      : { border: '2px solid transparent', background: 'transparent' }}
                  >
                    <div className={`${activa ? 'w-10 h-10' : 'w-9 h-9'} rounded-full bg-[#FBEAD9] flex items-center justify-center text-base flex-shrink-0 overflow-hidden`}>
                      {m.foto_url ? (
                        <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />
                      ) : (
                        icono(m.especie)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${activa ? 'font-bold text-[15px]' : 'font-semibold text-[13px]'} text-[#3D2B1F] truncate`}>{m.nombre}</p>
                      <p className="text-[11px] text-[#8A7560] truncate">
                        {m.especie}{m.raza ? ` · ${m.raza}` : ''}
                      </p>
                    </div>
                    {activa && (
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <ChipActivo />
                        <span className="w-5 h-5 rounded-full bg-[#4CAF7D] text-white flex items-center justify-center text-[11px] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => router.push('/mascota/nueva')}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-t border-[#EEE2D4]"
            >
              <div className="w-8 h-8 rounded-full bg-[#FFBD59] flex items-center justify-center text-base flex-shrink-0 text-white">+</div>
              <span className="font-semibold text-[13px] text-[#8C572F]">Agregar otra mascota</span>
            </button>
            <div className="px-3 pb-3">
              <UnirseComoCotutor />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
