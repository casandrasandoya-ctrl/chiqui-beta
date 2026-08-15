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
  const [zoom, setZoom] = useState(1)

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
        onClick={() => { setZoom(1); setAbierta(true) }}
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

          {/* Botones de zoom propios. El pellizco del navegador solo
              funciona si la página lo autoriza en su viewport, y en la
              app instalada viene bloqueado para que la interfaz no se
              deforme al tocar. Cambiar eso afectaría toda la app, así
              que el visor trae su propio zoom. */}
          <div className="w-full h-full overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="min-w-full min-h-full flex items-center justify-center">
              <img
                src={src}
                alt={alt}
                onClick={() => setZoom(z => (z >= 2.5 ? 1 : 2.5))}
                style={{
                  width: `${zoom * 100}%`,
                  maxWidth: zoom === 1 ? '100%' : 'none',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}
                disabled={zoom <= 1}
                aria-label="Alejar"
                className="w-11 h-11 rounded-full bg-white/15 text-white text-xl font-bold disabled:opacity-30"
              >−</button>
              <span className="text-white/80 text-xs font-semibold w-14 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
                disabled={zoom >= 4}
                aria-label="Acercar"
                className="w-11 h-11 rounded-full bg-white/15 text-white text-xl font-bold disabled:opacity-30"
              >+</button>
            </div>
            <p className="text-white/50 text-[11px]">
              {zoom > 1 ? 'Desliza para recorrer la imagen' : 'Toca la imagen o usa + para acercar'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
