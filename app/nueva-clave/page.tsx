'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function NueClavePage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [verPass, setVerPass] = useState(false)

  async function handleNuevaClave(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    setListo(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (listo) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5EDE3]">
      <div className="text-center space-y-3">
        <img src="/chiqui/chiqui_celebracion.png" alt="" className="w-24 h-24 mx-auto" />
        <p className="font-bold text-xl text-[#3D2B1F]">¡Contraseña actualizada!</p>
        <p className="text-sm text-[#8A7560]">Entrando a CHIQUI...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#F5EDE3]">

      <div className="text-center mb-8">
        <img src="/logo-chiqui-completo.png" alt="CHIQUI Entre Señales" className="w-36 h-36 mx-auto" />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="font-bold text-xl text-[#3D2B1F] mb-1">Crea una nueva contraseña</h1>
        <p className="text-sm text-[#8A7560] mb-6">Elige una contraseña segura para tu cuenta.</p>

        <form onSubmit={handleNuevaClave} className="space-y-4">
          {error && (
            <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 pr-12 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
              />
              <button type="button" onClick={() => setVerPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7560] text-sm">
                {verPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">
              Confirmar contraseña
            </label>
            <input
              type={verPass ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              required
              className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña →'}
          </button>
        </form>
      </div>
    </div>
  )
}
