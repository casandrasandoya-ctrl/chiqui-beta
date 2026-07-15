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
  const [verPass, setVerPass] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

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

  async function handleGoogleRegistro() {
    setLoadingGoogle(true)
    setError('')
    // Es el mismo llamado que en login -- Supabase crea la cuenta sola
    // si es la primera vez, o inicia sesion directo si el email ya
    // existe (incluida una cuenta creada antes con email/contraseña
    // usando ese mismo Gmail, gracias a la vinculacion automatica por
    // email verificado).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('No se pudo continuar con Google. Intenta de nuevo.')
      setLoadingGoogle(false)
    }
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

      {/* Divisor */}
      <div className="w-full max-w-sm flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#EEE2D4]" />
        <span className="text-xs text-[#8A7560]">o</span>
        <div className="flex-1 h-px bg-[#EEE2D4]" />
      </div>

      {/* Botón Google */}
      <button
        type="button"
        onClick={handleGoogleRegistro}
        disabled={loadingGoogle}
        className="w-full max-w-sm bg-[#FFFCF8] border border-[#EEE2D4] text-[#3D2B1F] font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
          <path fill="#FBBC05" d="M3.95 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.96H.96C.35 6.18 0 7.55 0 9s.35 2.82.96 4.04l2.99-2.34z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.99 2.34C4.66 5.16 6.65 3.58 9 3.58z"/>
        </svg>
        {loadingGoogle ? 'Conectando...' : 'Continuar con Google'}
      </button>

      <p className="mt-6 text-sm text-[#8A7560]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[#4AABDB] font-semibold">Inicia sesión</Link>
      </p>

    </div>
  )
}
