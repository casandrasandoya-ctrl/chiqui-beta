'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useBloquearScroll } from '@/utils/useBloquearScroll'
import FechaSelector from '@/components/FechaSelector'

interface RegistroPeso {
  id: string
  peso: number
  fecha: string
  nota?: string
}

const MS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmtCorta(f: string, mostrarAnio = false) {
  const d = new Date(f + 'T00:00:00')
  const base = `${d.getDate()} ${MS[d.getMonth()]}`
  return mostrarAnio ? `${base} ${d.getFullYear()}` : base
}

// Detecta si los datos abarcan mas de un año para mostrar el año en el eje
function necesitaAnio(fechas: string[]) {
  if (fechas.length < 2) return false
  const anios = new Set(fechas.map(f => new Date(f + 'T00:00:00').getFullYear()))
  return anios.size > 1
}

function fechaHoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

// Catálogo de tamaños adultos esperados para PERROS. min/max definen el
// rango orientativo de peso, y adultezMeses la edad desde la cual la
// referencia se muestra (durante el crecimiento no tiene sentido
// comparar contra el rango adulto).
const TAMANOS_PERRO = [
  { valor: 'muy_pequeno', label: 'Muy pequeño', detalle: 'menos de 5 kg', min: 1, max: 5, adultezMeses: 12 },
  { valor: 'pequeno', label: 'Pequeño', detalle: '5–10 kg', min: 5, max: 10, adultezMeses: 12 },
  { valor: 'mediano', label: 'Mediano', detalle: '10–25 kg', min: 10, max: 25, adultezMeses: 15 },
  { valor: 'grande', label: 'Grande', detalle: '25–45 kg', min: 25, max: 45, adultezMeses: 18 },
  { valor: 'gigante', label: 'Gigante', detalle: 'más de 45 kg', min: 45, max: 70, adultezMeses: 24 },
]

// Referencia orientativa felina (adultos, desde los 12 meses). Son
// tramos de referencia general -- la condición corporal real la evalúa
// el veterinario, por eso el marcador solo se posiciona, sin emitir
// una clasificación en texto.
const TRAMOS_GATO = [
  { label: 'Bajo peso', desde: 2, hasta: 3.5, color: '#4AABDB' },
  { label: 'Orientativo', desde: 3.5, hasta: 5, color: '#4CAF7D' },
  { label: 'Sobrepeso', desde: 5, hasta: 6, color: '#F5C842' },
  { label: 'Obesidad', desde: 6, hasta: 8, color: '#F07A30' },
]

