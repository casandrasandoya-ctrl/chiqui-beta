'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setLoadingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('No se pudo iniciar con Google. Intenta de nuevo.')
      setLoadingGoogle(false)
    }
    // Si no hubo error, el navegador redirige a Google -- no hace falta
    // hacer nada mas aqui, ni quitar el loading (la pagina va a cambiar).
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <div className="text-center mb-10">
        <img src="/logo-chiqui-completo.png" alt="CHIQUI Entre Señales" className="w-48 h-48 mx-auto" />
      </div>

      {/* Formulario */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">

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
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={verPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 pr-12 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60 transition-colors"
            />
            <button type="button" onClick={() => setVerPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7560] text-sm">
              {verPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="text-right -mt-2">
          <Link href="/recuperar-clave" className="text-xs text-[#8A7560] hover:text-[#CD7421]">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base transition-opacity disabled:opacity-50 mt-2"
        >
          {loading ? 'Ingresando...' : 'Ingresar →'}
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
        onClick={handleGoogleLogin}
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
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="text-[#4AABDB] font-semibold">
          Regístrate gratis
        </Link>
      </p>

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-[#8A7560]/60 text-center max-w-xs leading-relaxed">
        CHIQUI no es una aplicación veterinaria. Es una herramienta de observación y acompañamiento para tutores.
      </p>

    </div>
  )
}
