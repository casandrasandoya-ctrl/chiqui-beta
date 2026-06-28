'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const TIPOS_CICLO: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  celo:      { emoji: '🌸', label: 'Celo',      color: '#E05252', bg: '#FDEAEA' },
  embarazo:  { emoji: '🤰', label: 'Embarazo',  color: '#8C572F', bg: '#FBEAD9' },
  lactancia: { emoji: '🍼', label: 'Lactancia', color: '#4AABDB', bg: '#EBF6FC' },
}

const TIPOS_ETAPA: Record<string, { emoji: string; label: string }> = {
  primer_celo:   { emoji: '🌸', label: 'Primer celo' },
  esterilizacion:{ emoji: '✂️', label: 'Esterilización' },
  embarazo:      { emoji: '🤰', label: 'Embarazo' },
  parto:         { emoji: '🐣', label: 'Parto' },
  lactancia:     { emoji: '🍼', label: 'Lactancia' },
  tumor_mamario: { emoji: '🎗️', label: 'Tumor mamario' },
  otro:          { emoji: '📋', label: 'Otro' },
}

function fmt(f: string) {
  if (!f) return '—'
  const d = new Date(f + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
}

function fmtCorta(f: string) {
  const d = new Date(f + 'T00:00:00')
  return d.getFullYear().toString()
}

// Predice el próximo celo basado en el historial de ciclos
function predecirProximoCelo(ciclos: any[]): { fecha: string; confianza: string } | null {
  const celos = ciclos
    .filter(c => c.tipo === 'celo' && c.fecha_inicio)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  if (celos.length < 2) return null

  // Calcular intervalos entre celos consecutivos
  const intervalos: number[] = []
  for (let i = 1; i < celos.length; i++) {
    const anterior = new Date(celos[i-1].fecha_inicio + 'T00:00:00')
    const actual = new Date(celos[i].fecha_inicio + 'T00:00:00')
    const dias = Math.round((actual.getTime() - anterior.getTime()) / 86400000)
    if (dias > 30 && dias < 400) intervalos.push(dias) // filtrar datos anómalos
  }

  if (intervalos.length === 0) return null

  const promedio = Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length)
  const ultimoCelo = new Date(celos[celos.length - 1].fecha_inicio + 'T00:00:00')
  const proximo = new Date(ultimoCelo.getTime() + promedio * 86400000)
  const hoy = new Date()

  if (proximo < hoy) return null // ya pasó

  const confianza = intervalos.length >= 3 ? 'Alta' : 'Moderada'
  return {
    fecha: proximo.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    confianza,
  }
}

// Detecta si está actualmente en celo
function celoActivo(ciclos: any[]): { activo: boolean; dia: number } {
  const hoy = new Date()
  const celoEnCurso = ciclos.find(c => {
    if (c.tipo !== 'celo') return false
    const inicio = new Date(c.fecha_inicio + 'T00:00:00')
    if (inicio > hoy) return false
    if (!c.fecha_termino) return (hoy.getTime() - inicio.getTime()) / 86400000 < 21
    return hoy <= new Date(c.fecha_termino + 'T00:00:00')
  })
  if (!celoEnCurso) return { activo: false, dia: 0 }
  const inicio = new Date(celoEnCurso.fecha_inicio + 'T00:00:00')
  const dia = Math.ceil((hoy.getTime() - inicio.getTime()) / 86400000) + 1
  return { activo: true, dia }
}

interface Props {
  mascotaId: string
  sexo: string
  especie: string
  seguimientoReproductivo: boolean
  estadoReproductivo: string
  nombreMascota: string
}

