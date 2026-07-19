'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
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

// Definición de los 22 cuidados que se pueden calcular como "rutina"
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
const CUIDADOS_RUTINA: { columna: string; label: string; emoji: string; grupo: string; frase: string }[] = [
  { columna: 'fue_al_vet', label: 'Visitas al veterinario', emoji: '🩺', grupo: 'Veterinario y salud', frase: 'Sueles llevar a {nombre} al veterinario {cada}' },
  { columna: 'control_peso', label: 'Controles de peso', emoji: '⚖️', grupo: 'Veterinario y salud', frase: 'Controlas su peso {cada}' },
  { columna: 'procedimiento_cirugia', label: 'Procedimientos o cirugías', emoji: '🏥', grupo: 'Veterinario y salud', frase: 'Se ha registrado un procedimiento o cirugía {cada} aprox.' },
  { columna: 'seguimiento_lesion', label: 'Seguimientos de lesión', emoji: '📸', grupo: 'Veterinario y salud', frase: 'Registras seguimientos de lesión {cada} aprox.' },
  { columna: 'medicamento_hoy', label: 'Medicamentos', emoji: '💊', grupo: 'Prevención', frase: 'Registras medicamentos {cada} aprox.' },
  { columna: 'vacuna_hoy', label: 'Vacunas', emoji: '💉', grupo: 'Prevención', frase: 'Las vacunas se han aplicado {cada} aprox.' },
  { columna: 'anti_hoy', label: 'Antiparasitarios', emoji: '🪱', grupo: 'Prevención', frase: 'Aplicas antiparasitario {cada} aprox.' },
  { columna: 'alimente_hoy', label: 'Alimentación', emoji: '🥘', grupo: 'Alimentación', frase: 'Registras su alimentación {cada}' },
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
  ocurrencias: number
  promedioDias: number | null
  ultimaFecha: string
  diasDesdeUltima: number
  proximaEstimadaDias: number | null
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
  const [abiertaRutinas, setAbiertaRutinas] = useState(false)
  const [signosHistorial, setSignosHistorial] = useState<SignoEvento[]>([])
  const [abiertaSignos, setAbiertaSignos] = useState(false)

  // Misma función que en el dashboard: devuelve la fecha en zona horaria
  // de Chile en vez de UTC, para que el cálculo de racha sea correcto.
  function fechaChile(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date)
  }

  async function cargarRegistros(mascotaId: string) {
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)
    const { data: r } = await supabase
      .from('registros_diarios').select('*')
      .eq('mascota_id', mascotaId)
      .gte('fecha', fechaChile(desde))
      .order('fecha', { ascending: false })
    setRegistros(r || [])
  }

  // Signos de alerta: trae TODO el historial de la mascota (no solo 30
  // días), pero solo las 3 columnas necesarias — así el query queda
  // liviano. Los eventos graves son poco frecuentes pero muy relevantes
  // para detectar recurrencias en el tiempo (ej. convulsiones que se
  // repiten cada cierto período).
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
    const columnas = ['fecha', ...CUIDADOS_RUTINA.map(c => c.columna)].join(', ')
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
        return {
          columna: c.columna,
          label: c.label,
          emoji: c.emoji,
          grupo: c.grupo,
          frase: c.frase,
          ocurrencias,
          promedioDias,
          ultimaFecha,
          diasDesdeUltima,
          proximaEstimadaDias,
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
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascota(m)
      await cargarRegistros(m.id)
      await cargarRutinas(m.id)
      await cargarSignos(m.id)
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

  const insights = []
  if (total === 0) {
    insights.push({ icon: '🐶', text: `Aún no hay registros. Empieza a registrar las señales de ${mascota?.nombre} para ver tendencias aquí.`, tipo: 'info' })
  } else {
    if (signosUltimos30 > 0) insights.push({ icon: '🚨', text: `${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta en los últimos 30 días. Revisa el detalle más abajo y coméntalo con tu veterinario.`, tipo: 'warn' })
    if (pctBien >= 80) insights.push({ icon: '✅', text: `Energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`, tipo: 'good' })
    if (naranjos > 0 || rojos > 0) insights.push({ icon: '👁', text: `Se detectaron ${naranjos + rojos} días con síntomas notables en los últimos ${periodo} días. Vale la pena observar.`, tipo: 'warn' })
    const modaEnerg = modaCampo('energia')
    if (modaEnerg) insights.push({ icon: '⚡', text: `La señal de energía más frecuente fue "${modaEnerg.val.replace(/_/g,' ')}" (${modaEnerg.count} de ${total} días).`, tipo: 'info' })
    const vomitos = contarValor('digestion', 'vomito')
    if (vomitos > 0) insights.push({ icon: '🤮', text: `Se registraron ${vomitos} episodios de vómito. Si se repiten, sería bueno comentarlo con el veterinario.`, tipo: 'warn' })
    const rascado = contarValor('pelaje', 'rasca')
    if (rascado >= 3) insights.push({ icon: '🐾', text: `Noté ${rascado} días con rascado registrado. Quizás sería bueno comentarlo en la próxima consulta veterinaria.`, tipo: 'warn' })
  }

  const ultimos7 = registros.slice(0, 7).reverse()

  // --- RESUMEN INTELIGENTE DEL PERÍODO (plantillas inteligentes) ---
  // Sintetiza el período en un texto interpretativo con estructura de
  // informe: Estado general · Seguimientos · Recomendación. No es IA
  // remota: son reglas que arman frases naturales a partir de los datos
  // reales de la mascota (mismo enfoque que las Rutinas y los Insights).
  const nombreM = mascota?.nombre || 'tu mascota'
  const seguimientosActivos = registros.filter(r => r.seguimiento_lesion).length
  const resumenInteligente: { titulo: string; parrafos: string[] } | null = total === 0 ? null : (() => {
    const parrafos: string[] = []
    // Estado general
    const estadoBase = pctBien >= 80
      ? `Durante los últimos ${periodo} días, ${nombreM} se mantuvo estable. Su energía y ánimo estuvieron normales o positivos en el ${pctBien}% de los días registrados.`
      : pctBien >= 50
        ? `Durante los últimos ${periodo} días, ${nombreM} tuvo altibajos. Alrededor del ${pctBien}% de los días se registraron con normalidad.`
        : `Durante los últimos ${periodo} días se registraron varios días con señales que vale la pena observar en ${nombreM}.`
    let detalle = ''
    if (signosUltimos30 > 0) {
      detalle = ` Se registró ${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta, algo que conviene comentar con tu veterinario.`
    } else if (naranjos + rojos > 0) {
      detalle = ` Hubo ${naranjos + rojos} día${naranjos + rojos === 1 ? '' : 's'} con síntomas notables, sin llegar a signos de alerta.`
    } else if (total >= 3) {
      detalle = ` No se registraron síntomas de alerta en el período.`
    }
    parrafos.push(estadoBase + detalle)
    // Seguimientos
    if (seguimientosActivos > 0) {
      parrafos.push(`Hay seguimientos de lesión o recuperación en curso (${seguimientosActivos} registro${seguimientosActivos === 1 ? '' : 's'} en el período). Revisa la sección de Salud Preventiva para ver su evolución.`)
    }
    // Recomendación
    let recomendacion = ''
    if (signosUltimos30 > 0 || rojos > 0) {
      recomendacion = `Te recomiendo mantener a ${nombreM} en observación y compartir estos registros con tu veterinario en la próxima consulta.`
    } else if (naranjos > 0 || seguimientosActivos > 0) {
      recomendacion = `Continúa observando y registrando cualquier cambio. Tener este historial le da contexto valioso a tu veterinario.`
    } else if (total >= 3) {
      recomendacion = `Todo se ve bien. Sigue registrando con esta constancia para detectar a tiempo cualquier cambio en ${nombreM}.`
    } else {
      recomendacion = `Sigue registrando para que pueda darte una lectura más completa de la salud de ${nombreM}.`
    }
    parrafos.push(recomendacion)
    return { titulo: 'Resumen del período', parrafos }
  })()

  // --- Cálculos de Paseo (solo aplica a perros) ---
  const MINUTOS_POR_PASEO: Record<string, number> = {
    no_paseo: 0,
    '10_30min': 20,
    '30min_1h': 45,
    '1_2h': 90,
    '2_4h': 180,
  }
  const esPerro = mascota?.especie === 'Perro'
  const minutosPaseoMes = registros.reduce((acc, r) => acc + (MINUTOS_POR_PASEO[r.paseo] || 0), 0)
  const horasPaseoMes = Math.floor(minutosPaseoMes / 60)
  const minRestantesPaseoMes = minutosPaseoMes % 60

  function calcularRachaPaseo(): { racha: number; enRiesgo: boolean } {
    const hoy = new Date()
    const hoyStr = fechaChile(hoy)
    const regHoy = registros.find(r => r.fecha === hoyStr)
    const tieneHoy = regHoy && regHoy.paseo && regHoy.paseo !== 'no_paseo'
    const inicio = tieneHoy ? 0 : 1
    let racha = 0
    for (let i = inicio; i < 30; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(fecha.getDate() - i)
      const fechaStr = fechaChile(fecha)
      const reg = registros.find(r => r.fecha === fechaStr)
      if (reg && reg.paseo && reg.paseo !== 'no_paseo') {
        racha++
      } else {
        break
      }
    }
    return { racha, enRiesgo: !tieneHoy && racha > 0 }
  }
  const { racha: rachaPaseo, enRiesgo: rachaEnRiesgo } = calcularRachaPaseo()

  const paseoUltimos7 = Array(7).fill(null).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const fechaStr = fechaChile(d)
    const reg = registros.find(r => r.fecha === fechaStr)
    return { fecha: d, minutos: reg ? (MINUTOS_POR_PASEO[reg.paseo] || 0) : 0 }
  })
  const maxMinutosSemana = Math.max(...paseoUltimos7.map(p => p.minutos), 1)

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

  // Texto amigable para "próxima estimada" / "días desde"
  function textoProxima(dias: number | null): string {
    if (dias === null) return ''
    if (dias < 0) return `Ya pasaron ${Math.abs(dias)} días de lo habitual`
    if (dias === 0) return 'Te tocaría hoy'
    if (dias === 1) return 'Te tocaría mañana'
    return `Te tocaría de nuevo en ${dias} días`
  }

  const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  function fmtFechaCorta(f: string): string {
    const d = new Date(f + 'T00:00:00')
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center gap-2.5">
        <img src="/chiqui/chiqui_analisis.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
        <div>
          <h1 className="font-heading text-xl font-extrabold">Análisis</h1>
          <p className="text-xs text-[#8A7560]">{mascota?.nombre} · últimos 30 días</p>
        </div>
      </div>
      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}
      {/* Resumen inteligente del período — plantillas inteligentes */}
      {resumenInteligente && (
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEE2D4]" style={{ background: 'linear-gradient(135deg, #FFBD5918, #FFFCF8)' }}>
            <img src="/chiqui/chiqui_ia.png" alt="Chiqui IA" className="w-9 h-9 object-contain flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#3D2B1F]">{resumenInteligente.titulo}</p>
              <p className="text-xs text-[#8A7560]">Lo esencial de los últimos {periodo} días</p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {resumenInteligente.parrafos.map((p, i) => (
              <p key={i} className="text-xs text-[#3D2B1F] leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      )}
      {/* Lo observado este mes (insights) */}
      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEE2D4]">
          <img src="/chiqui/chiqui_lupa.png" alt="" className="w-9 h-9 object-contain flex-shrink-0" />
          <div>
            <p className="text-sm font-bold">Lo observado este mes</p>
            <p className="text-xs text-[#8A7560]">{total} registros</p>
          </div>
        </div>
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
      {/* Signos de alerta — episodios por tipo + línea de tiempo, sobre
          todo el historial. Solo registra hechos objetivos informados
          por el tutor; no interpreta clínicamente. */}
      {signosHistorial.length > 0 && (
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#E05252]/40 overflow-hidden">
          <button onClick={() => setAbiertaSignos(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🚨</span>
              <div>
                <p className="font-bold text-sm text-[#3D2B1F]">Signos de alerta</p>
                <p className="text-[10px] text-[#8A7560]">{signosHistorial.length} día{signosHistorial.length === 1 ? '' : 's'} con eventos graves en todo el historial</p>
              </div>
            </div>
            <span className="text-[#8A7560] text-lg">{abiertaSignos ? '⌃' : '⌄'}</span>
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
      {total > 0 && <>
        {/* Normalidad por categoría — desplegable */}
        {(normalidadPorCategoria.length > 0 || respReciente || tempReciente || celoInfo) && (
          <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
            <button onClick={() => setAbiertaNormalidad(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="font-bold text-sm text-[#3D2B1F]">📊 Normalidad por categoría</span>
              <span className="text-[#8A7560] text-lg">{abiertaNormalidad ? '⌃' : '⌄'}</span>
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
      </>}
      {total > 0 && <>
        {/* Últimos 7 días visual */}
        <div className="px-5 mb-2">
          <div className="flex items-center gap-2">
            <img src="/chiqui/chiqui_calendario.png" alt="" className="w-8 h-8 object-contain" />
            <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Últimos 7 días</h2>
          </div>
        </div>
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
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
      </>}
      {total > 0 && <>
        <div className="px-5 mb-2">
          <div className="flex items-center gap-2">
            <img src="/chiqui/chiqui_analisis.png" alt="" className="w-8 h-8 object-contain" />
            <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Resumen del período</h2>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mx-4 mb-4">
          {[
            { label: 'Total', val: total, color: '#3DD6B5' },
            { label: 'Verdes', val: verdes, color: '#4CAF7D' },
            { label: 'Leve', val: amarillos, color: '#F5C842' },
            { label: 'Síntoma', val: naranjos + rojos, color: '#F07A30' },
          ].map(s => (
            <div key={s.label} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
              <div className="font-bold text-lg" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] text-[#8A7560] uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </>}
      {total > 0 && <>
        {/* Paseo (solo perros) */}
        {esPerro && (
          <>
            <div className="px-5 mb-2">
              <div className="flex items-center gap-2">
                <img src="/chiqui/chiqui_paseo.png" alt="" className="w-8 h-8 object-contain" />
                <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Paseo</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mx-4 mb-3">
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
                  <span className="text-sm">⏱️</span>
                  <span className="text-[10px] text-[#8A7560]">Paseo este mes (estimado)</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{horasPaseoMes}h {minRestantesPaseoMes}m</div>
              </div>
            </div>
            <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-[#8A7560]">Últimos 7 días</p>
                <p className="text-[9px] text-[#8A7560] italic">estimado</p>
              </div>
              <div className="flex items-end justify-between gap-1 h-8">
                {paseoUltimos7.map((p, i) => {
                  const diasSemana = ['D','L','M','M','J','V','S']
                  const alturaPct = p.minutos > 0 ? Math.max((p.minutos / maxMinutosSemana) * 100, 12) : 6
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded transition-all"
                        style={{ height: `${alturaPct}%`, background: p.minutos > 0 ? '#FFBD59' : 'rgba(140,87,47,0.08)', minHeight: '3px' }}
                      />
                      <span className="text-[8px] text-[#8A7560]">{diasSemana[p.fecha.getDay()]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </>}
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
        const top = rutinasOrdenadas.slice(0, 3)
        const resto = rutinasOrdenadas.slice(3)
        const visibles = abiertaRutinas ? rutinasOrdenadas : top
        const renderRutina = (r: RutinaCalculada) => (
          <div key={r.columna} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base flex-shrink-0">{r.emoji}</span>
              <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{r.label}</p>
            </div>
            {r.promedioDias !== null ? (
              <>
                <p className="text-xs text-[#3D2B1F] leading-relaxed">
                  {r.frase.replace('{cada}', textoCada(r.promedioDias)).replace('{nombre}', mascota?.nombre || 'tu mascota')}
                </p>
                <p className="text-[11px] text-[#8A7560] mt-0.5">
                  Última vez: hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'} · {r.ocurrencias} registros
                </p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: (r.proximaEstimadaDias ?? 0) < 0 ? '#F07A30' : '#4CAF7D' }}>
                  {textoProxima(r.proximaEstimadaDias)}
                </p>
              </>
            ) : (
              <p className="text-xs text-[#8A7560]">
                Solo 1 registro hasta ahora (hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'}) — falta otro para calcular un promedio.
              </p>
            )}
          </div>
        )
        return (
          <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#EEE2D4]">
              <img src="/chiqui/chiqui_analisis.png" alt="" className="w-9 h-9 object-contain flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-[#3D2B1F]">Rutinas de cuidado</p>
                <p className="text-[10px] text-[#8A7560]">Las más relevantes según todo el historial</p>
              </div>
            </div>
            <div className="divide-y divide-[#EEE2D4]">
              {visibles.map(renderRutina)}
            </div>
            {resto.length > 0 && (
              <button onClick={() => setAbiertaRutinas(v => !v)} className="w-full px-4 py-2.5 text-xs font-bold text-[#CD7421] border-t border-[#EEE2D4]">
                {abiertaRutinas ? 'Ver menos' : `Ver todas las rutinas (${rutinas.length})`}
              </button>
            )}
            {abiertaRutinas && (
              <p className="text-[10px] text-[#8A7560] px-4 py-2.5 italic border-t border-[#EEE2D4]">Calculado sobre todo el historial registrado de {mascota?.nombre}, no solo los últimos 30 días.</p>
            )}
          </div>
        )
      })()}
      {total > 0 && <>
        {/* Registros recientes — desplegable */}
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => setAbiertoRecientes(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">📋 Registros recientes</span>
            <span className="text-[#8A7560] text-lg">{abiertoRecientes ? '⌃' : '⌄'}</span>
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
