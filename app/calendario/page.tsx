'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'

const ESTADO_COLOR: Record<string, string> = {
  verde: '#4CAF7D',
  amarillo: '#F5C842',
  naranjo: '#F07A30',
  rojo: '#E05252',
}
const ESTADO_BG: Record<string, string> = {
  verde: 'rgba(76,203,127,0.18)',
  amarillo: 'rgba(245,200,66,0.15)',
  naranjo: 'rgba(243,155,53,0.18)',
  rojo: 'rgba(226,93,93,0.18)',
}

// Cuidados del día para el modal del calendario: columna booleana →
// chip con emoji y etiqueta. bano y limpieza_dental agregan su tipo
// como detalle si existe (columnas bano_tipo / dental_tipo).
const CUIDADOS_DIA: { col: string; emoji: string; label: string }[] = [
  { col: 'fue_al_vet', emoji: '🩺', label: 'Fue al veterinario' },
  { col: 'control_peso', emoji: '⚖️', label: 'Control de peso' },
  { col: 'procedimiento_cirugia', emoji: '🏥', label: 'Procedimiento o cirugía' },
  { col: 'seguimiento_lesion', emoji: '📸', label: 'Seguimiento de lesión' },
  { col: 'medicamento_hoy', emoji: '💊', label: 'Recibió medicamento' },
  { col: 'vacuna_hoy', emoji: '💉', label: 'Vacuna aplicada' },
  { col: 'anti_hoy', emoji: '🪱', label: 'Antiparasitario' },
  { col: 'suplemento_hoy', emoji: '🌿', label: 'Suplemento' },
  { col: 'alimente_hoy', emoji: '🥘', label: 'Lo alimentó' },
  { col: 'compro_alimento', emoji: '🍖', label: 'Compró alimento' },
  { col: 'cambio_alimento', emoji: '🥣', label: 'Cambio de alimento' },
  { col: 'probo_alimento_nuevo', emoji: '🎁', label: 'Probó alimento nuevo' },
  { col: 'cargo_dispensador', emoji: '🤖', label: 'Cargó el dispensador' },
  { col: 'se_bano', emoji: '🛁', label: 'Baño' },
  { col: 'shampoo_seco', emoji: '🧼', label: 'Baño en seco' },
  { col: 'peino', emoji: '💇', label: 'Cepillado' },
  { col: 'corte_unas', emoji: '✂️', label: 'Corte de uñas' },
  { col: 'limpieza_dental', emoji: '🦷', label: 'Limpieza dental' },
  { col: 'limpieza_oidos', emoji: '👂', label: 'Limpieza de oídos' },
  { col: 'tratamiento_dermatologico', emoji: '🧴', label: 'Trat. dermatológico' },
  { col: 'limpie_arenero', emoji: '🧹', label: 'Limpió el arenero' },
  { col: 'cambie_arena', emoji: '🔄', label: 'Cambió la arena' },
  { col: 'compre_arena', emoji: '🛒', label: 'Compró arena' },
]

// Detalle textual de un cuidado según las columnas de tipo.
function detalleCuidado(col: string, reg: any): string {
  if (col === 'se_bano' && reg.bano_tipo === 'dermatologico') return ' (dermatológico)'
  if (col === 'limpieza_dental' && reg.dental_tipo === 'destartraje') return ' (destartraje)'
  if (col === 'limpieza_dental' && reg.dental_tipo === 'cepillado') return ' (cepillado)'
  return ''
}

// Actividades de enriquecimiento (solo perros las registran).
const ACTIVIDADES_ENR: Record<string, { emoji: string; label: string }> = {
  juguete_interactivo: { emoji: '🧩', label: 'Juguete interactivo' },
  juego_olfato: { emoji: '👃', label: 'Juegos de olfato' },
  juego_activo: { emoji: '🎾', label: 'Juego activo' },
  entrenamiento: { emoji: '🎓', label: 'Entrenamiento' },
  social_animales: { emoji: '🐶', label: 'Socialización con animales' },
  social_personas: { emoji: '👨‍👩‍👧‍👦', label: 'Socialización con personas' },
  lugar_nuevo: { emoji: '🌳', label: 'Exploró un lugar nuevo' },
}

