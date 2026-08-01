'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

const ITEMS = [
  { id: 'orejas', emoji: '👂', label: 'Orejas', pregunta: '¿Ves algo distinto? (olor, secreción, enrojecimiento)' },
  { id: 'ojos_hocico', emoji: '👀', label: 'Ojos y hocico', pregunta: '¿Hay secreción, irritación o cambios?' },
  { id: 'boca_dientes', emoji: '🦷', label: 'Boca y dientes', pregunta: '¿Algo llama la atención? (color de encías, sarro, mal aliento)' },
  { id: 'patitas_unas', emoji: '🐾', label: 'Patitas y uñas', pregunta: '¿Hay heridas, grietas, sensibilidad o uñas muy largas?' },
  { id: 'cuello_pecho', emoji: '🧣', label: 'Cuello y pecho', pregunta: '¿Notas algún bulto, nódulo o zona diferente?' },
  { id: 'piel_pelaje', emoji: '🐶', label: 'Piel y pelaje', pregunta: '¿Hay heridas, costras, enrojecimiento o caída de pelo?' },
  { id: 'pancita_cuerpo', emoji: '🤍', label: 'Pancita y cuerpo', pregunta: '¿Notas algo distinto al tocar suavemente?' },
]

type Estado = 'normal' | 'algo_distinto' | null

function RevisionContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const mascotaId = searchParams.get('mascotaId') || ''
  const nombreMascota = searchParams.get('nombre') || 'tu mascota'
  const revisionId = searchParams.get('revisionId') || ''
  const modoEdicion = !!revisionId

  const [estados, setEstados] = useState<Record<string, Estado>>({})
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [itemActivo, setItemActivo] = useState(0)
  const [finalizado, setFinalizado] = useState(false)

  // En modo edición, cargar la revisión existente y saltar directo a la
  // pantalla final (con todos los estados ya marcados), para corregir lo
  // que se quiera sin rehacer el paso a paso.
  useEffect(() => {
    if (!revisionId) return
    ;(async () => {
      const { data } = await supabase
        .from('revisiones_corporales')
        .select('*')
        .eq('id', revisionId)
        .single()
      if (data) {
        const est: Record<string, Estado> = {}
        ITEMS.forEach(item => {
          const v = data[item.id]
          est[item.id] = (v === 'normal' || v === 'algo_distinto') ? v : null
        })
        setEstados(est)
        setNota(data.nota || '')
        setFinalizado(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisionId])

  const todosRespondidos = ITEMS.every(item => estados[item.id] !== undefined && estados[item.id] !== null)
  const hayAlgoDistinto = Object.values(estados).some(v => v === 'algo_distinto')

  function marcar(itemId: string, valor: Estado) {
    setEstados(prev => ({ ...prev, [itemId]: valor }))
    const idx = ITEMS.findIndex(i => i.id === itemId)
    if (idx < ITEMS.length - 1) {
      setTimeout(() => setItemActivo(idx + 1), 300)
    } else {
      setTimeout(() => setFinalizado(true), 300)
    }
  }

  // El resultado guardado depende de si hubo hallazgos (no del botón):
  // si hay algo distinto, SIEMPRE se guarda como 'con_observacion',
  // aunque no se agregue nota. Así una revisión con hallazgos nunca
  // queda registrada como 'normal'.
  // El parámetro irAObservacion controla solo la redirección: true lleva
  // a crear una observación con lo encontrado; false vuelve al inicio.
  async function guardar(irAObservacion: boolean) {
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !mascotaId) { setGuardando(false); return }

    const resultado: 'normal' | 'con_observacion' = hayAlgoDistinto ? 'con_observacion' : 'normal'

    const datos: any = {
      mascota_id: mascotaId,
      user_id: user.id,
      resultado,
      nota: nota || null,
    }
    ITEMS.forEach(item => { datos[item.id] = estados[item.id] || 'no_revisado' })

    if (modoEdicion) {
      await supabase.from('revisiones_corporales').update(datos).eq('id', revisionId)
    } else {
      await supabase.from('revisiones_corporales').insert(datos)
    }

    if (irAObservacion && hayAlgoDistinto) {
      const textoObs = ITEMS
        .filter(i => estados[i.id] === 'algo_distinto')
        .map(i => i.label)
        .join(', ')
      router.push(`/prevencion?tab=obs&nota=Revision+corporal:+${encodeURIComponent(textoObs)}`)
    } else {
      // En edición volvemos a Salud (donde está el historial); en una
      // revisión nueva, al inicio.
      router.push(modoEdicion ? '/prevencion' : '/dashboard')
    }
  }

  const IC = "flex-1 rounded-xl py-3 text-sm font-semibold transition-colors"

  return (
    <div className="min-h-screen pb-28 bg-[#F5EDE3]">
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs text-[#8A7560] mb-1">Revisión periódica</p>
        <h1 className="text-xl font-bold text-[#3D2B1F]">🔍 Revisión corporal</h1>
        <p className="text-xs text-[#8A7560] mt-1 leading-relaxed">
          Un momento breve para observar y tocar a {nombreMascota} con cariño. No es una evaluación médica — es tu mirada de cada día, con más atención.
        </p>
      </div>

      <div className="mx-5 mb-4 h-1.5 bg-[#EEE2D4] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FFBD59] rounded-full transition-all duration-300"
          style={{ width: `${(Object.keys(estados).length / ITEMS.length) * 100}%` }}
        />
      </div>

      {!finalizado ? (
        <div className="px-4 space-y-3">
          {ITEMS.map((item, idx) => {
            const estado = estados[item.id]
            const activo = idx === itemActivo
            const respondido = estado !== undefined && estado !== null
            const visible = idx <= itemActivo || respondido

            if (!visible) return null

            return (
              <div
                key={item.id}
                className={`bg-[#FFFCF8] rounded-2xl border p-4 transition-all ${activo ? 'border-[#FFBD59]' : 'border-[#EEE2D4]'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{item.emoji}</span>
                  <p className="font-bold text-sm text-[#3D2B1F]">{item.label}</p>
                  {respondido && (
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${estado === 'normal' ? 'bg-[#4CAF7D]/15 text-[#3B8C5E]' : 'bg-[#F5C842]/20 text-[#8C6A00]'}`}>
                      {estado === 'normal' ? '✓ Normal' : '⚠ Algo distinto'}
                    </span>
                  )}
                </div>
                {activo && (
                  <>
                    <p className="text-xs text-[#8A7560] mb-3 leading-relaxed">{item.pregunta}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => marcar(item.id, 'normal')}
                        className={`${IC} bg-[#4CAF7D]/15 text-[#3B8C5E] border border-[#4CAF7D]/30`}
                      >
                        ✓ Todo normal
                      </button>
                      <button
                        onClick={() => marcar(item.id, 'algo_distinto')}
                        className={`${IC} bg-[#F5C842]/15 text-[#8C6A00] border border-[#F5C842]/40`}
                      >
                        ⚠ Algo distinto
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-4">
          {/* En modo edición: permitir corregir cada item uno por uno */}
          {modoEdicion && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4 mb-3">
              <p className="font-bold text-sm text-[#3D2B1F] mb-1">✏️ Editar revisión</p>
              <p className="text-xs text-[#8A7560] mb-3">Toca cualquier zona para cambiar cómo la viste.</p>
              <div className="space-y-2">
                {ITEMS.map(item => {
                  const est = estados[item.id]
                  return (
                    <div key={item.id} className="border border-[#EEE2D4] rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{item.emoji}</span>
                        <p className="text-xs font-semibold text-[#3D2B1F]">{item.label}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEstados(prev => ({ ...prev, [item.id]: 'normal' }))}
                          className={`flex-1 rounded-lg py-2 text-xs font-semibold border ${est === 'normal' ? 'bg-[#4CAF7D]/15 text-[#3B8C5E] border-[#4CAF7D]/40' : 'bg-[#FFFCF8] text-[#8A7560] border-[#EEE2D4]'}`}
                        >
                          ✓ Normal
                        </button>
                        <button
                          onClick={() => setEstados(prev => ({ ...prev, [item.id]: 'algo_distinto' }))}
                          className={`flex-1 rounded-lg py-2 text-xs font-semibold border ${est === 'algo_distinto' ? 'bg-[#F5C842]/20 text-[#8C6A00] border-[#F5C842]/50' : 'bg-[#FFFCF8] text-[#8A7560] border-[#EEE2D4]'}`}
                        >
                          ⚠ Algo distinto
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4 mb-3">
            <p className="font-bold text-sm text-[#3D2B1F] mb-3">
              {hayAlgoDistinto
                ? '⚠️ Encontraste algo que merece atención'
                : '✅ ¡Todo se ve normal!'}
            </p>
            {hayAlgoDistinto && (
              <div className="mb-3">
                <p className="text-xs text-[#8A7560] mb-1">Zonas con algo distinto:</p>
                {ITEMS.filter(i => estados[i.id] === 'algo_distinto').map(i => (
                  <span key={i.id} className="inline-flex items-center gap-1 bg-[#F5C842]/15 text-[#8C6A00] text-xs font-semibold px-2 py-1 rounded-full mr-1.5 mb-1.5">
                    {i.emoji} {i.label}
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="¿Quieres agregar alguna nota sobre lo que encontraste?"
              rows={3}
              className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            {hayAlgoDistinto && (
              <button
                onClick={() => guardar(true)}
                disabled={guardando}
                className="w-full bg-[#8C572F] text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
              >
                {guardando ? 'Guardando...' : '📋 Guardar y agregar observación'}
              </button>
            )}
            <button
              onClick={() => guardar(false)}
              disabled={guardando}
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : hayAlgoDistinto ? 'Guardar sin agregar observación' : '✓ Todo normal, guardar'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#EEE2D4] text-[#8A7560] font-semibold py-3 rounded-xl text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function RevisionCorporalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5EDE3]" />}>
      <RevisionContenido />
    </Suspense>
  )
}
