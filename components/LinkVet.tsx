'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LinkVet({ mascotaId }: { mascotaId: string }) {
  const supabase = createClient()
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function generarLink() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('links_veterinario')
      .insert({ mascota_id: mascotaId, user_id: user.id })
      .select('token')
      .single()

    if (data) {
      const url = `${window.location.origin}/vet?token=${data.token}`
      setLink(url)
    }
    setLoading(false)
  }

  async function copiar() {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="mx-4 mb-4 bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="font-bold text-sm">🩺 Compartir con veterinario</h2>
        <p className="text-xs text-[#8A8FA8] mt-0.5">Genera un link de solo lectura válido por 7 días</p>
      </div>
      <div className="p-4">
        {!link ? (
          <button onClick={generarLink} disabled={loading}
            className="w-full bg-[#4AABDB] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {loading ? 'Generando...' : '🔗 Generar link para el vet'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-[#1E2333] rounded-xl p-3 text-xs text-[#8A8FA8] break-all border border-white/8">
              {link}
            </div>
            <button onClick={copiar}
              className="w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-3 rounded-xl text-sm">
              {copiado ? '✅ ¡Copiado!' : '📋 Copiar link'}
            </button>
            <p className="text-xs text-[#8A8FA8] text-center">El veterinario puede ver el historial sin crear cuenta</p>
          </div>
        )}
      </div>
    </div>
  )
}
