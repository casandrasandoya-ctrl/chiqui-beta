'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarMascotaActivaId } from '@/utils/mascotaActiva'

interface Mascota {
  id: string
  nombre: string
  especie: string
  raza?: string
}

const ICONO_ESPECIE: Record<string, string> = {
  Perro: '🐶',
  Gato: '🐱',
  Conejo: '🐇',
  Ave: '🐦',
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

  const icono = (especie: string) => ICONO_ESPECIE[especie] || '🐾'

  return (
    <div className="px-4 pb-3 relative">
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
      >
        <div className="w-9 h-9 rounded-full bg-[#FBEAD9] flex items-center justify-center text-lg flex-shrink-0">
          {icono(mascotaActiva.especie)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-sm text-[#3D2B1F] truncate">{mascotaActiva.nombre}</p>
          <p className="text-[11px] text-[#8A7560]">
            {mascotaActiva.especie}{mascotaActiva.raza ? ` · ${mascotaActiva.raza}` : ''}
          </p>
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
            {mascotas.map(m => (
              <button
                key={m.id}
                onClick={() => elegir(m)}
                className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-b border-[#EEE2D4] last:border-0 ${m.id === mascotaActiva.id ? 'bg-[#FBEAD9]' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#FBEAD9] flex items-center justify-center text-base flex-shrink-0">
                  {icono(m.especie)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-[#3D2B1F] truncate">{m.nombre}</p>
                  {m.id === mascotaActiva.id && <p className="text-[10px] text-[#8A7560]">Activa ahora</p>}
                </div>
                {m.id === mascotaActiva.id && <span className="text-[#8C572F] text-sm">✓</span>}
              </button>
            ))}
            <button
              onClick={() => router.push('/mascota/nueva')}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-t border-[#EEE2D4]"
            >
              <div className="w-8 h-8 rounded-full bg-[#FFBD59] flex items-center justify-center text-base flex-shrink-0 text-white">+</div>
              <span className="font-semibold text-[13px] text-[#8C572F]">Agregar otra mascota</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
