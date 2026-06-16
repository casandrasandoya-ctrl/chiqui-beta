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
        <div className="text-5xl mb-4">🐶</div>
        <h1 className="text-2xl font-bold mb-3">¡Cuenta creada!</h1>
        <p className="text-[#8A8FA8] text-sm leading-relaxed mb-8 max-w-xs">
          Tu cuenta fue creada con éxito.
        </p>
        <Link href="/login" className="bg-[#E3A84A] text-[#1A1200] font-bold px-8 py-4 rounded-xl text-sm">
          Ir al login →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">

      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🐶</div>
        <div className="text-2xl font-bold">Crear cuenta</div>
        <div className="text-sm text-[#E3A84A] font-semibold tracking-widest uppercase mt-1">CHIQUI Entre Señales</div>
      </div>

      <form onSubmit={handleRegistro} className="w-full max-w-sm space-y-4">

        {error && (
          <div className="bg-[#E25D5D]/10 border border-[#E25D5D]/30 rounded-xl px-4 py-3 text-sm text-[#E25D5D]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Tu nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="¿Cómo te llamamos?"
            required
            className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>

      </form>

      <p className="mt-6 text-sm text-[#8A8FA8]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#4AABDB] font-semibold">Inicia sesión</Link>
      </p>

    </div>
  )
}
