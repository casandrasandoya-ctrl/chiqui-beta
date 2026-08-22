import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createVetClient } from '@/utils/supabase/vet-client'
import PanelDia, { type DiaPanel } from '@/components/PanelDia'
import PanelSemanas from '@/components/PanelSemanas'

// ============================================================
// PANEL DE ADMINISTRACIÓN — solo Casandra
// ============================================================
// QUÉ MIDE Y QUÉ NO
// Este panel mide lo que la gente CREA (filas en la base), no lo que
// MIRA. La app no registra visitas a pantallas, así que no existe el
// dato de "cuántas veces se abrió Análisis". A cambio, todo lo que sí
// mide funciona de forma retroactiva sobre todo el historial, sin
// haber tenido que instrumentar nada antes.
//
// SEGURIDAD
// Dos capas. Primero exige sesión iniciada y que el id del usuario
// coincida con ADMIN_USER_ID (variable de entorno de Vercel, nunca en
// el código: así el repositorio puede ser público). Si no coincide
// devuelve 404 — no "acceso denegado" — para no revelar siquiera que
// la página existe.
//
// Recién después de esa comprobación se usa el cliente con service
// role, el mismo de /vet, que es lo que permite ver datos de todas las
// usuarias saltándose RLS.
//
// La cuenta de la propia Casandra se EXCLUYE de todas las métricas:
// es la cuenta de pruebas y distorsiona cada número (llegó a tener 52
// links de veterinario generados).

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

type Periodo = 'semana' | 'mes' | 'anio'

function fechaChile(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)
}

function restarDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return fechaChile(d)
}

