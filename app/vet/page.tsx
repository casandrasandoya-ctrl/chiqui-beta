import { createVetClient } from '@/utils/supabase/vet-client'
import ExamenesLabVet from '@/components/ExamenesLabVet'

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
}): string[] {
  const { historialPeso, vacunas, antis, obs, examenesLab } = params
  const resumen: string[] = []
  const hoy = new Date()

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
      if (variacionPct < 5) {
        resumen.push(`⚖️ Peso estable durante los últimos 6 meses (${ultimo} kg).`)
      } else if (ultimo > primero) {
        resumen.push(`⚖️ Peso aumentó de ${primero} kg a ${ultimo} kg en los últimos 6 meses.`)
      } else {
        resumen.push(`⚖️ Peso disminuyó de ${primero} kg a ${ultimo} kg en los últimos 6 meses.`)
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
      ? `💉 ${vencidas.length} vacuna${vencidas.length === 1 ? '' : 's'} vencida${vencidas.length === 1 ? '' : 's'}.`
      : '💉 Vacunas al día.')
  }

  // Antiparasitario: se mira la ÚLTIMA DOSIS APLICADA (por
  // fecha_aplicacion, no por proxima_fecha) -- una dosis vieja del
  // historial que ya fue reemplazada no debe seguir contando.
  if (antis.length > 0) {
    const masReciente = antis.slice().sort((a: any, b: any) => (b.fecha_aplicacion || '').localeCompare(a.fecha_aplicacion || ''))[0]
    const vigente = masReciente?.proxima_fecha && new Date(masReciente.proxima_fecha + 'T00:00:00') >= hoy
    resumen.push(vigente ? '🪱 Antiparasitario vigente.' : '🪱 Antiparasitario vencido o sin próxima fecha registrada.')
  }

  // Observaciones activas
  const obsActivas = obs.filter((o: any) => o.estado === 'activa').length
  if (obsActivas > 0) {
    resumen.push(`👁️ ${obsActivas} observación${obsActivas === 1 ? '' : 'es'} activa${obsActivas === 1 ? '' : 's'}.`)
  }

  // Último perfil bioquímico + parámetros fuera de rango
  const bioquimicos = examenesLab.filter((e: any) => e.tipo === 'bioquimico').sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
  if (bioquimicos.length > 0) {
    const ultimo = bioquimicos[0]
    const dias = diasDesde(ultimo.fecha)
    resumen.push(`🧪 Último perfil bioquímico hace ${dias} día${dias === 1 ? '' : 's'}.`)
    const fuera = (ultimo.resultados || []).filter((r: any) => fueraDeRango(r.valor, r.rango_min, r.rango_max)).length
    if (fuera > 0) resumen.push(`⚠️ ${fuera} parámetro${fuera === 1 ? '' : 's'} fuera de rango en el último bioquímico.`)
  }

  // Último hemograma
  const hemogramas = examenesLab.filter((e: any) => e.tipo === 'hemograma').sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
  if (hemogramas.length > 0) {
    const ultimo = hemogramas[0]
    const dias = diasDesde(ultimo.fecha)
    resumen.push(`🩸 Último hemograma hace ${dias} día${dias === 1 ? '' : 's'}.`)
  }

  return resumen
}

function SeccionVet({ titulo, children, abiertaPorDefecto = false }: { titulo: string, children: React.ReactNode, abiertaPorDefecto?: boolean }) {
  return (
    <details open={abiertaPorDefecto} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none">
        <span className="font-bold text-sm text-[#3D2B1F]">{titulo}</span>
        <span className="text-[#8A7560] text-lg select-none">⌄</span>
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
  if (!med.fecha_fin) return true
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  return med.fecha_fin >= hoy
}

function MedicamentoCard({ med }: { med: any }) {
  const activo = medicamentoEstaActivo(med)
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
  const vacunas = datos.vacunas || []
  const antis = datos.antiparasitarios || []
  const obs = obsConEvoluciones
  const examenes = datos.examenes || []
  const enfermedades = datos.enfermedades || []
  const medicamentos = datos.medicamentos || []
  const examenesLab = datos.examenes_lab || []

  const motivosConsulta = detectarMotivosConsulta(registros)
  const resumenClinico = construirResumenClinico({ historialPeso: historialPeso || [], vacunas, antis, obs, examenesLab })

  const medicamentosActivos = medicamentos.filter((m: any) => medicamentoEstaActivo(m))
  const medicamentosFinalizados = medicamentos.filter((m: any) => !medicamentoEstaActivo(m))

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
              ['Alimentación', mascota.alimentacion_tipo || '—'],
              ['Marca / proteína', mascota.alimentacion_marca || '—'],
              ['Microchip', mascota.microchip || '—'],
              ['Veterinaria habitual', mascota.veterinaria || '—'],
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
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-2">📋 Resumen clínico</h2>
            <ul className="space-y-1.5">
              {resumenClinico.map((linea, i) => (
                <li key={i} className="text-xs text-[#3D2B1F] leading-relaxed">{linea}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Posible motivo de consulta -- se mantiene igual, función
            distinta al Resumen clínico (esta mira solo los últimos 7 días). */}
        <div className="bg-[#FBEAD9] rounded-2xl p-4 border border-[#CD7421]/30">
          <h2 className="font-bold text-xs text-[#CD7421] uppercase tracking-wider mb-2">
            🩺 Posible motivo de consulta
          </h2>
          <p className="text-[11px] text-[#8A7560] mb-2">Basado en los últimos 7 días:</p>
          {motivosConsulta.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {motivosConsulta.map(m => (
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
                                <img src={p.foto_url} alt={o.titulo} className="w-full h-32 object-cover rounded-xl mt-1.5" />
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
            {medicamentosActivos.length > 0 ? (
              <div className="space-y-2 mb-3">
                {medicamentosActivos.map((med: any) => <MedicamentoCard key={med.id} med={med} />)}
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
                  {medicamentosFinalizados.map((med: any) => <MedicamentoCard key={med.id} med={med} />)}
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
