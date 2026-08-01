'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function BienvenidaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [paso, setPaso] = useState<'elegir' | 'codigo'>('elegir')
  const [nombreTutor, setNombreTutor] = useState('')
  const [errorNombre, setErrorNombre] = useState('')

  // Al cargar, precargar el nombre si ya existe (de un registro manual
  // previo, o el nombre de la cuenta de Google) para no pedirlo de nuevo
  // sin necesidad. Los de Google llegan sin "nombre" propio pero suelen
  // traer "full_name" o "name".
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata as any
      const existente = meta?.nombre || meta?.full_name || meta?.name || ''
      if (existente) setNombreTutor(existente)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guarda el nombre del tutor en la metadata de auth (de donde lo lee
  // "Mi cuenta" y el resto de la app). Se llama antes de avanzar por
  // cualquier camino (crear mascota o unirse con código), así queda
  // registrado para TODOS por igual, vengan de Google o de registro
  // manual. Devuelve true si está ok para continuar.
  async function guardarNombreTutor(): Promise<boolean> {
    const n = nombreTutor.trim()
    if (!n) {
      setErrorNombre('Cuéntanos tu nombre para continuar.')
      return false
    }
    setErrorNombre('')
    await supabase.auth.updateUser({ data: { nombre: n } })
    return true
  }

  async function unirseConCodigo() {
    const c = codigo.trim().toUpperCase()
    if (!c) return
    setCargando(true)
    setError('')

    const { data, error: err } = await supabase
      .rpc('aceptar_invitacion_cotutor', { codigo: c })

    if (err || data?.error) {
      setError(data?.error || 'Código inválido o expirado. Verifica con quien te lo compartió.')
      setCargando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (paso === 'codigo') {
    return (
      <div className="min-h-screen bg-[#F5EDE3] flex flex-col items-center justify-center px-6">
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-20 h-20 object-contain mb-6" />

        <h1 className="text-xl font-bold text-[#3D2B1F] text-center mb-2">
          Ingresa tu código
        </h1>
        <p className="text-sm text-[#8A7560] text-center mb-8 leading-relaxed">
          Escribe el código que te compartió el dueño principal de la mascota.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="CHIQ-XXXX"
            maxLength={9}
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-4 text-[#3D2B1F] text-center text-2xl font-black tracking-widest placeholder-[#8A7560] focus:outline-none"
          />
          {error && <p className="text-xs text-[#E05252] text-center">{error}</p>}
          <button
            onClick={unirseConCodigo}
            disabled={cargando || codigo.length < 9}
            className="w-full bg-[#8C572F] text-white font-bold py-4 rounded-xl text-base disabled:opacity-40"
          >
            {cargando ? 'Verificando...' : 'Unirme 🐾'}
          </button>
          <button
            onClick={() => { setPaso('elegir'); setCodigo(''); setError('') }}
            className="w-full text-[#8A7560] text-sm py-2"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5EDE3] flex flex-col items-center justify-center px-6">
      <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-24 h-24 object-contain mb-4" />

      <h1 className="text-2xl font-bold text-[#3D2B1F] text-center mb-2">
        ¡Bienvenido/a a CHIQUI!
      </h1>
      <p className="text-sm text-[#8A7560] text-center mb-8 leading-relaxed">
        Cuéntanos tu nombre y cómo quieres empezar.
      </p>

      <div className="w-full max-w-sm space-y-3">

        {/* Nombre del tutor — se pide una vez aquí, para todos (Google o
            registro manual), y queda guardado en la cuenta. */}
        <div className="mb-2">
          <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Nombre de tutor</label>
          <input
            type="text"
            value={nombreTutor}
            onChange={e => { setNombreTutor(e.target.value); if (errorNombre) setErrorNombre('') }}
            placeholder="¿Cómo te llamamos?"
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
          />
          {errorNombre && <p className="text-xs text-[#E05252] mt-1.5">{errorNombre}</p>}
        </div>

        {/* Opción 1: Agregar mi mascota */}
        <button
          onClick={async () => { if (await guardarNombreTutor()) router.push('/mascota/nueva') }}
          className="w-full bg-[#FFBD59] rounded-2xl p-5 text-left flex items-center gap-4"
        >
          <span className="text-3xl flex-shrink-0">🐾</span>
          <div>
            <p className="font-bold text-[#3D2B1F] text-base">Agregar mi mascota</p>
            <p className="text-xs text-[#5C4A3A] mt-0.5">
              Crea el perfil de tu perro o gato y empieza a registrar.
            </p>
          </div>
        </button>

        {/* Opción 2: Tengo un código */}
        <button
          onClick={async () => { if (await guardarNombreTutor()) setPaso('codigo') }}
          className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-5 text-left flex items-center gap-4"
        >
          <span className="text-3xl flex-shrink-0">🔑</span>
          <div>
            <p className="font-bold text-[#3D2B1F] text-base">Tengo un código</p>
            <p className="text-xs text-[#8A7560] mt-0.5">
              Alguien te compartió un código para acceder a su mascota.
            </p>
          </div>
        </button>

      </div>
    </div>
  )
}
