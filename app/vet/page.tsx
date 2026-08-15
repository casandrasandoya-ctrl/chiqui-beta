import { createVetClient } from '@/utils/supabase/vet-client'
import FotoAmpliable from '@/components/FotoAmpliable'
import ExamenesLabVet from '@/components/ExamenesLabVet'

// La vista del veterinario NUNCA se cachea: cada visita trae los datos
// más recientes. Sin esto, Next.js cacheaba la página y una evolución
// recién registrada no aparecía hasta forzar recarga o expirar el
// caché. force-dynamic garantiza que el vet siempre vea lo último.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  searchParams: { token?: string }
}

function calcEdad(f: string): string {
  const d = new Date(f + 'T00:00:00')
  const hoy = new Date()
  const anos = Math.floor((hoy.getTime() - d.getTime()) / (1000*60*60*24*365.25))
  const meses = Math.floor((hoy.getTime() - d.getTime()) / (1000*60*60*24*30.44))
  return anos >= 1 ? `${anos} ${anos===1?'año':'años'}` : `${meses} meses`
}

function fmt(f: string): string {
  if (!f) return '—'
  const d = new Date(f + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
}

function diasDesde(f: string): number {
  return Math.round((new Date().getTime() - new Date(f + 'T00:00:00').getTime()) / 86400000)
}

function fueraDeRango(valor: string, rangoMin: number | null, rangoMax: number | null): boolean {
  if (rangoMin === null || rangoMax === null) return false
  const v = parseFloat(String(valor).replace(',', '.'))
  if (isNaN(v)) return false
  return v < rangoMin || v > rangoMax
}

// Para vacunas: cada NOMBRE de vacuna (ej. "Séxtuple", "Antirrábica")
// es un tratamiento independiente con su propio calendario -- así que
// para saber si algo está "vencido", hay que mirar solo la aplicación
// MÁS RECIENTE de cada nombre, no todo el historial completo (una
// vacuna vieja que ya fue reemplazada por una más nueva del mismo tipo
// no debería seguir contando como "vencida").
function masRecientesPorNombre(lista: any[]): any[] {
  const porNombre = new Map<string, any>()
  for (const item of lista) {
    const existente = porNombre.get(item.nombre)
    if (!existente || (item.fecha_aplicacion || '') > (existente.fecha_aplicacion || '')) {
      porNombre.set(item.nombre, item)
    }
  }
  return Array.from(porNombre.values())
}

const EC: Record<string,string> = { verde:'#4CAF7D', amarillo:'#F5C842', naranjo:'#F07A30', rojo:'#E05252' }
const EL: Record<string,string> = { verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' }

const CAMPOS_SALUD = [
  ['Energía','energia'],['Ánimo','animo'],['Apetito','apetito'],['Agua','agua'],
  ['Digestión','digestion'],['Heces','heces'],['Pelaje','pelaje'],
  ['Conducta','conducta'],['Movilidad','movilidad'],
]

const CATEGORIAS_EXAMEN: Record<string,{icon:string,label:string}> = {
  hemograma: { icon:'🩸', label:'Hemograma' },
  bioquimica: { icon:'🧪', label:'Perfil bioquímico' },
  orina: { icon:'💛', label:'Examen de orina' },
  imagen: { icon:'📷', label:'Imagen (Rx / Eco)' },
  corazon: { icon:'❤️', label:'Examen cardíaco' },
  otro: { icon:'📄', label:'Otro examen' },
}

function detectarMotivosConsulta(registros: any[]): string[] {
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const recientes = registros.filter(r => new Date(r.fecha + 'T00:00:00') >= hace7)
  const senales: Set<string> = new Set()
  const CAMPOS_LABEL: Record<string,Record<string,string>> = {
    energia: { baja:'Energía baja', muy_baja:'Energía muy baja' },
    animo: { triste:'Ánimo decaído', ansioso:'Ansiedad', agresivo:'Agresividad' },
    apetito: { poco:'Poco apetito', nada:'Sin apetito', excesivo:'Apetito excesivo' },
    agua: { poco:'Poca ingesta de agua', mucho:'Ingesta excesiva de agua', nada:'Sin ingesta de agua' },
    digestion: { vomito:'Vómito', diarrea:'Diarrea', constipacion:'Constipación', gases:'Gases' },
    heces: { diarrea:'Diarrea', diarrea_con_sangre:'Diarrea con sangre', estreñimiento:'Estreñimiento' },
    pelaje: { caida_excesiva:'Caída excesiva de pelo', rasca:'Se rasca', lame_exceso:'Se lame en exceso', opaco:'Pelaje opaco' },
    conducta: { agresivo:'Cambios de conducta (agresivo)', ansioso:'Ansiedad', escondite:'Se esconde', letargico:'Letárgico' },
    movilidad: { cojera:'Cojera', rigidez:'Rigidez', dolor_aparente:'Dolor aparente', no_salta:'Dificultad para saltar' },
  }
  for (const r of recientes) {
    for (const [campo, valoresLabel] of Object.entries(CAMPOS_LABEL)) {
      const val = r[campo]
      if (val && valoresLabel[val]) senales.add(valoresLabel[val])
    }
    if (r.estado_dia === 'rojo' || r.estado_dia === 'naranjo') senales.add('Días con estado de alerta reciente')
  }
  return Array.from(senales).slice(0, 6)
}

// Construye el Resumen Clínico: resume información ya registrada, sin
// emitir diagnósticos ni interpretar -- solo agrupa lo que ya existe
// para que el veterinario entienda el panorama general en segundos,
// antes de entrar al detalle de cada sección.
function construirResumenClinico(params: {
  historialPeso: any[]
  vacunas: any[]
  antis: any[]
  obs: any[]
  examenesLab: any[]
  fechaNacimiento?: string | null
  especie?: string | null
}): { texto: string; nivel: 'verde' | 'amarillo' | 'rojo' }[] {
  const { historialPeso, vacunas, antis, obs, examenesLab, fechaNacimiento, especie } = params
  const resumen: { texto: string; nivel: 'verde' | 'amarillo' | 'rojo' }[] = []
  const hoy = new Date()

  // ¿Es cachorro/gatito en crecimiento? Perros hasta 18 meses, gatos
  // hasta 12. En esa etapa, aumentar de peso es esperado (no es una
  // observación). La pérdida de peso sí sigue marcándose.
  let esCachorroCrecimiento = false
  if (fechaNacimiento) {
    const nac = new Date(fechaNacimiento + 'T00:00:00')
    const meses = (hoy.getTime() - nac.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    esCachorroCrecimiento = meses >= 0 && meses < (especie === 'Gato' ? 12 : 18)
  }

  // Peso: compara el registro más antiguo vs el más reciente dentro de
  // los últimos 6 meses. Si hay menos de 2 registros en ese período, no
  // hay nada confiable que decir, así que se omite la línea entera.
  if (historialPeso && historialPeso.length >= 2) {
    const hace6meses = new Date()
    hace6meses.setMonth(hace6meses.getMonth() - 6)
    const enPeriodo = historialPeso
      .filter((p: any) => new Date(p.fecha + 'T00:00:00') >= hace6meses)
      .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))
    if (enPeriodo.length >= 2) {
      const primero = enPeriodo[0].peso
      const ultimo = enPeriodo[enPeriodo.length - 1].peso
      const variacionPct = primero ? Math.abs((ultimo - primero) / primero) * 100 : 0

      // Cambio desde el CONTROL ANTERIOR. Mirar solo el primero y el
      // último del semestre puede ocultar lo que acaba de pasar: si
      // pesaba 15, subió a 16 y volvió a 15, la variación da cero y
      // se leía "estable" — aunque la baja fuera reciente.
      //
      // Mismo umbral del 5% que usa la app, para que las dos digan lo
      // mismo. Un 5% en un perro de 16 kg es cerca de un kilo.
      const anteriorPeso = enPeriodo[enPeriodo.length - 2].peso
      const cambioReciente = ultimo - anteriorPeso
      const cambioRecientePct = anteriorPeso ? (Math.abs(cambioReciente) / anteriorPeso) * 100 : 0
      const fechaUltimo = enPeriodo[enPeriodo.length - 1].fecha

      if (cambioRecientePct >= 5 && Math.abs(cambioReciente) >= 0.1) {
        const kg = Math.abs(cambioReciente).toFixed(1).replace('.', ',')
        if (cambioReciente < 0) {
          // La pérdida se marca a cualquier edad, también en cachorros.
          resumen.push({ texto: `Perdió ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg, ${fechaUltimo}).`, nivel: 'amarillo' })
        } else if (esCachorroCrecimiento) {
          resumen.push({ texto: `Aumentó ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg), acorde a su crecimiento.`, nivel: 'verde' })
        } else {
          resumen.push({ texto: `Aumentó ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg, ${fechaUltimo}).`, nivel: 'amarillo' })
        }
      } else if (variacionPct < 5) {
        resumen.push({ texto: `Peso estable durante los últimos 6 meses (${ultimo} kg).`, nivel: 'verde' })
      } else if (ultimo > primero) {
        // En cachorros/gatitos en crecimiento, el aumento es esperado:
        // se informa en verde, no como observación.
        if (esCachorroCrecimiento) {
          resumen.push({ texto: `Peso aumentó de ${primero} kg a ${ultimo} kg, acorde a su crecimiento.`, nivel: 'verde' })
        } else {
          resumen.push({ texto: `Peso aumentó de ${primero} kg a ${ultimo} kg en los últimos 6 meses.`, nivel: 'amarillo' })
        }
      } else {
        resumen.push({ texto: `Peso disminuyó de ${primero} kg a ${ultimo} kg en los últimos 6 meses.`, nivel: 'amarillo' })
      }
    }
  }

  // Vacunas: solo se cuenta como "vencida" si la aplicación MÁS
  // RECIENTE de ese nombre de vacuna ya pasó su próxima fecha -- una
  // vacuna vieja reemplazada por una más nueva no cuenta.
  if (vacunas.length > 0) {
    const vigentesPorNombre = masRecientesPorNombre(vacunas)
    const vencidas = vigentesPorNombre.filter((v: any) => v.proxima_fecha && new Date(v.proxima_fecha + 'T00:00:00') < hoy)
    resumen.push(vencidas.length > 0
      ? { texto: `${vencidas.length} vacuna${vencidas.length === 1 ? '' : 's'} vencida${vencidas.length === 1 ? '' : 's'}.`, nivel: 'rojo' }
      : { texto: 'Vacunas al día.', nivel: 'verde' })
  }

  // Antiparasitario: se mira la ÚLTIMA DOSIS APLICADA (por
  // fecha_aplicacion, no por proxima_fecha) -- una dosis vieja del
  // historial que ya fue reemplazada no debe seguir contando.
  if (antis.length > 0) {
    const masReciente = antis.slice().sort((a: any, b: any) => (b.fecha_aplicacion || '').localeCompare(a.fecha_aplicacion || ''))[0]
    const vigente = masReciente?.proxima_fecha && new Date(masReciente.proxima_fecha + 'T00:00:00') >= hoy
    resumen.push(vigente ? { texto: 'Antiparasitario vigente.', nivel: 'verde' } : { texto: 'Antiparasitario vencido o sin próxima fecha registrada.', nivel: 'rojo' })
  }

  // Observaciones activas
  const obsActivas = obs.filter((o: any) => o.estado === 'activa').length
  if (obsActivas > 0) {
    resumen.push({ texto: `${obsActivas} observación${obsActivas === 1 ? '' : 'es'} activa${obsActivas === 1 ? '' : 's'}.`, nivel: 'amarillo' })
  }

  // Último perfil bioquímico + parámetros fuera de rango
  const bioquimicos = examenesLab.filter((e: any) => e.tipo === 'bioquimico').sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
  if (bioquimicos.length > 0) {
    const ultimo = bioquimicos[0]
    const dias = diasDesde(ultimo.fecha)
    resumen.push({ texto: `Último perfil bioquímico hace ${dias} día${dias === 1 ? '' : 's'}.`, nivel: 'verde' })
    const fuera = (ultimo.resultados || []).filter((r: any) => fueraDeRango(r.valor, r.rango_min, r.rango_max)).length
    if (fuera > 0) resumen.push({ texto: `${fuera} parámetro${fuera === 1 ? '' : 's'} fuera de rango en el último bioquímico.`, nivel: 'rojo' })
  }

  // Último hemograma
  const hemogramas = examenesLab.filter((e: any) => e.tipo === 'hemograma').sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
  if (hemogramas.length > 0) {
    const ultimo = hemogramas[0]
    const dias = diasDesde(ultimo.fecha)
    resumen.push({ texto: `Último hemograma hace ${dias} día${dias === 1 ? '' : 's'}.`, nivel: 'verde' })
  }

  return resumen
}

function SeccionVet({ titulo, children, abiertaPorDefecto = false }: { titulo: string, children: React.ReactNode, abiertaPorDefecto?: boolean }) {
  return (
    <details open={abiertaPorDefecto} className="seccion-vet bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: '.seccion-vet[open] > summary .flecha-vet { transform: rotate(180deg); }' }} />
      <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none">
        <span className="font-bold text-sm text-[#3D2B1F]">{titulo}</span>
        <span className="flecha-vet text-[#8C572F] text-sm font-bold select-none transition-transform">▼</span>
      </summary>
      <div className="border-t border-[#EEE2D4] px-4 py-3">
        {children}
      </div>
    </details>
  )
}

function RegistroCard({ r }: { r: any }) {
  return (
    <div className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold">{fmt(r.fecha)}</p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${EC[r.estado_dia]}20`, color: EC[r.estado_dia] }}>
          {EL[r.estado_dia]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {CAMPOS_SALUD.filter(([,k]) => r[k] && r[k] !== 'normal').map(([label, key]) => (
          <span key={key} className="text-xs text-[#8A7560]">
            <span className="font-medium text-[#3D2B1F]">{label}:</span> {r[key].replace(/_/g,' ')}
          </span>
        ))}
      </div>
      {r.nota && <p className="text-xs text-[#8A7560] mt-1 italic">📝 {r.nota}</p>}
    </div>
  )
}

function VacunaCard({ v }: { v: any }) {
  return (
    <div className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{v.nombre}</p>
        {v.proxima_fecha && <p className="text-xs text-[#8A7560]">Próxima: {fmt(v.proxima_fecha)}</p>}
      </div>
      <p className="text-xs text-[#8A7560] mt-0.5">Aplicada: {fmt(v.fecha_aplicacion)}{v.lote ? ` · Lote: ${v.lote}` : ''}</p>
    </div>
  )
}

function AntiCard({ a }: { a: any }) {
  return (
    <div className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{a.nombre}</p>
        {a.proxima_fecha && <p className="text-xs text-[#8A7560]">Próxima: {fmt(a.proxima_fecha)}</p>}
      </div>
      <p className="text-xs text-[#8A7560] mt-0.5">{a.tipo} · {fmt(a.fecha_aplicacion)}</p>
    </div>
  )
}

// Estado DERIVADO de un medicamento: no basta con estado='activo' en
// la base (ese campo no se actualiza solo) — si fecha_fin ya pasó, el
// tratamiento terminó. Misma regla que usan Prevención y el dashboard.
function medicamentoEstaActivo(med: any): boolean {
  if (med.estado !== 'activo') return false
  // Un tratamiento que empieza el 10 no esta activo el 2. Sin esta
  // comprobacion, el veterinario veia "Activo · 0 de 8 dosis" en un
  // tratamiento que aun no comienza, y podia concluir que el tutor
  // no estaba cumpliendo.
  const hoyInicio = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  if (med.fecha_inicio && med.fecha_inicio > hoyInicio) return false
  if (!med.fecha_fin) return true
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  return med.fecha_fin >= hoy
}

// Adherencia al tratamiento: cuantas dosis se REGISTRARON sobre
// cuantas correspondian entre la fecha de inicio y la de termino
// (o hoy, si el tratamiento sigue en curso).
//
// Las fechas se construyen a MEDIODIA para que los cambios de
// horario de verano (Chile los tiene dos veces al año) no
// desplacen el conteo de dias al restar 24 horas.
function calcularAdherencia(med: any, dadas: number): { esperadas: number; dadas: number; pct: number } | null {
  if (!med.fecha_inicio) return null
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const finReal = med.fecha_fin && med.fecha_fin < hoy ? med.fecha_fin : hoy
  const ini = new Date(med.fecha_inicio + 'T12:00:00')
  const fin = new Date(finReal + 'T12:00:00')
  const dias = Math.floor((fin.getTime() - ini.getTime()) / 86400000) + 1
  if (dias <= 0) return null
  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)
  // Solo cuentan los dias que llevaban dosis. Un tratamiento dia
  // por medio de 7 dias son 4 dias con dosis, no 7: dividir por
  // todos mostraria al veterinario un incumplimiento inexistente.
  const intervalo = Math.max(1, Number(med.intervalo_dias) || 1)
  const diasConDosis = Math.floor((dias - 1) / intervalo) + 1
  const esperadas = diasConDosis * porDia
  if (esperadas <= 0) return null
  return { esperadas, dadas, pct: Math.round((dadas / esperadas) * 100) }
}

function MedicamentoCard({ med, tomas }: { med: any; tomas: number }) {
  const activo = medicamentoEstaActivo(med)
  const adh = calcularAdherencia(med, tomas)
  // Semaforo de salud del proyecto. El ancho de la barra se topa
  // en 100 aunque se hayan registrado mas dosis de las esperadas.
  const colorAdh = !adh ? '#8A7560' : adh.pct >= 80 ? '#4CAF7D' : adh.pct >= 50 ? '#F5C842' : '#E05252'
  return (
    <div className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{med.nombre}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activo ? 'bg-[#4AABDB]/20 text-[#4AABDB]' : 'bg-[#EEE2D4] text-[#8A7560]'}`}>
          {activo ? 'Activo' : 'Finalizado'}
        </span>
      </div>
      {med.dosis && <p className="text-xs text-[#8A7560] mt-0.5">{med.dosis}{med.frecuencia ? ` · ${med.frecuencia}` : ''}</p>}
      <p className="text-xs text-[#8A7560] mt-0.5">Desde: {fmt(med.fecha_inicio)}{med.fecha_fin ? ` hasta ${fmt(med.fecha_fin)}` : ''}</p>
      {med.motivo && <p className="text-xs text-[#8A7560] mt-0.5">Motivo: {med.motivo}</p>}
      {adh && (
        <div className="mt-1.5">
          <div className="h-1.5 rounded-full bg-[#EEE2D4] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, adh.pct)}%`, background: colorAdh }} />
          </div>
          <p className="text-xs mt-1" style={{ color: colorAdh }}>
            <span className="font-bold">{adh.dadas} de {adh.esperadas} dosis registradas</span>
            <span className="text-[#8A7560]"> · {adh.pct}%</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default async function VetPage({ searchParams }: Props) {
  const token = searchParams?.token

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F5EDE3]">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-[#3D2B1F] mb-2">Link inválido</h1>
        <p className="text-[#8A7560] text-sm">Este link no es válido o ha expirado.</p>
      </div>
    )
  }

  const supabase = createVetClient()
  const { data: datos, error } = await supabase
    .rpc('obtener_datos_veterinario', { token_param: token })

  if (error || !datos) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F5EDE3]">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-[#3D2B1F] mb-2">Link expirado</h1>
        <p className="text-[#8A7560] text-sm">Este link ya no está activo. Pide al tutor que genere uno nuevo.</p>
      </div>
    )
  }

  const mascota = datos.mascota

  const { data: historialPeso } = await supabase
    .from('historial_peso')
    .select('*')
    .eq('mascota_id', datos.mascota.id)
    .order('fecha', { ascending: false })
    .limit(20)

  const { data: respiracion } = await supabase
    .from('frecuencia_respiratoria')
    .select('*')
    .eq('mascota_id', datos.mascota.id)
    .order('fecha', { ascending: false })
    .limit(5)

  const { data: temperatura } = await supabase
    .from('temperatura_corporal')
    .select('*')
    .eq('mascota_id', datos.mascota.id)
    .order('fecha', { ascending: false })
    .limit(5)

  const { data: ciclos } = await supabase
    .from('ciclos_reproductivos')
    .select('*')
    .eq('mascota_id', datos.mascota.id)
    .order('fecha_inicio', { ascending: false })
    .limit(5)

  const { data: etapas } = await supabase
    .from('etapas_reproductivas')
    .select('*')
    .eq('mascota_id', datos.mascota.id)
    .order('fecha', { ascending: true })

  // Enriquecimiento de los últimos 30 días — para el item de actividad
  // (solo perros). El paseo ya viene en los registros; esto suma la
  // estimulación mental/física estructurada.
  const hace30Vet = new Date()
  hace30Vet.setDate(hace30Vet.getDate() - 30)
  const inicio30Vet = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(hace30Vet)
  const { data: enriqVet } = await supabase
    .from('enriquecimientos')
    .select('fecha, duracion_min')
    .eq('mascota_id', datos.mascota.id)
    .gte('fecha', inicio30Vet)

  // Cargar evoluciones de cada observación
  const obsData = datos.observaciones || []
  const obsConEvoluciones = await Promise.all(
    obsData.map(async (o: any) => {
      const { data: evos } = await supabase
        .from('observacion_evoluciones')
        .select('*')
        .eq('observacion_id', o.id)
        .order('fecha', { ascending: false })
      return { ...o, evoluciones: evos || [] }
    })
  )

  const registros = datos.registros || []

  // Etiquetas legibles del tamaño del perro (la base guarda la clave).
  // Solo aplica a perros; para gatos queda en "—".
  const TAMANO_NOMBRE_VET: Record<string, string> = {
    muy_pequeno: 'Muy pequeño',
    pequeno: 'Pequeño',
    mediano: 'Mediano',
    grande: 'Grande',
    gigante: 'Gigante',
  }

  // --- Actividad física diaria promedio (SOLO PERROS) ---
  // Combina paseo + enriquecimiento de los últimos 30 días y lo expresa
  // como minutos/día, para que el veterinario sepa de un vistazo si es
  // un perro activo, moderado o sedentario. Es un promedio sobre los 30
  // días del período (no solo los días con actividad), que es lo que
  // refleja el nivel real de ejercicio.
  const MIN_PASEO_VET: Record<string, number> = {
    '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180,
  }
  function minPaseoVet(r: any): number {
    if (r.paseo === 'tiempo_exacto' && typeof r.paseo_minutos_exactos === 'number') return r.paseo_minutos_exactos
    return MIN_PASEO_VET[r.paseo] || 0
  }
  const esPerroVet = mascota?.especie === 'Perro'
  let actividadPromedioDia: number | null = null
  let nivelActividad: { label: string; color: string } | null = null
  if (esPerroVet) {
    const inicio = inicio30Vet
    const totalPaseo = registros
      .filter((r: any) => r.fecha >= inicio)
      .reduce((acc: number, r: any) => acc + minPaseoVet(r), 0)
    const totalEnr = (enriqVet || []).reduce((acc: number, e: any) => acc + (e.duracion_min || 0), 0)

    // Días REALMENTE cubiertos por los registros, no 30 fijos. Antes,
    // un tutor con pocos días de uso aparecía como "Bajo" aunque
    // paseara su perro una hora diaria — un dato falso sobre el que
    // un veterinario podría decidir.
    const fechasVet = registros
      .filter((r: any) => r.fecha >= inicio)
      .map((r: any) => r.fecha as string)
      .sort()
    const hoyVetStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    let diasVet = 30
    if (fechasVet.length > 0) {
      const primeraVet = new Date(fechasVet[0] + 'T12:00:00')
      const hoyVet = new Date(hoyVetStr + 'T12:00:00')
      const d = Math.round((hoyVet.getTime() - primeraVet.getTime()) / 86400000) + 1
      diasVet = Math.max(1, Math.min(30, d))
    }

    actividadPromedioDia = Math.round((totalPaseo + totalEnr) / diasVet)
    // Rangos orientativos de actividad diaria para un perro adulto.
    // No son un estándar clínico rígido; ayudan a leer el número.
    //
    // Con menos de una semana de registros NO se etiqueta: el
    // promedio existe pero es ruido, y una etiqueta clínica sobre
    // ruido es peor que ninguna etiqueta.
    if (diasVet < 7) {
      nivelActividad = { label: `Pocos datos (${diasVet} ${diasVet === 1 ? 'día' : 'días'})`, color: '#8A7560' }
    } else if (actividadPromedioDia >= 60) nivelActividad = { label: 'Activo', color: '#4CAF7D' }
    else if (actividadPromedioDia >= 30) nivelActividad = { label: 'Moderado', color: '#F5C842' }
    else nivelActividad = { label: 'Bajo', color: '#F07A30' }
  }
  // Dieta especial más reciente registrada (indicación veterinaria).
  // Se muestra al vet como contexto: si el tutor viene registrando
  // dieta gastrointestinal, es dato clínico relevante.
  const DIETA_ESPECIAL_VET: Record<string, string> = {
    dieta_blanda: 'Dieta blanda',
    gastrointestinal: 'Alimento gastrointestinal',
    recuperacion: 'Dieta de recuperación',
    otro: 'Dieta especial',
  }
  const registrosConDieta = registros
    .filter((r: any) => r.alimentacion_especial)
    .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))
  const dietaEspecialReciente = registrosConDieta[0] || null
  // Cuántos de los últimos registros la traen (señal de continuidad).
  const diasConDietaEspecial = registrosConDieta.length
  const vacunas = datos.vacunas || []
  const antis = datos.antiparasitarios || []
  const obs = obsConEvoluciones
  const examenes = datos.examenes || []
  const enfermedades = datos.enfermedades || []
  const medicamentos = datos.medicamentos || []
  const examenesLab = datos.examenes_lab || []

  const motivosConsulta = detectarMotivosConsulta(registros)
  // La dieta especial se muestra como un chip más dentro de "Posible
  // motivo de consulta" (ej. "Dieta blanda · 3 días"), en vez de un
  // cuadro aparte. Es información del mismo tipo: qué está pasando
  // últimamente que el vet debería saber.
  const chipDieta = dietaEspecialReciente
    ? `${DIETA_ESPECIAL_VET[dietaEspecialReciente.alimentacion_especial] || 'Dieta especial'} · ${diasConDietaEspecial === 1 ? '1 día' : `${diasConDietaEspecial} días`}`
    : null
  const chipsMotivo = chipDieta ? [...motivosConsulta, chipDieta] : motivosConsulta
  const resumenClinico = construirResumenClinico({ historialPeso: historialPeso || [], vacunas, antis, obs, examenesLab, fechaNacimiento: mascota?.fecha_nacimiento, especie: mascota?.especie })

  const medicamentosActivos = medicamentos.filter((m: any) => medicamentoEstaActivo(m))
  const medicamentosFinalizados = medicamentos.filter((m: any) => !medicamentoEstaActivo(m))

  // Dosis registradas por medicamento. Se consultan SOLO por los
  // ids que el RPC ya devolvio, es decir, medicamentos que el token
  // del link ya autorizo: no se abre ningun acceso nuevo.
  const tomasPorMed: Record<string, number> = {}
  const idsMeds = medicamentos.map((md: any) => md.id).filter(Boolean)
  if (idsMeds.length > 0) {
    const { data: tomasVet } = await supabase
      .from('medicamento_tomas')
      .select('medicamento_id')
      .in('medicamento_id', idsMeds)
    for (const t of ((tomasVet || []) as { medicamento_id: string }[])) {
      tomasPorMed[t.medicamento_id] = (tomasPorMed[t.medicamento_id] || 0) + 1
    }
  }

  const examenesConUrl = await Promise.all(
    examenes.map(async (ex: any) => {
      const { data: signed } = await supabase.storage
        .from('examenes')
        .createSignedUrl(ex.archivo_path, 60)
      return { ...ex, signedUrl: signed?.signedUrl || null }
    })
  )

  return (
    <div className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg mx-auto">

      {/* Header */}
      <div className="bg-[#6B4423] text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <img src="/chiqui/chiqui_doctor.png" alt="" className="w-10 h-10 object-contain flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#FFBD59] tracking-widest uppercase">CHIQUI Entre Señales</div>
            <div className="text-xs text-white/80">Vista veterinaria · Solo lectura</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mascota.foto_url ? (
            <img src={mascota.foto_url} alt={mascota.nombre} className="w-16 h-16 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-2xl flex-shrink-0">
              {mascota.especie === 'Gato' ? '🐱' : '🐶'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{mascota.nombre}</h1>
            <p className="text-white/80 text-sm mt-0.5">
              {mascota.especie}{mascota.raza ? ` · ${mascota.raza}` : ''}
              {mascota.fecha_nacimiento ? ` · ${calcEdad(mascota.fecha_nacimiento)}` : ''}
              {mascota.sexo ? ` · ${mascota.sexo}` : ''}
              {mascota.castrado ? ' · Esterilizado/a' : ''}
            </p>
          </div>
        </div>
        {mascota.alergias && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E05252]/20 text-white">
            ⚠️ Alergia: {mascota.alergias}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-3">

        {/* 1. Ficha del paciente -- prácticamente igual, se agrega Estado
            reproductivo explícito (antes solo aparecía implícito como
            "Esterilizado/a" en el header). */}
        <div className="bg-[#FFFCF8] rounded-2xl p-4 border border-[#EEE2D4]">
          <div className="flex items-center gap-2 mb-3">
            <img src="/chiqui/chiqui_registro.png" alt="" className="w-6 h-6 object-contain" />
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider">Ficha del paciente</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Estado reproductivo', mascota.castrado ? 'Esterilizado/a' : 'Entero/a'],
              ['Peso actual', mascota.peso_actual ? `${mascota.peso_actual} kg` : '—'],
              ['Tamaño', TAMANO_NOMBRE_VET[mascota.tamano_esperado as string] || '—'],
              ['Alimentación', mascota.alimentacion_tipo || '—'],
              ['Marca / proteína', mascota.alimentacion_marca || '—'],
              ['Microchip', mascota.microchip || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-[#8A7560]">{k}</p>
                <p className="text-sm font-semibold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Resumen clínico -- NUEVO. Resume el historial completo, sin
            diagnosticar. No compite con "Posible motivo de consulta"
            (esa se basa solo en los últimos 7 días de registro diario). */}
        {resumenClinico.length > 0 && (
          <div className="bg-[#FFFCF8] rounded-2xl p-4 border border-[#EEE2D4]">
            <h2 className="font-extrabold text-sm text-[#3D2B1F] mb-3">📋 Resumen clínico</h2>
            {(['rojo', 'amarillo', 'verde'] as const).map(nivel => {
              const items = resumenClinico.filter(r => r.nivel === nivel)
              if (items.length === 0) return null
              const dot = nivel === 'rojo' ? '#E05252' : nivel === 'amarillo' ? '#F5C842' : '#4CAF7D'
              const encabezado = nivel === 'rojo' ? 'Requiere atención' : nivel === 'amarillo' ? 'A observar' : 'Al día'
              return (
                <div key={nivel} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: dot }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: dot }}>{encabezado}</p>
                  </div>
                  <ul className="space-y-1 pl-4">
                    {items.map((r, i) => (
                      <li key={i} className="text-xs text-[#3D2B1F] leading-relaxed list-disc marker:text-[#8A7560]">{r.texto}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        {/* 3. Posible motivo de consulta -- se mantiene igual, función
            distinta al Resumen clínico (esta mira solo los últimos 7 días). */}
        <div className="bg-[#FBEAD9] rounded-2xl p-4 border border-[#CD7421]/30">
          <h2 className="font-bold text-xs text-[#CD7421] uppercase tracking-wider mb-2">
            🩺 Posible motivo de consulta
          </h2>
          <p className="text-[11px] text-[#8A7560] mb-2">Basado en los últimos 7 días:</p>
          {chipsMotivo.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chipsMotivo.map(m => (
                <span key={m} className="bg-[#FFFCF8] border border-[#CD7421]/30 text-[#8C572F] text-xs font-semibold px-2.5 py-1 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <p className="text-sm font-semibold text-[#4CAF7D]">Sin alertas recientes — posible control de rutina</p>
            </div>
          )}
        </div>

        {/* Actividad física (solo perros): desplegable para no alargar.
            Promedio diario de paseo + enriquecimiento en 30 días. */}
        {esPerroVet && actividadPromedioDia !== null && nivelActividad && (
          <SeccionVet titulo={`🐾 Actividad física · ${actividadPromedioDia >= 60 ? `${Math.floor(actividadPromedioDia / 60)}h ${actividadPromedioDia % 60}m` : `${actividadPromedioDia} min`}/día`}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#3D2B1F]">
                {actividadPromedioDia >= 60
                  ? `${Math.floor(actividadPromedioDia / 60)}h ${actividadPromedioDia % 60}m`
                  : `${actividadPromedioDia} min`}
              </span>
              <span className="text-xs text-[#8A7560]">promedio al día</span>
              <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${nivelActividad.color}22`, color: nivelActividad.color }}>
                {nivelActividad.label}
              </span>
            </div>
            <p className="text-[10px] text-[#8A7560] mt-1.5">Paseo y enriquecimiento combinados, últimos 30 días.</p>
          </SeccionVet>
        )}

        {/* La dieta especial ahora se muestra como chip dentro de
            "Posible motivo de consulta" (arriba), no como cuadro aparte. */}

        {/* ÁREA: Historial médico */}
        <div className="flex items-center gap-2 mb-1">
          <img src="/chiqui/chiqui_examen.png" alt="" className="w-6 h-6 object-contain" />
          <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Historial médico</p>
        </div>

        {/* 4. Observaciones -- tarjeta resumida por defecto (título,
            estado, cantidad de actualizaciones, última fecha). Solo al
            desplegar aparece la línea de tiempo completa con fotos. */}
        {obs.length > 0 && (
          <SeccionVet titulo={`👁️ Observaciones (${obs.length})`}>
            <div className="space-y-3">
              {obs.map((o: any) => {
                const puntos = [
                  { fecha: o.fecha_inicio, nota: o.descripcion, foto_url: o.foto_url, inicial: true },
                  ...((o.evoluciones || []).map((e: any) => ({ fecha: e.fecha, nota: e.nota, foto_url: e.foto_url, inicial: false }))),
                ].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                const totalActualizaciones = puntos.length

                return (
                  <details key={o.id} className="border border-[#EEE2D4] rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer list-none bg-[#FBEAD9]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{o.titulo}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${o.estado === 'activa' ? 'bg-[#F07A30]/20 text-[#F07A30]' : 'bg-[#4CAF7D]/20 text-[#4CAF7D]'}`}>
                            {o.estado === 'activa' ? 'Activa' : 'Resuelta'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8A7560] mt-0.5">
                          {totalActualizaciones} actualización{totalActualizaciones === 1 ? '' : 'es'} · Última actualización: {fmt(puntos[0]?.fecha)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#4AABDB] flex-shrink-0 ml-2 select-none">▼ Ver evolución</span>
                    </summary>

                    <div className="p-3 border-t border-[#EEE2D4]">
                      {o.fecha_resolucion && (
                        <p className="text-xs text-[#4CAF7D] mb-2">✅ Resuelta el {fmt(o.fecha_resolucion)}</p>
                      )}
                      <div className="relative">
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#EEE2D4]" />
                        <div className="space-y-3 pl-7">
                          {puntos.map((p, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#8C572F] border-2 border-[#FFFCF8]" />
                              <p className="text-[10px] font-bold text-[#8C572F] uppercase tracking-wider">
                                {fmt(p.fecha)}{p.inicial ? ' · Inicio' : ''}
                              </p>
                              {p.nota && <p className="text-xs text-[#3D2B1F] mt-0.5 leading-relaxed">{p.nota}</p>}
                              {p.foto_url && (
                                // Imagen COMPLETA (object-contain sobre fondo), no
                                // recortada: en una observación clínica el recorte
                                // puede ocultar justo la zona relevante. Mismo
                                // tratamiento que la vista del tutor en Prevención.
                                <FotoAmpliable src={p.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          </SeccionVet>
        )}

        {/* 5. Registros diarios -- solo los 5 más recientes visibles de
            entrada; el resto queda detrás de "Ver registros anteriores". */}
        {registros.length > 0 && (
          <SeccionVet titulo={`📋 Registros recientes (${registros.length})`}>
            <div className="space-y-2">
              {registros.slice(0, 5).map((r: any) => <RegistroCard key={r.id} r={r} />)}
            </div>
            {registros.length > 5 && (
              <details className="mt-2">
                <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none">
                  Ver registros anteriores ({registros.length - 5})
                </summary>
                <div className="space-y-2 mt-2">
                  {registros.slice(5).map((r: any) => <RegistroCard key={r.id} r={r} />)}
                </div>
              </details>
            )}
          </SeccionVet>
        )}

        {/* Enfermedades */}
        {enfermedades.length > 0 && (
          <SeccionVet titulo={`🏥 Enfermedades (${enfermedades.length})`}>
            <div className="space-y-2">
              {enfermedades.map((enf: any) => {
                const estadoColor: Record<string,string> = { activa:'#F07A30', cronica:'#E05252', resuelta:'#4CAF7D' }
                const estadoLabel: Record<string,string> = { activa:'Activa', cronica:'Crónica', resuelta:'Resuelta' }
                return (
                  <div key={enf.id} className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{enf.diagnostico}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${estadoColor[enf.estado]}20`, color: estadoColor[enf.estado] }}>
                        {estadoLabel[enf.estado] || enf.estado}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A7560] mt-0.5">Diagnosticada: {fmt(enf.fecha_diagnostico)}{enf.veterinario ? ` · ${enf.veterinario}` : ''}</p>
                    {enf.nota && <p className="text-xs text-[#8A7560] mt-1 italic">📝 {enf.nota}</p>}
                    {enf.foto_url && (
                      <img src={enf.foto_url} alt={enf.diagnostico} className="w-full h-40 object-cover rounded-xl mt-2" />
                    )}
                  </div>
                )
              })}
            </div>
          </SeccionVet>
        )}

        {/* Exámenes (PDF adjunto) */}
        {examenesConUrl.length > 0 && (
          <SeccionVet titulo={`📄 Exámenes (${examenesConUrl.length})`}>
            <div className="space-y-2">
              {examenesConUrl.map((ex: any) => {
                const cat = CATEGORIAS_EXAMEN[ex.categoria] || CATEGORIAS_EXAMEN.otro
                return (
                  <div key={ex.id} className="pb-2 border-b border-[#EEE2D4] last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{ex.nombre || cat.label}</p>
                        <p className="text-xs text-[#8A7560]">{cat.label} · {fmt(ex.fecha)}</p>
                      </div>
                    </div>
                    {ex.nota && <p className="text-xs text-[#8A7560] mt-1 italic">📝 {ex.nota}</p>}
                    {ex.signedUrl && (
                      <a href={ex.signedUrl} target="_blank" rel="noopener noreferrer"
                        className="w-full mt-2 bg-[#8C572F]/10 text-[#8C572F] font-bold py-2 rounded-xl text-sm inline-flex items-center justify-center">
                        📄 Ver / descargar PDF
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </SeccionVet>
        )}

        {/* 6. Exámenes de laboratorio -- resumido por defecto (fecha,
            peso, parámetros fuera de rango con flechas), tabla completa
            solo al desplegar. Ver ExamenesLabVet.tsx. */}
        {examenesLab.length > 0 && (
          <SeccionVet titulo={`🧫 Exámenes de laboratorio (${examenesLab.length})`}>
            <ExamenesLabVet examenesLab={examenesLab} />
          </SeccionVet>
        )}

        {/* ÁREA: Prevención */}
        <div className="flex items-center gap-2 mb-1">
          <img src="/chiqui/chiqui_escudo.png" alt="" className="w-6 h-6 object-contain" />
          <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Prevención</p>
        </div>

        {/* 7. Vacunas -- estado + próxima primero, historial detrás de un
            desplegable. Solo se considera la aplicación más reciente
            de CADA nombre de vacuna (una vacuna vieja reemplazada por
            una más nueva del mismo tipo no cuenta como "vencida"). */}
        {vacunas.length > 0 && (() => {
          const hoy = new Date()
          const vigentesPorNombre = masRecientesPorNombre(vacunas)
          const vencidas = vigentesPorNombre.filter((v: any) => v.proxima_fecha && new Date(v.proxima_fecha + 'T00:00:00') < hoy)
          const conProxima = vigentesPorNombre.filter((v: any) => v.proxima_fecha).sort((a: any, b: any) => a.proxima_fecha.localeCompare(b.proxima_fecha))
          const proxima = conProxima.find((v: any) => new Date(v.proxima_fecha + 'T00:00:00') >= hoy) || conProxima[0]
          return (
            <SeccionVet titulo={`💉 Vacunas (${vacunas.length})`}>
              <div className="mb-3 pb-3 border-b border-[#EEE2D4]">
                <p className="text-xs font-bold" style={{ color: vencidas.length > 0 ? '#E05252' : '#4CAF7D' }}>
                  {vencidas.length > 0 ? `⚠️ ${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'}` : '✅ Al día'}
                </p>
                {proxima?.proxima_fecha && (
                  <p className="text-xs text-[#8A7560] mt-0.5">Próxima: {proxima.nombre} · {fmt(proxima.proxima_fecha)}</p>
                )}
              </div>
              <details>
                <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none mb-2">Ver historial ({vacunas.length})</summary>
                <div className="space-y-2 mt-2">
                  {vacunas.map((v: any) => <VacunaCard key={v.id} v={v} />)}
                </div>
              </details>
            </SeccionVet>
          )
        })()}

        {/* 8. Antiparasitarios -- a diferencia de Vacunas, aquí se mira
            SOLO la última dosis aplicada en general (por
            fecha_aplicacion), sin importar el nombre del producto --
            es "cuándo toca la próxima dosis", y cambiar de producto
            (ej. de Mebermic a Simpárica trío) no debería dejar
            marcado "vencido" algo que ya fue reemplazado. */}
        {antis.length > 0 && (() => {
          const hoy = new Date()
          const masReciente = antis.slice().sort((a: any, b: any) => (b.fecha_aplicacion || '').localeCompare(a.fecha_aplicacion || ''))[0]
          const vencido = masReciente?.proxima_fecha && new Date(masReciente.proxima_fecha + 'T00:00:00') < hoy
          return (
            <SeccionVet titulo={`💊 Antiparasitarios (${antis.length})`}>
              <div className="mb-3 pb-3 border-b border-[#EEE2D4]">
                <p className="text-xs font-bold" style={{ color: vencido ? '#E05252' : '#4CAF7D' }}>
                  {vencido ? '⚠️ Vencido' : '✅ Al día'}
                </p>
                {masReciente?.proxima_fecha && (
                  <p className="text-xs text-[#8A7560] mt-0.5">Próxima: {masReciente.nombre} · {fmt(masReciente.proxima_fecha)}</p>
                )}
              </div>
              <details>
                <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none mb-2">Ver historial ({antis.length})</summary>
                <div className="space-y-2 mt-2">
                  {antis.map((a: any) => <AntiCard key={a.id} a={a} />)}
                </div>
              </details>
            </SeccionVet>
          )
        })()}

        {/* 9. Medicamentos -- activos primero (siempre visibles),
            finalizados detrás de un desplegable. */}
        {medicamentos.length > 0 && (
          <SeccionVet titulo={`🩹 Medicamentos (${medicamentos.length})`}>
            <p className="text-xs text-[#8A7560] mb-3 leading-relaxed italic">
              El porcentaje refleja las dosis que el tutor registró en la app. Una dosis sin registrar no significa necesariamente que no se haya administrado.
            </p>
            {medicamentosActivos.length > 0 ? (
              <div className="space-y-2 mb-3">
                {medicamentosActivos.map((med: any) => <MedicamentoCard key={med.id} med={med} tomas={tomasPorMed[med.id] || 0} />)}
              </div>
            ) : (
              <p className="text-xs text-[#8A7560] mb-3">Sin medicamentos activos.</p>
            )}
            {medicamentosFinalizados.length > 0 && (
              <details>
                <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none">
                  Finalizados ({medicamentosFinalizados.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {medicamentosFinalizados.map((med: any) => <MedicamentoCard key={med.id} med={med} tomas={tomasPorMed[med.id] || 0} />)}
                </div>
              </details>
            )}
          </SeccionVet>
        )}

        {/* ÁREA: Signos vitales */}
        <div className="flex items-center gap-2 mb-1 mt-2">
          <img src="/chiqui/chiqui_temperatura.png" alt="" className="w-6 h-6 object-contain" />
          <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Signos vitales</p>
        </div>

        {respiracion && respiracion.length > 0 && (
          <SeccionVet titulo={`🫁 Frecuencia respiratoria (${respiracion.length})`}>
            <div className="space-y-2">
              {respiracion.map((r: any) => {
                const color = r.rpm < 15 ? '#4AABDB' : r.rpm < 30 ? '#4CAF7D' : r.rpm < 40 ? '#F5C842' : '#E05252'
                const label = r.rpm < 15 ? 'Muy baja' : r.rpm < 30 ? 'Normal' : r.rpm < 40 ? 'Atención' : 'Urgente'
                return (
                  <div key={r.id} className="flex items-center justify-between pb-2 border-b border-[#EEE2D4] last:border-0">
                    <div>
                      <span className="text-sm font-bold" style={{ color }}>{r.rpm} rpm</span>
                      <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}20`, color }}>{label}</span>
                      <p className="text-xs text-[#8A7560] mt-0.5">{fmt(r.fecha)}{r.nota ? ` · ${r.nota}` : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SeccionVet>
        )}

        {temperatura && temperatura.length > 0 && (
          <SeccionVet titulo={`🌡️ Temperatura corporal (${temperatura.length})`}>
            <div className="space-y-2">
              {temperatura.map((t: any) => {
                const temp = t.temperatura
                const color = temp < 37.5 ? '#4AABDB' : temp < 39.3 ? '#4CAF7D' : temp < 39.5 ? '#F5C842' : temp < 41 ? '#F07A30' : '#E05252'
                const label = temp < 37.5 ? 'Hipotermia' : temp < 39.3 ? 'Normal' : temp < 39.5 ? 'Atención' : temp < 41 ? 'Fiebre' : 'Emergencia'
                return (
                  <div key={t.id} className="flex items-center justify-between pb-2 border-b border-[#EEE2D4] last:border-0">
                    <div>
                      <span className="text-sm font-bold" style={{ color }}>{temp}°C</span>
                      <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}20`, color }}>{label}</span>
                      <p className="text-xs text-[#8A7560] mt-0.5">{fmt(t.fecha)}{t.nota ? ` · ${t.nota}` : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SeccionVet>
        )}

        {ciclos && ciclos.length > 0 && (
          <SeccionVet titulo={`🌸 Ciclo reproductivo (${ciclos.length})`}>
            <div className="space-y-2">
              {ciclos.map((c: any) => (
                <div key={c.id} className="pb-2 border-b border-[#EEE2D4] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{c.tipo === 'celo' ? '🌸' : c.tipo === 'embarazo' ? '🤰' : '🍼'}</span>
                    <span className="text-sm font-semibold capitalize">{c.tipo}</span>
                    {c.duracion_dias && <span className="text-xs text-[#8A7560]">{c.duracion_dias} días</span>}
                  </div>
                  <p className="text-xs text-[#8A7560] mt-0.5">{fmt(c.fecha_inicio)}{c.fecha_termino ? ` → ${fmt(c.fecha_termino)}` : ' → en curso'}</p>
                  {c.notas && <p className="text-xs text-[#8A7560] italic">{c.notas}</p>}
                </div>
              ))}
            </div>
          </SeccionVet>
        )}

        {etapas && etapas.length > 0 && (
          <SeccionVet titulo={`📍 Línea de vida reproductiva (${etapas.length})`}>
            <div className="space-y-2">
              {etapas.map((e: any) => {
                const tipos: Record<string,string> = { primer_celo:'🌸 Primer celo', esterilizacion:'✂️ Esterilización', embarazo:'🤰 Embarazo', parto:'🐣 Parto', lactancia:'🍼 Lactancia', tumor_mamario:'🎗️ Tumor mamario', otro:'📋 Otro' }
                return (
                  <div key={e.id} className="flex items-center gap-2 pb-2 border-b border-[#EEE2D4] last:border-0">
                    <div>
                      <p className="text-sm font-semibold">{tipos[e.tipo] || e.tipo}</p>
                      <p className="text-xs text-[#8A7560]">{fmt(e.fecha)}{e.notas ? ` · ${e.notas}` : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SeccionVet>
        )}

        <div className="text-center pt-6 pb-2 border-t border-[#EEE2D4] mt-2">
          <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-12 h-12 object-contain mx-auto mb-2" />
          <p className="text-sm font-bold text-[#8C572F]">CHIQUI Entre Señales</p>
          <p className="text-xs text-[#8A7560] mt-1 leading-relaxed">
            Información de observación del tutor.<br/>No reemplaza la evaluación clínica.
          </p>
        </div>

      </div>
    </div>
  )
}
