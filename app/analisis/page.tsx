'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import ChiquiChat from '@/components/ChiquiChat'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'

const ESTADO_COLOR: Record<string, string> = {
  verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252'
}

// Labels de los signos de alerta (misma lista que en registro-diario).
// Se usan para mostrar el resumen por tipo y la línea de tiempo de
// eventos graves, sin interpretar clínicamente los hechos.
const SIGNOS_LABELS: Record<string, { emoji: string; label: string }> = {
  convulsiones: { emoji: '🌀', label: 'Convulsiones' },
  dificultad_respiratoria: { emoji: '🫁', label: 'Dificultad respiratoria severa' },
  perdida_conciencia: { emoji: '😵', label: 'Pérdida de conciencia' },
  sangrado_abundante: { emoji: '🩸', label: 'Sangrado abundante' },
  golpe_calor: { emoji: '🥵', label: 'Golpe de calor' },
  intoxicacion: { emoji: '☠️', label: 'Intoxicación' },
  trauma: { emoji: '🚑', label: 'Trauma / accidente importante' },
  paralisis: { emoji: '🦽', label: 'Parálisis o no puede caminar' },
  otro_signo: { emoji: '❓', label: 'Otro evento grave' },
}

// Definición de los 23 cuidados que se pueden calcular como "rutina"
// (cada cuánto ocurren). Mismo set, mismos grupos, mismo orden y mismos
// emojis que en registro-diario y dashboard.
// Cada rutina tiene una "frase" conversacional para que Chiqui le hable
// al tutor en vez de mostrar solo números. Placeholders: {cada} se
// reemplaza por "todos los días" / "día por medio" / "cada N días", y
// {nombre} por el nombre de la mascota. Para eventos médicos poco
// frecuentes (cirugías, lesiones) la frase es neutra a propósito —
// "sueles" sonaría mal ahí.
// Las rutinas del Arenero (solo gatos) permiten estimar reabastecimiento:
// "compras arena cada N días" funciona igual que "compras alimento cada
// N días". En perros esas columnas nunca son true, así que simplemente
// no aparecen (el filtro de ocurrencias === 0 las descarta solo).
const CUIDADOS_RUTINA: { columna: string; label: string; emoji: string; grupo: string; frase: string; diario?: boolean }[] = [
  { columna: 'fue_al_vet', label: 'Visitas al veterinario', emoji: '🩺', grupo: 'Veterinario y salud', frase: 'Sueles llevar a {nombre} al veterinario {cada}' },
  { columna: 'control_peso', label: 'Controles de peso', emoji: '⚖️', grupo: 'Veterinario y salud', frase: 'Controlas su peso {cada}' },
  { columna: 'procedimiento_cirugia', label: 'Procedimientos o cirugías', emoji: '🏥', grupo: 'Veterinario y salud', frase: 'Se ha registrado un procedimiento o cirugía {cada} aprox.' },
  { columna: 'seguimiento_lesion', label: 'Seguimientos de lesión', emoji: '📸', grupo: 'Veterinario y salud', frase: 'Registras seguimientos de lesión {cada} aprox.' },
  { columna: 'medicamento_hoy', label: 'Medicamentos', emoji: '💊', grupo: 'Prevención', frase: 'Registras medicamentos {cada} aprox.' },
  { columna: 'vacuna_hoy', label: 'Vacunas', emoji: '💉', grupo: 'Prevención', frase: 'Las vacunas se han aplicado {cada} aprox.' },
  { columna: 'anti_hoy', label: 'Antiparasitarios', emoji: '🪱', grupo: 'Prevención', frase: 'Aplicas antiparasitario {cada} aprox.' },
  { columna: 'suplemento_hoy', label: 'Suplementos', emoji: '🌿', grupo: 'Prevención', frase: 'Le das suplemento {cada}' },
  { columna: 'alimente_hoy', label: 'Alimentación', emoji: '🥘', grupo: 'Alimentación', frase: 'Registras su alimentación {cada}', diario: true },
  { columna: 'compro_alimento', label: 'Compras de alimento', emoji: '🍖', grupo: 'Alimentación', frase: 'Habitualmente compras alimento {cada}' },
  { columna: 'cambio_alimento', label: 'Cambios de alimento', emoji: '🥣', grupo: 'Alimentación', frase: 'Cambias su alimento {cada} aprox.' },
  { columna: 'probo_alimento_nuevo', label: 'Alimentos nuevos probados', emoji: '🎁', grupo: 'Alimentación', frase: 'Le das a probar algo nuevo {cada} aprox.' },
  { columna: 'cargo_dispensador', label: 'Dispensador cargado', emoji: '🤖', grupo: 'Alimentación', frase: 'Normalmente cargas el dispensador {cada}' },
  { columna: 'se_bano', label: 'Baños', emoji: '🛁', grupo: 'Higiene y bienestar', frase: 'Habitualmente bañas a {nombre} {cada}' },
  { columna: 'corte_unas', label: 'Corte de uñas', emoji: '✂️', grupo: 'Higiene y bienestar', frase: 'Sueles cortarle las uñas {cada}' },
  { columna: 'limpieza_dental', label: 'Limpieza dental', emoji: '🦷', grupo: 'Higiene y bienestar', frase: 'Haces limpieza dental {cada}' },
  { columna: 'limpieza_oidos', label: 'Limpieza de oídos', emoji: '👂', grupo: 'Higiene y bienestar', frase: 'Limpias sus oídos {cada}' },
  { columna: 'tratamiento_dermatologico', label: 'Tratamiento dermatológico', emoji: '🧴', grupo: 'Higiene y bienestar', frase: 'Aplicas su tratamiento dermatológico {cada}' },
  { columna: 'peino', label: 'Peinados', emoji: '💇', grupo: 'Higiene y bienestar', frase: 'Sueles peinar a {nombre} {cada}' },
  { columna: 'shampoo_seco', label: 'Shampoo en seco', emoji: '🧼', grupo: 'Higiene y bienestar', frase: 'Usas shampoo en seco {cada}' },
  { columna: 'limpie_arenero', label: 'Limpiezas del arenero', emoji: '🧹', grupo: 'Arenero', frase: 'Sueles limpiar el arenero {cada}' },
  { columna: 'cambie_arena', label: 'Cambios de arena', emoji: '🔄', grupo: 'Arenero', frase: 'Cambias la arena completa {cada}' },
  { columna: 'compre_arena', label: 'Compras de arena', emoji: '🛒', grupo: 'Arenero', frase: 'Habitualmente compras arena {cada}' },
]

// Convierte un promedio de días en texto natural: "todos los días",
// "día por medio" o "cada N días".
// Adherencia: dosis REGISTRADAS sobre las que correspondian entre
// la fecha de inicio y la de termino (o hoy, si sigue en curso).
// Mismo calculo que usa la vista del veterinario.
//
// Las fechas se construyen a MEDIODIA para que los cambios de
// horario de verano no desplacen el conteo de dias.
function adherenciaMed(med: any): { esperadas: number; dadas: number; pct: number } | null {
  if (!med.fecha_inicio) return null
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const finReal = med.fecha_fin && med.fecha_fin < hoy ? med.fecha_fin : hoy
  const ini = new Date(med.fecha_inicio + 'T12:00:00')
  const fin = new Date(finReal + 'T12:00:00')
  const dias = Math.floor((fin.getTime() - ini.getTime()) / 86400000) + 1
  if (dias <= 0) return null
  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)
  // Cuantos DIAS del periodo llevaban dosis. Para un tratamiento
  // dia por medio de 7 dias, son 4 dias con dosis y no 7: dividir
  // por todos los dias dejaba a la persona en 50% haciendolo bien.
  const intervalo = Math.max(1, Number(med.intervalo_dias) || 1)
  const diasConDosis = Math.floor((dias - 1) / intervalo) + 1
  const esperadas = diasConDosis * porDia
  if (esperadas <= 0) return null
  return { esperadas, dadas: Number(med.tomas) || 0, pct: Math.round(((Number(med.tomas) || 0) / esperadas) * 100) }
}

function textoCada(dias: number): string {
  if (dias <= 1) return 'todos los días'
  if (dias === 2) return 'día por medio'
  return `cada ${dias} días`
}

interface RutinaCalculada {
  columna: string
  label: string
  emoji: string
  grupo: string
  frase: string
  // Cuidado diario (alimentación): no aplica lógica de "vence cada N
  // días". Si se registró hoy, está al día; si no, es un recordatorio
  // suave, nunca "pendiente/atrasado".
  diario?: boolean
  ocurrencias: number
  promedioDias: number | null
  ultimaFecha: string
  diasDesdeUltima: number
  proximaEstimadaDias: number | null
  // Solo para la rutina de alimentación: distribución de franjas
  // (mañana/tarde/noche) sobre los días alimentados, en %.
  franjas?: { mañana: number; tarde: number; noche: number; total: number } | null
}

interface SignoEvento {
  fecha: string
  signos: string[]
  otro: string | null
}

// A partir de una lista de fechas (YYYY-MM-DD) donde ocurrió un cuidado,
// calcula: cuántas veces ocurrió, el promedio de días entre ocurrencias
// consecutivas, la fecha de la última vez, cuántos días pasaron desde
// esa última vez, y en cuántos días más se estimaría la próxima (solo
// si hay al menos 2 ocurrencias, ya que con 1 sola no hay intervalo que
// promediar).
function calcularRutina(fechas: string[]): { ocurrencias: number; promedioDias: number | null; ultimaFecha: string | null; proximaEstimadaDias: number | null } {
  if (fechas.length === 0) return { ocurrencias: 0, promedioDias: null, ultimaFecha: null, proximaEstimadaDias: null }
  const ordenadas = [...fechas].sort()
  const ultimaFecha = ordenadas[ordenadas.length - 1]
  if (ordenadas.length === 1) {
    return { ocurrencias: 1, promedioDias: null, ultimaFecha, proximaEstimadaDias: null }
  }
  const intervalos: number[] = []
  for (let i = 1; i < ordenadas.length; i++) {
    const a = new Date(ordenadas[i - 1] + 'T00:00:00')
    const b = new Date(ordenadas[i] + 'T00:00:00')
    intervalos.push(Math.round((b.getTime() - a.getTime()) / 86400000))
  }
  const promedioDias = Math.round(intervalos.reduce((s, v) => s + v, 0) / intervalos.length)
  const hoy = new Date()
  const ultima = new Date(ultimaFecha + 'T00:00:00')
  const diasDesdeUltima = Math.round((hoy.getTime() - ultima.getTime()) / 86400000)
  const proximaEstimadaDias = promedioDias - diasDesdeUltima
  return { ocurrencias: ordenadas.length, promedioDias, ultimaFecha, proximaEstimadaDias }
}

