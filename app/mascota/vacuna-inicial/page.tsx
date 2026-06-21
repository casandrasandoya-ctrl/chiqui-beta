'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

function VacunaInicialContenido() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const mascotaId = searchParams.get('mascotaId') || ''
  const nombreMascota = searchParams.get('nombre') || 'tu mascota'

  const [vacunaNombre, setVacunaNombre] = useState('')
  const [vacunaProxima, setVacunaProxima] = useState('')
  const [vacunaGuardada, setVacunaGuardada] = useState(false)
  const [guardandoVacuna, setGuardandoVacuna] = useState(false)

  const [antiNombre, setAntiNombre] = useState('')
  const [antiTipo, setAntiTipo] = useState('interno')
  const [antiProxima, setAntiProxima] = useState('')
  const [antiGuardado, setAntiGuardado] = useState(false)
  const [guardandoAnti, setGuardandoAnti] = useState(false)

  async function guardarVacuna() {
    if (!vacunaNombre.trim() || !mascotaId) return
    setGuardandoVacuna(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardandoVacuna(false); return }
    await supabase.from('vacunas').insert({
      mascota_id: mascotaId,
      user_id: user.id,
      nombre: vacunaNombre.trim(),
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      proxima_fecha: vacunaProxima || null,
    })
    setVacunaGuardada(true)
    setGuardandoVacuna(false)
  }

  async function guardarAntiparasitario() {
    if (!antiNombre.trim() || !mascotaId) return
    setGuardandoAnti(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardandoAnti(false); return }
    await supabase.from('antiparasitarios').insert({
      mascota_id: mascotaId,
      user_id: user.id,
      nombre: antiNombre.trim(),
      tipo: antiTipo,
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      proxima_fecha: antiProxima || null,
    })
    setAntiGuardado(true)
    setGuardandoAnti(false)
  }

  function continuar() {
    router.push('/registro-diario')
  }

  const inputClass = "w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"
  const selectClass = "w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"

  return (
    <div className="min-h-screen pb-8 fade-in bg-[#F5EDE3] text-[#3D2B1F]">
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs text-[#8A7560]">Opcional</p>
        <h1 className="text-xl font-bold">¿Tienes a mano el carnet de {nombreMascota}?</h1>
        <p className="text-xs text-[#8A7560] mt-1">Si ya sabes su última vacuna o antiparasitario, cuéntamelo. Si no, puedes saltarte este paso.</p>
      </div>

      <div className="px-5 space-y-3">
        {/* Vacuna */}
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">💉 Última vacuna</h2>
          {vacunaGuardada ? (
            <p className="text-xs text-[#4CAF7D] font-semibold">✓ Vacuna registrada</p>
          ) : (
            <>
              <input
                className={inputClass}
                placeholder="ej. Séxtuple, Antirrábica..."
                value={vacunaNombre}
                onChange={e => setVacunaNombre(e.target.value)}
              />
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima vacunación · opcional</label>
                <input type="date" className={inputClass} value={vacunaProxima} onChange={e => setVacunaProxima(e.target.value)} />
              </div>
              <button
                onClick={guardarVacuna}
                disabled={!vacunaNombre.trim() || guardandoVacuna}
                className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
              >
                {guardandoVacuna ? 'Guardando...' : 'Guardar vacuna'}
              </button>
            </>
          )}
        </div>

        {/* Antiparasitario */}
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">🪱 Último antiparasitario</h2>
          {antiGuardado ? (
            <p className="text-xs text-[#4CAF7D] font-semibold">✓ Antiparasitario registrado</p>
          ) : (
            <>
              <input
                className={inputClass}
                placeholder="ej. Bravecto, Simparica..."
                value={antiNombre}
                onChange={e => setAntiNombre(e.target.value)}
              />
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo</label>
                <select className={selectClass} value={antiTipo} onChange={e => setAntiTipo(e.target.value)}>
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima dosis · opcional</label>
                <input type="date" className={inputClass} value={antiProxima} onChange={e => setAntiProxima(e.target.value)} />
              </div>
              <button
                onClick={guardarAntiparasitario}
                disabled={!antiNombre.trim() || guardandoAnti}
                className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
              >
                {guardandoAnti ? 'Guardando...' : 'Guardar antiparasitario'}
              </button>
            </>
          )}
        </div>

        <button
          onClick={continuar}
          className="w-full bg-[#8C572F] text-white font-bold py-4 rounded-xl text-base mt-2"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

export default function VacunaInicialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5EDE3]" />}>
      <VacunaInicialContenido />
    </Suspense>
  )
}
