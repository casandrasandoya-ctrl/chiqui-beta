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
interface ParametroPlantilla { nombre: string; tipo: 'numero' | 'texto' | 'lista'; opciones?: string[]; seccion?: string; unidadDefecto?: string; placeholder?: string }

const TIPOS_EXAMEN: { valor: string; label: string; emoji: string; parametros: ParametroPlantilla[] }[] = [
  {
    valor: 'bioquimico', label: 'Perfil bioquímico', emoji: '🧪',
    // Organizado en 4 secciones clínicas, igual que los informes de
    // laboratorio reales (y que orina/tiroides en esta misma pantalla):
    // Proteínas · Función hepática · Función renal · Metabolismo y
    // minerales. El orden de los parámetros se reagrupó para que cada
    // sección quede contigua; los nombres NO cambian, así que los
    // rangos por defecto y los exámenes ya guardados siguen calzando.
    parametros: [
      { nombre: 'Proteínas Totales', seccion: 'Proteínas' },
      { nombre: 'Albúmina', seccion: 'Proteínas' },
      { nombre: 'Globulinas', seccion: 'Proteínas' },
      { nombre: 'Bilirrubina Total', seccion: 'Función hepática' },
      { nombre: 'Fosfatasa Alcalina', seccion: 'Función hepática' },
      { nombre: 'GPT/ALT', seccion: 'Función hepática' },
      { nombre: 'GOT/AST', seccion: 'Función hepática' },
      { nombre: 'GGT', seccion: 'Función hepática' },
      { nombre: 'Urea', seccion: 'Función renal' },
      { nombre: 'Nus (BUN)', seccion: 'Función renal' },
      { nombre: 'Creatinina', seccion: 'Función renal' },
      { nombre: 'Fósforo', seccion: 'Función renal' },
      { nombre: 'Glucosa', seccion: 'Metabolismo y minerales' },
      { nombre: 'Colesterol', seccion: 'Metabolismo y minerales' },
      { nombre: 'Calcio', seccion: 'Metabolismo y minerales' },
    ].map(p => ({ ...p, tipo: 'numero' as const })),
  },
  {
    valor: 'hemograma', label: 'Hemograma', emoji: '🩸',
    // 4 secciones siguiendo la lectura clínica del hemograma: Serie
    // roja (anemia/policitemia) · Plaquetas · Serie blanca en % ·
    // Serie blanca en valores absolutos. El orden original ya venía
    // agrupado así, solo se etiqueta.
    parametros: [
      { nombre: 'Eritrocitos', seccion: 'Serie roja' },
      { nombre: 'Hematocrito', seccion: 'Serie roja' },
      { nombre: 'Hemoglobina', seccion: 'Serie roja' },
      { nombre: 'VCM', seccion: 'Serie roja' },
      { nombre: 'HCM', seccion: 'Serie roja' },
      { nombre: 'CHCM', seccion: 'Serie roja' },
      { nombre: 'Plaquetas', seccion: 'Plaquetas' },
      { nombre: 'Leucocitos', seccion: 'Serie blanca (%)' },
      { nombre: 'Eosinófilos', seccion: 'Serie blanca (%)' },
      { nombre: 'Basófilos', seccion: 'Serie blanca (%)' },
      { nombre: 'Juveniles', seccion: 'Serie blanca (%)' },
      { nombre: 'Baciliformes', seccion: 'Serie blanca (%)' },
      { nombre: 'Segmentados', seccion: 'Serie blanca (%)' },
      { nombre: 'Linfocitos', seccion: 'Serie blanca (%)' },
      { nombre: 'Monocitos', seccion: 'Serie blanca (%)' },
      { nombre: 'Eosinófilos Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Basófilos Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Juveniles Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Baciliformes Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Segmentados Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Linfocitos Absolutos', seccion: 'Serie blanca (absolutos)' },
      { nombre: 'Monocitos Absolutos', seccion: 'Serie blanca (absolutos)' },
    ].map(p => ({ ...p, tipo: 'numero' as const })),
  },
  {
    // Orina y Tiroides definen sus parámetros en
    // obtenerParametrosPlantilla() (no aquí), porque dependen de la
    // especie y se organizan en secciones colapsables.
    valor: 'orina', label: 'Examen de orina', emoji: '🚽',
    parametros: [],
  },
  {
    valor: 'tiroides', label: 'Perfil tiroideo', emoji: '🦋',
    parametros: [],
  },
  {
    // Test rápido: pruebas cuyo resultado NO es numérico sino
    // Positivo / Negativo / Indeterminado (snap tests, kits ELISA
    // rápidos). Un solo tipo de examen para todas las enfermedades --
    // los tests disponibles viven en CATALOGO_TESTS_RAPIDOS, no aquí,
    // para poder agregar tests nuevos sin tocar la interfaz. El
    // formulario de este tipo es distinto (selector múltiple + tarjetas
    // por test) y no usa la tabla de parámetros/rangos.
    valor: 'test_rapido', label: 'Test rápido', emoji: '🧪',
    parametros: [],
  },
]

