'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function RecuperarClavePage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-clave`,
    })

    if (error) {
      setError('Hubo un problema. Verifica el email e intenta de nuevo.')
      setLoading(false)
      return
    }

    setEnviado(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#F5EDE3]">

      {/* Logo */}
      <div className="text-center mb-10">
        <img src="/logo-chiqui-completo.png" alt="CHIQUI Entre Señales" className="w-36 h-36 mx-auto" />
      </div>

      {enviado ? (
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="bg-[#EAF6EF] border border-[#A8D5B5] rounded-2xl px-5 py-6">
            <p className="text-2xl mb-2">📬</p>
            <p className="font-bold text-[#2E7D52] text-base mb-1">¡Listo! Revisa tu correo</p>
            <p className="text-sm text-[#5C4A3A] leading-relaxed">
              Te enviamos un enlace para crear una nueva contraseña. Puede tardar unos minutos en llegar.
            </p>
          </div>
          <p className="text-xs text-[#8A7560]">¿No llegó? Revisa tu carpeta de spam.</p>
          <Link href="/login" className="block text-sm font-semibold text-[#CD7421] mt-4">
            ← Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <h1 className="font-bold text-xl text-[#3D2B1F] mb-1">¿Olvidaste tu contraseña?</h1>
          <p className="text-sm text-[#8A7560] mb-6 leading-relaxed">
            Ingresa tu email y te enviamos un enlace para crear una nueva.
          </p>

          <form onSubmit={handleRecuperar} className="space-y-4">
            {error && (
              <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace →'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-[#8A7560]">
            <Link href="/login" className="text-[#CD7421] font-semibold">
              ← Volver al inicio de sesión
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
