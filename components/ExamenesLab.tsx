'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import FechaSelector from '@/components/FechaSelector'

interface Props {
  mascotaId: string
  especie?: string
}

// Plantillas: nombre, orden, y si el parámetro es NUMÉRICO (con
// unidad/rango) o de TEXTO (descriptivo, como "Negativo" o "Amarillo
// claro" -- no tiene sentido pedirle unidad ni rango a esos). El orden
// respeta el informe real del laboratorio, sin inventar categorías
// clínicas.
interface ParametroPlantilla { nombre: string; tipo: 'numero' | 'texto' }

const TIPOS_EXAMEN: { valor: string; label: string; emoji: string; parametros: ParametroPlantilla[] }[] = [
  {
    valor: 'bioquimico', label: 'Perfil bioquímico', emoji: '🧪',
    parametros: [
      'Proteínas Totales', 'Albúmina', 'Globulinas', 'Bilirrubina Total',
      'Colesterol', 'Glucosa', 'Calcio', 'Fósforo', 'Urea', 'Nus (BUN)',
      'Creatinina', 'Fosfatasa Alcalina', 'GPT/ALT', 'GOT/AST', 'GGT',
    ].map(nombre => ({ nombre, tipo: 'numero' as const })),
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
    ].map(nombre => ({ nombre, tipo: 'numero' as const })),
  },
  {
    // Solo Densidad urinaria (USG) y pH son realmente numéricos con
    // rango de referencia. El resto (evaluación física y química con
    // tira reactiva, y sedimento al microscopio) son descriptivos --
    // "Negativo", "Trazas", "1+", "Amarillo claro", "Escasos", etc.
    valor: 'orina', label: 'Examen de orina', emoji: '💛',
    parametros: [
      { nombre: 'Color', tipo: 'texto' },
      { nombre: 'Aspecto', tipo: 'texto' },
      { nombre: 'Densidad urinaria (USG)', tipo: 'numero' },
      { nombre: 'pH', tipo: 'numero' },
      { nombre: 'Proteínas', tipo: 'texto' },
      { nombre: 'Glucosa', tipo: 'texto' },
      { nombre: 'Cetonas', tipo: 'texto' },
      { nombre: 'Bilirrubina', tipo: 'texto' },
      { nombre: 'Sangre / Hemoglobina', tipo: 'texto' },
      { nombre: 'Urobilinógeno', tipo: 'texto' },
      { nombre: 'Nitritos', tipo: 'texto' },
      { nombre: 'Glóbulos rojos (RBC)', tipo: 'texto' },
      { nombre: 'Glóbulos blancos (WBC)', tipo: 'texto' },
      { nombre: 'Células epiteliales', tipo: 'texto' },
      { nombre: 'Bacterias', tipo: 'texto' },
      { nombre: 'Cristales', tipo: 'texto' },
      { nombre: 'Cilindros', tipo: 'texto' },
      { nombre: 'Moco', tipo: 'texto' },
    ],
  },
  {
    // Numéricos, pero SIN rango por defecto -- los valores de T4/T3/TSH
    // varían mucho entre laboratorios y métodos de medición, así que
    // siempre se copian del informe real (o del examen anterior, una
    // vez que ya se haya cargado uno).
    valor: 'tiroides', label: 'Perfil tiroideo', emoji: '🦴',
    parametros: ['T4 Total', 'T4 Libre', 'T3 Total', 'T3 Libre', 'TSH', 'Anticuerpos anti-tiroglobulina (TgAA)']
      .map(nombre => ({ nombre, tipo: 'numero' as const })),
  },
]

interface Fila {
  parametro: string
  valor: string
  unidad: string
  rangoMin: string
  rangoMax: string
  tipoValor: 'numero' | 'texto'
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
  orina: {
    // pH es igual para perros y gatos. Densidad urinaria (USG) SÍ
    // cambia por especie (perro: 1.015-1.045, gato: 1.035-1.060) --
    // por eso no va aquí fijo, se calcula en obtenerRangoDefecto()
    // usando la especie de la mascota.
    'pH': { min: 5, max: 7.5, unidad: '' },
  },
  // Tiroides queda sin rangos por defecto a propósito -- ver nota en
  // TIPOS_EXAMEN.
}

