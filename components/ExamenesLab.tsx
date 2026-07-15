'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import FechaSelector from '@/components/FechaSelector'

interface Props {
  mascotaId: string
}

// Plantillas: solo el NOMBRE y orden de cada parámetro, respetando el
// orden exacto en que suelen venir en el informe del laboratorio (sin
// inventar categorías clínicas). El rango de referencia NO se
// hardcodea aquí -- varía según laboratorio, así que se recuerda del
// examen anterior del mismo tipo (ver cargarUltimosRangos), o se deja
// en blanco la primera vez.
const TIPOS_EXAMEN: { valor: string; label: string; emoji: string; parametros: string[] }[] = [
  {
    valor: 'bioquimico', label: 'Perfil bioquímico', emoji: '🧪',
    parametros: [
      'Proteínas Totales', 'Albúmina', 'Globulinas', 'Bilirrubina Total',
      'Colesterol', 'Glucosa', 'Calcio', 'Fósforo', 'Urea', 'Nus (BUN)',
      'Creatinina', 'Fosfatasa Alcalina', 'GPT/ALT', 'GOT/AST', 'GGT',
    ],
  },
  {
    valor: 'hemograma', label: 'Hemograma', emoji: '🩸',
    parametros: [
      'Eritrocitos', 'Hematocrito', 'Hemoglobina', 'VCM', 'HCM', 'CHCM',
      'Plaquetas', 'Leucocitos', 'Eosinófilos', 'Basófilos', 'Juveniles',
      'Baciliformes', 'Segmentados', 'Linfocitos', 'Monocitos',
      'Eosinófilos Absolutos', 'Basófilos Absolutos', 'Juveniles Absolutos',
      'Baciliformes Absolutos', 'Segmentados Absolutos',
      'Linfocitos Absolutos', 'Monocitos Absolutos',
    ],
  },
  {
    valor: 'orina', label: 'Examen de orina', emoji: '💛',
    parametros: [
      'Color', 'Aspecto', 'Densidad urinaria (USG)', 'pH', 'Proteínas',
      'Glucosa', 'Cetonas', 'Bilirrubina', 'Sangre / Hemoglobina',
      'Urobilinógeno', 'Nitritos', 'Glóbulos rojos (RBC)',
      'Glóbulos blancos (WBC)', 'Células epiteliales', 'Bacterias',
      'Cristales', 'Cilindros', 'Moco',
    ],
  },
  {
    valor: 'tiroides', label: 'Perfil tiroideo', emoji: '🦴',
    parametros: ['T4 Total', 'T4 Libre', 'T3 Total', 'T3 Libre', 'TSH', 'Anticuerpos anti-tiroglobulina (TgAA)'],
  },
]

interface Fila {
  parametro: string
  valor: string
  unidad: string
  rangoMin: string
  rangoMax: string
}

