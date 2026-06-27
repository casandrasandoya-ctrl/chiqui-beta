'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function BienvenidaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [paso, setPaso] = useState<'elegir' | 'codigo'>('elegir')

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
      <p className="text-sm text-[#8A7560] text-center mb-10 leading-relaxed">
        ¿Cómo quieres empezar?
      </p>

      <div className="w-full max-w-sm space-y-3">

        {/* Opción 1: Agregar mi mascota */}
        <button
          onClick={() => router.push('/mascota/nueva')}
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
          onClick={() => setPaso('codigo')}
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