// --- Examen de orina: 3 secciones (físico, químico, sedimento) ---
// Los parámetros de tira reactiva usan listas de opciones (Negativo,
// Traza, 1+...) en vez de texto libre, para que la comparación entre
// fechas sea consistente. Eritrocitos/Leucocitos del sedimento quedan
// como texto libre porque los informes los expresan de formas muy
// variadas ("0-2 por campo", "escasos", etc.).
const OPCIONES_GRADIENTE = ['Negativo', 'Traza', '1+', '2+', '3+', '4+']
const PARAMETROS_ORINA: ParametroPlantilla[] = [
  { nombre: 'Color', tipo: 'lista', seccion: 'Examen físico', opciones: ['Amarillo pálido', 'Amarillo', 'Amarillo oscuro', 'Ámbar', 'Anaranjado', 'Rojo', 'Café', 'Verde', 'Incoloro', 'Otro'] },
  { nombre: 'Aspecto / Transparencia', tipo: 'lista', seccion: 'Examen físico', opciones: ['Transparente', 'Ligeramente turbio', 'Turbio', 'Muy turbio'] },
  { nombre: 'Olor', tipo: 'texto', seccion: 'Examen físico', placeholder: 'ej. sui géneris · opcional' },
  { nombre: 'Volumen', tipo: 'numero', seccion: 'Examen físico', unidadDefecto: 'mL' },
  { nombre: 'Densidad urinaria (USG)', tipo: 'numero', seccion: 'Examen físico' },
  { nombre: 'pH', tipo: 'numero', seccion: 'Examen químico' },
  { nombre: 'Proteínas', tipo: 'lista', seccion: 'Examen químico', opciones: OPCIONES_GRADIENTE },
  { nombre: 'Glucosa', tipo: 'lista', seccion: 'Examen químico', opciones: OPCIONES_GRADIENTE },
  { nombre: 'Cetonas', tipo: 'lista', seccion: 'Examen químico', opciones: ['Negativo', 'Traza', 'Positivo'] },
  { nombre: 'Bilirrubina', tipo: 'lista', seccion: 'Examen químico', opciones: ['Negativo', 'Traza', 'Positivo'] },
  { nombre: 'Sangre / Hemoglobina', tipo: 'lista', seccion: 'Examen químico', opciones: ['Negativo', 'Traza', 'Positivo'] },
  { nombre: 'Urobilinógeno', tipo: 'lista', seccion: 'Examen químico', opciones: ['Normal', 'Elevado'] },
  { nombre: 'Nitritos', tipo: 'lista', seccion: 'Examen químico', opciones: ['Negativo', 'Positivo'] },
  { nombre: 'Eritrocitos', tipo: 'texto', seccion: 'Sedimento urinario', placeholder: 'cantidad por campo, ej. 0-2' },
  { nombre: 'Leucocitos', tipo: 'texto', seccion: 'Sedimento urinario', placeholder: 'cantidad por campo, ej. 0-2' },
  { nombre: 'Células epiteliales', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['Escasas', 'Moderadas', 'Abundantes'] },
  { nombre: 'Bacterias', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['No', 'Escasas', 'Moderadas', 'Abundantes'] },
  { nombre: 'Levaduras', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['No', 'Sí'] },
  { nombre: 'Cristales', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['Ninguno', 'Estruvita', 'Oxalato de calcio', 'Urato', 'Cistina', 'Fosfato cálcico', 'Otros'] },
  { nombre: 'Cilindros', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['Ninguno', 'Hialinos', 'Granulosos', 'Celulares', 'Céreos', 'Otros'] },
  { nombre: 'Moco', tipo: 'lista', seccion: 'Sedimento urinario', opciones: ['No', 'Escaso', 'Moderado', 'Abundante'] },
  { nombre: 'Otros hallazgos', tipo: 'texto', seccion: 'Sedimento urinario', placeholder: 'ej. sin hallazgos' },
]