// Rangos de referencia por defecto, tomados directo de los informes
// reales del laboratorio (GammaVet) que ya usa Casandra. Sirven como
// punto de partida editable -- distintos laboratorios pueden usar
// rangos ligeramente distintos, así que si cambian de laboratorio,
// pueden ajustarlos y desde ahí en adelante se recuerda ese nuevo
// rango (ver cargarUltimosRangos).
const RANGOS_DEFECTO: Record<string, Record<string, { min: number; max: number; unidad: string }>> = {
  bioquimico: {
    'Proteínas Totales': { min: 5.4, max: 8, unidad: 'g/dL' },
    'Albúmina': { min: 2.5, max: 4, unidad: 'g/dL' },
    'Globulinas': { min: 2.7, max: 4.4, unidad: 'g/dL' },
    'Bilirrubina Total': { min: 0.1, max: 0.8, unidad: 'mg/dL' },
    'Colesterol': { min: 135, max: 270, unidad: 'mg/dL' },
    'Glucosa': { min: 65, max: 118, unidad: 'mg/dL' },
    'Calcio': { min: 9, max: 11.3, unidad: 'mg/dL' },
    'Fósforo': { min: 2.6, max: 6.2, unidad: 'mg/dL' },
    'Urea': { min: 16, max: 58, unidad: 'mg/dL' },
    'Nus (BUN)': { min: 8, max: 33, unidad: 'mg/dL' },
    'Creatinina': { min: 0.5, max: 1.5, unidad: 'mg/dL' },
    'Fosfatasa Alcalina': { min: 20, max: 156, unidad: 'U/L' },
    'GPT/ALT': { min: 21, max: 102, unidad: 'U/L' },
    'GOT/AST': { min: 23, max: 66, unidad: 'U/L' },
    'GGT': { min: 2, max: 23, unidad: 'U/L' },
  },
  hemograma: {
    'Eritrocitos': { min: 5.5, max: 9.1, unidad: 'M/µL' },
    'Hematocrito': { min: 37, max: 62, unidad: '%' },
    'Hemoglobina': { min: 13, max: 21, unidad: 'g/dL' },
    'VCM': { min: 62, max: 75, unidad: 'fL' },
    'HCM': { min: 20, max: 25, unidad: 'pg' },
    'CHCM': { min: 31, max: 36, unidad: 'g/dL' },
    'Plaquetas': { min: 173, max: 487, unidad: 'K/µL' },
    'Leucocitos': { min: 5, max: 21, unidad: 'K/µL' },
    'Eosinófilos': { min: 1, max: 9, unidad: '%' },
    'Basófilos': { min: 0, max: 0.7, unidad: '%' },
    'Juveniles': { min: 0, max: 0, unidad: '%' },
    'Baciliformes': { min: 0, max: 0.4, unidad: '%' },
    'Segmentados': { min: 60, max: 77, unidad: '%' },
    'Linfocitos': { min: 14, max: 42, unidad: '%' },
    'Monocitos': { min: 3, max: 9, unidad: '%' },
    'Eosinófilos Absolutos': { min: 0.1, max: 1.25, unidad: 'K/µL' },
    'Basófilos Absolutos': { min: 0, max: 0.5, unidad: 'K/µL' },
    'Juveniles Absolutos': { min: 0, max: 0, unidad: 'K/µL' },
    'Baciliformes Absolutos': { min: 0, max: 0.3, unidad: 'K/µL' },
    'Segmentados Absolutos': { min: 3, max: 11.5, unidad: 'K/µL' },
    'Linfocitos Absolutos': { min: 1, max: 4.8, unidad: 'K/µL' },
    'Monocitos Absolutos': { min: 0.15, max: 1.35, unidad: 'K/µL' },
  },
}

function estaFueraDeRango(valor: string, rangoMin: string, rangoMax: string): boolean | null {
  const v = parseFloat(valor.replace(',', '.'))
  const min = parseFloat(rangoMin.replace(',', '.'))
  const max = parseFloat(rangoMax.replace(',', '.'))
  if (isNaN(v) || isNaN(min) || isNaN(max)) return null
  return v < min || v > max
}

