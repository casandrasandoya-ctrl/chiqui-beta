'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// MENÚ DE CUENTA — esquina superior derecha
// ============================================================
// Reúne lo que es de LA CUENTA, no de la mascota: perfil del tutor,
// recordatorios, panel interno y cerrar sesión.
//
// A PROPÓSITO NO INCLUYE Registrar, Calendario, Análisis ni Salud: esos
// ya viven en la barra de abajo. Cuando la misma cosa se alcanza por
// dos caminos, la gente deja de confiar en cualquiera de los dos —
// sobre todo quienes ya aprendieron el primero.
//
// Tampoco incluye cambiar de mascota: eso se queda en los círculos del
// dashboard, donde ya funciona bien.
//
// Es un componente aparte para poder ponerlo en las demás pantallas con
// una sola línea, en vez de repetir el menú en cada una.
//
// El panel interno solo aparece si el servidor confirma que la sesión
// es la de la administradora. Para el resto no existe.

export default function MenuCuenta() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [confirmarCerrar, setConfirmarCerrar] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    let cancelado = false
    fetch('/api/soy-admin')
      .then(r => r.json())
      .then(d => { if (!cancelado && d?.admin) setEsAdmin(true) })
      .catch(() => { /* si falla, simplemente no se muestra */ })
    return () => { cancelado = true }
  }, [])

  // Bloqueo del scroll de fondo mientras hay algo abierto, igual que
  // el resto de los modales de la app.
  useEffect(() => {
    const hayAlgo = abierto || confirmarCerrar
    document.body.style.overflow = hayAlgo ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto, confirmarCerrar])

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function ir(ruta: string) {
    setAbierto(false)
    router.push(ruta)
  }

  const OPCION = 'w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#FBEAD9]'

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Menú"
        className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] flex-shrink-0"
      >
        <span className="block w-6 h-[2.5px] rounded-full bg-[#8C572F]" />
        <span className="block w-6 h-[2.5px] rounded-full bg-[#8C572F]" />
        <span className="block w-6 h-[2.5px] rounded-full bg-[#8C572F]" />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[60]"
          style={{ background: 'rgba(61,43,31,0.45)' }}
          onClick={() => setAbierto(false)}
        >
          {/* Anclado arriba a la derecha: sale desde donde se tocó. */}
          <div
            className="absolute top-4 right-4 w-60 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EEE2D4]">
              <p className="text-[11px] font-bold text-[#8A7560] uppercase tracking-wider">Mi cuenta</p>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="text-[#8A7560] text-sm w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <button onClick={() => ir('/perfil')} className={OPCION}>
              <span className="text-base w-5 text-center">👤</span>
              <span className="text-sm font-semibold text-[#3D2B1F]">Perfil y cuenta</span>
            </button>

            <button onClick={() => ir('/perfil')} className={`${OPCION} border-t border-[#EEE2D4]`}>
              <span className="text-base w-5 text-center">🔔</span>
              <span className="text-sm font-semibold text-[#3D2B1F]">Recordatorios</span>
            </button>

            {esAdmin && (
              <button onClick={() => ir('/admin')} className={`${OPCION} border-t border-[#EEE2D4]`}>
                <span className="text-base w-5 text-center">📊</span>
                <span className="text-sm font-semibold text-[#3D2B1F]">Panel interno</span>
              </button>
            )}

            <button
              onClick={() => { setAbierto(false); setConfirmarCerrar(true) }}
              className={`${OPCION} border-t border-[#EEE2D4]`}
            >
              <span className="text-base w-5 text-center">🚪</span>
              <span className="text-sm font-semibold text-[#E05252]">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {confirmarCerrar && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-8"
          style={{ background: 'rgba(61,43,31,0.45)' }}
          onClick={() => setConfirmarCerrar(false)}
        >
          <div className="bg-[#FFFCF8] rounded-2xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
            <img src="/chiqui/chiqui_hola.png" alt="" className="w-14 h-14 object-contain mx-auto mb-2" />
            <p className="font-bold text-sm text-[#3D2B1F] mb-1">¿Cerrar sesión?</p>
            <p className="text-xs text-[#8A7560] mb-4">Tendrás que iniciar sesión de nuevo para volver a entrar.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarCerrar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#8A7560] bg-[#F0E2CE]">
                Cancelar
              </button>
              <button onClick={cerrarSesion} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#E05252' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