export default function AnalisisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<any[]>([])
  const [mascota, setMascota] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(30)
  const [abiertaNormalidad, setAbiertaNormalidad] = useState(false)
  const [abiertoRecientes, setAbiertoRecientes] = useState(false)
  const [respReciente, setRespReciente] = useState<any>(null)
  const [tempReciente, setTempReciente] = useState<any>(null)
  const [celoInfo, setCeloInfo] = useState<any>(null)
  const [rutinas, setRutinas] = useState<RutinaCalculada[]>([])
  // Grupos de rutinas abiertos (Veterinario, Alimentación, etc.).
  const [gruposRutinaAbiertos, setGruposRutinaAbiertos] = useState<Set<string>>(new Set())
  const [signosHistorial, setSignosHistorial] = useState<SignoEvento[]>([])
  // Fechas en que se fue al veterinario, de las dos fuentes.
  const [visitasVet, setVisitasVet] = useState<string[]>([])
  // Datos que el chat necesita y que esta pantalla no cargaba: sin
  // ellos respondia "no hay registro" sobre cosas que sí estaban.
  const [pesoChat, setPesoChat] = useState<{ actual: number; fecha: string; anterior?: number | null } | null>(null)
  const [vacunasChat, setVacunasChat] = useState<any[]>([])
  const [antisChat, setAntisChat] = useState<any[]>([])
  const [examenesChat, setExamenesChat] = useState<any[]>([])
  const [enriqRegistros, setEnriqRegistros] = useState<any[]>([])
  // Historial COMPLETO de enriquecimiento (no los 30 dias de
  // enriqRegistros): la racha de juego de los gatos se cuenta
  // sobre el, para que no tenga un techo artificial de 30 dias.
  const [enriqHistorial, setEnriqHistorial] = useState<any[]>([])
  // Tratamientos vigentes hoy, con sus dosis registradas. La
  // seccion de medicamentos los muestra tal cual fueron recetados
  // en vez de inferir una cadencia del historial.
  const [medsVigentes, setMedsVigentes] = useState<any[]>([])
  const [abiertoJuegoGato, setAbiertoJuegoGato] = useState(false)
  // Historial de paseos de los últimos 6 meses CALENDARIO. Se carga
  // aparte de `registros` (que son 30 días móviles) porque la tarjeta
  // "este mes" y la comparación mensual necesitan meses completos, no
  // una ventana deslizante.
  const [paseoHistorial, setPaseoHistorial] = useState<any[]>([])
  const [abiertaEnriq, setAbiertaEnriq] = useState(false)
  const [abiertoAnillo, setAbiertoAnillo] = useState(false)
  // Sub-bloques de Paseo, colapsables por separado (racha y total del
  // mes quedan siempre visibles; el resto se abre a demanda).
  const [abiertoPaseoMes, setAbiertoPaseoMes] = useState(false)
  const [abiertoActSemana, setAbiertoActSemana] = useState(false)
  const [abiertoDetalleMes, setAbiertoDetalleMes] = useState(false)
  const [abiertoObservado, setAbiertoObservado] = useState(false)
  const [abiertaSignos, setAbiertaSignos] = useState(false)

  // Misma función que en el dashboard: devuelve la fecha en zona horaria
  // de Chile en vez de UTC, para que el cálculo de racha sea correcto.
  function fechaChile(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date)
  }

  async function cargarRegistros(mascotaId: string) {
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)
    const [{ data: r }, { data: enr }, { data: hist }, { data: enrHist }, { data: medsAct }] = await Promise.all([
      supabase
        .from('registros_diarios').select('*')
        .eq('mascota_id', mascotaId)
        .gte('fecha', fechaChile(desde))
        .order('fecha', { ascending: false }),
      // Enriquecimiento del mismo período (solo perros tienen filas;
      // la consulta es inocua para gatos).
      supabase
        .from('enriquecimientos')
        .select('fecha, actividad, duracion_min, detalle')
        .eq('mascota_id', mascotaId)
        .gte('fecha', fechaChile(desde)),
      // Historial COMPLETO de paseos (solo tres columnas, sale barato).
      // Se usa para el total del mes, la comparación mensual y la
      // racha — que así deja de tener techo.
      supabase
        .from('registros_diarios')
        .select('fecha, paseo, paseo_minutos_exactos')
        .eq('mascota_id', mascotaId)
        .order('fecha', { ascending: true })
        .limit(2000),
      // Historial COMPLETO de enriquecimiento (solo dos columnas):
      // la racha de juego se cuenta sobre esto para no tener techo.
      supabase
        .from('enriquecimientos')
        .select('fecha, actividad')
        .eq('mascota_id', mascotaId)
        .order('fecha', { ascending: true })
        .limit(2000),
      // Tratamientos marcados como activos. La fecha de termino se
      // filtra despues, en codigo, porque el campo estado no se
      // actualiza solo cuando llega esa fecha.
      supabase
        .from('medicamentos')
        .select('id, nombre, dosis, frecuencia, dosis_por_dia, intervalo_dias, fecha_inicio, fecha_fin')
        .eq('mascota_id', mascotaId)
        .eq('estado', 'activo'),
    ])
    setRegistros(r || [])
    setEnriqRegistros(enr || [])
    setPaseoHistorial(hist || [])
    setEnriqHistorial(enrHist || [])
    // Misma regla derivada que Prevencion, el dashboard y la vista
    // del veterinario: sin fecha_fin, o con fecha_fin de hoy o
    // futura.
    const hoyMedStr = fechaChile(new Date())
    // Vigente = ya empezo y aun no termina. La condicion de inicio
    // faltaba: un tratamiento futuro se contaba como en curso.
    const vigentes = (medsAct || []).filter((md: any) =>
      (!md.fecha_inicio || md.fecha_inicio <= hoyMedStr) &&
      (!md.fecha_fin || md.fecha_fin >= hoyMedStr)
    )
    if (vigentes.length === 0) {
      setMedsVigentes([])
    } else {
      // Dosis efectivamente registradas de cada tratamiento, para
      // mostrar cumplimiento real en vez de una cadencia inventada.
      const { data: tomasMed } = await supabase
        .from('medicamento_tomas')
        .select('medicamento_id')
        .in('medicamento_id', vigentes.map((md: any) => md.id))
      const conteo: Record<string, number> = {}
      for (const t of ((tomasMed || []) as { medicamento_id: string }[])) {
        conteo[t.medicamento_id] = (conteo[t.medicamento_id] || 0) + 1
      }
      setMedsVigentes(vigentes.map((md: any) => ({ ...md, tomas: conteo[md.id] || 0 })))
    }
  }

  // Signos de alerta: trae TODO el historial de la mascota (no solo 30
  // días), pero solo las 3 columnas necesarias — así el query queda
  // liviano. Los eventos graves son poco frecuentes pero muy relevantes
  // para detectar recurrencias en el tiempo (ej. convulsiones que se
  // repiten cada cierto período).
  // Visitas al veterinario. Vienen de DOS lugares y hay que mirar los
  // dos: la tabla formal de Prevención, y los días marcados "fue al
  // vet" en el registro diario. Es la misma combinación que hace el
  // componente de Visitas.
  //
  // Sirven para reconocer que el tutor YA actuó: si hubo episodios y
  // después una consulta, decírselo vale más que dejarle la alerta
  // abierta como si no hubiera hecho nada.
  // Peso, vacunas, antiparasitarios y exámenes. Viven en Salud, pero el
  // chat los necesita: antes respondía "no hay registro" sobre datos que
  // sí existían, que es peor que no responder.
  //
  // Solo la dosis MÁS RECIENTE de cada vacuna o antiparasitario, que es
  // la regla del proyecto: una reemplazada por otra más nueva no cuenta.
  async function cargarDatosChat(mascotaId: string) {
    const [{ data: pesos }, { data: vac }, { data: ant }, { data: exs }] = await Promise.all([
      supabase.from('historial_peso').select('peso, fecha').eq('mascota_id', mascotaId).order('fecha', { ascending: false }).limit(2),
      supabase.from('vacunas').select('nombre, fecha_aplicacion, proxima_fecha').eq('mascota_id', mascotaId).order('fecha_aplicacion', { ascending: false }),
      supabase.from('antiparasitarios').select('nombre, fecha_aplicacion, proxima_fecha').eq('mascota_id', mascotaId).order('fecha_aplicacion', { ascending: false }),
      supabase.from('examenes').select('nombre, categoria, fecha').eq('mascota_id', mascotaId).order('fecha', { ascending: false }).limit(5),
    ])

    if (pesos && pesos.length > 0) {
      const d = new Date(String(pesos[0].fecha).slice(0, 10) + 'T12:00:00')
      setPesoChat({
        actual: pesos[0].peso,
        fecha: `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`,
        anterior: pesos.length > 1 ? pesos[1].peso : null,
      })
    }

    // Una sola por nombre: la más reciente.
    const masReciente = (lista: any[] | null) => {
      const porNombre = new Map<string, any>()
      for (const x of (lista || [])) {
        const k = (x.nombre || '').toLowerCase().trim()
        if (!porNombre.has(k)) porNombre.set(k, x)
      }
      return Array.from(porNombre.values())
    }
    setVacunasChat(masReciente(vac))
    setAntisChat(masReciente(ant))
    setExamenesChat(exs || [])
  }

  async function cargarVisitas(mascotaId: string) {
    const [{ data: formales }, { data: marcadas }] = await Promise.all([
      supabase.from('visitas_veterinarias').select('fecha').eq('mascota_id', mascotaId),
      supabase.from('registros_diarios').select('fecha').eq('mascota_id', mascotaId).eq('fue_al_vet', true),
    ])
    const fechas = new Set<string>()
    for (const v of (formales || [])) if (v.fecha) fechas.add(String(v.fecha).slice(0, 10))
    for (const r of (marcadas || [])) if (r.fecha) fechas.add(String(r.fecha).slice(0, 10))
    setVisitasVet(Array.from(fechas).sort())
  }

  async function cargarSignos(mascotaId: string) {
    const { data } = await supabase
      .from('registros_diarios')
      .select('fecha, signos_alerta, signos_alerta_otro')
      .eq('mascota_id', mascotaId)
      .not('signos_alerta', 'is', null)
      .order('fecha', { ascending: false })
    setSignosHistorial((data || []).map((r: any) => ({
      fecha: r.fecha,
      signos: String(r.signos_alerta).split(', ').filter(Boolean),
      otro: r.signos_alerta_otro || null,
    })))
  }

  // Rutinas de cuidado: trae TODO el historial de la mascota (no solo
  // 30 días), pero solo las columnas de fecha + los 22 cuidados
  // booleanos -- así el query queda liviano aunque la mascota tenga
  // meses o años de registros.
  // Vacunas, Antiparasitarios y Medicamentos se pueden agregar de 2
  // formas: marcando el checkbox en Registro Diario (que guarda
  // vacuna_hoy/anti_hoy/medicamento_hoy = true ahí), O agregándolos
  // directo en Prevención (que los guarda en su propia tabla, sin tocar
  // registros_diarios). Para que "cada cuánto" cuente TODAS las veces,
  // sin importar por dónde se agregaron, hay que combinar ambas fuentes
  // para estos 3 cuidados en particular.
  const TABLA_EXTRA: Record<string, { tabla: string; campoFecha: string }> = {
    vacuna_hoy: { tabla: 'vacunas', campoFecha: 'fecha_aplicacion' },
    anti_hoy: { tabla: 'antiparasitarios', campoFecha: 'fecha_aplicacion' },
    medicamento_hoy: { tabla: 'medicamentos', campoFecha: 'fecha_inicio' },
  }

  async function cargarRutinas(mascotaId: string) {
    const columnas = ['fecha', 'alimento_franjas', ...CUIDADOS_RUTINA.map(c => c.columna)].join(', ')
    const [{ data }, { data: vacunasData }, { data: antisData }, { data: medsData }] = await Promise.all([
      supabase.from('registros_diarios').select(columnas).eq('mascota_id', mascotaId).order('fecha', { ascending: true }),
      supabase.from('vacunas').select('fecha_aplicacion').eq('mascota_id', mascotaId),
      supabase.from('antiparasitarios').select('fecha_aplicacion').eq('mascota_id', mascotaId),
      supabase.from('medicamentos').select('fecha_inicio').eq('mascota_id', mascotaId),
    ])
    const historial = (data || []) as any[]
    const fechasExtra: Record<string, string[]> = {
      vacuna_hoy: (vacunasData || []).map((v: any) => v.fecha_aplicacion).filter(Boolean),
      anti_hoy: (antisData || []).map((a: any) => a.fecha_aplicacion).filter(Boolean),
      medicamento_hoy: (medsData || []).map((m: any) => m.fecha_inicio).filter(Boolean),
    }
    const calculadas: RutinaCalculada[] = CUIDADOS_RUTINA
      .map(c => {
        const fechasRegistro = historial.filter(r => r[c.columna]).map(r => r.fecha as string)
        // Combinamos y quitamos duplicados (por si el mismo día quedó
        // marcado en registro diario Y agregado en Prevención).
        const fechas = Array.from(new Set([...fechasRegistro, ...(fechasExtra[c.columna] || [])]))
        const { ocurrencias, promedioDias, ultimaFecha, proximaEstimadaDias } = calcularRutina(fechas)
        if (ocurrencias === 0 || !ultimaFecha) return null
        const hoy = new Date()
        const ultima = new Date(ultimaFecha + 'T00:00:00')
        const diasDesdeUltima = Math.round((hoy.getTime() - ultima.getTime()) / 86400000)
        // Distribución de franjas, solo para Alimentación: cuántos
        // de los días alimentados fueron en la mañana, tarde y noche.
        // Un día puede tener varias franjas, así que los % pueden
        // sumar más de 100 (son proporciones independientes).
        let franjas: RutinaCalculada['franjas'] = null
        if (c.columna === 'alimente_hoy') {
          const diasAlimentado = historial.filter(r => r.alimente_hoy)
          const total = diasAlimentado.length
          if (total > 0) {
            let man = 0, tar = 0, noc = 0
            for (const r of diasAlimentado) {
              const f = String(r.alimento_franjas || '')
              if (f.includes('mañana')) man++
              if (f.includes('tarde')) tar++
              if (f.includes('noche')) noc++
            }
            franjas = {
              mañana: Math.round((man / total) * 100),
              tarde: Math.round((tar / total) * 100),
              noche: Math.round((noc / total) * 100),
              total,
            }
          }
        }
        return {
          columna: c.columna,
          label: c.label,
          emoji: c.emoji,
          grupo: c.grupo,
          frase: c.frase,
          diario: c.diario,
          ocurrencias,
          promedioDias,
          ultimaFecha,
          diasDesdeUltima,
          proximaEstimadaDias,
          franjas,
        }
      })
      .filter(Boolean) as RutinaCalculada[]
    // Ordenar por las que tienen promedio calculado primero (más útiles),
    // y dentro de esas, las que tienen la próxima estimada más próxima
    // primero (lo más "urgente" arriba).
    calculadas.sort((a, b) => {
      if (a.promedioDias === null && b.promedioDias === null) return 0
      if (a.promedioDias === null) return 1
      if (b.promedioDias === null) return -1
    


  return (a.proximaEstimadaDias ?? 999) - (b.proximaEstimadaDias ?? 999)
    })
    setRutinas(calculadas)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').is('archivada_en', null).order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascota(m)
      await cargarRegistros(m.id)
      await cargarRutinas(m.id)
      await cargarSignos(m.id)
    await cargarVisitas(m.id)
    await cargarDatosChat(m.id)
      // Respiración reciente
      const { data: resp } = await supabase
        .from('frecuencia_respiratoria')
        .select('rpm, fecha')
        .eq('mascota_id', m.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      setRespReciente(resp)
      // Temperatura reciente
      const { data: temp } = await supabase
        .from('temperatura_corporal')
        .select('temperatura, fecha')
        .eq('mascota_id', m.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      setTempReciente(temp)
      // Celo activo
      const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
      const { data: ciclosRecientes } = await supabase
        .from('ciclos_reproductivos')
        .select('tipo, fecha_inicio, fecha_termino')
        .eq('mascota_id', m.id)
        .eq('tipo', 'celo')
      const hoy = new Date()
      const celoActivo = (ciclosRecientes || []).find((cc: any) => {
        const inicio = new Date(cc.fecha_inicio + 'T00:00:00')
        if (inicio > hoy) return false
        if (!cc.fecha_termino) return (hoy.getTime() - inicio.getTime()) / 86400000 < 21
        return hoy <= new Date(cc.fecha_termino + 'T00:00:00')
      })
      if (celoActivo) {
        const dia = Math.ceil((hoy.getTime() - new Date(celoActivo.fecha_inicio + 'T00:00:00').getTime()) / 86400000) + 1
        setCeloInfo({ dia })
      }
      setLoading(false)
    }
    init()
  }, [])

  async function cambiarMascota(nueva: any) {
    setLoading(true)
    guardarMascotaActivaId(nueva.id)
    setMascota(nueva)
    await cargarRegistros(nueva.id)
    await cargarRutinas(nueva.id)
    await cargarSignos(nueva.id)
    // Respiración reciente
    const { data: resp } = await supabase
      .from('frecuencia_respiratoria')
      .select('rpm, fecha')
      .eq('mascota_id', nueva.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()
    setRespReciente(resp)
    // Temperatura reciente
    const { data: temp2 } = await supabase
      .from('temperatura_corporal')
      .select('temperatura, fecha')
      .eq('mascota_id', nueva.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()
    setTempReciente(temp2)
    // Celo activo
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const { data: ciclosRecientes } = await supabase
      .from('ciclos_reproductivos')
      .select('tipo, fecha_inicio, fecha_termino')
      .eq('mascota_id', nueva.id)
      .eq('tipo', 'celo')
    const hoy = new Date()
    const celoActivo = (ciclosRecientes || []).find((cc: any) => {
      const inicio = new Date(cc.fecha_inicio + 'T00:00:00')
      if (inicio > hoy) return false
      if (!cc.fecha_termino) return (hoy.getTime() - inicio.getTime()) / 86400000 < 21
      return hoy <= new Date(cc.fecha_termino + 'T00:00:00')
    })
    if (celoActivo) {
      const dia = Math.ceil((hoy.getTime() - new Date(celoActivo.fecha_inicio + 'T00:00:00').getTime()) / 86400000) + 1
      setCeloInfo({ dia })
    } else {
      setCeloInfo(null)
    }
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  const total = registros.length
  const verdes = registros.filter(r => r.estado_dia === 'verde').length
  const amarillos = registros.filter(r => r.estado_dia === 'amarillo').length
  const naranjos = registros.filter(r => r.estado_dia === 'naranjo').length
  const rojos = registros.filter(r => r.estado_dia === 'rojo').length
  const pctBien = total > 0 ? Math.round((verdes / total) * 100) : 0

  // --- Días realmente cubiertos por los registros ---
  // La consulta trae una ventana de 30 días y eso está bien, pero
  // el texto decía "durante los últimos 30 días" incluso a quien
  // empezó ayer. Se mide desde el primer registro que hay hasta hoy.
  // Las fechas se construyen a mediodía para que los cambios de
  // horario de verano no corran el conteo.
  const diasCubiertos = (() => {
    if (registros.length === 0) return 0
    const fechas = registros.map(r => r.fecha).filter(Boolean).sort()
    const primera = new Date(fechas[0] + 'T12:00:00')
    const hoyD = new Date(fechaChile(new Date()) + 'T12:00:00')
    const d = Math.round((hoyD.getTime() - primera.getTime()) / 86400000) + 1
    return Math.max(1, Math.min(30, d))
  })()

  // Con "los" delante, para frases tipo "Durante ___".
  const textoPeriodo =
    diasCubiertos === 0 ? 'el período'
    : diasCubiertos === 1 ? 'el único día registrado'
    : diasCubiertos >= 30 ? 'los últimos 30 días'
    : `los últimos ${diasCubiertos} días`

  // Sin "los", para el encabezado junto al nombre de la mascota.
  const textoPeriodoCorto =
    diasCubiertos === 0 ? 'sin registros aún'
    : diasCubiertos === 1 ? '1 día registrado'
    : diasCubiertos >= 30 ? 'últimos 30 días'
    : `últimos ${diasCubiertos} días`

  // Frecuencia por categoría
  function contarValor(campo: string, valor: string) {
    return registros.filter(r => r[campo] === valor).length
  }
  function modaCampo(campo: string) {
    const vals: Record<string, number> = {}
    registros.forEach(r => { if (r[campo]) vals[r[campo]] = (vals[r[campo]] || 0) + 1 })
    const sorted = Object.entries(vals).sort((a, b) => b[1] - a[1])
    return sorted[0] ? { val: sorted[0][0], count: sorted[0][1] } : null
  }

  // --- Signos de alerta: cálculos sobre TODO el historial ---
  // Conteo de episodios por tipo + última ocurrencia + promedio entre
  // episodios (solo hechos objetivos, sin interpretación clínica).
  const conteoSignos = Object.keys(SIGNOS_LABELS)
    .map(tipo => {
      const fechas = signosHistorial.filter(e => e.signos.includes(tipo)).map(e => e.fecha)
      if (fechas.length === 0) return null
      const { ocurrencias, promedioDias, ultimaFecha } = calcularRutina(fechas)
      const diasDesdeUltima = ultimaFecha ? Math.round((new Date().getTime() - new Date(ultimaFecha + 'T00:00:00').getTime()) / 86400000) : 0
      return { tipo, emoji: SIGNOS_LABELS[tipo].emoji, label: SIGNOS_LABELS[tipo].label, ocurrencias, promedioDias, ultimaFecha, diasDesdeUltima }
    })
    .filter(Boolean) as { tipo: string; emoji: string; label: string; ocurrencias: number; promedioDias: number | null; ultimaFecha: string | null; diasDesdeUltima: number }[]
  conteoSignos.sort((a, b) => b.ocurrencias - a.ocurrencias)
  const signosUltimos30 = signosHistorial.filter(e => {
    const d = new Date(e.fecha + 'T00:00:00')
    const hace30dias = new Date(); hace30dias.setDate(hace30dias.getDate() - 30)
    return d >= hace30dias
  }).length

  // El tipo va explicito: sin el, TypeScript lo deducia de los push()
  // de mas abajo, y eso dejo de alcanzar cuando el chat empezo a LEER
  // los insights para armar sus episodios.
  const insights: { icon: string; text: string; tipo: string }[] = []
  if (total === 0) {
    insights.push({ icon: '🐶', text: `Aún no hay registros. Empieza a registrar las señales de ${mascota?.nombre} para ver tendencias aquí.`, tipo: 'info' })
  } else {
    if (signosUltimos30 > 0) insights.push({ icon: '🚨', text: `${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta en ${textoPeriodo}. Revisa el detalle más abajo y coméntalo con tu veterinario.`, tipo: 'warn' })
    if (pctBien >= 80) insights.push({ icon: '✅', text: `Energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`, tipo: 'good' })
    // --- EPISODIOS CONCRETOS ---
    // Antes esto decía "Se detectaron 8 días con síntomas notables".
    // Un tutor que lee eso no sabe qué pasó, cuándo, ni qué contarle al
    // veterinario. Ahora se nombran los hechos con sus fechas.
    //
    // Los días con síntomas se agrupan en EPISODIOS: días seguidos o
    // separados por uno, porque un malestar de tres días es una cosa
    // distinta a tres malestares sueltos en el mes.
    //
    // Y se muestra la NOTA que escribió la persona junto al síntoma.
    // Eso es lo que convierte "heces con sangre" —que asusta— en
    // "heces con sangre, y anoté que había comido un hueso".
    //
    // No hay interpretación clínica: solo se ordenan los hechos que la
    // propia persona registró.
    const NORMALES: Record<string, string[]> = {
      digestion: ['normal'], heces: ['normal'], apetito: ['normal'], agua: ['normal'],
      energia: ['normal', 'alta', 'muy_alta'], animo: ['normal', 'feliz', 'muy_feliz'],
      movilidad: ['normal'], pelaje: ['brillante', 'normal'], conducta: ['sociable', 'normal'],
      arenero: ['normal'],
    }
    // Etiqueta natural + peso. El peso solo ORDENA dentro del episodio
    // (lo más relevante primero), no gradúa urgencia ni recomienda nada.
    const ETQ: Record<string, [string, number]> = {
      'digestion:vomito': ['vomitó', 10], 'digestion:diarrea': ['diarrea', 10],
      'digestion:nauseas': ['náuseas', 6], 'digestion:gases': ['gases', 2],
      'digestion:mal_aliento': ['mal aliento', 4],
      'heces:con_sangre': ['heces con sangre', 12], 'heces:blandas': ['heces blandas', 7],
      'heces:duras': ['heces duras', 5], 'heces:no_hizo': ['no hizo heces', 6],
      'heces:diarrea': ['diarrea', 10],
      'apetito:nada': ['no comió', 11], 'apetito:menos': ['comió menos', 7],
      'apetito:mas': ['comió más', 2],
      'agua:menos': ['tomó menos agua', 6], 'agua:mas': ['tomó más agua', 4],
      'agua:nada': ['no tomó agua', 10],
      'energia:muy_baja': ['energía muy baja', 10], 'energia:baja': ['energía baja', 7],
      'animo:decaido': ['decaído', 8], 'animo:ansioso': ['ansioso', 5],
      'animo:irritable': ['irritable', 6],
      'movilidad:cojera': ['cojera', 9], 'movilidad:rigidez': ['rigidez', 6],
      'movilidad:dificultad': ['dificultad al moverse', 8],
      'pelaje:rasca': ['se rascó', 4], 'pelaje:lame_exceso': ['se lamió mucho', 5],
      'pelaje:caida': ['caída de pelo', 4],
      'conducta:esconde': ['se escondió', 7], 'conducta:agresivo': ['agresivo', 6],
      'arenero:sangre': ['sangre en la orina', 12], 'arenero:dificultad': ['dificultad al orinar', 11],
    }

    const diasConSintoma = registros
      .filter(r => r.fecha)
      .map(r => {
        const hallazgos: { etq: string; peso: number }[] = []
        for (const [campo, normales] of Object.entries(NORMALES)) {
          const v = r[campo]
          if (v && !normales.includes(v)) {
            const par = ETQ[`${campo}:${v}`]
            hallazgos.push(par
              ? { etq: par[0], peso: par[1] }
              : { etq: String(v).replace(/_/g, ' '), peso: 3 })
          }
        }
        return { fecha: r.fecha as string, hallazgos, nota: (r.nota || '').trim() }
      })
      .filter(d => d.hallazgos.length > 0)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))

    // Agrupar en episodios. Mediodía para que los cambios de horario de
    // verano no corran el conteo de días.
    const episodios: { dias: typeof diasConSintoma }[] = []
    for (const d of diasConSintoma) {
      const ultimo = episodios[episodios.length - 1]
      const finAnterior = ultimo?.dias[ultimo.dias.length - 1]?.fecha
      const separacion = finAnterior
        ? Math.round((new Date(d.fecha + 'T12:00:00').getTime() - new Date(finAnterior + 'T12:00:00').getTime()) / 86400000)
        : 999
      if (ultimo && separacion <= 2) ultimo.dias.push(d)
      else episodios.push({ dias: [d] })
    }

    const MES_EP = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const fmtEp = (f: string) => {
      const d = new Date(f + 'T12:00:00')
      return `${d.getDate()} ${MES_EP[d.getMonth()]}`
    }


    // QUE SE MUESTRA Y QUE NO
    // Un vomito suelto o un dia de rascado son hechos aislados: mostrarlos
    // como hallazgo convierte el resumen en ruido y hace que se deje de
    // leer. Un episodio entra si cumple alguna de estas:
    //   - dura 2 dias o mas (hay continuidad)
    //   - trae algo de peso alto (sangre, no comio, cojera)
    //   - el mismo sintoma se repite 3 veces o mas en el periodo
    const PESO_MINIMO = 7
    const repeticiones = new Map<string, number>()
    for (const d of diasConSintoma) {
      for (const h of d.hallazgos) {
        repeticiones.set(h.etq, (repeticiones.get(h.etq) || 0) + 1)
      }
    }

    const episodiosRelevantes = episodios.filter(ep => {
      if (ep.dias.length >= 2) return true
      const hs = ep.dias[0].hallazgos
      if (hs.some(h => h.peso >= PESO_MINIMO)) return true
      return hs.some(h => (repeticiones.get(h.etq) || 0) >= 3)
    })

    // Los más recientes primero: lo de ayer importa más que lo del mes
    // pasado.
    for (const ep of episodiosRelevantes.slice().reverse()) {
      const primero = ep.dias[0].fecha
      const ultimo = ep.dias[ep.dias.length - 1].fecha
      const titulo = primero === ultimo
        ? `El ${fmtEp(primero)}`
        : `Del ${fmtEp(primero)} al ${fmtEp(ultimo)}`

      // Un mismo síntoma en varios días se nombra una vez.
      const pesos = new Map<string, number>()
      for (const d of ep.dias) {
        for (const h of d.hallazgos) {
          pesos.set(h.etq, Math.max(pesos.get(h.etq) || 0, h.peso))
        }
      }
      const lista = Array.from(pesos.entries()).sort((a, b) => b[1] - a[1]).map(([e]) => e)

      const notas = ep.dias.filter(d => d.nota).map(d => d.nota)
      const textoNotas = notas.length > 0 ? ` 💬 "${notas[notas.length - 1]}"` : ''

      // ¿Se fue al veterinario por esto? Se busca una visita entre el
      // primer día del episodio y hasta una semana después del último.
      // Si la hubo, el episodio deja de ser una alerta abierta: el
      // tutor ya actuó, y decírselo vale más que insistir.
      const limite = new Date(ultimo + 'T12:00:00')
      limite.setDate(limite.getDate() + 7)
      const limiteStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(limite)
      const visita = visitasVet.find(f => f >= primero && f <= limiteStr)
      const textoVisita = visita ? ` ✅ Fuiste al veterinario el ${fmtEp(visita)}.` : ''

      insights.push({
        icon: '🔍',
        text: `${titulo} — ${lista.join(', ')}.${textoNotas}${textoVisita}`,
        tipo: visita ? 'good' : 'warn',
      })
    }
  }

  const ultimos7 = registros.slice(0, 7).reverse()

  // --- RESUMEN INTELIGENTE DEL PERÍODO (plantillas inteligentes) ---
  // Sintetiza el período en un texto interpretativo con estructura de
  // informe: Estado general · Seguimientos · Recomendación. No es IA
  // remota: son reglas que arman frases naturales a partir de los datos
  // reales de la mascota (mismo enfoque que las Rutinas y los Insights).
  const nombreM = mascota?.nombre || 'tu mascota'
  const seguimientosActivos = registros.filter(r => r.seguimiento_lesion).length
  const resumenInteligente: { titulo: string; sintesis: string; estadoLabel: string; estadoIcon: string; estadoColor: string } | null = total === 0 ? null : (() => {
    // Estado general del período: 4 niveles según el semáforo de salud
    // de la app. Prioridad de mayor a menor: signos de alerta rojos >
    // muchos síntomas naranjos > algunos síntomas amarillos > estable.
    // Este estado es la CONCLUSIÓN de una línea; el detalle queda en
    // las tarjetas de abajo (evitamos repetir "coméntalo con tu vet"
    // varias veces).
    let estadoLabel = ''
    let estadoIcon = ''
    let estadoColor = ''
    if (signosUltimos30 > 0) {
      estadoLabel = 'Consulta veterinaria prioritaria'
      estadoIcon = '🔴'
      estadoColor = '#E05252'
    } else if (naranjos >= 3 || rojos >= 2) {
      estadoLabel = 'Seguimiento recomendado'
      estadoIcon = '🟠'
      estadoColor = '#F07A30'
    } else if (naranjos > 0 || rojos > 0 || (amarillos >= 5) || seguimientosActivos > 0) {
      estadoLabel = 'Requiere observación'
      estadoIcon = '🟡'
      estadoColor = '#F5C842'
    } else {
      estadoLabel = 'Estable'
      estadoIcon = '🟢'
      estadoColor = '#4CAF7D'
    }

    // Síntesis: una frase que combina lo esencial del período (días
    // registrados, % de normalidad, síntomas notables y seguimientos).
    // Solo datos observados, sin recomendaciones — las recomendaciones
    // viven en las tarjetas de abajo y no queremos repetirlas aquí.
    const partes: string[] = []
    if (signosUltimos30 > 0 || naranjos + rojos >= 3) {
      partes.push(`Durante ${textoPeriodo} se registraron varios episodios relevantes en ${nombreM}.`)
    } else if (pctBien >= 80) {
      partes.push(`Durante ${textoPeriodo}, ${nombreM} se mantuvo estable: energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`)
    } else if (pctBien >= 50) {
      partes.push(`Durante ${textoPeriodo}, ${nombreM} tuvo altibajos: alrededor del ${pctBien}% de los días se registraron con normalidad.`)
    } else {
      partes.push(`Durante ${textoPeriodo}, la mayoría de los registros de ${nombreM} incluyeron señales que vale la pena revisar.`)
    }
    // Cuantificar síntomas y signos si los hubo
    const detallesNum: string[] = []
    if (signosUltimos30 > 0) detallesNum.push(`${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta`)
    if (naranjos + rojos > 0) detallesNum.push(`${naranjos + rojos} día${naranjos + rojos === 1 ? '' : 's'} con síntomas notables`)
    if (detallesNum.length > 0) {
      partes.push(`Se contaron ${detallesNum.join(' y ')} en el período.`)
    }
    if (seguimientosActivos > 0) {
      partes.push(`Además, hay seguimientos de lesión o recuperación en curso (${seguimientosActivos} registro${seguimientosActivos === 1 ? '' : 's'}).`)
    }
    return {
      titulo: 'Resumen del período',
      sintesis: partes.join(' '),
      estadoLabel,
      estadoIcon,
      estadoColor,
    }
  })()

  // --- Cálculos de Paseo (solo aplica a perros) ---
  const MINUTOS_POR_PASEO: Record<string, number> = {
    no_paseo: 0,
    '10_30min': 20,
    '30min_1h': 45,
    '1_2h': 90,
    '2_4h': 180,
    // tiempo_exacto no está aquí: sus minutos vienen del campo
    // paseo_minutos_exactos del propio registro.
  }
  const esPerro = mascota?.especie === 'Perro'
  // --- Utilidades de mes calendario (zona horaria de Chile) ---
  // Todo lo que dice "este mes" debe ir del día 1 al día de hoy. Usar
  // una ventana móvil de 30 días hacía que el total BAJARA al avanzar
  // los días, porque iba soltando registros por atrás.
  function primerDiaDelMes(anio: number, mes: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}-01`
  }
  // Desplaza un par (año, mes 1-12) por N meses, hacia atrás o adelante.
  function desplazarMes(anio: number, mes: number, delta: number): { anio: number; mes: number } {
    const total = anio * 12 + (mes - 1) + delta
    return { anio: Math.floor(total / 12), mes: (total % 12) + 1 }
  }
  const NOMBRES_MES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const NOMBRES_MES_LARGOS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  // Formato compacto de minutos: 95 → "1h 35m", 40 → "40 min".
  function fmtDuracion(min: number): string {
    if (min <= 0) return '0 min'
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  // Minutos de paseo de un registro: usa el valor EXACTO cuando el
  // usuario lo capturó; si no, cae al promedio del rango. Así el
  // promedio mensual y semanal ganan precisión sin obligar a nadie a
  // usar cronómetro.
  function minutosDePaseo(r: any): number {
    if (typeof r?.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0) {
      return r.paseo_minutos_exactos
    }
    return MINUTOS_POR_PASEO[r?.paseo] || 0
  }
  // --- Paseos del MES CALENDARIO en curso (día 1 → hoy) ---
  const hoyStrPaseo = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const [anioActualP, mesActualP, diaActualP] = hoyStrPaseo.split('-').map(Number)
  const inicioMesActual = primerDiaDelMes(anioActualP, mesActualP)
  const registrosMesActual = paseoHistorial.filter(r => r.fecha >= inicioMesActual && r.fecha <= hoyStrPaseo)
  const minutosPaseoMes = registrosMesActual.reduce((acc, r) => acc + minutosDePaseo(r), 0)
  const horasPaseoMes = Math.floor(minutosPaseoMes / 60)
  const minRestantesPaseoMes = minutosPaseoMes % 60
  const nombreMesActual = NOMBRES_MES_LARGOS[mesActualP - 1]

  // Indicadores del mes. Nota sobre el modelo de datos: el registro
  // diario guarda UN paseo por día, así que lo que se cuenta son
  // DÍAS con paseo (no salidas individuales) y el promedio es por día
  // con paseo. Se etiqueta así para no prometer un dato que no existe.
  // Un día cuenta como "con paseo" si tiene paseo registrado distinto
  // de 'no_paseo' — MISMO criterio que la racha. Antes se exigía que
  // los minutos fueran > 0, y eso descartaba los días marcados con
  // "tiempo exacto" en los que no se alcanzó a elegir la duración
  // (se guardan con paseo_minutos_exactos en null): el paseo ocurrió,
  // pero no sabemos cuánto duró. Con la regla vieja, racha y contador
  // se contradecían.
  const diasConPaseoMes = registrosMesActual.filter(r => r.paseo && r.paseo !== 'no_paseo').length
  // Días en que además SÍ sabemos la duración. El promedio se calcula
  // solo sobre estos: dividir por días de duración desconocida
  // hundiría el promedio con ceros que no son ceros reales.
  const diasConDuracionMes = registrosMesActual.filter(r => minutosDePaseo(r) > 0).length
  const diasSinDuracionMes = diasConPaseoMes - diasConDuracionMes
  const promedioPorDiaConPaseo = diasConDuracionMes > 0 ? Math.round(minutosPaseoMes / diasConDuracionMes) : 0

  // --- Constancia de cuidado del mes (el "anillo") ---
  // NO mide la salud del animal (la app no puede conocerla). Mide
  // cuánto has REGISTRADO y ATENDIDO este mes — un espejo honesto del
  // seguimiento del tutor. Por eso "constancia de cuidado" y no
  // "bienestar": un número de bienestar bajo asustaría sin razón.
  //
  // Pilares medibles; el % se normaliza sobre los que aplican (un gato
  // no se penaliza por no pasear).
  const pilaresConstancia: { label: string; emoji: string; puntos: number; maximo: number; detalle: string; ok: boolean }[] = []

  // Pilar 1 — Registro diario: días registrados sobre días del mes.
  {
    const diasRegistradosMes = new Set(
      registros.filter(r => r.fecha >= inicioMesActual && r.fecha <= hoyStrPaseo).map(r => r.fecha)
    ).size
    const prop = diaActualP > 0 ? Math.min(diasRegistradosMes / diaActualP, 1) : 0
    pilaresConstancia.push({
      label: 'Registro diario', emoji: '📝',
      puntos: Math.round(prop * 40), maximo: 40,
      detalle: `${diasRegistradosMes} de ${diaActualP} días registrados`,
      ok: prop >= 0.6,
    })
  }

  // Pilar 2 — Prevención registrada: ¿hay vacuna y antiparasitario en
  // el historial? Señal honesta de control preventivo. No se afirma
  // "al día" porque Análisis no calcula vencimientos (eso vive en
  // Prevención); afirmarlo sería prometer precisión que aquí no hay.
  {
    const tieneVacunas = rutinas.some(r => r.columna === 'vacuna_hoy')
    const tieneAntis = rutinas.some(r => r.columna === 'anti_hoy')
    const ambos = tieneVacunas && tieneAntis
    pilaresConstancia.push({
      label: 'Prevención registrada', emoji: '🛡️',
      puntos: ambos ? 25 : (tieneVacunas || tieneAntis ? 12 : 0), maximo: 25,
      detalle: ambos ? 'Vacunas y antiparasitarios registrados' : (tieneVacunas || tieneAntis ? 'Falta registrar una prevención' : 'Sin prevención registrada'),
      ok: ambos,
    })
  }

  // Pilar 3 — Rutinas al día: cuántas de las detectadas no están
  // atrasadas (proximaEstimadaDias >= 0).
  {
    const totalRut = rutinas.length
    const alDiaRut = rutinas.filter(r => (r.proximaEstimadaDias ?? 0) >= 0).length
    const prop = totalRut > 0 ? alDiaRut / totalRut : 1
    pilaresConstancia.push({
      label: 'Rutinas al día', emoji: '🔄',
      puntos: Math.round(prop * 20), maximo: 20,
      detalle: totalRut > 0 ? `${alDiaRut} de ${totalRut} rutinas al día` : 'Aún sin rutinas detectadas',
      ok: prop >= 0.6,
    })
  }

  // Pilar 4 — Actividad física (SOLO PERROS): días con paseo del mes.
  if (esPerro) {
    const prop = diaActualP > 0 ? Math.min(diasConPaseoMes / diaActualP, 1) : 0
    pilaresConstancia.push({
      label: 'Actividad física', emoji: '🚶',
      puntos: Math.round(prop * 15), maximo: 15,
      detalle: `${diasConPaseoMes} de ${diaActualP} días con paseo`,
      ok: prop >= 0.5,
    })
  }

  const maximoPosible = pilaresConstancia.reduce((a, p) => a + p.maximo, 0)
  const puntosLogrados = pilaresConstancia.reduce((a, p) => a + p.puntos, 0)
  const constanciaPct = maximoPosible > 0 ? Math.round((puntosLogrados / maximoPosible) * 100) : 0
  const anilloColor = constanciaPct >= 80 ? '#4CAF7D' : constanciaPct >= 55 ? '#F5C842' : '#F07A30'
  const anilloMensaje = constanciaPct >= 80
    ? '¡Excelente constancia este mes!'
    : constanciaPct >= 55
      ? 'Buen seguimiento, con espacio para mejorar.'
      : 'Hay varios cuidados por poner al día.'
  const anilloCirc = 2 * Math.PI * 52
  const anilloOffset = anilloCirc * (1 - constanciaPct / 100)

  // --- Actividad de la semana: paseo + enriquecimiento por día ---
  // Reemplaza el viejo gráfico de "solo paseos, 7 días" por una vista
  // de TODA la estimulación: minutos de paseo y de enriquecimiento
  // apilados. Muestra los últimos 7 días (hoy a la derecha).
  const actividadSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const fechaStr = fechaChile(d)
    const regPaseo = paseoHistorial.find(r => r.fecha === fechaStr)
    const minPaseo = regPaseo ? minutosDePaseo(regPaseo) : 0
    const minEnr = enriqRegistros
      .filter(e => e.fecha === fechaStr)
      .reduce((acc, e) => acc + (e.duracion_min || 0), 0)
    return { fecha: d, minPaseo, minEnr, total: minPaseo + minEnr }
  })
  const maxActividadSemana = Math.max(...actividadSemana.map(a => a.total), 1)
  const totalPaseoSemana = actividadSemana.reduce((a, d) => a + d.minPaseo, 0)
  const totalEnrSemana = actividadSemana.reduce((a, d) => a + d.minEnr, 0)
  let diaMayorPaseo: { fecha: string; minutos: number } | null = null
  for (const r of registrosMesActual) {
    const m = minutosDePaseo(r)
    if (m > 0 && (!diaMayorPaseo || m > diaMayorPaseo.minutos)) diaMayorPaseo = { fecha: r.fecha, minutos: m }
  }

  // --- Comparación de los últimos 6 meses calendario ---
  const mesesComparacion = Array.from({ length: 6 }, (_, i) => {
    const { anio, mes } = desplazarMes(anioActualP, mesActualP, i - 5)
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`
    const minutos = paseoHistorial
      .filter(r => String(r.fecha).startsWith(prefijo))
      .reduce((acc, r) => acc + minutosDePaseo(r), 0)
    return { label: NOMBRES_MES_CORTOS[mes - 1], minutos, esActual: i === 5 }
  })
  const maxMinutosMes = Math.max(...mesesComparacion.map(m => m.minutos), 1)
  // Comparación con el mes anterior (solo si ese mes tuvo actividad,
  // para no comparar contra un mes en que el usuario aún no usaba la
  // app y sacar una conclusión falsa).
  const minutosMesAnterior = mesesComparacion[4]?.minutos || 0
  const difMesAnterior = minutosMesAnterior > 0 ? minutosPaseoMes - minutosMesAnterior : null

  // --- Voz de Chiqui: "Lo que Chiqui aprendió este mes" ---
  // Chiqui es el personaje que aprendió a observar. Aquí HABLA en
  // primera persona sobre lo que notó, adaptando el TONO al mes: cálido
  // y entusiasta cuando todo va bien, sereno y atento cuando hay
  // señales. NUNCA minimiza algo serio con ternura ni regaña cuando
  // baja la actividad. No es un cálculo nuevo: reusa el estado y la
  // síntesis del resumenInteligente y algunas señales de actividad.
  const vozChiqui: { apertura: string; cierre: string; color: string; icono: string } | null =
    !resumenInteligente ? null : (() => {
      const estado = resumenInteligente.estadoIcon // 🟢🟡🟠🔴
      const grave = estado === '🔴' || estado === '🟠'
      // Apertura en primera persona según el tono del mes.
      let apertura = ''
      if (grave) {
        apertura = `Estuve observando de cerca a ${nombreM} este mes.`
      } else if (estado === '🟡') {
        apertura = `Estuve atento a ${nombreM} este mes y quiero contarte lo que noté.`
      } else {
        apertura = `¡Estuve cuidando a ${nombreM} contigo este mes!`
      }
      // Cierre: una conclusión con la actitud correcta para el estado.
      // En meses buenos, si además bajó la actividad, un empujón amable;
      // si todo se mantuvo, reconocimiento sereno.
      let cierre = ''
      if (estado === '🔴') {
        cierre = `Vi varias señales que me gustaría que un veterinario revise pronto. Yo observo, pero ellos son quienes pueden ayudar de verdad. 🐾`
      } else if (estado === '🟠') {
        cierre = `Noté algunas cosas que vale la pena seguir de cerca. Si se repiten, coméntalas en el próximo control. Yo sigo atento contigo. 🐾`
      } else if (estado === '🟡') {
        cierre = `Nada que me preocupe demasiado, pero conviene observar un poco más estos días. Entre los dos lo cuidamos mejor. 🐾`
      } else {
        // Estado estable: modular según actividad si hay datos de paseo.
        if (difMesAnterior !== null && difMesAnterior <= -60) {
          cierre = `Todo se mantuvo tranquilo, aunque este mes salimos a caminar bastante menos que el anterior. ¿Recuperamos esas salidas? A ${nombreM} le encantan. 🐾`
        } else if (difMesAnterior !== null && difMesAnterior >= 60) {
          cierre = `¡Y además nos movimos más que el mes pasado! Se nota que ${nombreM} lo disfruta. Sigamos así. 🐾`
        } else {
          cierre = `${nombreM} se mantuvo estable y con buenas rutinas. Me gusta ver que lo cuidas con constancia. Sigamos observando juntos. 🐾`
        }
      }
      return { apertura, cierre, color: resumenInteligente.estadoColor, icono: estado }
    })()

  // --- Actividad recomendada según tamaño y edad (SOLO PERROS) ---
  // Compara el promedio diario REGISTRADO (paseo + enriquecimiento, 30
  // días) contra un rango orientativo por etapa de vida y tamaño. Se
  // usa en el resumen de Chiqui con tono cuidadoso: nunca afirma que el
  // perro "está sedentario" (medimos lo registrado, no lo real, y la
  // poca actividad puede ser síntoma de dolor, no pereza del tutor).
  const actividadChiqui: { promedioDia: number; min: number; ideal: string; suficiente: boolean; datosSuficientes: boolean } | null = (() => {
    if (!esPerro) return null
    const MIN_PASEO: Record<string, number> = { '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180 }
    const minP = (r: any) => r.paseo === 'tiempo_exacto' && typeof r.paseo_minutos_exactos === 'number'
      ? r.paseo_minutos_exactos : (MIN_PASEO[r.paseo] || 0)
    const inicio30 = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return fechaChile(d) })()
    const totalP = paseoHistorial.filter(r => r.fecha >= inicio30).reduce((a, r) => a + minP(r), 0)
    const totalE = enriqRegistros.filter(e => e.fecha >= inicio30).reduce((a, e) => a + (e.duracion_min || 0), 0)
    // Dividir por los días que REALMENTE cubren los registros, no
    // por 30 fijos. Con 2 días de uso, dividir por 30 daba un
    // promedio 15 veces más bajo que el real.
    const diasParaPromedio = Math.max(1, diasCubiertos)
    const promedioDia = Math.round((totalP + totalE) / diasParaPromedio)
    // Rango orientativo por edad y tamaño (minutos/día). Basado en
    // guías generales de ejercicio canino; NO es un estándar clínico
    // rígido — por eso el mensaje siempre deja espacio a la duda.
    const edadM = mascota?.fecha_nacimiento ? (() => {
      const nac = new Date(mascota.fecha_nacimiento + 'T00:00:00')
      return Math.floor((Date.now() - nac.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    })() : null
    let min = 30
    let ideal = '30 a 60 minutos'
    if (edadM !== null && edadM < 12) {
      // Cachorro: la "regla de 5 min/mes" es orientación popular, no
      // ley. Se usa suave y sin límite superior tajante.
      min = 15
      ideal = 'sesiones cortas de juego varias veces al día'
    } else if (edadM !== null && edadM >= 84) {
      // Senior (7+ años): mantiene necesidad pero suave y adaptada.
      min = 20
      ideal = 'paseos suaves, 20 a 40 minutos'
    } else {
      // Adulto: según tamaño.
      const t = mascota?.tamano_esperado
      if (t === 'muy_pequeno' || t === 'pequeno') { min = 30; ideal = '30 a 45 minutos' }
      else if (t === 'grande' || t === 'gigante') { min = 60; ideal = '1 a 2 horas' }
      else { min = 30; ideal = '30 a 90 minutos' }
    }
    // Aunque el promedio ya quede bien calculado, con 2 o 3 días
    // sigue siendo ruido: un fin de semana sin salir lo parte a la
    // mitad. Bajo 7 días se muestra el número pero no se compara
    // con lo recomendado. Siete es lo mínimo para que entre una
    // semana completa, con días laborales y fin de semana.
    return { promedioDia, min, ideal, suficiente: promedioDia >= min, datosSuficientes: diasCubiertos >= 7 }
  })()

  function diaAnteriorStr(f: string): string {
    const d = new Date(f + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // La racha NO depende del mes ni tiene tope: son días consecutivos
  // con paseo efectivo y el recorrido termina solo al encontrar un
  // hueco. Un registro diario SIN paseo (o con 'no_paseo') no la
  // mantiene: solo cuentan los días en que efectivamente salieron.
  function calcularRachaPaseo(): { racha: number; enRiesgo: boolean } {
    const hoyStr = fechaChile(new Date())
    const fechasConPaseo = new Set(
      paseoHistorial
        .filter((r: any) => r.paseo && r.paseo !== 'no_paseo')
        .map((r: any) => r.fecha as string)
    )
    const tieneHoy = fechasConPaseo.has(hoyStr)
    let cursor = tieneHoy ? hoyStr : diaAnteriorStr(hoyStr)
    let racha = 0
    while (fechasConPaseo.has(cursor)) {
      racha++
      cursor = diaAnteriorStr(cursor)
    }
    return { racha, enRiesgo: !tieneHoy && racha > 0 }
  }
  const { racha: rachaPaseo, enRiesgo: rachaEnRiesgo } = calcularRachaPaseo()

  // --- Racha de juego (gatos) ---
  // Solo cuentan las actividades donde el TUTOR participa. Ventana
  // y rascador las hace el gato solo: son enriquecimiento, pero no
  // vinculo, y la racha mide justamente eso.
  const ACTIVIDADES_VINCULO = ['caza', 'entrenamiento_felino', 'olfato_felino', 'puzzle_comida']
  function calcularRachaJuego(): { racha: number; enRiesgo: boolean } {
    const hoyStr = fechaChile(new Date())
    const fechasConJuego = new Set(
      (enriqHistorial || [])
        .filter((e: any) => ACTIVIDADES_VINCULO.includes(e.actividad))
        .map((e: any) => e.fecha as string)
    )
    // Igual criterio que la racha de paseo: si hoy todavia no hay
    // juego registrado, la racha no se rompe — se cuenta desde ayer
    // y se marca en riesgo hasta que termine el dia.
    const tieneHoy = fechasConJuego.has(hoyStr)
    let cursor = tieneHoy ? hoyStr : diaAnteriorStr(hoyStr)
    let racha = 0
    while (fechasConJuego.has(cursor)) {
      racha++
      cursor = diaAnteriorStr(cursor)
    }
    return { racha, enRiesgo: !tieneHoy && racha > 0 }
  }
  const { racha: rachaJuego, enRiesgo: juegoEnRiesgo } = calcularRachaJuego()

  // --- Normalidad por categoría (últimos 30 días) ---
  const CATEGORIAS_NORMALIDAD = [
    { campo: 'energia', label: 'Energía', icon: '⚡', valoresPositivos: ['muy_alta', 'alta', 'normal'] },
    { campo: 'animo', label: 'Ánimo', icon: '😄', valoresPositivos: ['muy_feliz', 'feliz', 'normal'] },
    { campo: 'apetito', label: 'Apetito', icon: '🍽', valoresPositivos: ['normal'] },
    { campo: 'agua', label: 'Agua', icon: '💧', valoresPositivos: ['normal'] },
    { campo: 'digestion', label: 'Digestión', icon: '🫃', valoresPositivos: ['normal'] },
    { campo: 'heces', label: 'Heces', icon: '💩', valoresPositivos: ['normal'] },
    { campo: 'arenero', label: esPerro ? 'Orina' : 'Arenero', icon: '🚽', valoresPositivos: ['normal'] },
    { campo: 'pelaje', label: 'Pelaje', icon: '✨', valoresPositivos: ['brillante', 'normal'] },
    { campo: 'conducta', label: 'Conducta', icon: '🧠', valoresPositivos: ['sociable', 'normal'] },
    { campo: 'movilidad', label: 'Movilidad', icon: '🦴', valoresPositivos: ['normal'] },
  ]
  const normalidadPorCategoria = CATEGORIAS_NORMALIDAD
    .map(cat => {
      const conValor = registros.filter(r => r[cat.campo])
      if (conValor.length === 0) return null
      const positivos = conValor.filter(r => cat.valoresPositivos.includes(r[cat.campo])).length
      const pct = Math.round((positivos / conValor.length) * 100)
      return { ...cat, pct, dias: conValor.length }
    })
    .filter(Boolean) as { campo: string; label: string; icon: string; pct: number; dias: number }[]
  normalidadPorCategoria.sort((a, b) => a.pct - b.pct)

  function colorNormalidad(pct: number): string {
    if (pct >= 80) return '#4CAF7D'
    if (pct >= 50) return '#F5C842'
    return '#E05252'
  }

  // Estado con semáforo para "próxima estimada" / "días desde".
  // Rutina retrasada = tarjeta con prioridad automática visible en el
  // color, sin necesidad de leer todo el texto.
  function estadoProxima(dias: number | null): { texto: string; color: string; icono: string } {
    if (dias === null) return { texto: '', color: '#8A7560', icono: '' }
    // Atraso. Antes decia "Hace N dias estaba pendiente", en pasado,
    // lo que se lee como algo que ya ocurrio y se resolvio. Significa
    // lo contrario: sigue sin hacerse. Los dos tramos comparten ahora
    // la misma frase y se distinguen solo por color, para que el
    // estado se entienda de un vistazo.
    if (dias < 0) {
      const n = Math.abs(dias)
      const texto = `Van ${n} ${n === 1 ? 'día' : 'días'} de atraso`
      return dias <= -3
        ? { texto, color: '#E05252', icono: '🔴' }
        : { texto, color: '#F07A30', icono: '🟠' }
    }
    if (dias === 0) return { texto: 'Corresponde hoy', color: '#F07A30', icono: '🟠' }
    if (dias === 1) return { texto: 'Te tocaría mañana', color: '#F5C842', icono: '🟡' }
    if (dias <= 3) return { texto: `Te tocaría en ${dias} días`, color: '#F5C842', icono: '🟡' }
    return { texto: `Te tocaría de nuevo en ${dias} días`, color: '#4CAF7D', icono: '🟢' }
  }

  const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  function fmtFechaCorta(f: string): string {
    const d = new Date(f + 'T00:00:00')
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`
  }

  // --- Datos para el chat ---
  // Se arma acá y no en el JSX para que se lea: son bastantes fuentes.
  const MESES_CHAT = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const hoyChat = fechaChile()
  const inicioMesChat = hoyChat.slice(0, 7) + '-01'

  const diasHastaChat = (f: string | null): number | null => {
    if (!f) return null
    // Mediodía: restar días sobre medianoche se cae en los cambios de
    // horario de verano.
    const a = new Date(hoyChat + 'T12:00:00').getTime()
    const b = new Date(String(f).slice(0, 10) + 'T12:00:00').getTime()
    return Math.round((b - a) / 86400000)
  }
  const fmtChat = (f: string | null): string => {
    if (!f) return ''
    const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
    return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`
  }

  // Paseos del MES CALENDARIO, no de 30 días móviles: "este mes" tiene
  // que significar agosto. Se usa paseoHistorial, que ya trae meses
  // completos justamente por esto.
  const paseosDelMes = (paseoHistorial || []).filter((r: any) =>
    r.fecha >= inicioMesChat && r.fecha <= hoyChat && r.paseo && r.paseo !== 'no_paseo'
  )
  const MIN_RANGO_CHAT: Record<string, number> = { '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180 }
  const minutosDelMes = paseosDelMes.reduce((acc: number, r: any) =>
    acc + (typeof r.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0
      ? r.paseo_minutos_exactos
      : (MIN_RANGO_CHAT[r.paseo] || 0)), 0)

  // Cuidados: cuándo fue la última vez y cada cuánto suele hacerse. Las
  // palabras van SIN tildes ni ñ, porque se comparan contra texto
  // normalizado — 'ban' cubre bañé, bañar y baño.
  const CUIDADOS_CHAT: { campo: string; label: string; palabras: string[] }[] = [
    { campo: 'se_bano', label: 'Baño', palabras: ['ban', 'ducha'] },
    // 'una' NO va: esta dentro de "vacUNAs" y respondia el corte de
    // uñas a preguntas de vacunas. El chat ademas revisa vacunas
    // primero, pero mejor no depender solo de eso.
    { campo: 'corte_unas', label: 'Corte de uñas', palabras: ['unas', 'unita', 'garra', 'cortar las'] },
    { campo: 'limpieza_dental', label: 'Limpieza dental', palabras: ['diente', 'dental', 'cepill'] },
    { campo: 'limpieza_oidos', label: 'Limpieza de oídos', palabras: ['oido', 'oreja'] },
    { campo: 'compro_alimento', label: 'Compra de alimento', palabras: ['comida', 'alimento', 'comprar', 'saco', 'croqueta'] },
    { campo: 'cambio_alimento', label: 'Cambio de alimento', palabras: ['cambio de alimento', 'cambiar alimento'] },
    { campo: 'cargo_dispensador', label: 'Dispensador', palabras: ['dispensador'] },
    { campo: 'peino', label: 'Cepillado', palabras: ['peina', 'peino', 'cepillar el pelo'] },
  ]
  const cuidadosChat = CUIDADOS_CHAT.map(c => {
    const fechas = (registros || [])
      .filter((r: any) => r[c.campo])
      .map((r: any) => String(r.fecha).slice(0, 10))
      .sort()
      .reverse()
    if (fechas.length === 0) return null
    const dias = Math.abs(diasHastaChat(fechas[0]) || 0)
    // Cada cuánto: el promedio entre las últimas veces. Con una sola
    // vez registrada no hay intervalo que calcular.
    let cada: number | null = null
    if (fechas.length >= 2) {
      const difs: number[] = []
      for (let i = 0; i < Math.min(fechas.length - 1, 5); i++) {
        const d1 = new Date(fechas[i] + 'T12:00:00').getTime()
        const d2 = new Date(fechas[i + 1] + 'T12:00:00').getTime()
        difs.push(Math.round((d1 - d2) / 86400000))
      }
      const prom = Math.round(difs.reduce((a, b) => a + b, 0) / difs.length)
      if (prom > 0) cada = prom
    }
    return { label: c.label, palabras: c.palabras, diasDesde: dias, cadaCuantos: cada }
  }).filter(Boolean) as { label: string; palabras: string[]; diasDesde: number; cadaCuantos: number | null }[]

  // Señales sueltas, para poder responder por una sola: "¿cuándo
  // vomitó?" tiene que hablar solo de vómito. Se arma con el mismo
  // criterio que los episodios, pero sin agrupar por días.
  const SENALES_CHAT: Record<string, string[]> = {
    digestion: ['normal'], heces: ['normal'], apetito: ['normal'], agua: ['normal'],
    energia: ['normal', 'alta', 'muy_alta'], animo: ['normal', 'feliz', 'muy_feliz'],
    movilidad: ['normal'], pelaje: ['brillante', 'normal'], conducta: ['sociable', 'normal'],
    arenero: ['normal'],
  }
  const ETQ_CHAT: Record<string, string> = {
    'digestion:vomito': 'vomitó', 'digestion:diarrea': 'diarrea', 'digestion:nauseas': 'náuseas',
    'digestion:gases': 'gases', 'digestion:mal_aliento': 'mal aliento',
    'heces:con_sangre': 'heces con sangre', 'heces:blandas': 'heces blandas',
    'heces:duras': 'heces duras', 'heces:no_hizo': 'no hizo heces', 'heces:diarrea': 'diarrea',
    'apetito:nada': 'no comió', 'apetito:menos': 'comió menos', 'apetito:mas': 'comió más',
    'agua:menos': 'tomó menos agua', 'agua:mas': 'tomó más agua', 'agua:nada': 'no tomó agua',
    'energia:muy_baja': 'energía muy baja', 'energia:baja': 'energía baja',
    'animo:decaido': 'decaído', 'animo:ansioso': 'ansioso', 'animo:irritable': 'irritable',
    'movilidad:cojera': 'cojera', 'movilidad:rigidez': 'rigidez',
    'movilidad:dificultad': 'dificultad al moverse',
    'pelaje:rasca': 'se rascó', 'pelaje:lame_exceso': 'se lamió mucho', 'pelaje:caida': 'caída de pelo',
    'conducta:esconde': 'se escondió', 'conducta:agresivo': 'agresivo',
    'arenero:sangre': 'sangre en la orina', 'arenero:dificultad': 'dificultad al orinar',
  }
  const senalesChat: { campo: string; etiqueta: string; fecha: string; fechaISO: string; nota: string }[] = []
  for (const r of (registros || [])) {
    if (!r.fecha) continue
    for (const [campo, normales] of Object.entries(SENALES_CHAT)) {
      const v = (r as any)[campo]
      if (v && !normales.includes(v)) {
        senalesChat.push({
          campo,
          etiqueta: ETQ_CHAT[`${campo}:${v}`] || String(v).replace(/_/g, ' '),
          fecha: fmtChat(r.fecha),
          // La fecha sin formatear, para poder cruzarla con las visitas
          // al veterinario.
          fechaISO: String(r.fecha).slice(0, 10),
          nota: (r.nota || '').trim(),
        })
      }
    }
  }
  // Las más recientes primero: lo de ayer importa más que lo del mes
  // pasado.
  senalesChat.reverse()

  const datosChat = {
    nombre: mascota?.nombre || 'tu mascota',
    especie: mascota?.especie || '',
    // Los episodios salen de los insights: las mismas frases que ya se
    // muestran, sin el ícono.
    // Las mismas frases que ya se muestran en pantalla, sin el ícono.
    episodios: insights.filter(i => i.icon === '🔍').map(i => i.text),
    totalRegistros: total,
    pctBien,
    textoPeriodo,
    paseosMes: esPerro
      ? { cantidad: paseosDelMes.length, minutos: minutosDelMes, nombreMes: MESES_CHAT[Number(hoyChat.slice(5, 7)) - 1] }
      : null,
    peso: pesoChat,
    medicamentos: (medsVigentes || []).map((m: any) => ({
      nombre: m.nombre || 'Medicamento',
      desde: fmtChat(m.fecha_inicio),
    })),
    vacunas: (vacunasChat || []).map((v: any) => ({
      nombre: v.nombre || 'Vacuna',
      proxima: v.proxima_fecha ? fmtChat(v.proxima_fecha) : null,
      dias: diasHastaChat(v.proxima_fecha),
    })),
    antiparasitarios: (antisChat || []).map((a: any) => ({
      nombre: a.nombre || 'Antiparasitario',
      proxima: a.proxima_fecha ? fmtChat(a.proxima_fecha) : null,
      dias: diasHastaChat(a.proxima_fecha),
    })),
    senales: senalesChat,
    // Las visitas ya se cargan para los episodios (script 439): acá se
    // reusan para poder responder "¿cuándo fue al veterinario?".
    visitasVet,
    fmtVisita: fmtChat,
    cuidados: cuidadosChat,
    examenes: (examenesChat || []).map((e: any) => ({
      nombre: e.nombre || e.tipo || e.categoria || 'Examen',
      fecha: fmtChat(e.fecha),
    })),
  }

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center gap-2.5">
        <img src="/chiqui/chiqui_analisis.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
        <div>
          <h1 className="font-heading text-xl font-extrabold">Análisis</h1>
          <p className="text-xs text-[#8A7560]">{mascota?.nombre} · {textoPeriodoCorto}</p>
        </div>
      </div>
      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}

      {/* Chat de Chiqui. Se abre contando los episodios del período y
          responde con dos fuentes: los datos registrados y los Chiqui
          Tips, que ya están escritos y verificados.
          No es una IA, y lo dice al abrirse. */}
      {mascota && total > 0 && (
        <ChiquiChat datos={datosChat} />
      )}
      {/* "Lo que Chiqui aprendió este mes" — el resumen del período
          contado con la voz del personaje. Chiqui abre en primera
          persona, comparte la síntesis de datos y cierra con una
          conclusión cuyo tono se adapta al estado del mes. */}
      {/* "Lo que Chiqui aprendió este mes" se movió al chat, que lo
          cuenta al abrirse y además deja seguir preguntando. */}
      {/* Anillo de constancia de cuidado del mes. Mide seguimiento del
          tutor (registro, prevención, rutinas, actividad), NO la salud
          del animal. Tocable para ver de qué se compone. */}
      {pilaresConstancia.length > 0 && (
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button
            type="button"
            onClick={() => setAbiertoAnillo(v => !v)}
            className="w-full flex items-center gap-4 px-4 py-4 text-left"
          >
            {/* Anillo SVG */}
            <div className="relative flex-shrink-0" style={{ width: '96px', height: '96px' }}>
              <svg width="96" height="96" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#EEE2D4" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={anilloColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={anilloCirc} strokeDashoffset={anilloOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#3D2B1F] leading-none">{constanciaPct}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#3D2B1F]">Constancia de cuidado</p>
              <p className="text-xs text-[#8A7560] mt-0.5 leading-snug">{anilloMensaje}</p>
              <span className="inline-block mt-1.5 text-[11px] font-bold text-[#CD7421]">
                {abiertoAnillo ? 'Ocultar detalle ▾' : 'Ver de qué se compone ›'}
              </span>
            </div>
          </button>
          {abiertoAnillo && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[10px] text-[#8A7560] leading-relaxed">
                Este número refleja tu <span className="font-semibold">seguimiento</span> del mes — cuánto has registrado y atendido — no un diagnóstico de salud.
              </p>
              {pilaresConstancia.map(pilar => (
                <div key={pilar.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: '#FBEAD9' }}>
                  <span className="text-base flex-shrink-0">{pilar.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#3D2B1F]">{pilar.label}</p>
                    <p className="text-[10px] text-[#8A7560]">{pilar.detalle}</p>
                  </div>
                  <span className="text-sm flex-shrink-0">{pilar.ok ? '✅' : '•'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* SECCIÓN ESTADO DE SALUD — contenedor con fondo */}
      {total > 0 && (
      <div className="mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3" style={{ background: '#F0E2CE' }}>
        <div className="px-2 mb-2 pt-1">
          <div className="flex items-center gap-2">
            <img src="/chiqui/chiqui_vet.png" alt="" className="w-7 h-7 object-contain" />
            <h2 className="text-sm font-bold text-[#8C572F] uppercase tracking-wider">Estado de salud</h2>
          </div>
        </div>
        {/* Lo observado este mes — desplegable, cerrado por defecto */}
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden mb-2">
          <button type="button" onClick={() => setAbiertoObservado(v => !v)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left">
            <img src="/chiqui/chiqui_lupa.png" alt="" className="w-9 h-9 object-contain flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">Lo observado este mes</p>
              <p className="text-xs text-[#8A7560]">{total} registros</p>
            </div>
            <span className="text-[#8C572F] text-base font-bold">{abiertoObservado ? '▲' : '▼'}</span>
          </button>
          {abiertoObservado && (
          <div className="border-t border-[#EEE2D4]">
          {insights.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#8A7560]">Cargando insights...</div>
          ) : (
            insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#EEE2D4] last:border-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${ins.tipo === 'good' ? 'bg-[#4CAF7D]/15' : ins.tipo === 'warn' ? 'bg-[#F07A30]/15' : 'bg-[#4AABDB]/15'}`}>
                  {ins.icon}
                </div>
                <p className="text-xs text-[#3D2B1F] leading-relaxed">{ins.text}</p>
              </div>
            ))
          )}
          </div>
          )}
        </div>
        {/* Signos de alerta — episodios por tipo + línea de tiempo, sobre
          todo el historial. Solo registra hechos objetivos informados
          por el tutor; no interpreta clínicamente. */}
      {signosHistorial.length > 0 && (
        <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#E05252]/40 overflow-hidden">
          <button onClick={() => setAbiertaSignos(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🚨</span>
              <div>
                <p className="font-bold text-sm text-[#3D2B1F]">Signos de alerta</p>
                <p className="text-[10px] text-[#8A7560]">{signosHistorial.length} día{signosHistorial.length === 1 ? '' : 's'} con eventos graves en todo el historial</p>
              </div>
            </div>
            <span className="text-[#8C572F] text-base font-bold">{abiertaSignos ? '▲' : '▼'}</span>
          </button>
          {abiertaSignos && (
            <div className="border-t border-[#EEE2D4]">
              {/* Episodios por tipo */}
              <div className="p-4 space-y-3">
                {conteoSignos.map(s => (
                  <div key={s.tipo}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base flex-shrink-0">{s.emoji}</span>
                      <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{s.label}</p>
                      <span className="text-[10px] font-bold text-[#E05252] bg-[#E05252]/10 rounded-full px-2 py-0.5 flex-shrink-0">
                        {s.ocurrencias} episodio{s.ocurrencias === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A7560]">
                      Última vez: hace {s.diasDesdeUltima} {s.diasDesdeUltima === 1 ? 'día' : 'días'}
                      {s.promedioDias !== null ? ` · se repite cada ${s.promedioDias} días aprox.` : ''}
                    </p>
                  </div>
                ))}
              </div>
              {/* Línea de tiempo de eventos */}
              <div className="border-t border-[#EEE2D4] p-4">
                <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">Línea de tiempo</p>
                <div className="relative">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#EEE2D4]" />
                  <div className="space-y-3 pl-7">
                    {signosHistorial.slice(0, 15).map((e, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#E05252] border-2 border-[#FFFCF8]" />
                        <Link href={`/registro-diario?fecha=${e.fecha}`} className="block">
                          <p className="text-[10px] font-bold text-[#E05252] uppercase tracking-wider">{fmtFechaCorta(e.fecha)}</p>
                          <p className="text-xs text-[#3D2B1F] mt-0.5 leading-relaxed">
                            {e.signos.map(s => `${SIGNOS_LABELS[s]?.emoji || '🚨'} ${SIGNOS_LABELS[s]?.label || s}`).join(' · ')}
                            {e.otro ? ` (${e.otro})` : ''}
                          </p>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                {signosHistorial.length > 15 && (
                  <p className="text-[10px] text-[#8A7560] mt-2 italic">Mostrando los 15 eventos más recientes de {signosHistorial.length}.</p>
                )}
                <p className="text-[10px] text-[#8A7560] mt-3 italic">Hechos informados por el tutor. Esta sección no interpreta ni diagnostica — coméntala con tu veterinario.</p>
              </div>
            </div>
          )}
        </div>
      )}
        {/* Normalidad por categoría — desplegable */}
        {(normalidadPorCategoria.length > 0 || respReciente || tempReciente || celoInfo) && (
          <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
            <button onClick={() => setAbiertaNormalidad(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="font-bold text-sm text-[#3D2B1F]">📊 Normalidad por categoría</span>
              <span className="text-[#8C572F] text-base font-bold">{abiertaNormalidad ? '▲' : '▼'}</span>
            </button>
            {abiertaNormalidad && (
              <div className="border-t border-[#EEE2D4] p-4">
                {normalidadPorCategoria.map((cat, i) => (
                  <div key={cat.campo} className={`flex items-center gap-2.5 ${i < normalidadPorCategoria.length - 1 || respReciente || tempReciente || celoInfo ? 'mb-2.5' : ''}`}>
                    <span className="text-sm flex-shrink-0 w-5">{cat.icon}</span>
                    <span className="text-xs text-[#3D2B1F] flex-1">{cat.label}</span>
                    <div className="w-20 h-1.5 bg-[#EEE2D4] rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: colorNormalidad(cat.pct) }} />
                    </div>
                    <span className="text-[11px] text-[#8A7560] w-9 text-right flex-shrink-0">{cat.pct}%</span>
                  </div>
                ))}
                {/* Respiración — último registro del mes */}
                {respReciente && (() => {
                  const rpm = respReciente.rpm
                  const color = rpm < 15 ? '#4AABDB' : rpm < 30 ? '#4CAF7D' : rpm < 40 ? '#F5C842' : '#E05252'
                  const label = rpm < 15 ? 'Muy baja' : rpm < 30 ? 'Normal' : rpm < 40 ? 'Atención' : 'Urgente'
                  return (
                    <div className={`flex items-center gap-2.5 ${tempReciente || celoInfo ? 'mb-2.5' : ''}`}>
                      <span className="text-sm flex-shrink-0 w-5">🫁</span>
                      <span className="text-xs text-[#3D2B1F] flex-1">Frecuencia respiratoria</span>
                      <span className="text-xs font-bold" style={{ color }}>{rpm} rpm</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}20`, color }}>{label}</span>
                    </div>
                  )
                })()}
                {/* Temperatura — último registro del mes */}
                {tempReciente && (() => {
                  const t = tempReciente.temperatura
                  const color = t < 37.5 ? '#4AABDB' : t < 39.3 ? '#4CAF7D' : t < 39.5 ? '#F5C842' : t < 41 ? '#F07A30' : '#E05252'
                  const label = t < 37.5 ? 'Hipotermia' : t < 39.3 ? 'Normal' : t < 39.5 ? 'Atención' : t < 41 ? 'Fiebre' : 'Emergencia'
                  return (
                    <div className={`flex items-center gap-2.5 ${celoInfo ? 'mb-2.5' : ''}`}>
                      <span className="text-sm flex-shrink-0 w-5">🌡</span>
                      <span className="text-xs text-[#3D2B1F] flex-1">Temperatura corporal</span>
                      <span className="text-xs font-bold" style={{ color }}>{t}°C</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}20`, color }}>{label}</span>
                    </div>
                  )
                })()}
                {/* Celo activo */}
                {celoInfo && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm flex-shrink-0 w-5">🌸</span>
                    <span className="text-xs text-[#3D2B1F] flex-1">Ciclo reproductivo</span>
                    <span className="text-xs font-bold text-[#E05252]">Día {celoInfo.dia}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[#FDEAEA] text-[#E05252]">En celo</span>
                  </div>
                )}
                <p className="text-[10px] text-[#8A7560] mt-3 italic">% de días registrados como "Normal" en cada categoría. Signos vitales: último registro.</p>
              </div>
            )}
          </div>
        )}
        {/* Últimos 7 días visual — parte de la sección Estado de salud */}
        <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
          <p className="text-[10px] font-semibold text-[#8A7560] mb-2">Últimos 7 días</p>
          <div className="flex items-end justify-between gap-1 h-16">
            {Array(7).fill(null).map((_, i) => {
              const reg = ultimos7[i]
              const color = reg ? ESTADO_COLOR[reg.estado_dia] : 'rgba(140,87,47,0.08)'
              const d = new Date(); d.setDate(d.getDate() - (6 - i))
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-lg transition-all" style={{ height: reg ? '100%' : '20%', background: color, minHeight: '8px' }}/>
                  <span className="text-[9px] text-[#8A7560]">{d.getDate()}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3">
            {Object.entries(ESTADO_COLOR).map(([e, c]) => (
              <div key={e} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: c }}/>
                <span className="text-[9px] text-[#8A7560] capitalize">{e}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      )}
      {/* JUEGO Y VÍNCULO (solo gatos) — contenedor con fondo.
          Equivalente felino de "Actividad física", pero con otro
          marco: el gato de interior no necesita caminar, necesita
          cazar y que su tutor juegue con él. */}
      {mascota?.especie === 'Gato' && enriqRegistros.length > 0 && (() => {
        const ACT_GATO: Record<string, { emoji: string; label: string }> = {
          caza: { emoji: '🎣', label: 'Sesión de caza' },
          puzzle_comida: { emoji: '🧩', label: 'Comida en puzzle' },
          vertical: { emoji: '🪜', label: 'Alturas y rascador' },
          entrenamiento_felino: { emoji: '🎓', label: 'Entrenamiento' },
          olfato_felino: { emoji: '👃', label: 'Juegos de olfato' },
          ventana: { emoji: '🪟', label: 'Ventana o mirador' },
        }
        const diasConJuego = new Set(enriqRegistros.map(e => e.fecha)).size
        const porAct: Record<string, { sesiones: number; minutos: number }> = {}
        for (const e of enriqRegistros) {
          const a = (porAct[e.actividad] = porAct[e.actividad] || { sesiones: 0, minutos: 0 })
          a.sesiones++
          a.minutos += e.duracion_min || 0
        }
        const ordenadas = Object.entries(porAct).sort((x, y) => y[1].sesiones - x[1].sesiones)
        // La duracion es opcional al registrar, asi que este total
        // puede quedar en 0 aunque si haya habido juego. Por eso va
        // como dato secundario y solo se muestra si hay minutos.
        const minutosTotales = Object.values(porAct).reduce((a, v) => a + v.minutos, 0)
        // Lo que mas disfruta: el detalle mas repetido entre caza y
        // olfato, que son los que hablan de preferencia real.
        const gustos: Record<string, number> = {}
        for (const e of enriqRegistros) {
          if (e.actividad !== 'caza' && e.actividad !== 'olfato_felino') continue
          for (const d of String(e.detalle || '').split(', ').filter(Boolean)) {
            if (d === 'Otro') continue
            gustos[d] = (gustos[d] || 0) + 1
          }
        }
        const favorito = Object.entries(gustos).sort((x, y) => y[1] - x[1])[0]
        // ¿Hubo caza en los últimos 7 días? De eso depende el consejo
        // de la madrugada, que es el beneficio inmediato y concreto.
        const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)
        const desde7 = fechaChile(hace7)
        const cazoEstaSemana = enriqRegistros.some(e => e.actividad === 'caza' && e.fecha >= desde7)
        const fmtMinG = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? (m % 60) + 'm' : ''}`.trim() : `${m} min`
        return (
          <div className="mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3" style={{ background: '#FBEEDD' }}>
            <div className="px-2 mb-2 pt-1">
              <div className="flex items-center gap-2">
                <img src="/chiqui/chiqui_paseo.png" alt="" className="w-7 h-7 object-contain" />
                <h2 className="text-sm font-bold text-[#8C572F] uppercase tracking-wider">Juego y vínculo</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-2">
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🔥</span>
                  <span className="text-[10px] text-[#8A7560]">Racha de juego</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{rachaJuego} {rachaJuego === 1 ? 'día' : 'días'}</div>
                {juegoEnRiesgo && rachaJuego > 0 && (
                  <p className="text-[10px] text-[#F07A30] mt-0.5 font-semibold">⚠️ Juega hoy para mantenerla</p>
                )}
              </div>
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🎲</span>
                  <span className="text-[10px] text-[#8A7560]">Variedad de juego</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{ordenadas.length} <span className="text-xs font-normal text-[#8A7560]">de 6 tipos</span></div>
                <p className="text-[10px] text-[#8A7560] mt-0.5">
                  {diasConJuego} {diasConJuego === 1 ? 'día' : 'días'}{minutosTotales > 0 ? ` · ${fmtMinG(minutosTotales)}` : ''}
                </p>
              </div>
            </div>
            {/* Consejo de la madrugada: el único beneficio inmediato
                y para el tutor que tiene la app. Un gato es cazador
                crepuscular; si no descarga esa energía en la tarde,
                despierta a su tutor de madrugada. */}
            {!cazoEstaSemana && (
              <div className="rounded-2xl bg-[#FFFCF8] border border-[#EEE2D4] px-3 py-2.5 mb-2">
                <p className="text-[11px] text-[#3D2B1F] leading-relaxed">
                  🌙 ¿{mascota?.nombre} te despierta de madrugada? Los gatos cazan al amanecer. Una sesión de caza antes de dormir suele ayudar a que la noche sea más tranquila para los dos.
                </p>
              </div>
            )}
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
              <button type="button" onClick={() => setAbiertoJuegoGato(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                <span className="text-sm">🐾</span>
                <p className="flex-1 text-[11px] font-bold text-[#8C572F]">Actividades de los últimos 30 días</p>
                <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{ordenadas.length}</span>
                <span className="text-[#8C572F] text-sm font-bold">{abiertoJuegoGato ? '▲' : '▼'}</span>
              </button>
              {abiertoJuegoGato && (
                <div className="px-4 pb-3 border-t border-[#EEE2D4] pt-2.5">
                  <div className="space-y-1">
                    {ordenadas.map(([act, datos]) => {
                      const info = ACT_GATO[act] || { emoji: '🐾', label: act }
                      return (
                        <div key={act} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#3D2B1F]">{info.emoji} {info.label}</span>
                          <span className="text-[#8A7560]">
                            {datos.sesiones} {datos.sesiones === 1 ? 'vez' : 'veces'}{datos.minutos > 0 ? ` · ${fmtMinG(datos.minutos)}` : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {favorito && favorito[1] >= 2 && (
                    <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                      <p className="text-[11px] text-[#3D2B1F]">
                        🥇 <span className="font-semibold">Lo que más disfruta:</span> {favorito[0]} ({favorito[1]} {favorito[1] === 1 ? 'vez' : 'veces'})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
      {/* ACTIVIDAD FÍSICA (solo perros) — contenedor con fondo */}
        {esPerro && (
          <div className="mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3" style={{ background: '#FBEEDD' }}>
            <div className="px-2 mb-2 pt-1">
              <div className="flex items-center gap-2">
                <img src="/chiqui/chiqui_paseo.png" alt="" className="w-7 h-7 object-contain" />
                <h2 className="text-sm font-bold text-[#8C572F] uppercase tracking-wider">Actividad física</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-2">
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🔥</span>
                  <span className="text-[10px] text-[#8A7560]">Racha de paseos</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{rachaPaseo} {rachaPaseo === 1 ? 'día' : 'días'}</div>
                {rachaEnRiesgo && rachaPaseo > 0 && (
                  <p className="text-[10px] text-[#F07A30] mt-0.5 font-semibold">⚠️ Pasea hoy para mantenerla</p>
                )}
              </div>
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🕒</span>
                  <span className="text-[10px] text-[#8A7560] capitalize">Paseo en {nombreMesActual}</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{horasPaseoMes}h {minRestantesPaseoMes}m</div>
                {/* Comparación con el mes anterior, solo si ese mes
                    tuvo registros (si no, no hay con qué comparar). */}
                {difMesAnterior !== null && Math.abs(difMesAnterior) >= 15 && (
                  <p className="text-[9px] mt-0.5 font-semibold" style={{ color: difMesAnterior > 0 ? '#4CAF7D' : '#8A7560' }}>
                    {difMesAnterior > 0 ? '↑' : '↓'} {fmtDuracion(Math.abs(difMesAnterior))} vs. mes anterior
                  </p>
                )}
                {/* Si al menos un registro del mes tiene tiempo exacto,
                    dejamos el título limpio; si todos son rangos,
                    avisamos que el total es aproximado. */}
                {registrosMesActual.length > 0 && !registrosMesActual.some(r => typeof r.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0) && (
                  <p className="text-[9px] text-[#8A7560] mt-0.5">≈ Basado en registros aproximados</p>
                )}
              </div>
            </div>
            {/* Comparación mensual: responde "¿estoy paseando más que
                el mes pasado?" mucho mejor que 7 barras sueltas. El
                mes en curso va en canela para distinguir que aún no
                termina — comparar un mes a medias con meses completos
                sería engañoso sin esa señal visual. */}
            <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
              <button type="button" onClick={() => setAbiertoPaseoMes(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                <span className="text-sm">📊</span>
                <p className="flex-1 text-[10px] font-semibold text-[#8A7560]">Historial mensual de paseos</p>
                <span className="text-[#8C572F] text-sm font-bold">{abiertoPaseoMes ? '▲' : '▼'}</span>
              </button>
              {abiertoPaseoMes && (
              <div className="px-4 pb-3">
              <div className="flex items-end justify-between gap-1.5" style={{ height: '84px' }}>
                {mesesComparacion.map((m, i) => {
                  const alturaPx = m.minutos > 0 ? Math.max(Math.round((m.minutos / maxMinutosMes) * 52), 5) : 3
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                      <span className="text-[8px] font-semibold text-[#3D2B1F] leading-none h-3">
                        {m.minutos > 0 ? fmtDuracion(m.minutos) : ''}
                      </span>
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${alturaPx}px`,
                          background: m.minutos > 0 ? (m.esActual ? '#CD7421' : '#FFBD59') : 'rgba(140,87,47,0.08)',
                        }}
                      />
                      <span className="text-[8px] leading-none" style={{ color: m.esActual ? '#CD7421' : '#8A7560', fontWeight: m.esActual ? 700 : 400 }}>
                        {m.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[9px] text-[#8A7560] mt-1.5">El mes en curso (destacado) todavía no termina.</p>
              </div>
              )}
            </div>

            {/* Detalle del mes en curso. Nota de honestidad: el
                registro diario guarda UN paseo por día, así que se
                cuentan días con paseo, no salidas individuales. */}
            {diasConPaseoMes > 0 && (
              <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                <button type="button" onClick={() => setAbiertoDetalleMes(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                  <span className="text-sm">📋</span>
                  <p className="flex-1 text-[10px] font-semibold text-[#8A7560] capitalize">Estadísticas del mes</p>
                  <span className="text-[#8C572F] text-sm font-bold">{abiertoDetalleMes ? '▲' : '▼'}</span>
                </button>
                {abiertoDetalleMes && (
                <div className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                  <div>
                    <p className="text-[9px] text-[#8A7560]">Días con paseo</p>
                    <p className="text-[13px] font-bold text-[#3D2B1F]">{diasConPaseoMes} de {diaActualP}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8A7560]">Promedio por salida</p>
                    <p className="text-[13px] font-bold text-[#3D2B1F]">{fmtDuracion(promedioPorDiaConPaseo)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#8A7560]">Constancia</p>
                    <p className="text-[13px] font-bold text-[#3D2B1F]">{diaActualP > 0 ? Math.round((diasConPaseoMes / diaActualP) * 100) : 0}%<span className="text-[9px] font-normal text-[#8A7560]"> de los días</span></p>
                  </div>
                  {diaMayorPaseo && (
                    <div>
                      <p className="text-[9px] text-[#8A7560]">Día más largo</p>
                      <p className="text-[13px] font-bold text-[#3D2B1F]">
                        {fmtDuracion(diaMayorPaseo.minutos)}
                        <span className="text-[9px] font-normal text-[#8A7560]"> · {Number(diaMayorPaseo.fecha.split('-')[2])} {NOMBRES_MES_CORTOS[Number(diaMayorPaseo.fecha.split('-')[1]) - 1]}</span>
                      </p>
                    </div>
                  )}
                </div>
                {/* Aviso honesto: si hay salidas sin duración, el total
                    del mes las cuenta como cero minutos. Mejor decirlo
                    que dejar que el número parezca más bajo sin razón. */}
                {diasSinDuracionMes > 0 && (
                  <p className="text-[9px] text-[#8A7560] mt-2 leading-relaxed">
                    {diasSinDuracionMes === 1
                      ? 'Hay 1 día con paseo sin duración registrada, así que no suma minutos al total.'
                      : `Hay ${diasSinDuracionMes} días con paseo sin duración registrada, así que no suman minutos al total.`}
                    {' '}Puedes completarla editando esos días.
                  </p>
                )}
                </div>
                )}
              </div>
            )}
            {/* Enriquecimiento y entrenamiento — resumen del período.
                Solo si hay actividades registradas (perros). Muestra
                frecuencia, tiempo por actividad y trucos practicados.
                No inventamos "% de aprendizaje": las sesiones por
                truco son el dato real; el dominio no es medible aún. */}
            {enriqRegistros.length > 0 && (() => {
              const ACT_ENR: Record<string, { emoji: string; label: string }> = {
                juguete_interactivo: { emoji: '🧩', label: 'Juguete interactivo' },
                juego_olfato: { emoji: '👃', label: 'Juegos de olfato' },
                juego_activo: { emoji: '🎾', label: 'Juego activo' },
                entrenamiento: { emoji: '🎓', label: 'Entrenamiento' },
                social_animales: { emoji: '🐶', label: 'Social. con animales' },
                social_personas: { emoji: '👨‍👩‍👧‍👦', label: 'Social. con personas' },
                lugar_nuevo: { emoji: '🌳', label: 'Lugar nuevo' },
                // Actividades felinas (script 327). Sin estas
                // entradas, una fila de gato se renderiza sin
                // nombre ni emoji.
                caza: { emoji: '🎣', label: 'Sesión de caza' },
                puzzle_comida: { emoji: '🧩', label: 'Comida en puzzle' },
                vertical: { emoji: '🪜', label: 'Alturas y rascador' },
                entrenamiento_felino: { emoji: '🎓', label: 'Entrenamiento' },
                olfato_felino: { emoji: '👃', label: 'Juegos de olfato' },
                ventana: { emoji: '🪟', label: 'Ventana o mirador' },
              }
              const diasConEnr = new Set(enriqRegistros.map(e => e.fecha)).size
              // Sesiones y minutos por actividad, ordenado por sesiones.
              const porActividad: Record<string, { sesiones: number; minutos: number }> = {}
              for (const e of enriqRegistros) {
                const a = (porActividad[e.actividad] = porActividad[e.actividad] || { sesiones: 0, minutos: 0 })
                a.sesiones++
                a.minutos += e.duracion_min || 0
              }
              const actividadesOrdenadas = Object.entries(porActividad).sort((x, y) => y[1].sesiones - x[1].sesiones)
              // Detalles por actividad (qué hicieron, dónde, cómo les
              // fue). Vienen de la columna detalle, separados por comas.
              function detallesDe(actividad: string): [string, number][] {
                const cuenta: Record<string, number> = {}
                for (const e of enriqRegistros) {
                  if (e.actividad !== actividad || !e.detalle) continue
                  for (const d of String(e.detalle).split(', ').filter(Boolean)) {
                    cuenta[d] = (cuenta[d] || 0) + 1
                  }
                }
                return Object.entries(cuenta).sort((x, y) => y[1] - x[1])
              }
              const trucosOrdenados = detallesDe('entrenamiento')
              const lugaresVisitados = detallesDe('lugar_nuevo')
              // Lo que más disfruta: el detalle más repetido entre los
              // juegos (olfato y activo), que son los que hablan de
              // preferencia real y no de logística.
              const juegosDetalle: Record<string, number> = {}
              for (const [d, n] of [...detallesDe('juego_olfato'), ...detallesDe('juego_activo')]) {
                if (d === 'Otro') continue
                juegosDetalle[d] = (juegosDetalle[d] || 0) + n
              }
              const favoritoJuego = Object.entries(juegosDetalle).sort((x, y) => y[1] - x[1])[0]
              // Socialización: cómo resultaron las experiencias.
              const experiencias: Record<string, number> = { Positiva: 0, Neutral: 0, 'Difícil': 0 }
              let totalSocial = 0
              for (const e of enriqRegistros) {
                if (e.actividad !== 'social_animales' && e.actividad !== 'social_personas') continue
                totalSocial++
                for (const d of String(e.detalle || '').split(', ').filter(Boolean)) {
                  if (d in experiencias) experiencias[d]++
                }
              }
              // Días desde la última actividad registrada.
              const fechasEnr = enriqRegistros.map(e => e.fecha).sort()
              const ultimaEnr = fechasEnr[fechasEnr.length - 1]
              const diasSinEnr = ultimaEnr
                ? Math.floor((new Date(fechaChile(new Date()) + 'T00:00:00').getTime() - new Date(ultimaEnr + 'T00:00:00').getTime()) / 86400000)
                : null
              const variedad = actividadesOrdenadas.length
              // Interpretación amable — NUNCA un reproche. Si hace días
              // que no hay actividad, se sugiere algo concreto y fácil;
              // si hay buena variedad, se reconoce. El tutor puede estar
              // pasando un mes difícil y la app no está para juzgarlo.
              let interpretacion = ''
              if (diasSinEnr !== null && diasSinEnr >= 10) {
                interpretacion = `Hace ${diasSinEnr} días que no registras actividades de estimulación. Un rato corto de juegos de olfato ya hace diferencia.`
              } else if (variedad >= 4) {
                interpretacion = 'Excelente variedad de actividades este mes — la estimulación mental se nutre justamente de eso.'
              } else if (variedad > 0 && diasConEnr >= 15) {
                interpretacion = 'Muy buena constancia. Sumar otro tipo de actividad puede enriquecer aún más la rutina.'
              } else if (variedad > 0) {
                interpretacion = 'Buen comienzo. La estimulación mental rinde más cuando es frecuente y variada.'
              }
              const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? (m % 60) + 'm' : ''}`.trim() : `${m} min`
              return (
                <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAbiertaEnriq(v => !v)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left"
                  >
                    <img src="/chiqui/chiqui_juguetes.png" alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                    <p className="flex-1 text-[11px] font-bold text-[#8C572F]">Enriquecimiento y entrenamiento</p>
                    <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{diasConEnr}</span>
                    <span className="text-[#8C572F] text-sm font-bold">{abiertaEnriq ? '▲' : '▼'}</span>
                  </button>
                  {abiertaEnriq && (
                  <div className="px-4 pb-3">
                  <p className="text-[11px] text-[#3D2B1F] mb-2">
                    Actividades de estimulación en <span className="font-bold">{diasConEnr} de los últimos 30 días</span>.
                  </p>
                  {/* Interpretación amable del período: reconoce o
                      sugiere, nunca reprocha. */}
                  {interpretacion && (
                    <div className="rounded-xl bg-[#FBEAD9] px-3 py-2 mb-2.5">
                      <p className="text-[11px] text-[#3D2B1F] leading-relaxed">{interpretacion}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {actividadesOrdenadas.map(([act, datos]) => {
                      const info = ACT_ENR[act] || { emoji: '🧠', label: act }
                      return (
                        <div key={act} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#3D2B1F]">{info.emoji} {info.label}</span>
                          <span className="text-[#8A7560]">
                            {datos.sesiones} {datos.sesiones === 1 ? 'vez' : 'veces'}{datos.minutos > 0 ? ` · ${fmtMin(datos.minutos)}` : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Lo que más disfruta: el juego más repetido entre
                      olfato y juego activo. */}
                  {favoritoJuego && favoritoJuego[1] >= 2 && (
                    <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                      <p className="text-[11px] text-[#3D2B1F]">
                        🥇 <span className="font-semibold">Lo que más disfruta:</span> {favoritoJuego[0]} ({favoritoJuego[1]} {favoritoJuego[1] === 1 ? 'vez' : 'veces'})
                      </p>
                    </div>
                  )}
                  {lugaresVisitados.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                      <p className="text-[10px] font-semibold text-[#8A7560] mb-1">
                        🌳 Lugares nuevos ({lugaresVisitados.length} {lugaresVisitados.length === 1 ? 'tipo' : 'tipos'})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lugaresVisitados.map(([l, n]) => (
                          <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFBD59]/20 text-[#3D2B1F] font-medium">
                            {l}{n > 1 ? ` ×${n}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Socialización con semáforo: cómo le fue importa
                      tanto como cuántas veces salió. */}
                  {totalSocial > 0 && (experiencias.Positiva + experiencias.Neutral + experiencias['Difícil']) > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                      <p className="text-[10px] font-semibold text-[#8A7560] mb-1">🐶 Cómo resultaron las socializaciones</p>
                      <div className="flex flex-wrap gap-1.5">
                        {experiencias.Positiva > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#4CAF7D20', color: '#3D2B1F' }}>
                            🟢 {experiencias.Positiva} {experiencias.Positiva === 1 ? 'positiva' : 'positivas'}
                          </span>
                        )}
                        {experiencias.Neutral > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#F5C84220', color: '#3D2B1F' }}>
                            🟡 {experiencias.Neutral} {experiencias.Neutral === 1 ? 'neutral' : 'neutrales'}
                          </span>
                        )}
                        {experiencias['Difícil'] > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#E0525220', color: '#3D2B1F' }}>
                            🔴 {experiencias['Difícil']} {experiencias['Difícil'] === 1 ? 'difícil' : 'difíciles'}
                          </span>
                        )}
                      </div>
                      {experiencias['Difícil'] >= 2 && (
                        <p className="text-[10px] text-[#8A7560] mt-1.5 leading-relaxed">
                          Varias experiencias difíciles seguidas pueden valer una conversación con tu veterinario o un etólogo.
                        </p>
                      )}
                    </div>
                  )}
                  {trucosOrdenados.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                      <p className="text-[10px] font-semibold text-[#8A7560] mb-1">🎓 Trucos practicados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trucosOrdenados.map(([t, n]) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFBD59]/20 text-[#3D2B1F] font-medium">
                            {t} ×{n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                  )}
                </div>
              )
            })()}
{/* Actividad de la semana: paseo + enriquecimiento apilados.
                Da una imagen de toda la estimulación, no solo caminatas.
                Solo se muestra si hubo algo de actividad en la semana. */}
            {(totalPaseoSemana > 0 || totalEnrSemana > 0) && (
              <div className="mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                <button type="button" onClick={() => setAbiertoActSemana(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                  <span className="text-sm">📅</span>
                  <p className="flex-1 text-[10px] font-semibold text-[#8A7560]">Resumen de actividad semanal</p>
                  <span className="text-[#8C572F] text-sm font-bold">{abiertoActSemana ? '▲' : '▼'}</span>
                </button>
                {abiertoActSemana && (
                <div className="px-4 pb-3">
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-[9px] text-[#8A7560]">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#FFBD59' }} />Paseo
                    </span>
                    {esPerro && (
                      <span className="flex items-center gap-1 text-[9px] text-[#8A7560]">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#4AABDB' }} />Enriquecim.
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-end justify-between gap-1.5" style={{ height: '72px' }}>
                  {actividadSemana.map((d, i) => {
                    const diasSemana = ['D','L','M','M','J','V','S']
                    const alturaPaseo = d.minPaseo > 0 ? Math.max(Math.round((d.minPaseo / maxActividadSemana) * 52), 3) : 0
                    const alturaEnr = d.minEnr > 0 ? Math.max(Math.round((d.minEnr / maxActividadSemana) * 52), 3) : 0
                    const esHoy = i === 6
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                        <div className="w-full flex flex-col justify-end items-center" style={{ minHeight: '3px' }}>
                          {/* Enriquecimiento arriba (azul), paseo abajo
                              (dorado): apilados forman el total del día. */}
                          {alturaEnr > 0 && (
                            <div className="w-full rounded-t" style={{ height: `${alturaEnr}px`, background: '#4AABDB' }} />
                          )}
                          {alturaPaseo > 0 && (
                            <div className={`w-full ${alturaEnr > 0 ? '' : 'rounded-t'}`} style={{ height: `${alturaPaseo}px`, background: '#FFBD59' }} />
                          )}
                          {d.total === 0 && <div className="w-full rounded" style={{ height: '3px', background: 'rgba(140,87,47,0.08)' }} />}
                        </div>
                        <span className="text-[8px] leading-none" style={{ color: esHoy ? '#CD7421' : '#8A7560', fontWeight: esHoy ? 700 : 400 }}>
                          {diasSemana[d.fecha.getDay()]}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#EEE2D4]">
                  <p className="text-[10px] text-[#8A7560]">🚶 {fmtDuracion(totalPaseoSemana)} de paseo</p>
                  {esPerro && totalEnrSemana > 0 && <p className="text-[10px] text-[#8A7560]">🧠 {fmtDuracion(totalEnrSemana)} de enriquecimiento</p>}
                </div>
                </div>
                )}
              </div>
            )}

            
          </div>
        )}
      {/* Rutinas de cuidado — cada cuánto, sobre todo el historial.
          Se muestran las 3 más relevantes ordenadas por prioridad
          (retrasadas y próximas a vencer primero); el resto aparece al
          tocar "Ver todas". */}
      {rutinas.length > 0 && (() => {
        // Prioridad: menor "proximaEstimadaDias" primero (negativo =
        // retrasado, luego lo que vence pronto). Las rutinas sin
        // promedio (1 solo registro) van al final.
        const rutinasOrdenadas = rutinas.slice().sort((a, b) => {
          const pa = a.proximaEstimadaDias ?? 99999
          const pb = b.proximaEstimadaDias ?? 99999
          return pa - pb
        })
        // Agrupar por categoría, en el MISMO orden que el registro
        // diario, para que la app se lea igual en todas partes. Dentro
        // de cada grupo se conserva el orden por urgencia.
        const ORDEN_GRUPOS = ['Veterinario y salud', 'Prevención', 'Alimentación', 'Higiene y bienestar', 'Arenero']
        const porGrupo = ORDEN_GRUPOS
          .map(g => ({ grupo: g, items: rutinasOrdenadas.filter(r => r.grupo === g) }))
          .filter(g => g.items.length > 0)
        // Una rutina "necesita atención" si está pendiente o vence hoy
        // (proximaEstimadaDias <= 0). El encabezado del grupo lo indica
        // para que lo urgente se vea aunque el grupo esté cerrado.
        // Los cuidados diarios (alimentación) no cuentan como
        // "pendientes": alimentar una o dos veces al día es normal y no
        // es un atraso. Solo los cuidados periódicos pueden estar
        // vencidos.
        const necesitaAtencion = (r: RutinaCalculada) => {
          // Medicamentos NUNCA cuenta como pendiente aqui. La
          // cadencia inferida no aplica a un tratamiento con pauta
          // medica, y recordar la dosis de hoy ya es tarea del
          // dashboard. Analisis muestra cumplimiento, no urgencia.
          if (r.columna === 'medicamento_hoy') return false
          return !r.diario && (r.proximaEstimadaDias ?? 99999) <= 0
        }
        const renderRutina = (r: RutinaCalculada) => {
          // Medicamentos NO es una rutina. La maquinaria de rutinas
          // infiere "cada cuantos dias" del historial, y eso para un
          // medicamento es falso: la pauta la dio el veterinario, no
          // la costumbre. Decir "cada 4 dias aprox." describe cada
          // cuanto se abrio la app, y "te tocaria en 3 dias" puede
          // contradecir la receta con apariencia de recomendacion.
          //
          // Se muestra el tratamiento tal cual existe: nombre,
          // frecuencia recetada y cumplimiento real.
          if (r.columna === 'medicamento_hoy') {
            return (
              <div key={r.columna} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base flex-shrink-0">{r.emoji}</span>
                  <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{r.label}</p>
                </div>
                {medsVigentes.length === 0 ? (
                  <>
                    <p className="text-xs text-[#3D2B1F] leading-relaxed">
                      Última dosis registrada: hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'}
                    </p>
                    <p className="text-[11px] text-[#8A7560] mt-0.5">{r.ocurrencias} días con dosis registradas</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#8A7560' }}>
                      ✓ Sin tratamientos activos
                    </p>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    {medsVigentes.map((md: any) => {
                      const adh = adherenciaMed(md)
                      const colorAdh = !adh ? '#8A7560' : adh.pct >= 80 ? '#4CAF7D' : adh.pct >= 50 ? '#F5C842' : '#E05252'
                      return (
                        <div key={md.id}>
                          <p className="text-xs font-semibold text-[#3D2B1F]">{md.nombre}</p>
                          <p className="text-[11px] text-[#8A7560]">
                            {md.dosis ? `${md.dosis} · ` : ''}{md.frecuencia || (Number(md.dosis_por_dia) > 1 ? `${md.dosis_por_dia} dosis al día` : '1 dosis al día')}
                            {Number(md.intervalo_dias) > 1 && (
                              <span> · {Number(md.intervalo_dias) === 2 ? 'día por medio' : `cada ${md.intervalo_dias} días`}</span>
                            )}
                          </p>
                          {adh && (
                            <>
                              <div className="h-1.5 rounded-full bg-[#EEE2D4] overflow-hidden mt-1">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, adh.pct)}%`, background: colorAdh }} />
                              </div>
                              <p className="text-[11px] mt-0.5" style={{ color: colorAdh }}>
                                {adh.dadas} de {adh.esperadas} dosis registradas · {adh.pct}%
                              </p>
                            </>
                          )}
                        </div>
                      )
                    })}
                    <p className="text-[10px] text-[#8A7560] italic leading-relaxed">
                      Cuenta las dosis que registraste. Una dosis sin registrar no significa que no se haya dado.
                    </p>
                  </div>
                )}
              </div>
            )
          }
          return (
          <div key={r.columna} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base flex-shrink-0">{r.emoji}</span>
              <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{r.label}</p>
            </div>
            {r.diario ? (
              /* Cuidado diario (alimentación): sin lógica de \"vence\".
                 Muestra si está al día hoy y la frecuencia observada,
                 pero nunca \"pendiente\" — comer una o dos veces al día
                 es lo normal, no un atraso. */
              <>
                <p className="text-xs text-[#3D2B1F] leading-relaxed">
                  {r.diasDesdeUltima === 0
                    ? 'Registrada hoy ✓'
                    : `Última vez: hace ${r.diasDesdeUltima} ${r.diasDesdeUltima === 1 ? 'día' : 'días'}`}
                </p>
                <p className="text-[11px] text-[#8A7560] mt-0.5">{r.ocurrencias} días registrados</p>
                {r.diasDesdeUltima === 0 ? (
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#4CAF7D' }}>🟢 Al día</p>
                ) : r.diasDesdeUltima >= 2 ? (
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#F5C842' }}>🟡 ¿Registraste su comida de hoy?</p>
                ) : null}
                {/* Distribución de franjas (solo alimentación): en qué
                    momento del día suele comer. Útil sobre todo para
                    coordinar cotutores. */}
                {r.franjas && (r.franjas.mañana > 0 || r.franjas.tarde > 0 || r.franjas.noche > 0) && (
                  <div className="mt-2 pt-2 border-t border-[#EEE2D4]">
                    <p className="text-[10px] text-[#8A7560] mb-1.5">¿En qué momento suele comer?</p>
                    <div className="space-y-1">
                      {([
                        { k: 'mañana', emoji: '☀️', label: 'Mañana', pct: r.franjas.mañana },
                        { k: 'tarde', emoji: '🌤️', label: 'Tarde', pct: r.franjas.tarde },
                        { k: 'noche', emoji: '🌙', label: 'Noche', pct: r.franjas.noche },
                      ] as const).map(fr => (
                        <div key={fr.k} className="flex items-center gap-2">
                          <span className="text-[11px] w-16 flex-shrink-0">{fr.emoji} {fr.label}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#EEE2D4' }}>
                            <div className="h-full rounded-full" style={{ width: `${fr.pct}%`, background: '#FFBD59' }} />
                          </div>
                          <span className="text-[10px] text-[#8A7560] w-8 text-right flex-shrink-0">{fr.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : r.promedioDias !== null ? (
              <>
                <p className="text-xs text-[#3D2B1F] leading-relaxed">
                  {r.frase.replace('{cada}', textoCada(r.promedioDias)).replace('{nombre}', mascota?.nombre || 'tu mascota')}
                </p>
                <p className="text-[11px] text-[#8A7560] mt-0.5">
                  Última vez: hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'} · {r.ocurrencias} registros
                </p>
                {(() => {
                  const ep = estadoProxima(r.proximaEstimadaDias)
                  return (
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: ep.color }}>
                      {ep.icono} {ep.texto}
                    </p>
                  )
                })()}
              </>
            ) : (
              <p className="text-xs text-[#8A7560]">
                Solo 1 registro hasta ahora (hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'}) — falta otro para calcular un promedio.
              </p>
            )}
          </div>
          )
        }
        // Nombre corto y emoji para el encabezado de cada grupo.
        const GRUPO_INFO: Record<string, { emoji: string; label: string }> = {
          'Veterinario y salud': { emoji: '🩺', label: 'Veterinario y salud' },
          'Prevención': { emoji: '🛡️', label: 'Prevención' },
          'Alimentación': { emoji: '🍽️', label: 'Alimentación' },
          'Higiene y bienestar': { emoji: '🧼', label: 'Higiene y bienestar' },
          'Arenero': { emoji: '🐱', label: 'Arenero' },
        }
        return (
          <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#EEE2D4]">
              <img src="/chiqui/chiqui_cuidados.png" alt="" className="w-9 h-9 object-contain flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-[#3D2B1F]">Rutinas de cuidado</p>
                <p className="text-[10px] text-[#8A7560]">Agrupadas por tipo · todo el historial</p>
              </div>
            </div>
            {porGrupo.map(({ grupo, items }, gi) => {
              const abierto = gruposRutinaAbiertos.has(grupo)
              const info = GRUPO_INFO[grupo] || { emoji: '📋', label: grupo }
              const cuantasAtencion = items.filter(necesitaAtencion).length
              return (
                <div key={grupo} className={gi > 0 ? 'border-t border-[#EEE2D4]' : ''}>
                  <button
                    onClick={() => setGruposRutinaAbiertos(prev => {
                      const next = new Set(prev)
                      if (next.has(grupo)) next.delete(grupo); else next.add(grupo)
                      return next
                    })}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left"
                  >
                    <span className="text-base flex-shrink-0">{info.emoji}</span>
                    <p className="flex-1 text-xs font-bold text-[#3D2B1F]">{info.label}</p>
                    {/* Contador de rutinas que necesitan atención — se
                        ve aunque el grupo esté cerrado, así lo urgente
                        no queda escondido. */}
                    {cuantasAtencion > 0 && (
                      <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: '#F07A30' }}>
                        {cuantasAtencion} pendiente{cuantasAtencion === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="text-[10px] text-[#8A7560]">{items.length}</span>
                    <span className="text-[#8C572F] text-sm font-bold">{abierto ? '▲' : '▼'}</span>
                  </button>
                  {abierto && (
                    <div className="divide-y divide-[#EEE2D4] border-t border-[#EEE2D4]">
                      {items.map(renderRutina)}
                    </div>
                  )}
                </div>
              )
            })}
            <p className="text-[10px] text-[#8A7560] px-4 py-2.5 italic border-t border-[#EEE2D4]">Calculado sobre todo el historial registrado de {mascota?.nombre}, no solo los últimos 30 días.</p>
          </div>
        )
      })()}
      {total > 0 && <>
        {/* Registros recientes — desplegable */}
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => setAbiertoRecientes(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">📋 Registros recientes</span>
            <span className="text-[#8C572F] text-base font-bold">{abiertoRecientes ? '▲' : '▼'}</span>
          </button>
          {abiertoRecientes && (
            <div className="border-t border-[#EEE2D4]">
              {registros.slice(0, 10).map(r => {
                const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                const d = new Date(r.fecha + 'T00:00:00')
                const color = ESTADO_COLOR[r.estado_dia]
                const labels: Record<string,string> = { verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' }
              

  return (
                  <Link key={r.id} href={`/registro-diario?fecha=${r.fecha}`} className="flex items-center gap-3 px-4 py-3 border-b border-[#EEE2D4] last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{d.getDate()} {MESES[d.getMonth()]}</p>
                      <p className="text-xs mt-0.5" style={{ color }}>{labels[r.estado_dia]}</p>
                      {r.nota && <p className="text-[10px] text-[#8A7560] mt-0.5 italic">{r.nota}</p>}
                    </div>
                    <span className="text-[#8A7560] text-sm flex-shrink-0">›</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </>}
      {total === 0 && (
        <div className="mx-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm text-[#8A7560] mb-4">Empieza a registrar para ver tendencias y análisis aquí.</p>
          <a href="/registro-diario" className="bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-3 rounded-xl text-sm inline-block">
            Registrar hoy →
          </a>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
