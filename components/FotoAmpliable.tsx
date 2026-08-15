'use client'
import { useState, useEffect } from 'react'

// ============================================================
// FOTO AMPLIABLE
// ============================================================
// Nació de una consulta real: la veterinaria intentó hacer zoom en la
// foto de una observación —quería ver qué había en el vómito— y no
// pudo. La foto existe justamente para que ella la mire.
//
// Al tocarla se abre a pantalla completa sobre fondo oscuro, donde el
// gesto de pellizcar para ampliar sí funciona. Se cierra tocando fuera,
// con la ✕ o con la tecla Escape.
//
// Es un componente de cliente porque necesita estado, y así puede
// usarse también dentro de /vet, que se dibuja en el servidor.
//
// El fondo va oscuro y no claro: sobre negro se distinguen mejor los
// detalles de color de una lesión o una deposición, que es lo que se
// está mirando.

export default function FotoAmpliable({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [abierta, setAbierta] = useState(false)

  // Escape para cerrar, y bloqueo del scroll de fondo mientras está
  // abierta.
  useEffect(() => {
    if (!abierta) return
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierta(false)
    }
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierta])

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="w-full block relative mt-2"
        aria-label={`Ampliar foto: ${alt}`}
      >
        <img src={src} alt={alt} className={className} />
        {/* Señal de que se puede ampliar: sin esto, nadie lo intenta. */}
        <span className="absolute bottom-2 right-2 bg-[#3D2B1F]/70 text-white text-[10px] font-semibold rounded-full px-2 py-1">
          🔍 Ampliar
        </span>
      </button>

      {abierta && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center text-lg font-bold z-10"
          >
            ✕
          </button>

          {/* overflow-auto permite desplazarse cuando la imagen se amplía
              con el gesto de pellizcar. */}
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <p className="absolute bottom-5 left-0 right-0 text-center text-white/50 text-[11px]">
            Pellizca para acercar · Toca fuera para cerrar
          </p>
        </div>
      )}
    </>
  )
}
