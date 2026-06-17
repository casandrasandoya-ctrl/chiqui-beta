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
        <div className="text-6xl mb-3">🐶</div>
        <div className="text-3xl font-bold text-[#F0EEE8] tracking-tight">CHIQUI</div>
        <div className="text-sm font-semibold text-[#E8A84C] tracking-widest uppercase mt-1">Entre Señales</div>
        <div className="text-xs text-[#8A8FA8] mt-1 italic">Tu compañero de observación y cuidado.</div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">

        {error && (
          <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-[#232840] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E8A84C]/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-[#232840] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E8A84C]/60 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base transition-opacity disabled:opacity-50 mt-2"
        >
          {loading ? 'Ingresando...' : 'Ingresar →'}
        </button>

      </form>

      <p className="mt-6 text-sm text-[#8A8FA8]">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="text-[#4AABDB] font-semibold">
          Regístrate gratis
        </Link>
      </p>

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-[#8A8FA8]/60 text-center max-w-xs leading-relaxed">
        CHIQUI no es una aplicación veterinaria. Es una herramienta de observación y acompañamiento para tutores.
      </p>

    </div>
  )
}