function fmtFecha(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Se construye a MEDIODIA para que el cambio de horario de verano
// no corra el dia de la semana.
function fmtFechaLarga(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`
}

// Mediodia otra vez: sumar o restar 24 horas sobre medianoche se
// cae en los cambios de horario de verano.
function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return fechaChile(d)
}

// ---------- Piezas visuales ----------

function Tarjeta({ label, valor, sub, color }: { label: string; valor: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
      <p className="text-[10px] text-[#8A7560] uppercase tracking-wider">{label}</p>
      <p className="font-bold text-2xl mt-0.5" style={{ color: color || '#3D2B1F' }}>{valor}</p>
      {sub && <p className="text-[10px] text-[#8A7560] mt-0.5">{sub}</p>}
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4">
      <h2 className="text-xs font-bold text-[#8C572F] uppercase tracking-wider mb-2">{titulo}</h2>
      <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">{children}</div>
    </div>
  )
}

// Barra del embudo. El ancho es relativo al primer escalón, para que se
// vea de un vistazo dónde se cae la gente.
function PasoEmbudo({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs text-[#3D2B1F]">{label}</p>
        <p className="text-xs"><span className="font-bold" style={{ color }}>{n}</span> <span className="text-[#8A7560]">· {pct}%</span></p>
      </div>
      <div className="h-2 rounded-full bg-[#EEE2D4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function Barras({ datos }: { datos: { etiqueta: string; valor: number }[] }) {
  const max = Math.max(1, ...datos.map(d => d.valor))
  return (
    <div className="flex items-end gap-1 h-28">
      {datos.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-[9px] text-[#8A7560] mb-0.5">{d.valor > 0 ? d.valor : ''}</span>
          <div
            className="w-full rounded-t"
            style={{ height: `${Math.max(2, (d.valor / max) * 80)}%`, background: d.valor > 0 ? '#FFBD59' : '#EEE2D4' }}
          />
          <span className="text-[8px] text-[#8A7560] mt-1 truncate w-full text-center">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- Página ----------

interface Props {
  searchParams: { p?: string; m?: string; y?: string }
}

export default async function AdminPage({ searchParams }: Props) {
  // --- Capa 1: sesión iniciada y que sea la cuenta autorizada
  const sesion = await createClient()
  const { data: { user } } = await sesion.auth.getUser()
  const adminId = process.env.ADMIN_USER_ID

  if (!user || !adminId || user.id !== adminId) notFound()

  // --- Capa 2: recién ahora, acceso completo a los datos
  const db = createVetClient()

  const hoy = fechaChile()
  const periodo: Periodo =
    searchParams?.p === 'mes' ? 'mes' : searchParams?.p === 'anio' ? 'anio' : 'semana'

  // Mes y año son de CALENDARIO: julio 2026 empieza el 1 y termina
  // el 31. La semana se deja como ventana movil (ultimos 7 dias),
  // porque ahi lo util es "como venimos", no "la semana 31 del año".
  //
  // Los parametros se validan por formato y se limitan a no ser
  // futuros; cualquier otra cosa cae de vuelta en el actual.
  const mParam = searchParams?.m || ''
  const yParam = searchParams?.y || ''
  const mesSel = /^\d{4}-\d{2}$/.test(mParam) && mParam <= hoy.slice(0, 7) ? mParam : hoy.slice(0, 7)
  const anioSel = /^\d{4}$/.test(yParam) && yParam <= hoy.slice(0, 4) ? yParam : hoy.slice(0, 4)

  let desde: string
  let hasta: string
  if (periodo === 'mes') {
    const [ay, am] = mesSel.split('-').map(Number)
    // Ultimo dia del mes: nunca hardcodear 31. new Date(año, mes, 0)
    // devuelve el ultimo dia del mes anterior al indice dado.
    const ultimoDia = new Date(ay, am, 0).getDate()
    desde = `${mesSel}-01`
    hasta = `${mesSel}-${String(ultimoDia).padStart(2, '0')}`
  } else if (periodo === 'anio') {
    desde = `${anioSel}-01-01`
    hasta = `${anioSel}-12-31`
  } else {
    desde = restarDias(6)
    hasta = hoy
  }

  // Navegacion entre periodos
  const desplazarMes = (ym: string, n: number) => {
    const [a, m] = ym.split('-').map(Number)
    const d = new Date(a, m - 1 + n, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const linkPeriodo = (n: number) =>
    periodo === 'mes'
      ? `/admin?p=mes&m=${desplazarMes(mesSel, n)}`
      : `/admin?p=anio&y=${Number(anioSel) + n}`
  const puedeAvanzar = periodo === 'mes'
    ? desplazarMes(mesSel, 1) <= hoy.slice(0, 7)
    : Number(anioSel) < Number(hoy.slice(0, 4))
  const etiquetaPeriodo = periodo === 'mes'
    ? `${MESES_LARGO[Number(mesSel.slice(5, 7)) - 1]} ${mesSel.slice(0, 4)}`
    : anioSel

  const [
    { data: usuarios },
    { data: mascotas },
    { data: registros },
    { data: links },
    { data: cotutores },
    { data: prefs },
    { data: visitas },
    { data: momentos },
    { data: enriq },
  ] = await Promise.all([
    db.from('perfil_usuario').select('id, nombre, email, created_at'),
    db.from('mascotas').select('id, user_id, nombre, especie, archivada_en, created_at'),
    // paseo y se_bano viven dentro del registro del dia, no en una
    // tabla propia: por eso viajan aca y no en una consulta aparte.
    // Supabase corta en 1000 filas por consulta, sin importar el
    // .limit() que se pida. La tabla ya tiene mas de 1000 registros, asi
    // que se traian solo los primeros mil EN UN ORDEN CUALQUIERA — y los
    // mas recientes, los de hoy, quedaban fuera.
    //
    // Con .order descendente y .range se piden 5000 explicitamente,
    // empezando por los mas nuevos. Si algun dia se pasa de 5000, lo que
    // se pierde son los mas antiguos, no los de hoy.
    db.from('registros_diarios')
      .select('user_id, mascota_id, fecha, paseo, se_bano, corte_unas, limpieza_dental, limpieza_oidos, cambio_alimento, probo_alimento_nuevo, compro_alimento')
      .order('fecha', { ascending: false })
      .range(0, 4999),
    db.from('links_veterinario').select('user_id, created_at'),
    db.from('mascota_cotutores').select('dueno_user_id, estado'),
    db.from('preferencias_usuario').select('user_id, notificaciones_activas'),
    db.from('visitas_veterinarias').select('user_id, fecha'),
    db.from('momentos').select('user_id, fecha'),
    db.from('enriquecimientos').select('mascota_id, fecha'),
  ])

  // La cuenta propia SI cuenta: es una usuaria real, con una mascota
  // real y registro diario. Antes estaba excluida por sus mascotas de
  // prueba, pero eso la borraba de su propia app. Se incluye y se
  // marca en la lista para saber leer el numero.
  const TODOS: any[] = usuarios || []
  const ids = new Set(TODOS.map(u => u.id))

  const masc: any[] = (mascotas || []).filter((m: any) => ids.has(m.user_id))
  const regs: any[] = (registros || []).filter((r: any) => ids.has(r.user_id))
  const mascPorId = new Map(masc.map((m: any) => [m.id, m]))

  // ---------- Embudo de activación (histórico completo) ----------
  const regsPorUsuario = new Map<string, any[]>()
  for (const r of regs) {
    const arr = regsPorUsuario.get(r.user_id) || []
    arr.push(r)
    regsPorUsuario.set(r.user_id, arr)
  }
  const hace7 = restarDias(7)

  const conMascota = new Set(masc.map((m: any) => m.user_id))
  const conUnRegistro = new Set(regsPorUsuario.keys())
  const conCinco = Array.from(regsPorUsuario.entries()).filter(([, v]) => v.length >= 5).map(([k]) => k)
  const activos7 = Array.from(regsPorUsuario.entries())
    .filter(([, v]) => v.some((r: any) => r.fecha >= hace7))
    .map(([k]) => k)
  const nucleo = conCinco.filter(u => activos7.includes(u))

  // ---------- Actividad del período ----------
  // Ahora los tres filtros usan desde Y hasta. Antes solo miraban
  // "desde", lo que estaba bien con ventanas moviles que siempre
  // terminaban hoy, pero contaria de mas al mirar un mes pasado.
  const regsPeriodo = regs.filter((r: any) => r.fecha >= desde && r.fecha <= hasta)
  const activosPeriodo = new Set(regsPeriodo.map((r: any) => r.user_id))
  const enRango = (iso: string) => {
    const f = (iso || '').slice(0, 10)
    return f >= desde && f <= hasta
  }
  const nuevasCuentas = TODOS.filter((u: any) => enRango(u.created_at))
  const nuevasMascotas = masc.filter((m: any) => enRango(m.created_at))

  // ---------- Otra actividad, más allá del registro diario ----------
  // Todo lo que la gente guarda en la app y que no es el registro
  // del día. Se usa la fecha del EVENTO (cuándo se puso la vacuna),
  // no la de cuándo se escribió: es la que todas estas tablas
  // guardan de forma confiable.
  const [
    { data: vacunas },
    { data: antis },
    { data: meds },
    { data: pesos },
    { data: obs },
    { data: exams },
    { data: examsLab },
    { data: revis },
    { data: tomas },
    { data: enfs },
  ] = await Promise.all([
    db.from('vacunas').select('mascota_id, nombre, fecha_aplicacion'),
    db.from('antiparasitarios').select('mascota_id, nombre, fecha_aplicacion'),
    db.from('medicamentos').select('mascota_id, nombre, fecha_inicio'),
    db.from('historial_peso').select('mascota_id, peso, fecha'),
    db.from('observaciones').select('mascota_id, titulo, fecha_inicio'),
    db.from('examenes').select('mascota_id, nombre, categoria, fecha'),
    db.from('examenes_lab').select('mascota_id, tipo, fecha'),
    db.from('revisiones_corporales').select('mascota_id, fecha'),
    // Dosis efectivamente registradas. Dice mucho mas que cuantos
    // tratamientos se crearon: un tratamiento son muchas dosis, y
    // lo que importa es si se cumplieron.
    db.from('medicamento_tomas').select('mascota_id, fecha').limit(50000),
    db.from('enfermedades').select('mascota_id, fecha_diagnostico'),
  ])

  // ---------- Quiénes registraron cada día ----------
  // Replica la planilla que se lleva a mano. Es tambien la
  // evidencia que pide Google Play para salir de closed testing:
  // testers activos de verdad, dia a dia.
  const nombrePorUsuario = new Map<string, string>(TODOS.map((u: any) => [u.id, u.nombre || u.email || '(sin nombre)']))

  // Los ultimos 60 dias, ya agrupados, para que el selector de dia
  // funcione sin recargar la pagina ni volver al servidor.
  // Se agrupan los registros por fecha UNA vez y despues se recorren
  // los 60 dias, en vez de filtrar la lista completa 60 veces.
  const regsPorFecha = new Map<string, any[]>()
  for (const r of regs) {
    // La fecha se NORMALIZA a YYYY-MM-DD antes de usarla como clave.
    // Sin esto, si Supabase la devuelve con hora ("2026-08-21T00:00:00")
    // o con cualquier variacion de formato, nunca coincide con la clave
    // que arma sumarDias() y los registros de ese dia desaparecen.
    //
    // El bloque de "otra actividad" mas abajo ya hacia esto con
    // .slice(0, 10), y por eso la vacuna y el peso SI se veian mientras
    // los registros diarios no.
    const f = String(r.fecha).slice(0, 10)
    const arr = regsPorFecha.get(f) || []
    arr.push(r)
    regsPorFecha.set(f, arr)
  }

  // Cada fuente se normaliza a la misma forma. Si una consulta
  // fallara, su lista llega vacía y el resto sigue funcionando.
  const otrosPorFecha = new Map<string, { emoji: string; label: string; quien: string; detalle: string }[]>()

  const agregarOtro = (mascotaId: string, fecha: string | null, emoji: string, label: string, detalle: string) => {
    if (!fecha) return
    const mm = mascPorId.get(mascotaId)
    if (!mm) return // mascota de otra cuenta o de la cuenta de pruebas
    const f = String(fecha).slice(0, 10)
    const arr = otrosPorFecha.get(f) || []
    arr.push({
      emoji,
      label,
      quien: `${nombrePorUsuario.get(mm.user_id) || '(sin nombre)'} · ${mm.nombre}`,
      detalle,
    })
    otrosPorFecha.set(f, arr)
  }

  for (const v of (vacunas || [])) agregarOtro(v.mascota_id, v.fecha_aplicacion, '💉', 'vacuna', v.nombre || 'Vacuna')
  for (const a of (antis || [])) agregarOtro(a.mascota_id, a.fecha_aplicacion, '🪱', 'antiparasitario', a.nombre || 'Antiparasitario')
  for (const md of (meds || [])) agregarOtro(md.mascota_id, md.fecha_inicio, '💊', 'medicamento', md.nombre || 'Medicamento')
  for (const pz of (pesos || [])) agregarOtro(pz.mascota_id, pz.fecha, '⚖️', 'peso', `Peso: ${pz.peso} kg`)
  for (const o of (obs || [])) agregarOtro(o.mascota_id, o.fecha_inicio, '🔍', 'observación', o.titulo || 'Observación')
  for (const ex of (exams || [])) agregarOtro(ex.mascota_id, ex.fecha, '📄', 'examen', ex.nombre || ex.categoria || 'Examen')
  for (const el of (examsLab || [])) agregarOtro(el.mascota_id, el.fecha, '🧫', 'examen de lab', el.tipo || 'Examen de laboratorio')
  for (const rv of (revis || [])) agregarOtro(rv.mascota_id, rv.fecha, '🩺', 'revisión corporal', 'Revisión corporal')

  // Visitas y momentos vienen por user_id, no por mascota.
  for (const vt of (visitas || [])) {
    if (!ids.has(vt.user_id) || !vt.fecha) continue
    const f = String(vt.fecha).slice(0, 10)
    const arr = otrosPorFecha.get(f) || []
    arr.push({ emoji: '🏥', label: 'visita al vet', quien: nombrePorUsuario.get(vt.user_id) || '(sin nombre)', detalle: 'Visita al veterinario' })
    otrosPorFecha.set(f, arr)
  }
  for (const mo of (momentos || [])) {
    if (!ids.has(mo.user_id) || !mo.fecha) continue
    const f = String(mo.fecha).slice(0, 10)
    const arr = otrosPorFecha.get(f) || []
    arr.push({ emoji: '✨', label: 'momento', quien: nombrePorUsuario.get(mo.user_id) || '(sin nombre)', detalle: 'Momento registrado' })
    otrosPorFecha.set(f, arr)
  }

  const diasPanel: DiaPanel[] = Array.from({ length: 60 }, (_, i) => {
    const f = sumarDias(hoy, -(59 - i))
    const mapa = new Map<string, { nombre: string; especie: string }[]>()
    for (const r of (regsPorFecha.get(f) || [])) {
      const arr = mapa.get(r.user_id) || []
      const mm = mascPorId.get(r.mascota_id)
      // Una persona puede registrar varias mascotas el mismo dia.
      if (mm && !arr.some(x => x.nombre === mm.nombre)) {
        arr.push({ nombre: mm.nombre, especie: mm.especie || '' })
      }
      mapa.set(r.user_id, arr)
    }
    return {
      fecha: f,
      usuarios: Array.from(mapa.entries())
        .map(([uid, mascotasDia]) => ({
          nombre: nombrePorUsuario.get(uid) || '(sin nombre)',
          mascotas: mascotasDia,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      otros: otrosPorFecha.get(f) || [],
    }
  })

  // ---------- Serie para el gráfico ----------
  const serie: { etiqueta: string; valor: number }[] = []
  // Lo mismo que serie, pero con la fecha completa: el desglose por
  // semanas necesita saber que dia de la semana es cada uno, y la
  // etiqueta del grafico solo guarda el numero.
  const diasDetalle: { fecha: string; valor: number }[] = []
  if (periodo === 'anio') {
    const porMes = new Map<string, Set<string>>()
    for (const r of regsPeriodo) {
      const k = r.fecha.slice(0, 7)
      if (!porMes.has(k)) porMes.set(k, new Set())
      porMes.get(k)!.add(r.user_id)
    }
    // Los 12 meses del año elegido, de enero a diciembre.
    for (let m = 1; m <= 12; m++) {
      const k = `${anioSel}-${String(m).padStart(2, '0')}`
      serie.push({ etiqueta: MESES[m - 1], valor: porMes.get(k)?.size || 0 })
    }
  } else {
    const porDia = new Map<string, Set<string>>()
    for (const r of regsPeriodo) {
      if (!porDia.has(r.fecha)) porDia.set(r.fecha, new Set())
      porDia.get(r.fecha)!.add(r.user_id)
    }
    // Una barra por cada dia del periodo, recorriendo de desde a
    // hasta. En la semana se rotula con dia/mes; en el mes basta el
    // numero del dia, o no cabe.
    let f = desde
    while (f <= hasta) {
      const valor = porDia.get(f)?.size || 0
      serie.push({
        etiqueta: periodo === 'semana' ? fmtFecha(f) : String(Number(f.slice(8, 10))),
        valor,
      })
      diasDetalle.push({ fecha: f, valor })
      f = sumarDias(f, 1)
    }
  }

  // ---------- Resumen de la comunidad ----------
  // Que paso con la salud de estos animales en el periodo elegido.
  // Se cuenta solo lo de mascotas conocidas (mascPorId), asi nada
  // que quedara huerfano en la base infla los numeros.
  const enPeriodo = (iso: any) => {
    const f = String(iso || '').slice(0, 10)
    return f >= desde && f <= hasta
  }
  const contarPorMascota = (lista: any[] | null, campoFecha: string) =>
    (lista || []).filter((x: any) => mascPorId.has(x.mascota_id) && enPeriodo(x[campoFecha])).length
  const contarPorUsuario = (lista: any[] | null, campoFecha: string) =>
    (lista || []).filter((x: any) => ids.has(x.user_id) && enPeriodo(x[campoFecha])).length

  // Cuenta cuantos dias del periodo tienen marcada una columna del
  // registro diario. Esos cuidados no tienen tabla propia: viven
  // como booleanos dentro del registro del dia.
  const contarMarca = (campo: string) => regsPeriodo.filter((r: any) => r[campo]).length

  // Las areas siguen la misma division que la app, para que leer el
  // panel se parezca a usarla.
  const gruposResumen: { area: string; emoji: string; items: [string, string, number][] }[] = [
    {
      area: 'Observación', emoji: '📝',
      items: [
        ['📝', 'Registros diarios', regsPeriodo.length],
        ['👁️', 'Observaciones', contarPorMascota(obs, 'fecha_inicio')],
        ['🦠', 'Diagnósticos', contarPorMascota(enfs, 'fecha_diagnostico')],
      ],
    },
    {
      area: 'Prevención', emoji: '🛡️',
      items: [
        ['💉', 'Vacunas', contarPorMascota(vacunas, 'fecha_aplicacion')],
        ['🪱', 'Antiparasitarios', contarPorMascota(antis, 'fecha_aplicacion')],
        // Los dos tipos de examen se suman: para leer el resumen
        // son lo mismo.
        ['🧪', 'Exámenes', contarPorMascota(exams, 'fecha') + contarPorMascota(examsLab, 'fecha')],
        ['⚖️', 'Controles de peso', contarPorMascota(pesos, 'fecha')],
        ['🔍', 'Revisiones corporales', contarPorMascota(revis, 'fecha')],
      ],
    },
    {
      area: 'Tratamiento', emoji: '💊',
      items: [
        // Dosis registradas, no tratamientos creados: un tratamiento
        // son muchas dosis, y lo que dice algo es si se cumplieron.
        ['💊', 'Dosis de medicamento', contarPorMascota(tomas, 'fecha')],
        ['🏥', 'Visitas al veterinario', contarPorUsuario(visitas, 'fecha')],
      ],
    },
    {
      area: 'Actividad', emoji: '🐾',
      items: [
        // 'no_paseo' es un valor real que significa que ese dia NO
        // salio: contarlo como paseo seria mentir.
        ['🐾', 'Paseos', regsPeriodo.filter((r: any) => r.paseo && r.paseo !== 'no_paseo').length],
        ['🦴', 'Enriquecimiento', contarPorMascota(enriq, 'fecha')],
        ['✨', 'Momentos', contarPorUsuario(momentos, 'fecha')],
      ],
    },
    {
      area: 'Cuidados', emoji: '🚿',
      items: [
        ['🚿', 'Baños', contarMarca('se_bano')],
        ['✂️', 'Corte de uñas', contarMarca('corte_unas')],
        ['🦷', 'Limpieza dental', contarMarca('limpieza_dental')],
        ['👂', 'Limpieza de oídos', contarMarca('limpieza_oidos')],
      ],
    },
    {
      area: 'Alimentación', emoji: '🍽️',
      items: [
        ['🔄', 'Cambios de alimento', contarMarca('cambio_alimento')],
        ['🆕', 'Probó algo nuevo', contarMarca('probo_alimento_nuevo')],
        ['🛒', 'Compras de alimento', contarMarca('compro_alimento')],
      ],
    },
  ]

  // ---------- Funciones usadas ----------
  const usaronLink = new Set((links || []).filter((l: any) => ids.has(l.user_id)).map((l: any) => l.user_id))
  const usaronCotutor = new Set((cotutores || []).filter((c: any) => ids.has(c.dueno_user_id)).map((c: any) => c.dueno_user_id))
  const conNotif = new Set((prefs || []).filter((p: any) => ids.has(p.user_id) && p.notificaciones_activas).map((p: any) => p.user_id))
  const usaronVisitas = new Set((visitas || []).filter((v: any) => ids.has(v.user_id)).map((v: any) => v.user_id))
  const usaronMomentos = new Set((momentos || []).filter((mo: any) => ids.has(mo.user_id)).map((mo: any) => mo.user_id))
  const enriqValidos = (enriq || []).filter((e: any) => mascPorId.has(e.mascota_id))

  const perros = masc.filter((m: any) => m.especie === 'Perro')
  const gatos = masc.filter((m: any) => m.especie === 'Gato')

  const nucleoPorEspecie = (lista: any[]) => {
    const idsMasc = new Set(lista.map(m => m.id))
    const porMasc = new Map<string, number>()
    for (const r of regs) {
      if (!idsMasc.has(r.mascota_id)) continue
      porMasc.set(r.mascota_id, (porMasc.get(r.mascota_id) || 0) + 1)
    }
    const recientes = new Set(regs.filter((r: any) => r.fecha >= hace7).map((r: any) => r.mascota_id))
    return Array.from(porMasc.entries()).filter(([k, v]) => v >= 5 && recientes.has(k)).length
  }

  // ---------- Tabla de usuarias ----------
  const filas = TODOS.map((u: any) => {
    const rs = regsPorUsuario.get(u.id) || []
    const ultima = rs.length ? rs.map((r: any) => r.fecha).sort().slice(-1)[0] : null
    const sinRegistrar = ultima
      ? Math.round((new Date(hoy + 'T12:00:00').getTime() - new Date(ultima + 'T12:00:00').getTime()) / 86400000)
      : null
    return {
      nombre: u.nombre || '(sin nombre)',
      esAdmin: u.id === adminId,
      email: u.email || '',
      mascotas: masc.filter((m: any) => m.user_id === u.id).map((m: any) => m.nombre).join(', ') || '—',
      registros: rs.length,
      ultima,
      sinRegistrar,
    }
  }).sort((a, b) => b.registros - a.registros)

  const Tab = ({ v, label }: { v: Periodo; label: string }) => (
    <a
      href={`/admin?p=${v}&m=${mesSel}&y=${anioSel}`}
      className="flex-1 text-center py-2 rounded-xl text-xs font-bold"
      style={periodo === v
        ? { background: '#FFBD59', color: '#1A1200' }
        : { background: '#FFFCF8', color: '#8A7560', border: '1px solid #EEE2D4' }}
    >
      {label}
    </a>
  )

  return (
    <div className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-16">
      <div className="bg-[#8C572F] text-white px-5 pt-8 pb-5">
        <p className="text-xs font-bold text-[#FFBD59] tracking-widest uppercase">CHIQUI · Panel interno</p>
        <h1 className="text-xl font-bold mt-1">Uso de la app</h1>
        <p className="text-xs text-white/70 mt-1">
          Actualizado al {fmtFecha(hoy)} · Incluye tu cuenta
        </p>
        <a href="/dashboard" className="inline-block mt-3 text-xs font-bold text-[#FFBD59]">
          ← Volver a la app
        </a>
      </div>

      <div className="flex gap-2 mx-4 my-4">
        <Tab v="semana" label="Semana" />
        <Tab v="mes" label="Mes" />
        <Tab v="anio" label="Año" />
      </div>

      {/* Navegacion de periodo. La semana no la lleva: es una
          ventana movil, no un periodo de calendario. */}
      {periodo !== 'semana' && (
        <div className="flex items-center justify-between mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] px-2 py-2">
          <a href={linkPeriodo(-1)} className="text-lg text-[#8C572F] px-3">◀</a>
          <p className="text-sm font-bold text-[#3D2B1F] capitalize">{etiquetaPeriodo}</p>
          {puedeAvanzar ? (
            <a href={linkPeriodo(1)} className="text-lg text-[#8C572F] px-3">▶</a>
          ) : (
            <span className="text-lg text-[#EEE2D4] px-3">▶</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mx-4 mb-4">
        <Tarjeta label="Activas" valor={activosPeriodo.size} sub={`de ${TODOS.length} registradas`} color="#4CAF7D" />
        <Tarjeta label="Registros" valor={regsPeriodo.length} sub="en el período" />
        <Tarjeta label="Cuentas nuevas" valor={nuevasCuentas.length} sub="en el período" />
        <Tarjeta label="Mascotas nuevas" valor={nuevasMascotas.length} sub="en el período" />
      </div>

      <PanelDia dias={diasPanel} totalUsuarios={TODOS.length} />


      <Seccion titulo="Embudo de activación (histórico)">
        <PasoEmbudo label="Crearon cuenta" n={TODOS.length} total={TODOS.length} color="#8C572F" />
        <PasoEmbudo label="Crearon una mascota" n={conMascota.size} total={TODOS.length} color="#CD7421" />
        <PasoEmbudo label="Registraron al menos 1 día" n={conUnRegistro.size} total={TODOS.length} color="#FFBD59" />
        <PasoEmbudo label="Llegaron a 5 registros" n={conCinco.length} total={TODOS.length} color="#F5C842" />
        <PasoEmbudo label="Núcleo: 5+ y activas esta semana" n={nucleo.length} total={TODOS.length} color="#4CAF7D" />
        <p className="text-[10px] text-[#8A7560] mt-3 leading-relaxed italic">
          El escalón donde más cae el porcentaje es dónde se está perdiendo la gente. Ese es el número a mover.
        </p>
      </Seccion>

      {/* El mes se desglosa en semanas plegables: 31 barras juntas
          no se leen en un teléfono. La semana y el año conservan su
          gráfico, que ahí sí se entiende. */}
      {periodo === 'mes' ? (
        <PanelSemanas dias={diasDetalle} />
      ) : (
        <Seccion titulo={periodo === 'anio' ? 'Personas activas por mes' : 'Personas activas por día'}>
          <Barras datos={serie} />
        </Seccion>
      )}

      {/* Resumen de la comunidad: no cuanta gente entro, sino que
          paso con la salud de estos animales. Respeta el periodo
          elegido arriba. */}
      <Seccion titulo="Resumen de la comunidad">
        {gruposResumen.map(g => {
          const totalArea = g.items.reduce((a, it) => a + it[2], 0)
          return (
            <details key={g.area} className="border-b border-[#EEE2D4] last:border-0">
              <summary className="py-2.5 flex items-center gap-2 cursor-pointer list-none">
                <span className="text-sm">{g.emoji}</span>
                <p className="flex-1 text-xs font-semibold text-[#3D2B1F]">{g.area}</p>
                <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{totalArea}</span>
                <span className="text-[#8C572F] text-sm font-bold">▼</span>
              </summary>
              <div className="grid grid-cols-2 gap-2.5 pb-3">
                {g.items.map(([emoji, label, n]) => (
                  <div key={label} className="bg-[#FBEAD9]/50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-[#8A7560] leading-tight">{emoji} {label}</p>
                    <p className="font-bold text-xl mt-0.5" style={{ color: n > 0 ? '#3D2B1F' : '#B5A38F' }}>{n}</p>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
        <p className="text-[10px] text-[#8A7560] mt-3 leading-relaxed italic">
          Todo lo registrado en el período elegido. No es cuánta gente entró: es qué pasó con la salud de estos animales.
        </p>
      </Seccion>

      <Seccion titulo="Funciones usadas (histórico)">
        <div className="space-y-2">
          {[
            ['Notificaciones activas', conNotif.size, '#4CAF7D'],
            ['Generaron link al veterinario', usaronLink.size, '#CD7421'],
            ['Registraron una visita al vet', usaronVisitas.size, '#CD7421'],
            ['Registraron momentos', usaronMomentos.size, '#FFBD59'],
            ['Generaron código de co-tutor', usaronCotutor.size, '#8C572F'],
          ].map(([label, n, color]) => (
            <PasoEmbudo key={String(label)} label={String(label)} n={Number(n)} total={TODOS.length} color={String(color)} />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Perros y gatos">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#8A7560]">🐶 Perros</p>
            <p className="font-bold text-xl">{perros.length}</p>
            <p className="text-[10px] text-[#8A7560]">{nucleoPorEspecie(perros)} en el núcleo</p>
          </div>
          <div>
            <p className="text-xs text-[#8A7560]">🐱 Gatos</p>
            <p className="font-bold text-xl">{gatos.length}</p>
            <p className="text-[10px] text-[#8A7560]">{nucleoPorEspecie(gatos)} en el núcleo</p>
          </div>
        </div>
        <p className="text-[10px] text-[#8A7560] mt-3">
          {enriqValidos.length} actividades de enriquecimiento registradas en total
        </p>
      </Seccion>

      <Seccion titulo={`Usuarios (${filas.length})`}>
        {/* Desplegable: con dos docenas de filas, la lista abierta
            empujaba todo lo demas fuera de la pantalla. <details> no
            necesita JavaScript, asi que la pagina sigue siendo un
            componente de servidor. */}
        <details>
          <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none mb-2">
            Ver los {filas.length} usuarios ▼
          </summary>
          <div className="space-y-2.5">
          {filas.map((f, i) => {
            const color = f.sinRegistrar === null ? '#B5A38F'
              : f.sinRegistrar <= 1 ? '#4CAF7D'
              : f.sinRegistrar <= 3 ? '#F5C842'
              : f.sinRegistrar <= 7 ? '#F07A30' : '#E05252'
            return (
              <div key={i} className="pb-2.5 border-b border-[#EEE2D4] last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-[#3D2B1F] truncate">
                    {f.nombre}
                    {f.esAdmin && (
                      <span className="ml-1.5 text-[9px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-1.5 py-0.5 align-middle">
                        tú
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] font-bold flex-shrink-0" style={{ color }}>
                    {f.sinRegistrar === null ? 'Nunca registró'
                      : f.sinRegistrar === 0 ? 'Hoy'
                      : f.sinRegistrar === 1 ? 'Ayer'
                      : `Hace ${f.sinRegistrar} días`}
                  </p>
                </div>
                <p className="text-[10px] text-[#8A7560] truncate">{f.email}</p>
                <p className="text-[10px] text-[#8A7560]">
                  🐾 {f.mascotas} · {f.registros} {f.registros === 1 ? 'registro' : 'registros'}
                </p>
              </div>
            )
          })}
          </div>
        </details>
      </Seccion>

      <p className="text-[10px] text-[#8A7560] text-center px-8 leading-relaxed">
        Este panel mide lo que las personas registran en la base de datos.
        No mide visitas a pantallas: la app no las guarda.
      </p>
    </div>
  )
}
