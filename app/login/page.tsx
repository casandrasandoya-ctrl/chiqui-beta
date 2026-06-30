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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60 transition-colors"
          />
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