// Edad en meses a partir de la fecha de nacimiento (null si no hay fecha).
function edadEnMeses(fechaNacimiento?: string | null): number | null {
  if (!fechaNacimiento) return null
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  const hoy = new Date()
  return Math.floor((hoy.getTime() - nac.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
}

// Resumen automático de la evolución del peso, generado SOLO a partir
// del historial registrado. Nunca emite diagnósticos -- describe la
// tendencia y, en el caso más marcado, sugiere comentarlo con el
// veterinario. Umbrales (proporcionales al peso, para que funcionen
// igual en un gato de 4 kg y un perro de 40 kg):
// - Rojo: 3+ registros seguidos a la baja con pérdida acumulada >= 8%.
// - Amarillo: cambio >= 5% (y >= 0.1 kg) desde el control anterior.
// - Verde: variación total <= 5% en los últimos 6 meses.
function generarResumen(historial: RegistroPeso[]): { emoji: string; color: string; texto: string } | null {
  if (historial.length < 2) return null
  const ultimo = historial[historial.length - 1]
  const anterior = historial[historial.length - 2]

  // Rojo: disminución progresiva (3+ registros seguidos bajando, >= 8% acumulado)
  if (historial.length >= 3) {
    let caidasSeguidas = 0
    for (let i = historial.length - 1; i > 0; i--) {
      if (historial[i].peso < historial[i - 1].peso) caidasSeguidas++
      else break
    }
    if (caidasSeguidas >= 2) {
      const inicioCaida = historial[historial.length - 1 - caidasSeguidas]
      const perdidaPct = ((inicioCaida.peso - ultimo.peso) / inicioCaida.peso) * 100
      if (caidasSeguidas + 1 >= 3 && perdidaPct >= 8) {
        return { emoji: '🔴', color: '#E05252', texto: 'Se observa una disminución progresiva del peso. Se recomienda comentarlo con el médico veterinario.' }
      }
    }
  }

  // Amarillo: cambio notorio desde el último control
  const cambio = ultimo.peso - anterior.peso
  const cambioPct = anterior.peso > 0 ? (Math.abs(cambio) / anterior.peso) * 100 : 0
  if (cambioPct >= 5 && Math.abs(cambio) >= 0.1) {
    const kg = Math.abs(cambio).toFixed(1).replace('.', ',')
    return cambio > 0
      ? { emoji: '🟡', color: '#B8860B', texto: `Ha aumentado ${kg} kg desde el último control.` }
      : { emoji: '🟡', color: '#B8860B', texto: `Ha perdido ${kg} kg desde el último control.` }
  }

  // Verde: estable en los últimos 6 meses (o desde el primer registro
  // si el historial es más corto)
  const hace6meses = new Date()
  hace6meses.setMonth(hace6meses.getMonth() - 6)
  const recientes = historial.filter(h => new Date(h.fecha + 'T00:00:00') >= hace6meses)
  const base = recientes.length >= 2 ? recientes : historial
  const pesos = base.map(h => h.peso)
  const promedio = pesos.reduce((s, v) => s + v, 0) / pesos.length
  const variacionPct = promedio > 0 ? ((Math.max(...pesos) - Math.min(...pesos)) / promedio) * 100 : 0
  if (variacionPct <= 5) {
    const abarca6meses = new Date(historial[0].fecha + 'T00:00:00') <= hace6meses
    return { emoji: '🟢', color: '#4CAF7D', texto: abarca6meses ? 'Peso estable durante los últimos 6 meses.' : 'Peso estable desde que llevas registro.' }
  }

  return null
}

export default function PesoTracker({ mascotaId, pesoActual }: { mascotaId: string; pesoActual?: number }) {
  const supabase = createClient()
  const [historial, setHistorial] = useState<RegistroPeso[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalTamano, setModalTamano] = useState(false)
  // Datos de la mascota que necesita la referencia orientativa
  const [especie, setEspecie] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null)
  const [tamano, setTamano] = useState<string | null>(null)
  const [guardandoTamano, setGuardandoTamano] = useState(false)

  // Bloquea el scroll del fondo mientras algún modal esté abierto.
  useBloquearScroll(modal || modalTamano)
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(fechaHoyChile())
  const [errorPeso, setErrorPeso] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    // Los MÁS RECIENTES primero (con límite alto) y luego se invierte
    // para graficar en orden cronológico. Antes se pedían ascendentes
    // con limit(12), lo que tomaba los 12 más ANTIGUOS y descartaba
    // los registros nuevos -- por eso la curva no reflejaba los pesos
    // recién agregados.
    const [{ data }, { data: m }] = await Promise.all([
      supabase
        .from('historial_peso')
        .select('id, peso, fecha, nota')
        .eq('mascota_id', mascotaId)
        .order('fecha', { ascending: false })
        .limit(60),
      supabase
        .from('mascotas')
        .select('especie, fecha_nacimiento, tamano_esperado')
        .eq('id', mascotaId)
        .maybeSingle(),
    ])
    setHistorial((data || []).slice().reverse())
    if (m) {
      setEspecie(m.especie || '')
      setFechaNacimiento(m.fecha_nacimiento || null)
      setTamano(m.tamano_esperado || null)
    }
    setLoading(false)
  }

  async function guardar() {
    const pesoNum = parseFloat(nuevoPeso.replace(',', '.'))
    // Validación: el peso debe ser un número mayor a cero.
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setErrorPeso('El peso debe ser un número mayor a 0.')
      return
    }
    setErrorPeso('')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Si ya existe un registro para esa fecha, lo actualizamos en vez de duplicar
    const { data: existente } = await supabase
      .from('historial_peso')
      .select('id')
      .eq('mascota_id', mascotaId)
      .eq('fecha', nuevaFecha)
      .maybeSingle()

    if (existente) {
      await supabase.from('historial_peso').update({ peso: pesoNum }).eq('id', existente.id)
    } else {
      await supabase.from('historial_peso').insert({
        mascota_id: mascotaId,
        user_id: user.id,
        peso: pesoNum,
        fecha: nuevaFecha,
      })
    }

    // peso_actual solo se actualiza si NO existe un registro más
    // reciente que la fecha ingresada (registrar un peso antiguo no
    // debe pisar el peso vigente).
    const hayMasNuevo = historial.some(h => h.fecha > nuevaFecha)
    if (!hayMasNuevo) {
      await supabase.from('mascotas').update({ peso_actual: pesoNum }).eq('id', mascotaId)
    }

    await cargar()
    setModal(false)
    setNuevoPeso('')
    setNuevaFecha(fechaHoyChile())
    setSaving(false)
  }

  async function guardarTamano(valor: string) {
    setGuardandoTamano(true)
    const { error } = await supabase.from('mascotas').update({ tamano_esperado: valor }).eq('id', mascotaId)
    if (!error) setTamano(valor)
    setGuardandoTamano(false)
    setModalTamano(false)
  }

  if (loading) return null

  const ultimo = historial[historial.length - 1]
  const anterior = historial[historial.length - 2]
  const cambio = ultimo && anterior ? +(ultimo.peso - anterior.peso).toFixed(1) : null
  const resumen = generarResumen(historial)

  const esPerro = especie === 'Perro'
  const esGato = especie === 'Gato'
  const tamanoInfo = esPerro && tamano ? TAMANOS_PERRO.find(t => t.valor === tamano) || null : null
  const meses = edadEnMeses(fechaNacimiento)
  // Adultez: en perros depende del tamaño configurado; en gatos, desde
  // los 12 meses. Si no hay fecha de nacimiento no se puede determinar,
  // así que la referencia no se muestra (mejor no mostrar que adivinar).
  const mesesAdultez = esGato ? 12 : (tamanoInfo ? tamanoInfo.adultezMeses : null)
  const esAdulta = meses !== null && mesesAdultez !== null && meses >= mesesAdultez
  const pesoReferencia = ultimo ? ultimo.peso : (pesoActual || null)

  // --- Gráfico con eje vertical de escala dinámica ---
  // La escala se calcula con el mínimo y máximo registrados de ESTA
  // mascota más un margen -- nunca una escala fija, para que funcione
  // igual en un gato de 4 kg y un gran danés de 60 kg.
  const W = 300, H = 84, PADL = 34, PADR = 8, PADY = 10
  let puntos: { x: number; y: number; peso: number; fecha: string }[] = []
  let ejeTicks: { y: number; valor: number }[] = []
  if (historial.length >= 2) {
    const pesos = historial.map(h => h.peso)
    const minP = Math.min(...pesos)
    const maxP = Math.max(...pesos)
    const margen = Math.max(0.2, (maxP - minP) * 0.15)
    const yMin = Math.max(0, minP - margen)
    const yMax = maxP + margen
    const rango = yMax - yMin || 1
    puntos = historial.map((h, i) => ({
      x: PADL + (i / (historial.length - 1)) * (W - PADL - PADR),
      y: H - PADY - ((h.peso - yMin) / rango) * (H - PADY * 2),
      peso: h.peso,
      fecha: h.fecha,
    }))
    // 3 marcas en el eje: máximo, punto medio y mínimo de la escala
    ejeTicks = [yMax, (yMax + yMin) / 2, yMin].map(v => ({
      y: H - PADY - ((v - yMin) / rango) * (H - PADY * 2),
      valor: Math.round(v * 10) / 10,
    }))
  }
  const pathD = puntos.length >= 2
    ? `M ${puntos.map(p => `${p.x},${p.y}`).join(' L ')}`
    : ''

  // --- Posición del marcador en la barra de referencia ---
  // Perros: barra centrada en el rango del tamaño configurado, con
  // espacio a los lados para que un peso fuera del rango se vea fuera
  // de la franja. Gatos: escala 2-8 kg con los tramos de referencia.
  function posicionEnBarra(peso: number, desde: number, hasta: number): number {
    const pct = ((peso - desde) / (hasta - desde)) * 100
    return Math.max(2, Math.min(98, pct))
  }

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div>
          <p className="font-heading text-sm font-bold">Peso</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading text-[22px] font-extrabold text-[#F07A30]">
              {ultimo ? ultimo.peso : pesoActual || '—'}
            </span>
            <span className="text-[13px] text-[#8A7560]">kg</span>
            {cambio !== null && cambio !== 0 && (
              <span className={`text-[11px] ml-1 ${cambio > 0 ? 'text-[#E05252]' : 'text-[#4CAF7D]'}`}>
                {cambio > 0 ? '+' : ''}{cambio} kg
              </span>
            )}
          </div>
        </div>
        <button onClick={() => { setNuevaFecha(fechaHoyChile()); setErrorPeso(''); setModal(true) }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl">
          + Registrar
        </button>
      </div>

      {/* Resumen automático de evolución (solo con 2+ registros). Se
          genera únicamente desde el historial -- describe la tendencia
          sin diagnosticar. */}
      {resumen && (
        <div className="mx-4 mb-2 rounded-xl px-3 py-2" style={{ background: `${resumen.color}12` }}>
          <p className="text-xs leading-relaxed" style={{ color: resumen.color === '#B8860B' ? '#8C6D1F' : resumen.color }}>
            {resumen.emoji} {resumen.texto}
          </p>
        </div>
      )}

      {/* Tamaño adulto esperado (solo perros): configurable directamente
          desde esta tarjeta, sin entrar a editar toda la ficha. */}
      {esPerro && (
        tamanoInfo ? (
          <div className="mx-4 mb-2 flex items-center justify-between">
            <p className="text-[11px] text-[#8A7560]">
              Tamaño adulto esperado: <span className="font-semibold text-[#3D2B1F]">{tamanoInfo.label}</span> ({tamanoInfo.detalle})
            </p>
            <button onClick={() => setModalTamano(true)} className="text-[11px] font-semibold text-[#CD7421] flex-shrink-0 ml-2">
              Editar tamaño
            </button>
          </div>
        ) : (
          <div className="mx-4 mb-2 bg-[#FBEAD9] rounded-xl px-3 py-2.5 flex items-center gap-2">
            <p className="flex-1 text-[11px] text-[#8A7560] leading-relaxed">
              Aún no has indicado el tamaño adulto esperado de tu perro. Configúralo para obtener referencias de peso más precisas.
            </p>
            <button onClick={() => setModalTamano(true)} className="text-[11px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-lg px-2.5 py-1.5 flex-shrink-0">
              Configurar tamaño
            </button>
          </div>
        )
      )}

      {puntos.length >= 2 ? (
        <div className="px-4 pb-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 84, overflow: 'visible' }} preserveAspectRatio="none">
            {/* Eje vertical con escala dinámica (min/max de esta mascota) */}
            {ejeTicks.map((t, i) => (
              <g key={i}>
                <line x1={PADL} y1={t.y} x2={W - PADR} y2={t.y} stroke="#EEE2D4" strokeWidth="1" strokeDasharray="3 3" />
                <text x={PADL - 5} y={t.y + 3} textAnchor="end" fontSize="8" fill="#8A7560">{t.valor}</text>
              </g>
            ))}
            <path d={pathD} fill="none" stroke="#F07A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {puntos.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === puntos.length - 1 ? 4 : 3} fill="#F07A30" stroke={i === puntos.length - 1 ? '#FBEAD9' : 'none'} strokeWidth={i === puntos.length - 1 ? 2 : 0} />
            ))}
          </svg>
          <div className="flex justify-between mt-1" style={{ paddingLeft: `${(PADL / W) * 100}%` }}>
            <span className="text-[10px] text-[#8A7560]">{fmtCorta(historial[0].fecha, necesitaAnio(historial.map(h => h.fecha)))}</span>
            <span className="text-[10px] text-[#8A7560]">{fmtCorta(historial[historial.length - 1].fecha, necesitaAnio(historial.map(h => h.fecha)))}</span>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3">
          <p className="text-xs text-[#8A7560]">
            {historial.length === 1 ? 'Registra un segundo peso para ver la tendencia.' : 'Registra el peso para empezar a ver su evolución.'}
          </p>
        </div>
      )}

      {/* Referencia orientativa -- SOLO en mascotas adultas (durante el
          crecimiento comparar contra el rango adulto no tiene sentido).
          Es una franja visual: muestra dónde cae el peso actual dentro
          del rango de referencia, sin clasificar a la mascota. */}
      {pesoReferencia !== null && (
        <>
          {esPerro && tamanoInfo && esAdulta && (
            <div className="mx-4 mb-3">
              <p className="text-[10px] font-semibold text-[#8A7560] uppercase tracking-wider mb-1.5">
                Referencia orientativa · {tamanoInfo.label} ({tamanoInfo.detalle})
              </p>
              {(() => {
                const span = tamanoInfo.max - tamanoInfo.min
                const desde = Math.max(0, tamanoInfo.min - span * 0.35)
                const hasta = tamanoInfo.max + span * 0.35
                const pctIni = ((tamanoInfo.min - desde) / (hasta - desde)) * 100
                const pctFin = ((tamanoInfo.max - desde) / (hasta - desde)) * 100
                const pctMarca = posicionEnBarra(pesoReferencia, desde, hasta)
                return (
                  <div className="relative h-4">
                    <div className="absolute inset-x-0 top-1 h-2 rounded-full bg-[#F5EDE3]" />
                    <div className="absolute top-1 h-2 rounded-full bg-[#FFBD59]/60" style={{ left: `${pctIni}%`, width: `${pctFin - pctIni}%` }} />
                    <div className="absolute top-0 w-1 h-4 rounded-full bg-[#8C572F]" style={{ left: `calc(${pctMarca}% - 2px)` }} />
                  </div>
                )
              })()}
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-[#8A7560]">{tamanoInfo.min} kg</span>
                <span className="text-[9px] text-[#8A7560]">{tamanoInfo.max} kg</span>
              </div>
            </div>
          )}
          {esGato && esAdulta && (
            <div className="mx-4 mb-3">
              <p className="text-[10px] font-semibold text-[#8A7560] uppercase tracking-wider mb-1.5">
                Referencia orientativa
              </p>
              {(() => {
                const desde = TRAMOS_GATO[0].desde
                const hasta = TRAMOS_GATO[TRAMOS_GATO.length - 1].hasta
                const pctMarca = posicionEnBarra(pesoReferencia, desde, hasta)
                return (
                  <>
                    <div className="relative h-4">
                      <div className="absolute inset-x-0 top-1 h-2 rounded-full overflow-hidden flex">
                        {TRAMOS_GATO.map(t => (
                          <div key={t.label} style={{ width: `${((t.hasta - t.desde) / (hasta - desde)) * 100}%`, background: `${t.color}55` }} />
                        ))}
                      </div>
                      <div className="absolute top-0 w-1 h-4 rounded-full bg-[#8C572F]" style={{ left: `calc(${pctMarca}% - 2px)` }} />
                    </div>
                    <div className="flex mt-0.5">
                      {TRAMOS_GATO.map(t => (
                        <span key={t.label} className="text-[8px] text-[#8A7560] text-center" style={{ width: `${((t.hasta - t.desde) / (hasta - desde)) * 100}%` }}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-[#8A7560]">{desde} kg</span>
                      <span className="text-[9px] text-[#8A7560]">+{hasta} kg</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
          {/* Durante el crecimiento, guiamos sin mostrar la referencia */}
          {((esPerro && tamanoInfo) || esGato) && !esAdulta && meses !== null && mesesAdultez !== null && (
            <p className="mx-4 mb-3 text-[10px] text-[#8A7560] italic">
              🌱 En crecimiento — la referencia orientativa de peso aparecerá desde los {mesesAdultez} meses.
            </p>
          )}
          {/* Disclaimer SIEMPRE visible cuando hay referencia (perro o gato) */}
          {((esPerro && tamanoInfo) || esGato) && esAdulta && (
            <p className="mx-4 mb-3 text-[9px] text-[#8A7560] leading-relaxed italic">
              Esta referencia es únicamente orientativa. El peso ideal puede variar según la raza, edad, sexo, masa muscular, condición corporal y evaluación realizada por un médico veterinario.
            </p>
          )}
        </>
      )}

      {/* Modal registrar peso */}
      {modal && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base">⚖️ Registrar peso</h2>
              <button onClick={() => setModal(false)} className="text-[#8A7560] text-xl">✕</button>
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Peso (kg)</label>
              <input
                type="number" step="0.1" min="0.1" autoFocus
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
                placeholder="ej. 16.2"
                value={nuevoPeso}
                onChange={e => { setNuevoPeso(e.target.value); setErrorPeso('') }}
              />
              {errorPeso && <p className="text-xs text-[#E05252] mt-1">{errorPeso}</p>}
            </div>
            <FechaSelector value={nuevaFecha} onChange={setNuevaFecha} label="Fecha" />
            <button onClick={guardar} disabled={saving || !nuevoPeso}
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar peso'}
            </button>
          </div>
        </div>
      )}

      {/* Modal configurar/editar tamaño adulto esperado (solo perros) */}
      {modalTamano && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => setModalTamano(false)}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base">🐕 Tamaño adulto esperado</h2>
              <button onClick={() => setModalTamano(false)} className="text-[#8A7560] text-xl">✕</button>
            </div>
            <p className="text-xs text-[#8A7560] -mt-1">
              Sirve solo como referencia visual del rango de peso. No representa un diagnóstico.
            </p>
            <div className="space-y-2">
              {TAMANOS_PERRO.map(t => {
                const activo = tamano === t.valor
                return (
                  <button
                    key={t.valor}
                    onClick={() => guardarTamano(t.valor)}
                    disabled={guardandoTamano}
                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 border text-left disabled:opacity-50"
                    style={activo
                      ? { background: '#FFBD5920', borderColor: '#FFBD59', borderWidth: '1.5px' }
                      : { background: '#FFFCF8', borderColor: '#EEE2D4', borderWidth: '1.5px' }}
                  >
                    <span className="text-sm font-semibold text-[#3D2B1F]">{t.label}</span>
                    <span className="text-xs text-[#8A7560]">{t.detalle}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