// --- Perfil tiroideo: 2 secciones (hormonas + autoanticuerpos) ---
// Las hormonas cambian de nombre según la especie (TSH Canina vs TSH
// Felina) y los autoanticuerpos solo aplican a PERROS.
// Unidades por defecto: T4 Total µg/dL, T4 Libre ng/dL, TSH ng/mL,
// T3 Total ng/dL. Rangos por defecto: T4 Total (por especie) y TSH
// Canina (0.05-0.42 ng/mL, según método analítico) -- ver
// obtenerRangoDefecto(). T4 Libre, T3 y TSH Felina quedan sin rango
// por defecto porque varían mucho entre laboratorios: se copian del
// informe real y, una vez cargado un examen, se recuerdan para el
// siguiente.
function parametrosTiroides(especieMascota?: string): ParametroPlantilla[] {
  const esGato = especieMascota === 'Gato'
  const hormonas: ParametroPlantilla[] = [
    { nombre: 'T4 Total', tipo: 'numero', seccion: 'Hormonas tiroideas', unidadDefecto: 'µg/dL' },
    { nombre: 'T4 Libre', tipo: 'numero', seccion: 'Hormonas tiroideas', unidadDefecto: 'ng/dL' },
    { nombre: esGato ? 'TSH Felina' : 'TSH Canina', tipo: 'numero', seccion: 'Hormonas tiroideas', unidadDefecto: 'ng/mL' },
    { nombre: 'T3 Total', tipo: 'numero', seccion: 'Hormonas tiroideas', unidadDefecto: 'ng/dL' },
  ]
  if (especieMascota === 'Perro') {
    hormonas.push(
      { nombre: 'TgAA (Anticuerpos antitiroglobulina)', tipo: 'lista', seccion: 'Autoanticuerpos', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Autoanticuerpos T3', tipo: 'lista', seccion: 'Autoanticuerpos', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Autoanticuerpos T4', tipo: 'lista', seccion: 'Autoanticuerpos', opciones: ['Negativo', 'Positivo'] },
    )
  }
  return hormonas
}

// Punto único para obtener los parámetros de la plantilla de cualquier
// tipo de examen, considerando la especie cuando corresponde.
function obtenerParametrosPlantilla(tipoExamen: string, especieMascota?: string): ParametroPlantilla[] {
  if (tipoExamen === 'orina') return PARAMETROS_ORINA
  if (tipoExamen === 'tiroides') return parametrosTiroides(especieMascota)
  return TIPOS_EXAMEN.find(t => t.valor === tipoExamen)?.parametros || []
}

// Catálogo de tests rápidos, desacoplado de la interfaz. Para agregar
// un test nuevo (de cualquier especie) basta con sumar una línea aquí:
// no hay que crear un tipo de examen ni una pantalla nueva. Los tests
// escritos a mano con "+ agregar otro test" también se guardan igual,
// aunque no estén en el catálogo.
interface TestRapidoCatalogo { especie: string; nombre: string; descripcion?: string }
const CATALOGO_TESTS_RAPIDOS: TestRapidoCatalogo[] = [
  { especie: 'Gato', nombre: 'FelV (Leucemia Felina)' },
  { especie: 'Gato', nombre: 'FIV (Inmunodeficiencia Felina)' },
  { especie: 'Gato', nombre: 'Coronavirus Felino (FCoV)' },
  { especie: 'Perro', nombre: 'Ehrlichia' },
  { especie: 'Perro', nombre: 'Anaplasma' },
  { especie: 'Perro', nombre: 'Dirofilaria (Heartworm)' },
  { especie: 'Perro', nombre: 'Leishmania' },
  { especie: 'Perro', nombre: 'Lyme' },
  { especie: 'Perro', nombre: '4DX IDEXX', descripcion: 'Panel combinado' },
]

const RESULTADOS_TEST = ['Negativo', 'Positivo', 'Indeterminado'] as const

// Color del resultado de un test rápido: rojo si Positivo, naranjo si
// Indeterminado, verde si Negativo (semáforo de salud de la app).
function colorResultadoTest(resultado: string): string {
  if (resultado === 'Positivo') return '#E05252'
  if (resultado === 'Indeterminado') return '#F07A30'
  return '#4CAF7D'
}

interface Fila {
  parametro: string
  valor: string
  unidad: string
  rangoMin: string
  rangoMax: string
  tipoValor: 'numero' | 'texto' | 'lista'
  opciones?: string[]
  seccion?: string
  placeholder?: string
}

