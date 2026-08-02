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
    .is('archivada_en', null)
    .order('created_at', { ascending: true })

  if (!mascotas || !mascotas.length) redirect('/bienvenida')

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

  // Dia anterior a una fecha YYYY-MM-DD. Se construye a MEDIODIA para
  // que los cambios de horario de verano (Chile los tiene dos veces al
  // ano) no desplacen el dia al restar 24 horas.
  function diaAnteriorStr(f: string): string {
    const d = new Date(f + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Cuenta dias consecutivos hacia atras desde `desde`, SIN TOPE: el
  // recorrido termina solo cuando encuentra un hueco. Antes cada racha
  // tenia su propio limite artificial (30, 60, 200 dias segun donde se
  // calculara), asi que una racha larga se veia truncada y ademas
  // distinta en cada pantalla.
  function contarRachaConsecutiva(fechasValidas: Set<string>, desde: string): number {
    let racha = 0
    let cursor = desde
    while (fechasValidas.has(cursor)) {
      racha++
      cursor = diaAnteriorStr(cursor)
    }
    return racha
  }

  const [{ data: regHoy }, { data: vacunas }, { data: antis }, { data: obs }, { data: medsConControl }, { data: enfsConRevision }, { data: visitasVet }] = await Promise.all([
    supabase.from('registros_diarios').select('estado_dia').eq('mascota_id', m.id).eq('fecha', hoy).single(),
    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('observaciones').select('id,titulo,fecha_inicio').eq('mascota_id', m.id).eq('estado', 'activa').limit(10),
    supabase.from('medicamentos').select('nombre,proximo_control,fecha_fin').eq('mascota_id', m.id).eq('estado', 'activo').gte('proximo_control', hoy).order('proximo_control').limit(5),
    supabase.from('enfermedades').select('diagnostico,proxima_revision').eq('mascota_id', m.id).gte('proxima_revision', hoy).order('proxima_revision').limit(2),
    supabase.from('visitas_veterinarias').select('id,fecha,tipo,motivo,veterinario').eq('mascota_id', m.id).gte('fecha', hoy).order('fecha').limit(5),
  ])

  // Calcula "hace cuántos días" a partir de una fecha (texto YYYY-MM-DD).
  function diasDesde(fecha: string): number {
    const hoyDate = new Date(hoy + 'T00:00:00')
    const fechaDate = new Date(fecha + 'T00:00:00')
    return Math.round((hoyDate.getTime() - fechaDate.getTime()) / 86400000)
  }

  // --- Seguimientos pendientes (novedad, ya no tarjeta fija) ---
  // Para cada observación ACTIVA, la "última actualización" es su
  // evolución más reciente (o la fecha de inicio si no tiene ninguna).
  // Si lleva 15+ días sin actualizar, el sistema de Novedades pedirá
  // acción; al registrar una evolución, el contador se reinicia solo.
  let evolucionesObs: { observacion_id: string; fecha: string }[] = []
  const idsObs = (obs || []).map((o: any) => o.id as string)
  if (idsObs.length > 0) {
    const { data: evos } = await supabase
      .from('observacion_evoluciones')
      .select('observacion_id,fecha')
      .in('observacion_id', idsObs)
    evolucionesObs = (evos || []) as { observacion_id: string; fecha: string }[]
  }
  const DIAS_SEGUIMIENTO = 15
  const seguimientosPendientes = (obs || [])
    .map((o: any) => {
      const fechasEvos = evolucionesObs.filter(e => e.observacion_id === o.id).map(e => e.fecha)
      const ultimaFecha = fechasEvos.length > 0 ? fechasEvos.sort().reverse()[0] : o.fecha_inicio
      return { id: o.id as string, titulo: o.titulo as string, diasSinActualizar: diasDesde(ultimaFecha) }
    })
    .filter(sg => sg.diasSinActualizar >= DIAS_SEGUIMIENTO)

  // --- Recordatorios inteligentes: días desde el último registro CON
  // dato de cada campo clave. null = ese campo nunca se ha registrado
  // (a un usuario nuevo no se le recuerda algo que nunca ha usado; el
  // hábito general lo cubre la novedad "Aún no has registrado hoy").
  const [{ data: regCampos }, { data: ultimoPesoReg }] = await Promise.all([
    supabase.from('registros_diarios').select('fecha,apetito,agua,heces').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(60),
    supabase.from('historial_peso').select('fecha').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(1),
  ])
  function diasDesdeUltimoCampo(campo: 'apetito' | 'agua' | 'heces'): number | null {
    const conDato = (regCampos || []).find((r: any) => r[campo] !== null && r[campo] !== undefined && r[campo] !== '')
    return conDato ? diasDesde(conDato.fecha) : null
  }
  const diasSinCampo = {
    apetito: diasDesdeUltimoCampo('apetito'),
    agua: diasDesdeUltimoCampo('agua'),
    heces: diasDesdeUltimoCampo('heces'),
    peso: ultimoPesoReg && ultimoPesoReg[0]?.fecha ? diasDesde(ultimoPesoReg[0].fecha) : null,
  }

  // --- Medicamentos activos: si hay al menos uno y HOY aún no se
  // marcó "medicamento_hoy" en el registro, la novedad correspondiente
  // pregunta al tutor si se lo dio. Estado activo es DERIVADO: no
  // basta con estado='activo' en la base — si fecha_fin ya pasó, el
  // tratamiento terminó aunque el campo no se haya actualizado.
  const { data: medsActivosRaw } = await supabase
    .from('medicamentos')
    .select('id,nombre,frecuencia,fecha_fin,dosis_por_dia')
    .eq('mascota_id', m.id)
    .eq('estado', 'activo')
  const medsActivos = (medsActivosRaw || []).filter((med: any) =>
    !med.fecha_fin || med.fecha_fin >= hoy
  )
  // Tomas de HOY por cada medicamento activo. Ahora que un
  // medicamento puede tener varias dosis por día, un medicamento se
  // considera "completo" solo cuando cumplió TODAS sus dosis del día.
  const idsActivos = medsActivos.map((m: any) => m.id as string)
  let tomasHoyPorMed: Record<string, number> = {}
  if (idsActivos.length > 0) {
    const { data: tomasHoy } = await supabase
      .from('medicamento_tomas')
      .select('medicamento_id')
      .eq('mascota_id', m.id)
      .eq('fecha', hoy)
    for (const t of ((tomasHoy || []) as { medicamento_id: string }[])) {
      tomasHoyPorMed[t.medicamento_id] = (tomasHoyPorMed[t.medicamento_id] || 0) + 1
    }
  }
  const medicamentosPendientesHoy = medsActivos
    .filter((md: any) => {
      const esperadas = Math.max(1, Number(md.dosis_por_dia) || 1)
      const dadas = tomasHoyPorMed[md.id] || 0
      return dadas < esperadas
    })
    .map((md: any) => ({
      id: md.id as string,
      nombreOriginal: md.nombre as string,
      frecuencia: (md.frecuencia || null) as string | null,
      dosisPorDia: Math.max(1, Number(md.dosis_por_dia) || 1),
      tomasHoy: tomasHoyPorMed[md.id] || 0,
    }))

  // Definición de los cuidados posibles, organizados por grupo (mismo
  // orden que en el registro diario: Veterinario y salud → Prevención →
  // Alimentación → Higiene y bienestar → Arenero), cada uno con la
  // columna booleana que hay que consultar en registros_diarios. Las
  // columnas del Arenero solo tienen datos en gatos, así que en perros
  // ese grupo nunca aparece.
  const definicionCuidados = [
    { grupo: 'Veterinario y salud', columna: 'fue_al_vet', label: 'Veterinario', emoji: '🩺' },
    { grupo: 'Veterinario y salud', columna: 'control_peso', label: 'Control de peso', emoji: '⚖️' },
    { grupo: 'Veterinario y salud', columna: 'procedimiento_cirugia', label: 'Procedimiento/cirugía', emoji: '🏥' },
    { grupo: 'Veterinario y salud', columna: 'seguimiento_lesion', label: 'Seguimiento de lesión', emoji: '📸' },
    { grupo: 'Prevención', columna: 'medicamento_hoy', label: 'Medicamento', emoji: '💊' },
    { grupo: 'Prevención', columna: 'vacuna_hoy', label: 'Vacuna', emoji: '💉' },
    { grupo: 'Prevención', columna: 'anti_hoy', label: 'Antiparasitario', emoji: '🪱' },
    { grupo: 'Alimentación', columna: 'alimente_hoy', label: 'Alimenté a mi mascota', emoji: '🥘' },
    { grupo: 'Alimentación', columna: 'compro_alimento', label: 'Compra de alimento', emoji: '🍖' },
    { grupo: 'Alimentación', columna: 'cambio_alimento', label: 'Cambio de alimento', emoji: '🥣' },
    { grupo: 'Alimentación', columna: 'probo_alimento_nuevo', label: 'Alimento nuevo', emoji: '🎁' },
    { grupo: 'Alimentación', columna: 'cargo_dispensador', label: 'Cargué el dispensador', emoji: '🤖' },
    { grupo: 'Higiene y bienestar', columna: 'se_bano', label: 'Baño', emoji: '🛁' },
    { grupo: 'Higiene y bienestar', columna: 'corte_unas', label: 'Corte de uñas', emoji: '✂️' },
    { grupo: 'Higiene y bienestar', columna: 'limpieza_dental', label: 'Limpieza dental', emoji: '🦷' },
    { grupo: 'Higiene y bienestar', columna: 'limpieza_oidos', label: 'Limpieza de oídos', emoji: '👂' },
    { grupo: 'Higiene y bienestar', columna: 'tratamiento_dermatologico', label: 'Tratamiento dermatológico', emoji: '🧴' },
    { grupo: 'Higiene y bienestar', columna: 'peino', label: 'Lo peiné', emoji: '💇' },
    { grupo: 'Higiene y bienestar', columna: 'shampoo_seco', label: 'Shampoo en seco', emoji: '🧼' },
    { grupo: 'Arenero', columna: 'limpie_arenero', label: 'Limpié el arenero', emoji: '🧹' },
    { grupo: 'Arenero', columna: 'cambie_arena', label: 'Cambié la arena', emoji: '🔄' },
    { grupo: 'Arenero', columna: 'compre_arena', label: 'Compré arena', emoji: '🛒' },
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
    // Historial completo de paseos: solo dos columnas, asi que traer
    // todo sale barato y la racha deja de tener techo.
    const { data: registrosPaseo } = await supabase
      .from('registros_diarios')
      .select('fecha, paseo')
      .eq('mascota_id', m.id)
      .order('fecha', { ascending: false })
      .limit(2000)

    // Solo cuentan los dias con paseo efectivo: un registro diario sin
    // paseo (o con 'no_paseo') NO mantiene la racha.
    const fechasConPaseo = new Set(
      (registrosPaseo || [])
        .filter((r: any) => r.paseo && r.paseo !== 'no_paseo')
        .map((r: any) => r.fecha as string)
    )

    // Si todavia no se registra el paseo de hoy, la racha no se rompe:
    // se cuenta desde ayer y se marca en riesgo. Este es el mismo
    // criterio que usa Analisis (antes el dashboard usaba otro y las
    // dos pantallas podian mostrar numeros distintos).
    const tienePaseoHoy = fechasConPaseo.has(hoy)
    if (!tienePaseoHoy) rachaEnRiesgo = true
    const desde = tienePaseoHoy ? hoy : diaAnteriorStr(hoy)
    rachaPaseo = contarRachaConsecutiva(fechasConPaseo, desde)
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
      .limit(2000)
    const fechasRegistro = new Set((ultimosRegistros || []).map((r: any) => r.fecha as string))
    // Igual que la de paseos: si hoy aun no registra, se cuenta desde
    // ayer y la racha no se pierde hasta que pase el dia.
    const tieneHoy = fechasRegistro.has(hoy)
    const desdeReg = tieneHoy ? hoy : diaAnteriorStr(hoy)
    rachaRegistros = contarRachaConsecutiva(fechasRegistro, desdeReg)
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
  // Mismo criterio DERIVADO que usa el resto de la app: no basta
  // con estado='activo' en la base, porque ese campo no se
  // actualiza solo. Si fecha_fin ya paso, el tratamiento termino.
  // Sin este filtro, un medicamento terminado seguia apareciendo en
  // "Proximos" solo porque tenia un control agendado a futuro.
  const proximoMed = (medsConControl || []).find((md: any) => !md.fecha_fin || md.fecha_fin >= hoy)
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
        if (fechaChile(proximo) >= fechaChile()) {
          proximoCeloFecha = fechaChile(proximo)
        }
      }
      // Sin historial suficiente: estimar según especie
      // Perras: ~180 días (6 meses), Gatas: ~21 días (3 semanas)
      // Solo si hay al menos 1 celo registrado y no calculamos predicción
      if (intervalos.length === 0 && celos.length >= 1 && !proximoCeloFecha) {
        const diasEspecie = m.especie === 'Gato' ? 21 : 180
        const ultimo = new Date(celos[celos.length-1].fecha_inicio + 'T00:00:00')
        const proximo = new Date(ultimo.getTime() + diasEspecie * 86400000)
        if (fechaChile(proximo) >= fechaChile()) {
          proximoCeloFecha = fechaChile(proximo)
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
      url: '/prevencion?nuevaVisita=1',
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
      // "Control veterinario" en vez de "Enfermedades": lo que ocurre
      // próximamente es el CONTROL, no la enfermedad. El subtítulo
      // sigue mostrando el nombre de la enfermedad para el contexto.
      label: 'Control veterinario', sub: proximaRevisionEnf.diagnostico, dias: diasR(proximaRevisionEnf.proxima_revision), color: '#E05252',
    },
    // Proximo celo estimado (solo hembras con 2+ celos registrados)
    proximoCeloFecha && {
      label: 'Próximo celo', sub: 'Estimado según historial', dias: diasR(proximoCeloFecha), color: '#E05252',
    },
    // Próxima visita veterinaria agendada (de la sección Visitas en Salud)
    (visitasVet && visitasVet.length > 0) && (() => {
      const TIPO_LABEL: Record<string, string> = {
        rutina: 'Control / rutina', examenes: 'Exámenes', enfermedad: 'Por enfermedad', tratamiento: 'Tratamiento',
      }
      const v = visitasVet[0]
      return {
        label: 'Visita veterinaria',
        sub: v.motivo || TIPO_LABEL[v.tipo] || 'Visita agendada',
        dias: diasR(v.fecha),
        color: '#8C572F',
      }
    })(),
  ].filter(Boolean) as { label: string; sub: string; dias: string; color: string; url?: string }[]

  const edad = m.fecha_nacimiento ? calcEdad(m.fecha_nacimiento) : null

  return (
    <DashboardContenido
      mascotas={mascotas}
      mascota={m}
      edad={edad}
      color={color}
      estadoLabel={estadoLabel}
      proximosItems={proximosItems}
      tieneRegistroHoy={!!regHoy}
      seguimientosPendientes={seguimientosPendientes}
      diasSinCampo={diasSinCampo}
      medicamentosPendientesHoy={medicamentosPendientesHoy}
      visitasProximas={visitasVet || []}
      cuidadosRecientes={cuidadosRecientes}
      rachaPaseo={rachaPaseo}
        rachaRegistros={rachaRegistros}
        rachaEnRiesgo={rachaEnRiesgo}
        celoActivoHoy={celoActivoHoy}
        diaCeloHoy={diaCeloHoy}
    />
  )
}