export default function ExamenesLab({ mascotaId }: Props) {
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState('bioquimico')
  const [fecha, setFecha] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [nota, setNota] = useState('')
  const [filas, setFilas] = useState<Fila[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [examenes, setExamenes] = useState<any[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cargandoLista, setCargandoLista] = useState(true)

  useEffect(() => {
    cargarExamenes()
  }, [mascotaId])

  async function cargarExamenes() {
    setCargandoLista(true)
    const { data } = await supabase
      .from('examenes_lab')
      .select('*, examen_resultados(*)')
      .eq('mascota_id', mascotaId)
      .order('fecha', { ascending: false })
    setExamenes(data || [])
    setCargandoLista(false)
  }

  // Al elegir un tipo, arma las filas del formulario a partir de la
  // plantilla, y si ya hubo un examen de ese mismo tipo antes, copia el
  // rango/unidad de la última vez -- así no hay que volver a
  // escribirlos cada examen.
  async function iniciarFormulario(tipoElegido: string) {
    setTipo(tipoElegido)
    setError('')
    const plantilla = TIPOS_EXAMEN.find(t => t.valor === tipoElegido)!

    const ultimoDeEsteTipo = examenes.find(e => e.tipo === tipoElegido)
    const mapaAnterior: Record<string, { unidad: string; rangoMin: string; rangoMax: string }> = {}
    if (ultimoDeEsteTipo?.examen_resultados) {
      for (const r of ultimoDeEsteTipo.examen_resultados) {
        mapaAnterior[r.parametro] = {
          unidad: r.unidad || '',
          rangoMin: r.rango_min !== null && r.rango_min !== undefined ? String(r.rango_min) : '',
          rangoMax: r.rango_max !== null && r.rango_max !== undefined ? String(r.rango_max) : '',
        }
      }
    }

    setFilas(plantilla.parametros.map(p => {
      const anterior = mapaAnterior[p]
      const defecto = RANGOS_DEFECTO[tipoElegido]?.[p]
      return {
        parametro: p,
        valor: '',
        unidad: anterior?.unidad || (defecto ? defecto.unidad : ''),
        rangoMin: anterior?.rangoMin || (defecto ? String(defecto.min) : ''),
        rangoMax: anterior?.rangoMax || (defecto ? String(defecto.max) : ''),
      }
    }))
  }

  function actualizarFila(idx: number, campo: keyof Fila, valor: string) {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f))
  }

  function agregarFilaExtra() {
    setFilas(prev => [...prev, { parametro: '', valor: '', unidad: '', rangoMin: '', rangoMax: '' }])
  }

  async function guardarExamen() {
    if (!fecha) { setError('Selecciona la fecha del examen.'); return }
    const conValor = filas.filter(f => f.parametro.trim() && f.valor.trim())
    if (conValor.length === 0) { setError('Ingresa al menos un valor.'); return }

    setGuardando(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }

    const { data: examen, error: errExamen } = await supabase
      .from('examenes_lab')
      .insert({
        mascota_id: mascotaId,
        user_id: user.id,
        tipo,
        fecha,
        peso_kg: pesoKg ? parseFloat(pesoKg.replace(',', '.')) : null,
        nota: nota || null,
      })
      .select()
      .single()

    if (errExamen || !examen) {
      setError('No se pudo guardar el examen. Intenta de nuevo.')
      setGuardando(false)
      return
    }

    const filasParaGuardar = conValor.map((f, i) => ({
      examen_id: examen.id,
      parametro: f.parametro.trim(),
      valor: f.valor.trim(),
      unidad: f.unidad.trim() || null,
      rango_min: f.rangoMin.trim() ? parseFloat(f.rangoMin.replace(',', '.')) : null,
      rango_max: f.rangoMax.trim() ? parseFloat(f.rangoMax.replace(',', '.')) : null,
      orden: i,
    }))

    const { error: errResultados } = await supabase.from('examen_resultados').insert(filasParaGuardar)

    if (errResultados) {
      setError('El examen se creó, pero hubo un problema guardando algunos valores.')
      setGuardando(false)
      return
    }

    setFecha('')
    setPesoKg('')
    setNota('')
    setFilas([])
    setGuardando(false)
    setAbierto(false)
    await cargarExamenes()
  }

  const plantillaActual = TIPOS_EXAMEN.find(t => t.valor === tipo)!

  return (
    <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <span className="font-bold text-sm text-[#3D2B1F]">🧫 Exámenes de laboratorio</span>
        <span className="text-[#8A7560] text-lg">{abierto ? '⌃' : '⌄'}</span>
      </button>

      {abierto && (
        <div className="border-t border-[#EEE2D4] p-4">

          {/* Selector de tipo */}
          <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo de examen</label>
          <select
            className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none mb-3"
            value={tipo}
            onChange={e => iniciarFormulario(e.target.value)}
          >
            {TIPOS_EXAMEN.map(t => (
              <option key={t.valor} value={t.valor}>{t.emoji} {t.label}</option>
            ))}
          </select>

          {/* Fecha y peso */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha del examen</label>
              <FechaSelector value={fecha} onChange={setFecha} />
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Peso ese día (kg)</label>
              <input
                type="number" step="0.1" inputMode="decimal"
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"
                placeholder="ej. 18"
                value={pesoKg}
                onChange={e => setPesoKg(e.target.value)}
              />
            </div>
          </div>

          {/* Si aun no se cargaron filas para este tipo (primera vez que se abre) */}
          {filas.length === 0 && (
            <button
              onClick={() => iniciarFormulario(tipo)}
              className="w-full bg-[#FBEAD9] text-[#8C572F] font-semibold py-2.5 rounded-xl text-sm mb-3"
            >
              Cargar plantilla de {plantillaActual.label}
            </button>
          )}

          {/* Tabla de parámetros */}
          {filas.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-[#8A7560] mb-2">Deja vacío lo que tu examen no incluya. El rango viene precargado con valores típicos de referencia — ajústalo si tu laboratorio usa otros.</p>
              {filas.map((f, i) => {
                const fuera = estaFueraDeRango(f.valor, f.rangoMin, f.rangoMax)
                return (
                  <div key={i} className="py-2 border-b border-[#F5EDE3]">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        className="flex-1 text-xs font-medium text-[#3D2B1F] bg-transparent focus:outline-none focus:bg-[#FBEAD9] rounded px-1.5 py-1.5"
                        value={f.parametro}
                        onChange={e => actualizarFila(i, 'parametro', e.target.value)}
                        placeholder="Parámetro"
                      />
                      <input
                        className="w-20 text-xs text-center rounded-lg px-2 py-1.5 focus:outline-none"
                        style={fuera ? { background: '#FDEAEA', color: '#993C1D', fontWeight: 600 } : { background: '#F5EDE3', color: '#3D2B1F' }}
                        value={f.valor}
                        onChange={e => actualizarFila(i, 'valor', e.target.value)}
                        placeholder="—"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pl-1.5">
                      <span className="text-[9px] text-[#8A7560]">Unidad</span>
                      <input
                        className="w-14 text-[10px] text-[#8A7560] bg-[#FBEAD9] focus:outline-none rounded px-1.5 py-1"
                        value={f.unidad}
                        onChange={e => actualizarFila(i, 'unidad', e.target.value)}
                        placeholder="ud."
                      />
                      <span className="text-[9px] text-[#8A7560] ml-1.5">Mín</span>
                      <input
                        className="w-14 text-[10px] text-[#8A7560] bg-[#FBEAD9] focus:outline-none rounded px-1.5 py-1"
                        value={f.rangoMin}
                        onChange={e => actualizarFila(i, 'rangoMin', e.target.value)}
                        placeholder="min"
                      />
                      <span className="text-[9px] text-[#8A7560] ml-1.5">Máx</span>
                      <input
                        className="w-14 text-[10px] text-[#8A7560] bg-[#FBEAD9] focus:outline-none rounded px-1.5 py-1"
                        value={f.rangoMax}
                        onChange={e => actualizarFila(i, 'rangoMax', e.target.value)}
                        placeholder="max"
                      />
                    </div>
                  </div>
                )
              })}
              <button onClick={agregarFilaExtra} className="text-xs text-[#CD7421] font-semibold mt-2">
                + agregar parámetro
              </button>
            </div>
          )}

          {/* Nota */}
          <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota del veterinario · opcional</label>
          <textarea
            className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none resize-none mb-3"
            rows={2}
            placeholder="Interpretación o comentario del examen..."
            value={nota}
            onChange={e => setNota(e.target.value)}
          />

          {error && <p className="text-xs text-[#E05252] mb-2">{error}</p>}

          <button
            onClick={guardarExamen}
            disabled={guardando}
            className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar examen'}
          </button>

          {/* Lista de exámenes ya guardados */}
          <div className="mt-5 pt-4 border-t border-[#EEE2D4]">
            <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Historial</p>
            {cargandoLista ? (
              <p className="text-xs text-[#8A7560]">Cargando...</p>
            ) : examenes.length === 0 ? (
              <p className="text-xs text-[#8A7560]">Aún no hay exámenes registrados.</p>
            ) : (
              examenes.map(ex => {
                const infoTipo = TIPOS_EXAMEN.find(t => t.valor === ex.tipo)
                const resultados = (ex.examen_resultados || []).sort((a: any, b: any) => a.orden - b.orden)
                const abiertoEx = expandido === ex.id
                return (
                  <div key={ex.id} className="mb-2 border border-[#EEE2D4] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandido(abiertoEx ? null : ex.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-[#FBEAD9]"
                    >
                      <span className="text-xs font-semibold text-[#3D2B1F]">
                        {infoTipo?.emoji} {infoTipo?.label || ex.tipo} · {new Date(ex.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[#8A7560] text-xs">{abiertoEx ? '⌃' : '⌄'}</span>
                    </button>
                    {abiertoEx && (
                      <div className="p-3">
                        {ex.peso_kg && <p className="text-[11px] text-[#8A7560] mb-2">Peso: {ex.peso_kg} kg</p>}
                        {resultados.map((r: any) => {
                          const fuera = r.rango_min !== null && r.rango_max !== null
                            ? estaFueraDeRango(r.valor, String(r.rango_min), String(r.rango_max))
                            : null
                          return (
                            <div key={r.id} className="flex items-center justify-between py-1 border-b border-[#F5EDE3] last:border-0">
                              <span className="text-xs text-[#3D2B1F]">{r.parametro}</span>
                              <span className="text-xs font-semibold" style={{ color: fuera ? '#993C1D' : '#3D2B1F' }}>
                                {r.valor} {r.unidad || ''}
                                {r.rango_min !== null && r.rango_max !== null && (
                                  <span className="text-[10px] text-[#8A7560] font-normal ml-1">({r.rango_min}-{r.rango_max})</span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                        {ex.nota && <p className="text-[11px] text-[#8A7560] italic mt-2">📝 {ex.nota}</p>}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

        </div>
      )}
    </div>
  )
}
