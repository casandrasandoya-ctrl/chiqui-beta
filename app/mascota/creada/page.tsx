'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function CreadaContenido() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const nombre = searchParams.get('nombre') || 'tu mascota'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F5EDE3] text-[#3D2B1F]">
      <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-24 h-24 mb-2" />

      <h1 className="text-2xl font-bold mb-2">¡{nombre} ya está registrado!</h1>
      <p className="text-[#8A7560] text-sm leading-relaxed mb-10 max-w-xs">
        Ahora puedes empezar a registrar sus señales diarias y armar su historial de salud.
      </p>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => router.push('/mascota/nueva')}
          className="w-full bg-[#FFFCF8] border border-[#EEE2D4] text-[#8C572F] font-bold py-4 rounded-xl text-base"
        >
          + Agregar otra mascota
        </button>

        <Link
          href="/dashboard"
          className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base inline-flex items-center justify-center"
        >
          Ir al inicio →
        </Link>
      </div>
    </div>
  )
}

export default function MascotaCreadaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5EDE3]" />}>
      <CreadaContenido />
    </Suspense>
  )
}