// Etiquetas de los hitos de cachorro/gatito, espejo del catálogo del
// registro diario. Se muestran en el día del calendario en que
// quedaron registrados — son los recuerdos del primer año.
const HITOS_LABEL: Record<string, { emoji: string; label: string }> = {
  primer_diente_leche: { emoji: '🦷', label: 'Se le cayó su primer diente de leche' },
  primer_diente_definitivo: { emoji: '😁', label: 'Le salió su primer diente definitivo' },
  primeras_vacunas: { emoji: '💉', label: 'Completó sus primeras vacunas' },
  responde_nombre: { emoji: '📛', label: 'Responde a su nombre' },
  primera_noche_completa: { emoji: '🌙', label: 'Primera noche durmiendo completa' },
  primer_paseo: { emoji: '🦮', label: 'Su primer paseo en la calle' },
  necesidades_lugar: { emoji: '✅', label: 'Aprendió a hacer sus necesidades donde corresponde' },
  conocio_otro_perro: { emoji: '🐶', label: 'Conoció a otro perro por primera vez' },
  primer_arenero: { emoji: '🧹', label: 'Usó el arenero solo por primera vez' },
  primer_ronroneo: { emoji: '😺', label: 'Su primer ronroneo contigo' },
  exploro_casa: { emoji: '🪟', label: 'Exploró toda la casa por primera vez' },
}

// Etiquetas de los momentos de vida, espejo del catálogo del registro
// diario. Se muestran en el día del calendario en que ocurrieron.
const MOMENTOS_LABEL: Record<string, { emoji: string; label: string }> = {
  llego_a_casa: { emoji: '🏡', label: 'El día que llegó a casa' },
  mudanza: { emoji: '🏠', label: 'Se mudó de casa' },
  nuevo_integrante: { emoji: '👶', label: 'Llegó un nuevo integrante a la familia' },
  nuevo_companero: { emoji: '🐾', label: 'Conoció a un nuevo compañero peludo' },
  esterilizacion: { emoji: '✂️', label: 'Esterilización' },
  primer_viaje: { emoji: '✈️', label: 'Su primer viaje' },
  conocio_mar: { emoji: '🌊', label: 'Conoció el mar' },
  supero_enfermedad: { emoji: '💪', label: 'Superó una enfermedad' },
  despedida_companero: { emoji: '🕊️', label: 'Se despidió de un compañero' },
  otro: { emoji: '💛', label: 'Momento importante' },
  ojos_opacos: { emoji: '👀', label: 'Ojos más opacos o azulados' },
}

function textoDuracion(min: number | null): string {
  if (!min) return ''
  if (min >= 90) return ' · más de 1h'
  if (min >= 60) return ' · 1h'
  return ` · ${min} min`
}