// Densidad urinaria (USG) depende de la especie -- se calcula aparte
// en vez de ir fijo en RANGOS_DEFECTO.
function obtenerRangoDefecto(tipoExamen: string, parametro: string, especieMascota?: string): { min: number; max: number; unidad: string } | undefined {
  if (tipoExamen === 'orina' && parametro === 'Densidad urinaria (USG)') {
    if (especieMascota === 'Gato') return { min: 1.035, max: 1.060, unidad: '' }
    if (especieMascota === 'Perro') return { min: 1.015, max: 1.045, unidad: '' }
    return undefined // especie desconocida -- se deja en blanco, mejor que adivinar mal
  }
  return RANGOS_DEFECTO[tipoExamen]?.[parametro]
}

function estaFueraDeRango(valor: string, rangoMin: string, rangoMax: string): boolean | null {
  const v = parseFloat(valor.replace(',', '.'))
  const min = parseFloat(rangoMin.replace(',', '.'))
  const max = parseFloat(rangoMax.replace(',', '.'))
  if (isNaN(v) || isNaN(min) || isNaN(max)) return null
  return v < min || v > max
}

export default function ExamenesLab({ mascotaId, especie }: Props) {
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
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [comparando, setComparando] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

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
  // Busca si un parámetro es de tipo 'numero' o 'texto' según la
  // plantilla de ese tipo de examen. Si no se encuentra (ej. un
  // parámetro que se escribió a mano con "+ agregar parámetro"),
  // asume 'numero' por defecto.
  function buscarTipoValor(tipoExamen: string, parametro: string): 'numero' | 'texto' {
    const plantilla = TIPOS_EXAMEN.find(t => t.valor === tipoExamen)
    return plantilla?.parametros.find(p => p.nombre === parametro)?.tipo || 'numero'
  }

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
      const anterior = mapaAnterior[p.nombre]
      const defecto = p.tipo === 'numero' ? obtenerRangoDefecto(tipoElegido, p.nombre, especie) : undefined
      return {
        parametro: p.nombre,
        valor: '',
        tipoValor: p.tipo,
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
    setFilas(prev => [...prev, { parametro: '', valor: '', unidad: '', rangoMin: '', rangoMax: '', tipoValor: 'numero' }])
  }

  // Carga un examen ya guardado en el formulario, para editarlo. Reusa
  // exactamente los mismos campos que "Nuevo examen" -- al guardar, en
  // vez de crear uno nuevo, actualiza el existente.
  function editarExamen(ex: any) {
    setEditandoId(ex.id)
    setTipo(ex.tipo)
    setFecha(ex.fecha)
    setPesoKg(ex.peso_kg !== null && ex.peso_kg !== undefined ? String(ex.peso_kg) : '')
    setNota(ex.nota || '')
    const resultados = (ex.examen_resultados || []).slice().sort((a: any, b: any) => a.orden - b.orden)
    setFilas(resultados.map((r: any) => {
      const tipoValor = buscarTipoValor(ex.tipo, r.parametro)
      // Si este examen se creó antes de que existieran los rangos por
      // defecto, puede tener unidad/rango vacíos aunque el parámetro
      // sea uno conocido -- en ese caso, rellenamos con el valor
      // típico igual que al crear un examen nuevo (solo si es numérico).
      const defecto = tipoValor === 'numero' ? obtenerRangoDefecto(ex.tipo, r.parametro, especie) : undefined
      const tieneUnidad = r.unidad !== null && r.unidad !== undefined && r.unidad !== ''
      const tieneMin = r.rango_min !== null && r.rango_min !== undefined
      const tieneMax = r.rango_max !== null && r.rango_max !== undefined
      return {
        parametro: r.parametro,
        valor: r.valor,
        tipoValor,
        unidad: tieneUnidad ? r.unidad : (defecto ? defecto.unidad : ''),
        rangoMin: tieneMin ? String(r.rango_min) : (defecto ? String(defecto.min) : ''),
        rangoMax: tieneMax ? String(r.rango_max) : (defecto ? String(defecto.max) : ''),
      }
    }))
    setError('')
    setAbierto(true)
    // Ya no se colapsa la tarjeta del examen (antes se cerraba de golpe
    // sin indicar adónde fueron los datos). En vez de eso, saltamos la
    // pantalla hasta el formulario de arriba, que ya quedó lleno con
    // los datos de este examen listos para editar.
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setFecha('')
    setPesoKg('')
    setNota('')
    setFilas([])
    setError('')
  }

  async function eliminarExamen(id: string) {
    if (!confirm('¿Eliminar este examen y todos sus resultados? Esta acción no se puede deshacer.')) return
    await supabase.from('examenes_lab').delete().eq('id', id)
    if (editandoId === id) cancelarEdicion()
    await cargarExamenes()
  }

  async function guardarExamen() {
    if (!fecha) { setError('Selecciona la fecha del examen.'); return }
    const conValor = filas.filter(f => f.parametro.trim() && f.valor.trim())
    if (conValor.length === 0) { setError('Ingresa al menos un valor.'); return }

    setGuardando(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }

    let examenId = editandoId

    if (editandoId) {
      // Modo edición: actualizar el examen existente y reemplazar
      // todos sus resultados (borrar los viejos, insertar los nuevos --
      // más simple y confiable que tratar de "parchar" fila por fila).
      const { error: errUpdate } = await supabase
        .from('examenes_lab')
        .update({
          tipo,
          fecha,
          peso_kg: pesoKg ? parseFloat(pesoKg.replace(',', '.')) : null,
          nota: nota || null,
        })
        .eq('id', editandoId)

      if (errUpdate) {
        setError('No se pudo actualizar el examen. Intenta de nuevo.')
        setGuardando(false)
        return
      }

      await supabase.from('examen_resultados').delete().eq('examen_id', editandoId)
    } else {
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
      examenId = examen.id
    }

    const filasParaGuardar = conValor.map((f, i) => ({
      examen_id: examenId,
      parametro: f.parametro.trim(),
      valor: f.valor.trim(),
      unidad: f.unidad.trim() || null,
      rango_min: f.rangoMin.trim() ? parseFloat(f.rangoMin.replace(',', '.')) : null,
      rango_max: f.rangoMax.trim() ? parseFloat(f.rangoMax.replace(',', '.')) : null,
      orden: i,
    }))

    const { error: errResultados } = await supabase.from('examen_resultados').insert(filasParaGuardar)

    if (errResultados) {
      setError('El examen se guardó, pero hubo un problema guardando algunos valores.')
      setGuardando(false)
      return
    }

    setEditandoId(null)
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
        <div ref={formRef} className="border-t border-[#EEE2D4] p-4">

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
                const esTexto = f.tipoValor === 'texto'
                const fuera = !esTexto && estaFueraDeRango(f.valor, f.rangoMin, f.rangoMax)
                return (
                  <div key={i} className="py-2 border-b border-[#F5EDE3]">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        className="w-40 text-xs font-medium text-[#3D2B1F] bg-transparent focus:outline-none focus:bg-[#FBEAD9] rounded px-1.5 py-1.5"
                        value={f.parametro}
                        onChange={e => actualizarFila(i, 'parametro', e.target.value)}
                        placeholder="Parámetro"
                      />
                      <input
                        className={esTexto ? 'flex-1 text-xs rounded-lg px-2 py-1.5 focus:outline-none' : 'w-20 text-xs text-center rounded-lg px-2 py-1.5 focus:outline-none'}
                        style={fuera ? { background: '#FDEAEA', color: '#993C1D', fontWeight: 600 } : { background: '#F5EDE3', color: '#3D2B1F' }}
                        value={f.valor}
                        onChange={e => actualizarFila(i, 'valor', e.target.value)}
                        placeholder={esTexto ? 'ej. Negativo, Amarillo claro...' : '—'}
                      />
                    </div>
                    {/* Unidad/Mín/Máx solo tienen sentido para parámetros
                        numéricos -- "Color" o "Proteínas" (tira reactiva)
                        no traen un rango que comparar. */}
                    {!esTexto && (
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
                    )}
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

          {editandoId && (
            <div className="bg-[#4AABDB]/10 rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] text-[#4AABDB] font-semibold">Editando examen existente</span>
              <button onClick={cancelarEdicion} className="text-[11px] text-[#8A7560] font-semibold">Cancelar</button>
            </div>
          )}

          <button
            onClick={guardarExamen}
            disabled={guardando}
            className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar examen'}
          </button>

          {/* Lista de exámenes ya guardados -- agrupados por tipo, para
              que la comparación entre fechas tenga sentido (Hemograma
              con Hemograma, no mezclado con Bioquímico). */}
          <div className="mt-5 pt-4 border-t border-[#EEE2D4]">
            <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Historial</p>
            {cargandoLista ? (
              <p className="text-xs text-[#8A7560]">Cargando...</p>
            ) : examenes.length === 0 ? (
              <p className="text-xs text-[#8A7560]">Aún no hay exámenes registrados.</p>
            ) : (
              TIPOS_EXAMEN.map(t => {
                const deEsteTipo = examenes.filter(e => e.tipo === t.valor)
                if (deEsteTipo.length === 0) return null
                const enComparacion = comparando === t.valor

                // Unión de todos los parámetros que aparecen en cualquiera
                // de los exámenes de este tipo, respetando el orden de la
                // plantilla primero, y agregando al final cualquier
                // parámetro extra que se haya escrito a mano.
                const parametrosUnion: string[] = t.parametros.map(p => p.nombre)
                for (const ex of deEsteTipo) {
                  for (const r of (ex.examen_resultados || [])) {
                    if (!parametrosUnion.includes(r.parametro)) parametrosUnion.push(r.parametro)
                  }
                }
                const examenesAsc = deEsteTipo.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))

                return (
                  <div key={t.valor} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-bold text-[#8C572F]">{t.emoji} {t.label} ({deEsteTipo.length})</p>
                      {deEsteTipo.length >= 2 && (
                        <button
                          onClick={() => setComparando(enComparacion ? null : t.valor)}
                          className="text-[10px] font-semibold text-[#4AABDB]"
                        >
                          {enComparacion ? 'Ver lista' : '↔ Comparar'}
                        </button>
                      )}
                    </div>

                    {enComparacion ? (
                      <div className="overflow-x-auto border border-[#EEE2D4] rounded-xl">
                        <table className="text-[10px] border-collapse">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-[#FBEAD9] text-left px-2 py-1.5 font-semibold text-[#8A7560] border-b border-[#EEE2D4] min-w-[110px]">Parámetro</th>
                              {examenesAsc.map(ex => (
                                <th key={ex.id} className="px-2 py-1.5 font-semibold text-[#8A7560] border-b border-l border-[#EEE2D4] min-w-[70px] whitespace-nowrap">
                                  {new Date(ex.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parametrosUnion.map(p => (
                              <tr key={p}>
                                <td className="sticky left-0 bg-[#FFFCF8] px-2 py-1.5 text-[#3D2B1F] border-b border-[#F5EDE3] whitespace-nowrap">{p}</td>
                                {examenesAsc.map(ex => {
                                  const r = (ex.examen_resultados || []).find((rr: any) => rr.parametro === p)
                                  const fuera = r && r.rango_min !== null && r.rango_max !== null
                                    ? estaFueraDeRango(r.valor, String(r.rango_min), String(r.rango_max))
                                    : false
                                  return (
                                    <td key={ex.id} className="px-2 py-1.5 border-b border-l border-[#F5EDE3] text-center" style={fuera ? { color: '#993C1D', fontWeight: 600, background: '#FDEAEA' } : { color: '#3D2B1F' }}>
                                      {r ? r.valor : '—'}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      deEsteTipo.map(ex => {
                        const resultados = (ex.examen_resultados || []).slice().sort((a: any, b: any) => a.orden - b.orden)
                        const abiertoEx = expandido === ex.id
                        return (
                          <div key={ex.id} className="mb-2 border border-[#EEE2D4] rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandido(abiertoEx ? null : ex.id)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-[#FBEAD9]"
                            >
                              <span className="text-xs font-semibold text-[#3D2B1F]">
                                {new Date(ex.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[#8A7560] text-xs">{abiertoEx ? '⌃' : '⌄'}</span>
                            </button>
                            {abiertoEx && (
                              <div className="p-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <button onClick={() => editarExamen(ex)} className="text-[11px] font-semibold text-[#8C572F]">✏️ Editar</button>
                                  <button onClick={() => eliminarExamen(ex.id)} className="text-[11px] font-semibold text-[#E05252]">🗑️ Eliminar</button>
                                </div>
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
                )
              })
            )}
          </div>

        </div>
      )}
    </div>
  )
}
