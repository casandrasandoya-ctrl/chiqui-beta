import { calcularEtapaVida } from '@/utils/etapaVida'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardContenido from '@/components/DashboardContenido'

function calcEdad(f: string) {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${Math.floor(m / 12)}a`
}
function diasR(f: string) {
  const diff = Math.round((new Date(f + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
  return diff <= 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff < 30 ? `${diff}d` : diff < 365 ? `${Math.round(diff / 30)}m` : `${Math.round(diff / 365)}a`
}

// Colores de semáforo de salud: se mantienen igual, separados de la paleta
// de marca, porque tienen un significado clínico que no debe cambiar.
const EC: Record<string, string> = { verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252' }
const EL: Record<string, string> = { verde: 'Todo al día', amarillo: 'Atención leve', naranjo: 'Síntoma notable', rojo: 'Alerta' }

interface Props {
  searchParams: { mascota?: string }
}

export default async function Dashboard({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Traemos TODAS las mascotas del usuario (liviano: solo lo necesario
  // para el selector), para saber cuales existen y poder elegir cual
  // mostrar como activa.
  const { data: mascotas } = await supabase
    .from('mascotas')
    .select('id, nombre, especie, raza, foto_url')
    .order('created_at', { ascending: true })

  if (!mascotas || !mascotas.length) redirect('/mascota/nueva')

  // La mascota activa es la indicada por el parametro ?mascota=ID en la
  // URL (que el selector del lado del cliente controla), o si no viene
  // ninguna, la primera mascota como respaldo inicial. La logica de
  // "recordar la ultima elegida" vive en el cliente (localStorage), que
  // redirige agregando el parametro si hace falta -- ver DashboardContenido.
  const mascotaIdParam = searchParams?.mascota
  const mascotaActivaResumen = mascotas.find(m => m.id === mascotaIdParam) || mascotas[0]

  // Ahora si, traemos los datos completos SOLO de la mascota activa.
  const { data: mascota } = await supabase
    .from('mascotas')
    .select('*')
    .eq('id', mascotaActivaResumen.id)
    .single()

  if (!mascota) redirect('/mascota/nueva')

  const m = mascota

  // Funcion helper para obtener la fecha actual en zona horaria de Chile
  // (America/Santiago). Usar toISOString() directamente devuelve UTC, lo
  // que en Chile puede ser el dia anterior o siguiente segun la hora --
  // ese era el bug que causaba que la racha de paseos apareciera en 0
  // aunque el registro del dia si estuviera guardado.
  function fechaChile(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date)
  }

  const hoy = fechaChile()

  const [{ data: regHoy }, { data: vacunas }, { data: antis }, { data: obs }, { data: medsConControl }, { data: enfsConRevision }] = await Promise.all([
    supabase.from('registros_diarios').select('estado_dia').eq('mascota_id', m.id).eq('fecha', hoy).single(),
    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('observaciones').select('titulo,fecha_inicio').eq('mascota_id', m.id).eq('estado', 'activa').limit(1),
    supabase.from('medicamentos').select('nombre,proximo_control').eq('mascota_id', m.id).gte('proximo_control', hoy).order('proximo_control').limit(2),
    supabase.from('enfermedades').select('diagnostico,proxima_revision').eq('mascota_id', m.id).gte('proxima_revision', hoy).order('proxima_revision').limit(2),
  ])

  // Calcula "hace cuántos días" a partir de una fecha (texto YYYY-MM-DD).
  function diasDesde(fecha: string): number {
    const hoyDate = new Date(hoy + 'T00:00:00')
    const fechaDate = new Date(fecha + 'T00:00:00')
    return Math.round((hoyDate.getTime() - fechaDate.getTime()) / 86400000)
  }

  // Definición de los 12 cuidados posibles, organizados por grupo (mismo
  // orden que en el registro diario), cada uno con la columna booleana
  // que hay que consultar en registros_diarios.
  const definicionCuidados = [
    { grupo: 'Cuidados básicos', columna: 'fue_al_vet', label: 'Veterinario', emoji: '🩺' },
    { grupo: 'Cuidados básicos', columna: 'se_bano', label: 'Baño', emoji: '🛁' },
    { grupo: 'Cuidados básicos', columna: 'corte_unas', label: 'Corte de uñas', emoji: '✂️' },
    { grupo: 'Cuidados básicos', columna: 'compro_alimento', label: 'Compra de alimento', emoji: '🍖' },
    { grupo: 'Prevención', columna: 'medicamento_hoy', label: 'Medicamento', emoji: '💊' },
    { grupo: 'Prevención', columna: 'vacuna_hoy', label: 'Vacuna', emoji: '💉' },
    { grupo: 'Prevención', columna: 'anti_hoy', label: 'Antiparasitario', emoji: '🪱' },
    { grupo: 'Higiene y bienestar', columna: 'limpieza_dental', label: 'Limpieza dental', emoji: '🦷' },
    { grupo: 'Higiene y bienestar', columna: 'limpieza_oidos', label: 'Limpieza de oídos', emoji: '👂' },
    { grupo: 'Higiene y bienestar', columna: 'tratamiento_dermatologico', label: 'Tratamiento dermatológico', emoji: '🧴' },
    { grupo: 'Alimentación', columna: 'cambio_alimento', label: 'Cambio de alimento', emoji: '🥣' },
    { grupo: 'Alimentación', columna: 'probo_alimento_nuevo', label: 'Alimento nuevo', emoji: '🎁' },
    { grupo: 'Eventos importantes', columna: 'control_peso', label: 'Control de peso', emoji: '⚖️' },
    { grupo: 'Eventos importantes', columna: 'procedimiento_cirugia', label: 'Procedimiento/cirugía', emoji: '🏥' },
    { grupo: 'Eventos importantes', columna: 'seguimiento_lesion', label: 'Seguimiento de lesión', emoji: '📸' },
  ]

  const resultadosCuidados = await Promise.all(
    definicionCuidados.map(d =>
      supabase.from('registros_diarios').select('fecha').eq('mascota_id', m.id).eq(d.columna, true).order('fecha', { ascending: false }).limit(1).maybeSingle()
    )
  )

  const cuidadosRecientes = definicionCuidados
    .map((d, i) => {
      const fecha = resultadosCuidados[i].data?.fecha
      if (!fecha) return null
      return { grupo: d.grupo, label: d.label, emoji: d.emoji, dias: diasDesde(fecha) }
    })
    .filter(Boolean) as { grupo: string; label: string; emoji: string; dias: number }[]

  // Racha de paseos consecutivos (solo para perros). Se calcula sobre
  // los ultimos 30 dias de registros_diarios, contando hacia atras desde
  // hoy y cortando apenas hay un dia sin paseo o sin registro -- misma
  // logica que la racha que ya se muestra en Analisis.
  //
  // LOGICA ESPECIAL: si hoy no se ha registrado todavia, la racha NO
  // se rompe -- se muestra la racha de dias anteriores con un aviso
  // "Pasea hoy para mantener tu racha". Solo se rompe al dia siguiente
  // si ayer tampoco se registro paseo.
  let rachaPaseo: number | null = null
  let rachaEnRiesgo = false // true = no registrado hoy, racha en peligro
  if (m.especie === 'Perro') {
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const { data: registrosPaseo } = await supabase
      .from('registros_diarios')
      .select('fecha, paseo')
      .eq('mascota_id', m.id)
      .gte('fecha', fechaChile(hace30))

    const hoyDate = new Date()
    const hoyStr = fechaChile(hoyDate)
    const regHoyPaseo = registrosPaseo?.find(r => r.fecha === hoyStr)
    const tieneRegistroHoyPaseo = !!regHoyPaseo

    // Si no hay registro hoy, empezar desde ayer para no romper la racha
    const inicioLoop = tieneRegistroHoyPaseo ? 0 : 1
    if (!tieneRegistroHoyPaseo) rachaEnRiesgo = true

    let racha = 0
    for (let i = inicioLoop; i < 30; i++) {
      const fecha = new Date(hoyDate)
      fecha.setDate(fecha.getDate() - i)
      const fechaStr = fechaChile(fecha)
      const reg = registrosPaseo?.find(r => r.fecha === fechaStr)
      if (reg && reg.paseo && reg.paseo !== 'no_paseo') {
        racha++
      } else {
        break
      }
    }
    rachaPaseo = racha
  }

  // Racha de REGISTROS DIARIOS consecutivos (cualquier registro, no solo paseos)
  // Misma lógica: si hoy no registró aún, no se rompe — se cuenta desde ayer
  let rachaRegistros = 0
  {
    const { data: ultimosRegistros } = await supabase
      .from('registros_diarios')
      .select('fecha')
      .eq('mascota_id', m.id)
      .order('fecha', { ascending: false })
      .limit(60)
    const fechasRegistro = new Set((ultimosRegistros || []).map((r: any) => r.fecha))
    const tieneHoy = fechasRegistro.has(hoy)
    const inicio = tieneHoy ? 0 : 1
    for (let i = inicio; i < 60; i++) {
      const d = new Date(new Date(hoy + 'T00:00:00').getTime() - i * 86400000)
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)
      if (fechasRegistro.has(f)) rachaRegistros++
      else break
    }
  }

  // Detectar si la mascota está en celo hoy
  let celoActivoHoy = false
  let diaCeloHoy = 0
  if (m.sexo === 'Hembra' && m.seguimiento_reproductivo && !m.castrado) {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const { data: ciclosHoy } = await supabase
      .from('ciclos_reproductivos')
      .select('tipo, fecha_inicio, fecha_termino')
      .eq('mascota_id', m.id)
      .eq('tipo', 'celo')
      .gte('fecha_inicio', fechaChile(hace30))
    const hoy = new Date()
    const celoEnCurso = (ciclosHoy || []).find((cc: any) => {
      const inicio = new Date(cc.fecha_inicio + 'T00:00:00')
      if (inicio > hoy) return false
      const maxDias = m.especie === 'Gato' ? 14 : 21
      if (!cc.fecha_termino) return (hoy.getTime() - inicio.getTime()) / 86400000 < maxDias
      return hoy <= new Date(cc.fecha_termino + 'T00:00:00')
    })
    if (celoEnCurso) {
      celoActivoHoy = true
      diaCeloHoy = Math.ceil((hoy.getTime() - new Date(celoEnCurso.fecha_inicio + 'T00:00:00').getTime()) / 86400000) + 1
    }
  }

  const color = regHoy?.estado_dia ? EC[regHoy.estado_dia] : '#4CAF7D'
  const estadoLabel = regHoy?.estado_dia ? EL[regHoy.estado_dia] : 'Sin registro hoy'

  const proximaVacuna = vacunas?.[0]
  const proximoAnti = antis?.[0]
  const obsActiva = obs?.[0]
  const proximoMed = medsConControl?.[0]
  const proximaRevisionEnf = enfsConRevision?.[0]

  const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)

  // Revision corporal: consultar la ultima para saber si corresponde
  // mostrar el recordatorio segun la etapa de vida.
  // Adulto/Adulto Maduro: cada 90 dias | Senior: cada 30 dias
  let mostrarRevisionCorporal = false
  let diasParaRevision = 0
  if (etapa && etapa.anos >= 5) {
    const intervalo = etapa.nombre === 'Senior' ? 30 : 90
    const { data: ultimaRevision } = await supabase
      .from('revisiones_corporales')
      .select('fecha')
      .eq('mascota_id', m.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!ultimaRevision) {
      mostrarRevisionCorporal = true
      diasParaRevision = 0
    } else {
      const diasDesdeUltima = Math.floor(
        (new Date().getTime() - new Date(ultimaRevision.fecha + 'T00:00:00').getTime())
        / (1000 * 60 * 60 * 24)
      )
      diasParaRevision = intervalo - diasDesdeUltima
      mostrarRevisionCorporal = diasDesdeUltima >= intervalo
    }
  }

  // Calcular prediccion del proximo celo para hembras con historial
  let proximoCeloFecha: string | null = null
  if (m.sexo === 'Hembra' && m.seguimiento_reproductivo !== false && !m.castrado) {
    const { data: celosHistorial } = await supabase
      .from('ciclos_reproductivos')
      .select('fecha_inicio')
      .eq('mascota_id', m.id)
      .eq('tipo', 'celo')
      .order('fecha_inicio', { ascending: true })
    const celos = (celosHistorial || []).filter((c: any) => c.fecha_inicio)
    if (celos.length >= 2) {
      const intervalos: number[] = []
      for (let i = 1; i < celos.length; i++) {
        const ant = new Date(celos[i-1].fecha_inicio + 'T00:00:00')
        const act = new Date(celos[i].fecha_inicio + 'T00:00:00')
        const dias = Math.round((act.getTime() - ant.getTime()) / 86400000)
        if (dias > 30 && dias < 400) intervalos.push(dias)
      }
      if (intervalos.length > 0) {
        const prom = Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length)
        const ultimo = new Date(celos[celos.length-1].fecha_inicio + 'T00:00:00')
        const proximo = new Date(ultimo.getTime() + prom * 86400000)
        if (proximo > new Date()) {
          proximoCeloFecha = proximo.toISOString().split('T')[0]
        }
      }
      // Sin historial suficiente: estimar según especie
      // Perras: ~180 días (6 meses), Gatas: ~21 días (3 semanas)
      // Solo si hay al menos 1 celo registrado y no calculamos predicción
      if (intervalos.length === 0 && celos.length >= 1 && !proximoCeloFecha) {
        const diasEspecie = m.especie === 'Gato' ? 21 : 180
        const ultimo = new Date(celos[celos.length-1].fecha_inicio + 'T00:00:00')
        const proximo = new Date(ultimo.getTime() + diasEspecie * 86400000)
        if (proximo > new Date()) {
          proximoCeloFecha = proximo.toISOString().split('T')[0]
        }
      }
    }
  }

  // Tarjetas de "Próximos" en formato grid 2x2. Se incluye solo si hay
  // datos reales -- si no hay ninguno, no se muestra la sección entera.
  const proximosItems = [
    // Revision corporal periodica (desde los 5 anos)
    mostrarRevisionCorporal && {
      label: 'Revisión corporal',
      sub: etapa?.nombre === 'Senior' ? 'Cada 30 días' : 'Cada 3 meses',
      dias: '🔍',
      color: '#8C572F',
      url: `/revision-corporal?mascotaId=${m.id}&nombre=${encodeURIComponent(m.nombre)}`,
    },
    // Si la mascota es Adulto Maduro o Senior, agregar automaticamente
    // el recordatorio de chequeo preventivo.
    (etapa?.alertaChequeo) && {
      label: 'Chequeo preventivo', sub: etapa.nombre === 'Senior' ? 'Cada 6 meses' : 'Cada 6-12 meses', dias: '⚕️', color: '#8C572F',
    },
    proximaVacuna && {
      label: 'Vacunas', sub: proximaVacuna.nombre, dias: diasR(proximaVacuna.proxima_fecha), color: '#3B8C5E',
    },
    proximoAnti && {
      label: 'Antiparasitarios', sub: proximoAnti.nombre, dias: diasR(proximoAnti.proxima_fecha), color: '#CD7421',
    },
    proximoMed && {
      label: 'Medicamentos', sub: proximoMed.nombre, dias: diasR(proximoMed.proximo_control), color: '#4AABDB',
    },
    proximaRevisionEnf && {
      label: 'Enfermedades', sub: proximaRevisionEnf.diagnostico, dias: diasR(proximaRevisionEnf.proxima_revision), color: '#E05252',
    },
    // Proximo celo estimado (solo hembras con 2+ celos registrados)
    proximoCeloFecha && {
      label: 'Próximo celo', sub: 'Estimado según historial', dias: diasR(proximoCeloFecha), color: '#E05252',
    },
  ].filter(Boolean) as { label: string; sub: string; dias: string; color: string; url?: string }[]

  const edad = m.fecha_nacimiento ? calcEdad(m.fecha_nacimiento) : null

  return (
    <DashboardContenido
      mascotas={mascotas}
      mascota={m}
      edad={edad}
      color={color}
      estadoLabel={estadoLabel}
      obsActiva={obsActiva}
      proximosItems={proximosItems}
      tieneRegistroHoy={!!regHoy}
      cuidadosRecientes={cuidadosRecientes}
      rachaPaseo={rachaPaseo}
        rachaRegistros={rachaRegistros}
        rachaEnRiesgo={rachaEnRiesgo}
        celoActivoHoy={celoActivoHoy}
        diaCeloHoy={diaCeloHoy}
    />
  )
}