// Forma exacta de una fila a insertar en examen_resultados. Ambas ramas
// de guardarExamen (test rápido y exámenes con parámetros/rangos) deben
// producir ESTE mismo tipo -- si cada rama infiere su propio tipo
// literal (ej. unidad: null vs unidad: string | null), la unión
// resultante rompe el tipado del cliente de Supabase en el build.
interface ResultadoInsert {
  examen_id: string | null
  parametro: string
  valor: string
  unidad: string | null
  rango_min: number | null
  rango_max: number | null
  observacion: string | null
  orden: number
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
    // pH y Densidad urinaria (USG) dependen de la especie -- se
    // calculan en obtenerRangoDefecto(), no aquí.
  },
  // Tiroides: solo T4 Total tiene rango por defecto (por especie, en
  // obtenerRangoDefecto). T4 Libre / TSH / T3 quedan sin rango a
  // propósito -- ver nota en parametrosTiroides().
}

// Densidad urinaria (USG), pH de orina y T4 Total dependen de la
// especie -- se calculan aparte en vez de ir fijos en RANGOS_DEFECTO.
function obtenerRangoDefecto(tipoExamen: string, parametro: string, especieMascota?: string): { min: number; max: number; unidad: string } | undefined {
  if (tipoExamen === 'orina' && parametro === 'Densidad urinaria (USG)') {
    if (especieMascota === 'Gato') return { min: 1.035, max: 1.060, unidad: '' }
    if (especieMascota === 'Perro') return { min: 1.015, max: 1.045, unidad: '' }
    return undefined // especie desconocida -- se deja en blanco, mejor que adivinar mal
  }
  if (tipoExamen === 'orina' && parametro === 'pH') {
    if (especieMascota === 'Gato') return { min: 6.0, max: 7.5, unidad: '' }
    if (especieMascota === 'Perro') return { min: 5.5, max: 7.5, unidad: '' }
    return undefined
  }
  if (tipoExamen === 'tiroides' && parametro === 'T4 Total') {
    if (especieMascota === 'Gato') return { min: 0.8, max: 4.7, unidad: 'µg/dL' }
    if (especieMascota === 'Perro') return { min: 1.0, max: 4.0, unidad: 'µg/dL' }
    return undefined
  }
  if (tipoExamen === 'tiroides' && parametro === 'TSH Canina') {
    // Referencia clínica habitual (según método analítico) -- editable
    // si el laboratorio usa otro intervalo.
    return { min: 0.05, max: 0.42, unidad: 'ng/mL' }
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
  // Tests rápidos seleccionados en el formulario (solo aplica cuando
  // tipo === 'test_rapido'). Cada uno lleva su resultado y una
  // observación opcional.
  const [testsSel, setTestsSel] = useState<{ nombre: string; resultado: string; observacion: string; manual?: boolean }[]>([])
  // Secciones colapsables del formulario (Examen físico / químico /
  // Sedimento en orina; Hormonas / Autoanticuerpos en tiroides).
  // Colapsadas por defecto.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Set<string>>(new Set())
  const formRef = useRef<HTMLDivElement>(null)

  function toggleSeccion(nombre: string) {
    setSeccionesAbiertas(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(nombre)) nuevo.delete(nombre)
      else nuevo.add(nombre)
      return nuevo
    })
  }

  const esTestRapido = tipo === 'test_rapido'
  // Tests del catálogo SOLO de la especie de esta mascota: los gatos
  // ven únicamente tests felinos y los perros únicamente tests caninos.
  // Si la especie no tiene tests en el catálogo (u otra especie a
  // futuro), no se muestra ningún test predefinido -- queda disponible
  // "+ agregar otro test" para escribirlo a mano.
  const testsCatalogo = CATALOGO_TESTS_RAPIDOS.filter(c => c.especie === especie)

  function toggleTestRapido(nombre: string) {
    setTestsSel(prev => {
      const existe = prev.find(t => t.nombre === nombre && !t.manual)
      if (existe) return prev.filter(t => !(t.nombre === nombre && !t.manual))
      return [...prev, { nombre, resultado: '', observacion: '' }]
    })
  }

  function actualizarTest(idx: number, campo: 'nombre' | 'resultado' | 'observacion', valor: string) {
    setTestsSel(prev => prev.map((t, i) => i === idx ? { ...t, [campo]: valor } : t))
  }

  function agregarTestManual() {
    setTestsSel(prev => [...prev, { nombre: '', resultado: '', observacion: '', manual: true }])
  }

  function quitarTest(idx: number) {
    setTestsSel(prev => prev.filter((_, i) => i !== idx))
  }

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
  // Busca la definición de un parámetro (tipo, opciones, sección)
  // según la plantilla de ese tipo de examen y la especie. Si no se
  // encuentra (ej. un parámetro escrito a mano con "+ agregar
  // parámetro"), asume numérico sin sección.
  function buscarDefParametro(tipoExamen: string, parametro: string): ParametroPlantilla {
    const def = obtenerParametrosPlantilla(tipoExamen, especie).find(p => p.nombre === parametro)
    return def || { nombre: parametro, tipo: 'numero' }
  }

  async function iniciarFormulario(tipoElegido: string) {
    setTipo(tipoElegido)
    setError('')
    setSeccionesAbiertas(new Set())
    // Test rápido no usa la tabla de parámetros/rangos: su formulario
    // es el selector múltiple de tests. Limpiamos ambos estados para
    // no arrastrar datos entre tipos.
    if (tipoElegido === 'test_rapido') {
      setFilas([])
      setTestsSel([])
      return
    }
    setTestsSel([])
    const parametrosPlantilla = obtenerParametrosPlantilla(tipoElegido, especie)

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

    setFilas(parametrosPlantilla.map(p => {
      const anterior = mapaAnterior[p.nombre]
      const defecto = p.tipo === 'numero' ? obtenerRangoDefecto(tipoElegido, p.nombre, especie) : undefined
      return {
        parametro: p.nombre,
        valor: '',
        tipoValor: p.tipo,
        opciones: p.opciones,
        seccion: p.seccion,
        placeholder: p.placeholder,
        unidad: anterior?.unidad || (defecto ? defecto.unidad : (p.unidadDefecto || '')),
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
    if (ex.tipo === 'test_rapido') {
      // Test rápido: cada resultado guardado vuelve como una tarjeta de
      // test (nombre = parametro, resultado = valor, observación).
      setFilas([])
      setTestsSel(resultados.map((r: any) => ({
        nombre: r.parametro,
        resultado: r.valor,
        observacion: r.observacion || '',
        manual: !CATALOGO_TESTS_RAPIDOS.some(c => c.nombre === r.parametro),
      })))
      setError('')
      setAbierto(true)
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      return
    }
    setTestsSel([])
    setSeccionesAbiertas(new Set())
    setFilas(resultados.map((r: any) => {
      const def = buscarDefParametro(ex.tipo, r.parametro)
      // Si este examen se creó antes de que existieran los rangos por
      // defecto, puede tener unidad/rango vacíos aunque el parámetro
      // sea uno conocido -- en ese caso, rellenamos con el valor
      // típico igual que al crear un examen nuevo (solo si es numérico).
      const defecto = def.tipo === 'numero' ? obtenerRangoDefecto(ex.tipo, r.parametro, especie) : undefined
      const tieneUnidad = r.unidad !== null && r.unidad !== undefined && r.unidad !== ''
      const tieneMin = r.rango_min !== null && r.rango_min !== undefined
      const tieneMax = r.rango_max !== null && r.rango_max !== undefined
      return {
        parametro: r.parametro,
        valor: r.valor,
        tipoValor: def.tipo,
        opciones: def.opciones,
        seccion: def.seccion,
        placeholder: def.placeholder,
        unidad: tieneUnidad ? r.unidad : (defecto ? defecto.unidad : (def.unidadDefecto || '')),
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
    setTestsSel([])
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
    const testsConResultado = testsSel.filter(t => t.nombre.trim() && t.resultado)
    if (esTestRapido) {
      if (testsConResultado.length === 0) { setError('Selecciona al menos un test y marca su resultado.'); return }
    } else {
      if (conValor.length === 0) { setError('Ingresa al menos un valor.'); return }
    }

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

    // Test rápido: cada test seleccionado se guarda como un resultado
    // (parametro = nombre del test, valor = Negativo/Positivo/
    // Indeterminado, observacion opcional). Mismo esquema de tablas que
    // los demás exámenes, sin rangos ni unidades.
    const filasParaGuardar: ResultadoInsert[] = esTestRapido
      ? testsConResultado.map((t, i) => ({
          examen_id: examenId,
          parametro: t.nombre.trim(),
          valor: t.resultado,
          unidad: null,
          rango_min: null,
          rango_max: null,
          observacion: t.observacion.trim() || null,
          orden: i,
        }))
      : conValor.map((f, i) => ({
          examen_id: examenId,
          parametro: f.parametro.trim(),
          valor: f.valor.trim(),
          unidad: f.unidad.trim() || null,
          rango_min: f.rangoMin.trim() ? parseFloat(f.rangoMin.replace(',', '.')) : null,
          rango_max: f.rangoMax.trim() ? parseFloat(f.rangoMax.replace(',', '.')) : null,
          observacion: null,
          orden: i,
        }))

    const { error: errResultados } = await supabase.from('examen_resultados').insert(filasParaGuardar)

    if (errResultados) {
      setError('El examen se guardó, pero hubo un problema guardando algunos valores.')
      setGuardando(false)
      return
    }

    // Sincroniza el peso del examen con el historial de peso: si el
    // laboratorio pesó a la mascota ese día, ese dato pertenece a la
    // curva de peso. Misma lógica que PesoTracker: si ya hay un
    // registro de peso para esa fecha se actualiza (no se duplica), y
    // si no, se inserta. peso_actual de la mascota solo se actualiza
    // cuando NO existe un registro de peso más reciente que la fecha
    // del examen (un examen antiguo no debe pisar el peso vigente).
    const pesoNum = pesoKg.trim() ? parseFloat(pesoKg.replace(',', '.')) : NaN
    if (!isNaN(pesoNum) && pesoNum > 0 && user) {
      const { data: existentePeso } = await supabase
        .from('historial_peso')
        .select('id')
        .eq('mascota_id', mascotaId)
        .eq('fecha', fecha)
        .maybeSingle()
      if (existentePeso) {
        await supabase.from('historial_peso').update({ peso: pesoNum }).eq('id', existentePeso.id)
      } else {
        await supabase.from('historial_peso').insert({
          mascota_id: mascotaId,
          user_id: user.id,
          peso: pesoNum,
          fecha: fecha,
        })
      }
      const { data: masNuevos } = await supabase
        .from('historial_peso')
        .select('id')
        .eq('mascota_id', mascotaId)
        .gt('fecha', fecha)
        .limit(1)
      if (!masNuevos || masNuevos.length === 0) {
        await supabase.from('mascotas').update({ peso_actual: pesoNum }).eq('id', mascotaId)
      }
    }

    setEditandoId(null)
    setFecha('')
    setPesoKg('')
    setNota('')
    setFilas([])
    setTestsSel([])
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

          {/* Formulario de TEST RÁPIDO: selector múltiple de tests del
              catálogo (filtrado por especie) + una tarjeta por test
              seleccionado con resultado y observación opcional. */}
          {esTestRapido && (
            <div className="mb-3">
              {testsCatalogo.length > 0 ? (
                <>
                  <p className="text-[10px] text-[#8A7560] mb-2">Toca los tests que se realizaron. Puedes marcar uno, varios o todos en un mismo examen.</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {testsCatalogo.map(c => {
                      const activo = testsSel.some(t => t.nombre === c.nombre && !t.manual)
                      return (
                        <button
                          key={c.nombre}
                          onClick={() => toggleTestRapido(c.nombre)}
                          className="text-xs font-semibold px-3 py-2 rounded-full border"
                          style={activo
                            ? { background: '#FFBD5920', borderColor: '#FFBD59', color: '#8C572F', borderWidth: '1.5px' }
                            : { background: '#FFFCF8', borderColor: '#EEE2D4', color: '#3D2B1F', borderWidth: '1.5px' }}
                        >
                          {activo ? '✓ ' : ''}{c.nombre}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-[#8A7560] mb-2">Agrega el test realizado con el botón de abajo.</p>
              )}
              {testsSel.map((t, i) => (
                <div key={i} className="border border-[#EEE2D4] rounded-xl p-3 mb-2 bg-[#FFFCF8]">
                  <div className="flex items-center justify-between mb-2">
                    {t.manual ? (
                      <input
                        className="flex-1 text-xs font-semibold text-[#3D2B1F] bg-[#FBEAD9] rounded px-2 py-1.5 focus:outline-none mr-2"
                        value={t.nombre}
                        onChange={e => actualizarTest(i, 'nombre', e.target.value)}
                        placeholder="Nombre del test"
                        autoFocus
                      />
                    ) : (
                      <p className="text-xs font-semibold text-[#3D2B1F]">🧪 {t.nombre}</p>
                    )}
                    <button onClick={() => quitarTest(i)} className="text-[#8A7560] text-sm flex-shrink-0">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {RESULTADOS_TEST.map(r => {
                      const sel = t.resultado === r
                      const color = colorResultadoTest(r)
                      return (
                        <button
                          key={r}
                          onClick={() => actualizarTest(i, 'resultado', r)}
                          className="text-xs font-semibold py-2 rounded-lg border"
                          style={sel
                            ? { background: `${color}15`, borderColor: color, color, borderWidth: '1.5px' }
                            : { background: '#F5EDE3', borderColor: '#EEE2D4', color: '#8A7560', borderWidth: '1.5px' }}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    className="w-full text-xs bg-[#FBEAD9] rounded-lg px-2.5 py-2 text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none"
                    value={t.observacion}
                    onChange={e => actualizarTest(i, 'observacion', e.target.value)}
                    placeholder="Observaciones · opcional"
                  />
                </div>
              ))}
              <button onClick={agregarTestManual} className="text-xs text-[#CD7421] font-semibold mt-1">
                + agregar otro test
              </button>
            </div>
          )}

          {/* Si aun no se cargaron filas para este tipo (primera vez que se abre) */}
          {!esTestRapido && filas.length === 0 && (
            <button
              onClick={() => iniciarFormulario(tipo)}
              className="w-full bg-[#FBEAD9] text-[#8C572F] font-semibold py-2.5 rounded-xl text-sm mb-3"
            >
              Cargar plantilla de {plantillaActual.label}
            </button>
          )}

          {/* Tabla de parámetros -- si la plantilla define secciones
              (orina, tiroides), se agrupan en bloques colapsables que
              parten cerrados; si no (bioquímico, hemograma), la lista
              plana de siempre. Los parámetros de tipo 'lista' usan un
              selector de opciones en vez de texto libre. */}
          {!esTestRapido && filas.length > 0 && (() => {
            const renderFila = (f: Fila, i: number) => {
              const esTexto = f.tipoValor === 'texto'
              const esLista = f.tipoValor === 'lista'
              const fuera = f.tipoValor === 'numero' && estaFueraDeRango(f.valor, f.rangoMin, f.rangoMax)
              const positivoLista = esLista && f.valor === 'Positivo'
              return (
                <div key={i} className="py-2 border-b border-[#F5EDE3]">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      className="w-40 text-xs font-medium text-[#3D2B1F] bg-transparent focus:outline-none focus:bg-[#FBEAD9] rounded px-1.5 py-1.5"
                      value={f.parametro}
                      onChange={e => actualizarFila(i, 'parametro', e.target.value)}
                      placeholder="Parámetro"
                    />
                    {esLista ? (
                      <select
                        className="flex-1 text-xs rounded-lg px-2 py-1.5 focus:outline-none appearance-none"
                        style={positivoLista ? { background: '#FDEAEA', color: '#993C1D', fontWeight: 600 } : { background: '#F5EDE3', color: f.valor ? '#3D2B1F' : '#8A7560' }}
                        value={f.valor}
                        onChange={e => actualizarFila(i, 'valor', e.target.value)}
                      >
                        <option value="">—</option>
                        {(f.opciones || []).map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={esTexto ? 'flex-1 text-xs rounded-lg px-2 py-1.5 focus:outline-none' : 'w-20 text-xs text-center rounded-lg px-2 py-1.5 focus:outline-none'}
                        style={fuera ? { background: '#FDEAEA', color: '#993C1D', fontWeight: 600 } : { background: '#F5EDE3', color: '#3D2B1F' }}
                        value={f.valor}
                        onChange={e => actualizarFila(i, 'valor', e.target.value)}
                        placeholder={esTexto ? (f.placeholder || 'descripción...') : '—'}
                      />
                    )}
                  </div>
                  {/* Unidad/Mín/Máx solo tienen sentido para parámetros
                      numéricos -- las listas y textos descriptivos no
                      traen un rango que comparar. */}
                  {f.tipoValor === 'numero' && (
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
            }

            // Secciones únicas en el orden en que aparecen en las filas.
            const secciones: string[] = []
            for (const f of filas) {
              if (f.seccion && !secciones.includes(f.seccion)) secciones.push(f.seccion)
            }
            const filasSinSeccion = filas.map((f, i) => ({ f, i })).filter(x => !x.f.seccion)

            return (
              <div className="mb-3">
                <p className="text-[10px] text-[#8A7560] mb-2">Deja vacío lo que tu examen no incluya. El rango viene precargado con valores típicos de referencia — ajústalo si tu laboratorio usa otros.</p>
                {secciones.length > 0 ? (
                  <>
                    {secciones.map(secc => {
                      const items = filas.map((f, i) => ({ f, i })).filter(x => x.f.seccion === secc)
                      const abierta = seccionesAbiertas.has(secc)
                      const completados = items.filter(x => x.f.valor.trim()).length
                      return (
                        <div key={secc} className="mb-2 border border-[#EEE2D4] rounded-xl overflow-hidden bg-[#FFFCF8]">
                          <button
                            type="button"
                            onClick={() => toggleSeccion(secc)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-[#FBEAD9]"
                          >
                            <p className="flex-1 text-xs font-semibold text-[#8C572F]">{secc}</p>
                            {completados > 0 && (
                              <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{completados}</span>
                            )}
                            <span className="text-[#8A7560] text-sm">{abierta ? '▾' : '›'}</span>
                          </button>
                          {abierta && (
                            <div className="px-3 pb-1">
                              {items.map(({ f, i }) => renderFila(f, i))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {filasSinSeccion.map(({ f, i }) => renderFila(f, i))}
                  </>
                ) : (
                  filas.map((f, i) => renderFila(f, i))
                )}
                <button onClick={agregarFilaExtra} className="text-xs text-[#CD7421] font-semibold mt-2">
                  + agregar parámetro
                </button>
              </div>
            )
          })()}

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
                // plantilla primero (según la especie), y agregando al
                // final cualquier parámetro extra que se haya escrito a
                // mano o que venga de una plantilla anterior.
                const parametrosUnion: string[] = obtenerParametrosPlantilla(t.valor, especie).map(p => p.nombre)
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
                                  const positivo = r?.valor === 'Positivo'
                                  const fuera = t.valor !== 'test_rapido' && r && r.rango_min !== null && r.rango_max !== null
                                    ? estaFueraDeRango(r.valor, String(r.rango_min), String(r.rango_max))
                                    : false
                                  return (
                                    <td key={ex.id} className="px-2 py-1.5 border-b border-l border-[#F5EDE3] text-center" style={(fuera || positivo) ? { color: '#993C1D', fontWeight: 600, background: '#FDEAEA' } : { color: '#3D2B1F' }}>
                                      {r ? `${r.valor}${positivo ? ' ⚠️' : ''}` : '—'}
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
                        const esTR = ex.tipo === 'test_rapido'
                        const positivosEx = esTR ? resultados.filter((r: any) => r.valor === 'Positivo') : []
                        return (
                          <div key={ex.id} className="mb-2 border border-[#EEE2D4] rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandido(abiertoEx ? null : ex.id)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-[#FBEAD9]"
                            >
                              <span className="text-xs font-semibold text-[#3D2B1F]">
                                {new Date(ex.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {esTR && positivosEx.length > 0 && (
                                  <span className="ml-2 text-[#E05252]">⚠️ {positivosEx.length} positivo{positivosEx.length === 1 ? '' : 's'}</span>
                                )}
                                {esTR && positivosEx.length === 0 && (
                                  <span className="ml-2 text-[#4CAF7D]">✓ sin positivos</span>
                                )}
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
                                {(() => {
                                  // Mapa parametro → sección para mostrar
                                  // subtítulos (Examen físico, Hormonas...)
                                  // cuando la plantilla los define.
                                  const mapaSeccion: Record<string, string> = {}
                                  for (const p of obtenerParametrosPlantilla(ex.tipo, especie)) {
                                    if (p.seccion) mapaSeccion[p.nombre] = p.seccion
                                  }
                                  let seccionPrevia = ''
                                  return resultados.map((r: any) => {
                                    const fuera = r.rango_min !== null && r.rango_max !== null
                                      ? estaFueraDeRango(r.valor, String(r.rango_min), String(r.rango_max))
                                      : null
                                    const colorTR = esTR ? colorResultadoTest(r.valor) : (r.valor === 'Positivo' ? '#E05252' : null)
                                    const seccionActual = mapaSeccion[r.parametro] || ''
                                    const mostrarSeccion = seccionActual && seccionActual !== seccionPrevia
                                    seccionPrevia = seccionActual || seccionPrevia
                                    return (
                                      <div key={r.id}>
                                        {mostrarSeccion && (
                                          <p className="text-[10px] font-bold text-[#8C572F] uppercase tracking-wider pt-2 pb-1">{seccionActual}</p>
                                        )}
                                        <div className="py-1 border-b border-[#F5EDE3] last:border-0">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-[#3D2B1F]">{r.parametro}</span>
                                            <span className="text-xs font-semibold" style={{ color: colorTR || (fuera ? '#993C1D' : '#3D2B1F') }}>
                                              {r.valor === 'Positivo' ? '⚠️ ' : ''}{r.valor} {r.unidad || ''}
                                              {r.rango_min !== null && r.rango_max !== null && (
                                                <span className="text-[10px] text-[#8A7560] font-normal ml-1">({r.rango_min}-{r.rango_max})</span>
                                              )}
                                            </span>
                                          </div>
                                          {r.observacion && <p className="text-[10px] text-[#8A7560] italic mt-0.5">{r.observacion}</p>}
                                        </div>
                                      </div>
                                    )
                                  })
                                })()}
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
