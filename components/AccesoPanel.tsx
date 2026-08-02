'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// ============================================================
// ACCESO AL PANEL — solo para la administradora
// ============================================================
// Pregunta al servidor si quien está conectado es la administradora.
// Si no lo es, no dibuja nada: ni el botón ni una pista de que exista.
//
// La seguridad real está en /admin, que verifica la sesión por su
// cuenta y devuelve 404 a cualquier otra persona. Este componente solo
// evita tener que escribir la dirección a mano cada vez.

export default function AccesoPanel() {
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    let cancelado = false
    fetch('/api/soy-admin')
      .then(r => r.json())
      .then(d => { if (!cancelado && d?.admin) setEsAdmin(true) })
      .catch(() => { /* si falla, simplemente no se muestra el botón */ })
    return () => { cancelado = true }
  }, [])

  if (!esAdmin) return null

  return (
    <Link
      href="/admin"
      className="mx-4 mb-4 bg-[#8C572F] rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
    >
      <span className="text-lg flex-shrink-0">📊</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Panel interno</p>
        <p className="text-[11px] text-white/70">Métricas de uso de la app</p>
      </div>
      <span className="text-white/70 text-sm flex-shrink-0">→</span>
    </Link>
  )
}