export default function ReproduccionTracker({
  mascotaId, sexo, especie, seguimientoReproductivo, estadoReproductivo, nombreMascota
}: Props) {
  const supabase = createClient()
  const [ciclos, setCiclos] = useState<any[]>([])
  const [etapas, setEtapas] = useState<any[]>([])
  const [tab, setTab] = useState<'ciclos' | 'etapas'>('ciclos')
  const [modalCiclo, setModalCiclo] = useState(false)
  const [modalEtapa, setModalEtapa] = useState(false)
  const [form, setForm] = useState<any>({})
  const [guardando, setGuardando] = useState(false)

  // Solo aplica a hembras con seguimiento activado y no esterilizadas
  const esMacho = sexo === 'Macho'
  const estaEsterilizada = estadoReproductivo === 'esterilizada'
  if (esMacho || !seguimientoReproductivo) return null

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from('ciclos_reproductivos').select('*').eq('mascota_id', mascotaId).order('fecha_inicio', { ascending: false }),
      supabase.from('etapas_reproductivas').select('*').eq('mascota_id', mascotaId).order('fecha', { ascending: true }),
    ])
    setCiclos(c || [])
    setEtapas(e || [])
  }

  async function guardarCiclo() {
    if (!form.tipo || !form.fecha_inicio) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }
    const duracion = form.fecha_termino
      ? Math.round((new Date(form.fecha_termino+'T00:00:00').getTime() - new Date(form.fecha_inicio+'T00:00:00').getTime()) / 86400000)
      : null
    await supabase.from('ciclos_reproductivos').insert({
      mascota_id: mascotaId, user_id: user.id,
      tipo: form.tipo, fecha_inicio: form.fecha_inicio,
      fecha_termino: form.fecha_termino || null,
      duracion_dias: duracion,
      notas: form.notas || null,
    })
    setForm({}); setModalCiclo(false)
    await cargar()
    setGuardando(false)
  }

  async function guardarEtapa() {
    if (!form.tipo || !form.fecha) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }
    await supabase.from('etapas_reproductivas').insert({
      mascota_id: mascotaId, user_id: user.id,
      tipo: form.tipo, fecha: form.fecha,
      notas: form.notas || null,
    })
    setForm({}); setModalEtapa(false)
    await cargar()
    setGuardando(false)
  }

  async function eliminarCiclo(id: string) {
    await supabase.from('ciclos_reproductivos').delete().eq('id', id)
    await cargar()
  }

  async function eliminarEtapa(id: string) {
    await supabase.from('etapas_reproductivas').delete().eq('id', id)
    await cargar()
  }

  const prediccion = !estaEsterilizada ? predecirProximoCelo(ciclos) : null
  const { activo: enCelo, dia: diaCelo } = !estaEsterilizada ? celoActivo(ciclos) : { activo: false, dia: 0 }

  const IC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none"

  return (
    <div className="border-t border-[#EEE2D4] pt-3">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider">🌸 Reproducción</p>
          {enCelo && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[#E05252] animate-pulse" />
              <span className="text-xs font-bold text-[#E05252]">En celo · Día {diaCelo}</span>
            </div>
          )}
          {estaEsterilizada && (
            <p className="text-xs text-[#4CAF7D] mt-0.5 font-semibold">✂️ Esterilizada</p>
          )}
        </div>
        <div className="flex gap-2">
          {!estaEsterilizada && (
            <button onClick={() => { setForm({ tipo: 'celo' }); setModalCiclo(true) }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-2 rounded-xl">
              + Ciclo
            </button>
          )}
          <button onClick={() => { setForm({}); setModalEtapa(true) }}
            className="bg-[#FBEAD9] text-[#8C572F] text-xs font-bold px-3 py-2 rounded-xl border border-[#EEE2D4]">
            + Etapa
          </button>
        </div>
      </div>

      {/* Predicción próximo celo */}
      {prediccion && !estaEsterilizada && (
        <div className="bg-[#FDEAEA] border border-[#E05252]/20 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-xs font-bold text-[#E05252] mb-0.5">📅 Próximo celo estimado</p>
          <p className="text-sm font-black text-[#3D2B1F]">{prediccion.fecha}</p>
          <p className="text-[10px] text-[#8A7560] mt-0.5">Confianza {prediccion.confianza} · basado en {ciclos.filter(c=>c.tipo==='celo').length} celos registrados</p>
        </div>
      )}
      {!prediccion && !estaEsterilizada && ciclos.filter(c=>c.tipo==='celo').length === 1 && (
        <div className="bg-[#FBEAD9] rounded-xl px-3 py-2 mb-3">
          <p className="text-xs text-[#8C572F]">Registra 1 celo más para que CHIQUI pueda predecir el próximo 📅</p>
        </div>
      )}

      {/* Tabs */}
      {(ciclos.length > 0 || etapas.length > 0) && (
        <div className="flex gap-2 mb-3">
          {[['ciclos','🌸 Ciclos'],['etapas','📍 Línea de vida']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab===t?'bg-[#FFBD59] text-[#1A1200]':'bg-[#FBEAD9] text-[#8A7560]'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* CICLOS */}
      {tab === 'ciclos' && (
        <div className="space-y-2">
          {ciclos.length === 0 && (
            <p className="text-xs text-[#8A7560] text-center py-4">
              {estaEsterilizada ? 'No hay ciclos registrados antes de la esterilización.' : `Registra el primer ciclo de ${nombreMascota}.`}
            </p>
          )}
          {ciclos.map(c => {
            const tipo = TIPOS_CICLO[c.tipo] || TIPOS_CICLO.celo
            return (
              <div key={c.id} className="flex items-start gap-3 py-2 border-b border-[#EEE2D4] last:border-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: tipo.bg }}>
                  {tipo.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: tipo.color }}>{tipo.label}</span>
                    {c.duracion_dias && <span className="text-[10px] text-[#8A7560]">{c.duracion_dias} días</span>}
                  </div>
                  <p className="text-[11px] text-[#8A7560] mt-0.5">
                    {fmt(c.fecha_inicio)}{c.fecha_termino ? ` → ${fmt(c.fecha_termino)}` : ' → en curso'}
                  </p>
                  {c.notas && <p className="text-[10px] text-[#8A7560] italic mt-0.5">{c.notas}</p>}
                </div>
                <button onClick={() => eliminarCiclo(c.id)} className="text-[#8A7560] text-xs">✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* LÍNEA DE VIDA */}
      {tab === 'etapas' && (
        <div className="relative">
          {etapas.length === 0 && (
            <p className="text-xs text-[#8A7560] text-center py-4">
              Registra los hitos importantes de la vida reproductiva de {nombreMascota}.
            </p>
          )}
          {etapas.length > 0 && (
            <div className="relative pl-8">
              {/* Línea vertical */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#EEE2D4]" />
              {etapas.map((e, i) => {
                const tipo = TIPOS_ETAPA[e.tipo] || TIPOS_ETAPA.otro
                return (
                  <div key={e.id} className="relative mb-4 last:mb-0">
                    {/* Punto en la línea */}
                    <div className="absolute -left-5 w-4 h-4 rounded-full bg-[#FFBD59] border-2 border-[#F5EDE3] flex items-center justify-center text-[8px]">
                      {tipo.emoji}
                    </div>
                    <div className="bg-[#FFFCF8] rounded-xl border border-[#EEE2D4] p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#3D2B1F]">{tipo.label}</p>
                          <p className="text-[10px] text-[#8A7560]">{fmt(e.fecha)}</p>
                        </div>
                        <button onClick={() => eliminarEtapa(e.id)} className="text-[#8A7560] text-xs">✕</button>
                      </div>
                      {e.notas && <p className="text-[10px] text-[#8A7560] italic mt-1">{e.notas}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CICLO */}
      {modalCiclo && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end justify-center bg-black/50" onClick={() => setModalCiclo(false)}>
          <div className="bg-[#F5EDE3] rounded-t-2xl p-5 w-full max-w-lg space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)", paddingBottom: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-[#3D2B1F]">Registrar ciclo</h3>
              <div className="flex gap-2">
                <button onClick={guardarCiclo} disabled={guardando || !form.tipo || !form.fecha_inicio}
                  className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-40">
                  {guardando ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setModalCiclo(false)} className="text-[#8A7560] text-xl">✕</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8A7560] mb-1.5">Tipo</p>
              <div className="flex gap-2">
                {Object.entries(TIPOS_CICLO).map(([k, v]) => (
                  <button key={k} onClick={() => setForm((f: any) => ({ ...f, tipo: k }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${form.tipo===k?'border-[#FFBD59] bg-[#FFBD59]/20 text-[#3D2B1F]':'border-[#EEE2D4] bg-[#FFFCF8] text-[#8A7560]'}`}>
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8A7560] mb-1">Fecha de inicio</p>
              <input type="date" value={form.fecha_inicio||''} onChange={e => setForm((f: any) => ({...f, fecha_inicio: e.target.value}))} className={IC} />
            </div>
            <div>
              <p className="text-xs text-[#8A7560] mb-1">Fecha de término <span className="text-[#8A7560]">(opcional)</span></p>
              <input type="date" value={form.fecha_termino||''} onChange={e => setForm((f: any) => ({...f, fecha_termino: e.target.value}))} className={IC} />
            </div>
            <div>
              <p className="text-xs text-[#8A7560] mb-1">Notas <span className="text-[#8A7560]">(opcional)</span></p>
              <input type="text" value={form.notas||''} onChange={e => setForm((f: any) => ({...f, notas: e.target.value}))} placeholder="ej. flujo abundante" className={IC} />
            </div>


          </div>
        </div>
      )}

      {/* MODAL ETAPA */}
      {modalEtapa && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end justify-center bg-black/50" onClick={() => setModalEtapa(false)}>
          <div className="bg-[#F5EDE3] rounded-t-2xl p-5 w-full max-w-lg space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)", paddingBottom: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-[#3D2B1F]">Registrar hito</h3>
              <div className="flex gap-2">
                <button onClick={guardarEtapa} disabled={guardando || !form.tipo || !form.fecha}
                  className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-40">
                  {guardando ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setModalEtapa(false)} className="text-[#8A7560] text-xl">✕</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8A7560] mb-1.5">Tipo de hito</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TIPOS_ETAPA).map(([k, v]) => (
                  <button key={k} onClick={() => setForm((f: any) => ({ ...f, tipo: k }))}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all text-left px-3 ${form.tipo===k?'border-[#FFBD59] bg-[#FFBD59]/20 text-[#3D2B1F]':'border-[#EEE2D4] bg-[#FFFCF8] text-[#8A7560]'}`}>
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8A7560] mb-1">Fecha</p>
              <input type="date" value={form.fecha||''} onChange={e => setForm((f: any) => ({...f, fecha: e.target.value}))} className={IC} />
            </div>
            <div>
              <p className="text-xs text-[#8A7560] mb-1">Notas <span className="text-[#8A7560]">(opcional)</span></p>
              <input type="text" value={form.notas||''} onChange={e => setForm((f: any) => ({...f, notas: e.target.value}))} placeholder="ej. sin complicaciones" className={IC} />
            </div>


          </div>
        </div>
      )}

    </div>
  )
}
