'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Este email ya tiene una cuenta. Intenta iniciar sesión.'
          : 'Hubo un error al crear la cuenta. Intenta de nuevo.'
      )
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-20 h-20 mb-2" />
        <h1 className="text-2xl font-bold mb-3">¡Cuenta creada!</h1>
        <p className="text-[#8A7560] text-sm leading-relaxed mb-8 max-w-xs">
          Tu cuenta fue creada con éxito.
        </p>
        <Link href="/login" className="bg-[#FFBD59] text-[#1A1200] font-bold px-8 py-4 rounded-xl text-sm">
          Ir al login →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">

      <div className="text-center mb-10">
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-24 h-24 mx-auto mb-2" />
        <div className="text-2xl font-bold">Crear cuenta</div>
        <div className="text-sm text-[#FFBD59] font-semibold tracking-widest uppercase mt-1">CHIQUI Entre Señales</div>
      </div>

      <form onSubmit={handleRegistro} className="w-full max-w-sm space-y-4">

        {error && (
          <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Tu nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="¿Cómo te llamamos?"
            required
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>

      </form>

      <p className="mt-6 text-sm text-[#8A7560]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#4AABDB] font-semibold">Inicia sesión</Link>
      </p>

    </div>
  )
}