// Calcula los puntos de cuidados para mostrar en el calendario.
// Cada grupo de cuidados tiene un color distinto — maximo 5 puntos
// (uno por grupo), para no saturar la celda del dia.
function puntosDelDia(reg: any): string[] {
  if (!reg) return []
  const puntos: string[] = []
  // Vet / Prevención medica
  if (reg.fue_al_vet) puntos.push('#8C572F')
  // Vacuna, antiparasitario, medicamento
  if (reg.vacuna_hoy || reg.anti_hoy || reg.medicamento_hoy) puntos.push('#4AABDB')
  // Higiene (baño, uñas, oídos, dental, dermatológico, peinado, shampoo seco)
  if (reg.se_bano || reg.corte_unas || reg.limpieza_dental || reg.limpieza_oidos || reg.tratamiento_dermatologico || reg.peino || reg.shampoo_seco) puntos.push('#4CAF7D')
  // Alimentación (comida, dispensador, cambio de alimento, alimentó hoy)
  if (reg.alimento || reg.cambio_alimento || reg.probo_alimento_nuevo || reg.cargo_dispensador || reg.alimente_hoy) puntos.push('#FFBD59')
  // Eventos importantes (cirugía, peso, lesión)
  if (reg.control_peso || reg.procedimiento_cirugia || reg.seguimiento_lesion) puntos.push('#F07A30')
  return puntos
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['L','M','M','J','V','S','D']

export default function CalendarioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<any[]>([])
  const [mascota, setMascota] = useState<any>(null)
  const [registros, setRegistros] = useState<Record<string, any>>({})
  const [pesos, setPesos] = useState<Record<string, number>>({})
  const [enriqMes, setEnriqMes] = useState<Record<string, any[]>>({})
  const [hitosMes, setHitosMes] = useState<Record<string, string[]>>({})
  const [momentosMes, setMomentosMes] = useState<Record<string, any[]>>({})
  const [mes, setMes] = useState(new Date().getMonth())
  const [año, setAño] = useState(new Date().getFullYear())
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const activa = determinarMascotaActiva(todasMascotas)!
      setMascota(activa)
      await cargarRegistros(activa.id, mes, año)
      setLoading(false)
    }
    cargar()
  }, [])

  async function cambiarMascota(nueva: any) {
    setLoading(true)
    setMascota(nueva)
    setDiaSeleccionado(null)
    await cargarRegistros(nueva.id, mes, año)
    setLoading(false)
  }

  async function cargarRegistros(mascotaId: string, m: number, a: number) {
    const ultimoDia = new Date(a, m + 1, 0).getDate()
    const inicio = `${a}-${String(m + 1).padStart(2, '0')}-01`
    const fin = `${a}-${String(m + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    const [{ data }, { data: pesoData }, { data: enrData }, { data: hitosData }, { data: momData }] = await Promise.all([
      supabase
        .from('registros_diarios')
        .select('*')
        .eq('mascota_id', mascotaId)
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('historial_peso')
        .select('fecha, peso')
        .eq('mascota_id', mascotaId)
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('enriquecimientos')
        .select('fecha, actividad, duracion_min, detalle')
        .eq('mascota_id', mascotaId)
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('hitos_cachorro')
        .select('fecha, hito')
        .eq('mascota_id', mascotaId)
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('momentos')
        .select('fecha, tipo, categoria, nota')
        .eq('mascota_id', mascotaId)
        .gte('fecha', inicio)
        .lte('fecha', fin),
    ])
    const map: Record<string, any> = {}
    data?.forEach(r => { map[r.fecha] = r })
    setRegistros(map)
    const mapPeso: Record<string, number> = {}
    pesoData?.forEach(p => { mapPeso[p.fecha] = p.peso })
    setPesos(mapPeso)
    const mapEnr: Record<string, any[]> = {}
    enrData?.forEach(e => { (mapEnr[e.fecha] = mapEnr[e.fecha] || []).push(e) })
    setEnriqMes(mapEnr)
    const mapHitos: Record<string, string[]> = {}
    hitosData?.forEach(h => { (mapHitos[h.fecha] = mapHitos[h.fecha] || []).push(h.hito) })
    setHitosMes(mapHitos)
    const mapMom: Record<string, any[]> = {}
    momData?.forEach(m => { (mapMom[m.fecha] = mapMom[m.fecha] || []).push(m) })
    setMomentosMes(mapMom)
  }

  async function cambiarMes(dir: number) {
    let nm = mes + dir
    let na = año
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm); setAño(na)
    if (mascota) await cargarRegistros(mascota.id, nm, na)
  }

  // Swipe horizontal para cambiar de mes -- complementa los botones de
  // flecha, no los reemplaza. Umbral de 50px para evitar que un scroll
  // vertical accidental dispare el cambio de mes.
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)

  function onTouchStartGrid(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
  }

  function onTouchEndGrid(e: React.TouchEvent) {
    if (touchStartX === null || touchStartY === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    const deltaY = e.changedTouches[0].clientY - touchStartY
    setTouchStartX(null)
    setTouchStartY(null)
    // Ignorar si el movimiento fue mas vertical que horizontal (scroll)
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX > 0) cambiarMes(-1)
    else cambiarMes(1)
  }

  const diasEnMes = new Date(año, mes + 1, 0).getDate()
  const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7 // lunes=0
  const hoy = new Date()
  const esHoy = (d: number) => d === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear()

  const fechaKey = (d: number) => `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const regDia = diaSeleccionado ? registros[fechaKey(diaSeleccionado)] : null

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* Header mes */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-[#F5EDE3] z-10 border-b border-[#EEE2D4]">
        <button onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg">‹</button>
        <div className="text-center flex items-center gap-2">
          <img src="/chiqui/chiqui_calendario.png" alt="CHIQUI" className="w-7 h-7 object-contain" />
          <div>
            <h1 className="font-heading text-base font-extrabold">{MESES[mes]} {año}</h1>
            <p className="text-xs text-[#8A7560]">{mascota?.nombre}</p>
          </div>
        </div>
        <button onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg">›</button>
      </div>

      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}

      {/* Leyenda */}
      <div className="flex gap-4 px-5 py-2 overflow-x-auto scrollbar-none">
        {[['verde','Todo bien'],['amarillo','Leve'],['naranjo','Síntoma'],['rojo','Alerta']].map(([e,l]) => (
          <div key={e} className="flex items-center gap-1.5 text-xs text-[#8A7560] whitespace-nowrap">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADO_COLOR[e] }}/>
            {l}
          </div>
        ))}
      </div>


      {/* Días semana */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-[#8A7560] py-1">{d}</div>
        ))}
      </div>

      {/* Grid días -- soporta swipe horizontal ademas de los botones de flecha */}
      <div
        className="grid grid-cols-7 gap-1 px-3"
        onTouchStart={onTouchStartGrid}
        onTouchEnd={onTouchEndGrid}
      >
        {Array(primerDia).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array(diasEnMes).fill(null).map((_, i) => {
          const d = i + 1
          const key = fechaKey(d)
          const reg = registros[key]
          const esFuturo = new Date(año, mes, d) > hoy
          const seleccionado = diaSeleccionado === d

          return (
            <button
              key={d}
              onClick={() => setDiaSeleccionado(seleccionado ? null : d)}
              disabled={esFuturo}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative"
              style={{
                background: seleccionado ? 'rgba(140,87,47,0.15)' : reg ? ESTADO_BG[reg.estado_dia] : 'rgba(140,87,47,0.05)',
                border: esHoy(d) ? '1.5px solid #FFBD59' : seleccionado ? '1.5px solid #8C572F' : '1px solid transparent',
                opacity: esFuturo ? 0.25 : 1,
              }}
            >
              <span className="text-sm font-bold leading-none" style={{ color: reg ? ESTADO_COLOR[reg.estado_dia] : esHoy(d) ? '#FFBD59' : '#8A7560' }}>
                {d}
              </span>
              {/* Puntos de cuidados — uno por grupo, debajo del número */}
              {(() => {
                const puntos = puntosDelDia(reg)
                if (puntos.length === 0) return null
                return (
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    {puntos.map((color, i) => (
                      <div key={i} className="w-1 h-1 rounded-full" style={{ background: color }} />
                    ))}
                  </div>
                )
              })()}
              {reg?.nota && !puntosDelDia(reg).length && !hitosMes[key] && !momentosMes[key] && <div className="w-1 h-1 rounded-full bg-[#FFBD59] mt-0.5"/>}
              {/* Marca en la esquina: 🐾 si ese día se logró un hito
                  del primer año, 💛 si ocurrió un momento de vida. Se
                  distinguen de los puntos de cuidados porque son
                  eventos únicos, no rutinas. */}
              {hitosMes[key] && hitosMes[key].length > 0 ? (
                <span className="absolute top-0.5 right-0.5 text-[9px] leading-none">🐾</span>
              ) : momentosMes[key] && momentosMes[key].some((m: any) => m.categoria !== 'cambio_edad') ? (
                <span className="absolute top-0.5 right-0.5 text-[9px] leading-none">💛</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Panel día seleccionado */}
      {diaSeleccionado && (
        <div className="mx-4 mt-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEE2D4] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{diaSeleccionado} de {MESES[mes]}</p>
              <div className="flex items-center gap-2 mt-1">
                {regDia && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: `${ESTADO_COLOR[regDia.estado_dia]}20`, color: ESTADO_COLOR[regDia.estado_dia] }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLOR[regDia.estado_dia] }}/>
                    {({ verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' } as Record<string,string>)[regDia.estado_dia]}
                  </div>
                )}
                {diaSeleccionado && pesos[fechaKey(diaSeleccionado)] && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F07A30]/15 text-[#F07A30]">
                    ⚖️ {pesos[fechaKey(diaSeleccionado)]} kg
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setDiaSeleccionado(null)} className="text-[#8A7560] text-lg w-7 h-7 flex items-center justify-center">✕</button>
          </div>

          {/* Hitos logrados ese día — se muestran SIEMPRE, aunque no
              haya registro diario (un hito puede registrarse solo). */}
          {(hitosMes[fechaKey(diaSeleccionado)] || []).length > 0 && (
            <div className="px-4 pt-3">
              <div className="rounded-xl border border-[#FFBD59] p-3" style={{ background: 'linear-gradient(135deg, #FFBD5918, #FFFCF8)' }}>
                <p className="text-[10px] font-bold text-[#CD7421] uppercase tracking-wider mb-1.5">🐾 Hito de este día</p>
                <div className="space-y-1">
                  {(hitosMes[fechaKey(diaSeleccionado)] || []).map(h => {
                    const info = HITOS_LABEL[h] || { emoji: '🐾', label: h }
                    return (
                      <p key={h} className="text-[11px] text-[#3D2B1F] font-medium">{info.emoji} {info.label}</p>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Momentos de vida ocurridos ese día — también fuera del
              registro diario. Los cambios de la edad se muestran con
              tono neutro (no son celebraciones). */}
          {(momentosMes[fechaKey(diaSeleccionado)] || []).length > 0 && (
            <div className="px-4 pt-3">
              {(momentosMes[fechaKey(diaSeleccionado)] || []).map((m: any, i: number) => {
                const info = MOMENTOS_LABEL[m.tipo] || { emoji: '💛', label: m.tipo }
                const esCambio = m.categoria === 'cambio_edad'
                return (
                  <div
                    key={i}
                    className="rounded-xl p-3 mb-2"
                    style={esCambio
                      ? { background: '#FBEAD9', border: '1px solid #EEE2D4' }
                      : { background: 'linear-gradient(135deg, #FFBD5918, #FFFCF8)', border: '1px solid #FFBD59' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: esCambio ? '#8A7560' : '#CD7421' }}>
                      {esCambio ? '👀 Cambio de la edad' : '💛 Momento de su vida'}
                    </p>
                    <p className="text-[11px] text-[#3D2B1F] font-medium">
                      {info.emoji} {m.tipo === 'otro' && m.nota ? m.nota : info.label}
                    </p>
                    {m.tipo !== 'otro' && m.nota && (
                      <p className="text-[10px] text-[#8A7560] italic mt-0.5">📝 {m.nota}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {regDia ? (
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  ['⚡','Energía',regDia.energia],
                  ['😄','Ánimo',regDia.animo],
                  ['🍽️','Apetito',regDia.apetito],
                  ['💧','Agua',regDia.agua],
                  ['🫃','Digestión',regDia.digestion],
                  ['💩','Heces',regDia.heces],
                  ['✨','Pelaje',regDia.pelaje],
                  ['🧠','Conducta',regDia.conducta],
                  ['🦴','Movilidad',regDia.movilidad],
                  ['🐕‍🦺','Paseo',regDia.paseo],
                ].map(([icon, label, val]) => val && (
                  <div key={label as string} className="bg-[#FBEAD9] rounded-xl p-2 text-center">
                    <div className="text-lg">{icon}</div>
                    <div className="text-[9px] text-[#8A7560] mt-0.5">{label}</div>
                    <div className="text-[10px] text-[#3D2B1F] font-semibold mt-0.5 leading-tight">{(val as string).replace(/_/g,' ')}</div>
                  </div>
                ))}
              </div>
              {regDia.nota && (
                <div className="bg-[#FBEAD9] rounded-xl p-3 text-xs text-[#8A7560] italic mb-3">
                  📝 {regDia.nota}
                </div>
              )}
              {/* Cuidados del día: chips con los booleanos marcados en
                  el registro, con detalle de tipo cuando existe. */}
              {(() => {
                const marcados = CUIDADOS_DIA.filter(c => regDia[c.col])
                if (marcados.length === 0) return null
                return (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-[#8A7560] uppercase tracking-wider mb-1.5">Cuidados del día</p>
                    <div className="flex flex-wrap gap-1.5">
                      {marcados.map(c => (
                        <span key={c.col} className="text-[10px] px-2 py-1 rounded-full bg-[#FFBD59]/20 text-[#3D2B1F] font-medium">
                          {c.emoji} {c.label}{detalleCuidado(c.col, regDia)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {/* Enriquecimiento del día (perros): actividad, duración
                  y trucos practicados en entrenamiento. */}
              {(() => {
                const enrDia = enriqMes[fechaKey(diaSeleccionado)] || []
                if (enrDia.length === 0) return null
                return (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-[#8A7560] uppercase tracking-wider mb-1.5">🧠 Enriquecimiento</p>
                    <div className="space-y-1">
                      {enrDia.map((e: any, i: number) => {
                        const info = ACTIVIDADES_ENR[e.actividad] || { emoji: '🧠', label: e.actividad }
                        return (
                          <div key={i} className="bg-[#FBEAD9] rounded-xl px-3 py-1.5">
                            <p className="text-[11px] text-[#3D2B1F] font-medium">
                              {info.emoji} {info.label}{textoDuracion(e.duracion_min)}
                            </p>
                            {e.detalle && <p className="text-[10px] text-[#8A7560] mt-0.5">Practicaron: {e.detalle}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              <Link href={`/registro-diario?fecha=${fechaKey(diaSeleccionado)}`} className="bg-[#FFFCF8] border border-[#EEE2D4] text-[#8C572F] font-bold px-6 py-2.5 rounded-xl text-sm inline-block">
                ✏️ Editar este día
              </Link>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-[#8A7560] mb-3">Sin registro para este día</p>
              <Link href={`/registro-diario?fecha=${fechaKey(diaSeleccionado)}`} className="bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm inline-block">
                Registrar este día →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Resumen mes */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Registros', val: Object.keys(registros).length, color: '#3DD6B5' },
          { label: 'Días verdes', val: Object.values(registros).filter((r: any) => r.estado_dia === 'verde').length, color: '#4CAF7D' },
          { label: 'Con síntoma', val: Object.values(registros).filter((r: any) => ['naranjo','rojo'].includes(r.estado_dia)).length, color: '#F07A30' },
        ].map(item => (
          <div key={item.label} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[10px] text-[#8A7560] mt-0.5 uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
