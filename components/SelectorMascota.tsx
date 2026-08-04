'use client'
import { useState, useEffect } from 'react'
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

// ============================================================
// SELECTOR DE MASCOTA — fila de círculos
// ============================================================
// Antes era un desplegable: había que tocar para ver quién más había, y
// cambiar de mascota costaba dos toques. Ahora están todas a la vista y
// cambiar cuesta uno.
//
// La activa lleva un aro verde; las demás quedan en blanco y negro. Esa
// combinación se entiende sin leer nada, incluso para quien nunca vio
// la app. El gris no es solo decorativo: dice "esta no es la que estás
// mirando", que es justo lo que la gente necesita saber.
//
// El nombre y los datos ya no van aquí: viven en la tarjeta de abajo,
// donde se ven más grandes. Repetirlos era ruido.
//
// El botón + abre "Agrandar familia", con los dos caminos posibles:
// crear una mascota propia o unirse a una con código. Antes esas dos
// opciones estaban escondidas al final del desplegable.

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
  const [modalFamilia, setModalFamilia] = useState(false)

  // Bloqueo del scroll de fondo mientras el modal está abierto, igual
  // que el resto de los modales de la app.
  useEffect(() => {
    if (modalFamilia) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [modalFamilia])

  function elegir(m: Mascota) {
    if (m.id === mascotaActiva.id) return
    guardarMascotaActivaId(m.id)
    onCambiar(m)
  }

  const icono = iconoPorEspecie

  return (
    <div className="px-4 pb-3">
      {/* Scroll horizontal para cuando hay varias mascotas. La barra se
          oculta por CSS global, así que se desliza sin verse. */}
      <div className="flex items-center gap-3 overflow-x-auto">
        {mascotas.map(m => {
          const activa = m.id === mascotaActiva.id
          return (
            <button
              key={m.id}
              onClick={() => elegir(m)}
              aria-label={`Cambiar a ${m.nombre}`}
              className="flex-shrink-0 rounded-full"
            >
              <div
                className="w-[68px] h-[68px] rounded-full overflow-hidden flex items-center justify-center text-3xl"
                style={activa
                  ? { border: '3px solid #4CAF7D', background: '#FBEAD9' }
                  : { border: '3px solid transparent', background: '#FBEAD9', filter: 'grayscale(1)', opacity: 0.7 }}
              >
                {m.foto_url ? (
                  <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />
                ) : (
                  icono(m.especie)
                )}
              </div>
            </button>
          )
        })}

        <button
          onClick={() => setModalFamilia(true)}
          aria-label="Agrandar familia"
          className="flex-shrink-0 w-[68px] h-[68px] rounded-full bg-[#FFBD59] flex items-center justify-center text-white text-3xl font-bold"
        >
          +
        </button>
      </div>

      {modalFamilia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(61,43,31,0.5)' }}
          onClick={() => setModalFamilia(false)}
        >
          <div
            className="bg-[#8C572F] rounded-3xl w-full max-w-xs p-4 relative overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalFamilia(false)}
              aria-label="Cerrar"
              /* DENTRO del borde: la tarjeta tiene overflow-y-auto y
                 eso recorta lo que sobresalga. Con -top-2 -right-2 el
                 botón quedaba cortado por la mitad. */
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3D2B1F] text-white flex items-center justify-center text-base font-bold z-10"
              style={{ border: '1.5px solid rgba(255,252,248,0.35)' }}
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-3 pr-10">
              <img src="/chiqui/chiqui_mascotas.png" alt="" className="w-12 h-12 object-contain flex-shrink-0" />
              <p className="font-heading text-lg font-extrabold text-[#FFBD59]">Agrandar familia</p>
            </div>

            <button
              onClick={() => { setModalFamilia(false); router.push('/mascota/nueva') }}
              className="w-full bg-[#FFFCF8] rounded-xl px-3 py-3 flex items-center gap-2.5 text-left mb-2"
            >
              <span className="w-7 h-7 rounded-full bg-[#FFBD59] text-white flex items-center justify-center text-base font-bold flex-shrink-0">+</span>
              <span className="text-sm font-semibold text-[#3D2B1F]">Agregar otra mascota</span>
            </button>

            {/* El componente de código ya trae su propio botón y su
                formulario: se reusa tal cual en vez de duplicar la
                lógica de validación del código. */}
            <UnirseComoCotutor />
          </div>
        </div>
      )}
    </div>
  )
}
