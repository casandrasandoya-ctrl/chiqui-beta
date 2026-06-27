'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function UnirseComoCotutor() {
  const supabase = createClient()
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  async function unirse() {
    const c = codigo.trim().toUpperCase()
    if (!c) return
    setCargando(true)
    setError('')

    const { data, error: err } = await supabase
      .rpc('aceptar_invitacion_cotutor', { codigo: c })

    if (err || data?.error) {
      setError(data?.error || 'Ocurrió un error. Intenta de nuevo.')
      setCargando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full bg-[#FBEAD9] border border-[#EEE2D4] text-[#8C572F] font-bold py-3 rounded-xl text-sm"
      >
        🐾 Tengo un código — unirme a una mascota
      </button>
    )
  }

  return (
    <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
      <h3 className="font-bold text-sm text-[#3D2B1F] mb-1">Unirme como co-tutor</h3>
      <p className="text-xs text-[#8A7560] mb-3">
        Ingresa el código que te compartieron (ej. CHIQ-A3K9)
      </p>
      <input
        value={codigo}
        onChange={e => setCodigo(e.target.value.toUpperCase())}
        placeholder="CHIQ-XXXX"
        maxLength={9}
        className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-center text-xl font-black tracking-widest placeholder-[#8A7560] focus:outline-none mb-3"
      />
      {error && <p className="text-xs text-[#E05252] mb-2 text-center">{error}</p>}
      <button
        onClick={unirse}
        disabled={cargando || codigo.length < 9}
        className="w-full bg-[#8C572F] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 mb-2"
      >
        {cargando ? 'Verificando...' : 'Unirme'}
      </button>
      <button
        onClick={() => { setAbierto(false); setCodigo(''); setError('') }}
        className="w-full text-[#8A7560] text-sm py-1"
      >
        Cancelar
      </button>
    </div>
  )
}
