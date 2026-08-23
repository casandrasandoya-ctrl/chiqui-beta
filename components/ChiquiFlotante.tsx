'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { determinarMascotaActiva, obtenerMascotaActivaId } from '@/utils/mascotaActiva'
import ChiquiChat, { type DatosChat } from '@/components/ChiquiChat'

// ============================================================
// CHIQUI FLOTANTE — el chat en cualquier pantalla
// ============================================================
// En Análisis el chat es una tarjeta dentro del contenido. Acá es una
// burbuja fija abajo a la derecha, para que se pueda preguntar desde
// donde uno esté sin tener que ir a buscarlo.
//
// CARGA SUS PROPIOS DATOS, sin depender de la pantalla donde esté. Es
// menos eficiente que reusar lo que Análisis ya calculó, pero es la
// única forma de que funcione en todas partes sin tocar seis archivos.
//
// NO APARECE en Análisis (que ya lo tiene incrustado), ni en el
// registro diario (donde la esquina la ocupa "Guardar"), ni en las
// pantallas sin sesión.

const SIN_CHAT = [
  '/login', '/registro', '/bienvenida', '/vet', '/privacidad', '/links',
  '/analisis',        // ya lo tiene como tarjeta
  '/registro-diario', // ahí manda el botón de guardar
]

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Los mismos valores normales y etiquetas que usa Análisis. Si algún
// día cambian allá, hay que cambiarlos acá también.
const NORMALES: Record<string, string[]> = {
  digestion: ['normal'], heces: ['normal'], apetito: ['normal'], agua: ['normal'],
  energia: ['normal', 'alta', 'muy_alta'], animo: ['normal', 'feliz', 'muy_feliz'],
  movilidad: ['normal'], pelaje: ['brillante', 'normal'], conducta: ['sociable', 'normal'],
  arenero: ['normal'],
}
const ETQ: Record<string, string> = {
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
const CUIDADOS: { campo: string; label: string; palabras: string[] }[] = [
  { campo: 'se_bano', label: 'Baño', palabras: ['ban', 'ducha'] },
  { campo: 'corte_unas', label: 'Corte de uñas', palabras: ['unas', 'unita', 'garra'] },
  { campo: 'limpieza_dental', label: 'Limpieza dental', palabras: ['diente', 'dental', 'cepill'] },
  { campo: 'limpieza_oidos', label: 'Limpieza de oídos', palabras: ['oido', 'oreja'] },
  { campo: 'compro_alimento', label: 'Compra de alimento', palabras: ['comprar', 'saco', 'croqueta'] },
  { campo: 'cargo_dispensador', label: 'Dispensador', palabras: ['dispensador'] },
]

export default function ChiquiFlotante() {
  const pathname = usePathname()
  const [datos, setDatos] = useState<DatosChat | null>(null)
  // El id de la mascota que se está mirando. Cambiar de mascota NO
  // cambia la ruta, así que sin esto el chat se quedaba con los datos
  // de la anterior y respondía el peso de otro animal.
  //
  // localStorage no avisa cuando cambia en la misma pestaña, así que se
  // revisa cada segundo y medio. Es una lectura de memoria: no cuesta
  // nada y evita tener que tocar el selector.
  const [idActivo, setIdActivo] = useState<string | null>(null)

  useEffect(() => {
    const revisar = () => {
      const id = obtenerMascotaActivaId()
      setIdActivo(prev => (prev === id ? prev : id))
    }
    revisar()
    const t = setInterval(revisar, 1500)
    return () => clearInterval(t)
  }, [])

  const oculto = !pathname || SIN_CHAT.some(r => pathname === r || pathname.startsWith(r + '/'))

  useEffect(() => {
    if (oculto) return
    let vivo = true
    // Se borra lo anterior de inmediato: es preferible que el chat no
    // aparezca por un instante a que muestre datos de otra mascota.
    setDatos(null)

    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: mascotas } = await supabase
        .from('mascotas')
        .select('id, nombre, especie')
        .eq('user_id', user.id)
        .is('archivada_en', null)
      if (!mascotas || mascotas.length === 0) return

      const m = determinarMascotaActiva(mascotas)
      // determinarMascotaActiva lee un id de localStorage, que podría
      // ser de otra cuenta si alguien cambió de sesión en el mismo
      // dispositivo. Se comprueba que esté en la lista del usuario.
      if (!m || !mascotas.some(x => x.id === m.id)) return

      const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
      // Mediodía: restar días sobre medianoche falla en los cambios de
      // horario de verano.
      const d30 = new Date(hoy + 'T12:00:00')
      d30.setDate(d30.getDate() - 30)
      const desde = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d30)
      const inicioMes = hoy.slice(0, 7) + '-01'

      const [
        { data: regs }, { data: pesos }, { data: vac }, { data: ant },
        { data: meds }, { data: exs }, { data: visitasT }, { data: paseos },
      ] = await Promise.all([
        supabase.from('registros_diarios').select('*').eq('mascota_id', m.id).eq('user_id', user.id)
          .gte('fecha', desde).order('fecha', { ascending: false }),
        supabase.from('historial_peso').select('peso, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(2),
        supabase.from('vacunas').select('nombre, fecha_aplicacion, proxima_fecha')
          .eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false }),
        supabase.from('antiparasitarios').select('nombre, fecha_aplicacion, proxima_fecha')
          .eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false }),
        supabase.from('medicamentos').select('nombre, fecha_inicio, fecha_fin, estado')
          .eq('mascota_id', m.id),
        supabase.from('examenes').select('nombre, categoria, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(5),
        supabase.from('visitas_veterinarias').select('fecha').eq('mascota_id', m.id).eq('user_id', user.id),
        supabase.from('registros_diarios').select('fecha, paseo, paseo_minutos_exactos')
          .eq('mascota_id', m.id).eq('user_id', user.id).gte('fecha', inicioMes).lte('fecha', hoy),
      ])

      if (!vivo) return

      const fmt = (f: string | null | undefined): string => {
        if (!f) return ''
        const d = new Date(String(f).slice(0, 10) + 'T12:00:00')
        return `${d.getDate()} ${MESES[d.getMonth()]}`
      }
      const diasHasta = (f: string | null | undefined): number | null => {
        if (!f) return null
        const a = new Date(hoy + 'T12:00:00').getTime()
        const b = new Date(String(f).slice(0, 10) + 'T12:00:00').getTime()
        return Math.round((b - a) / 86400000)
      }

      // Señales sueltas del período.
      const senales: DatosChat['senales'] = []
      for (const r of (regs || [])) {
        if (!r.fecha) continue
        for (const [campo, normales] of Object.entries(NORMALES)) {
          const v = (r as any)[campo]
          if (v && !normales.includes(v)) {
            senales!.push({
              campo,
              etiqueta: ETQ[`${campo}:${v}`] || String(v).replace(/_/g, ' '),
              fecha: fmt(r.fecha),
              fechaISO: String(r.fecha).slice(0, 10),
              nota: (r.nota || '').trim(),
            })
          }
        }
      }

      // Cuidados: última vez y cada cuánto.
      const cuidados = CUIDADOS.map(c => {
        const fechas = (regs || []).filter((r: any) => r[c.campo])
          .map((r: any) => String(r.fecha).slice(0, 10)).sort().reverse()
        if (fechas.length === 0) return null
        const dias = Math.abs(diasHasta(fechas[0]) || 0)
        let cada: number | null = null
        if (fechas.length >= 2) {
          const difs: number[] = []
          for (let i = 0; i < Math.min(fechas.length - 1, 5); i++) {
            difs.push(Math.round(
              (new Date(fechas[i] + 'T12:00:00').getTime() - new Date(fechas[i + 1] + 'T12:00:00').getTime()) / 86400000
            ))
          }
          const prom = Math.round(difs.reduce((a, b) => a + b, 0) / difs.length)
          if (prom > 0) cada = prom
        }
        return { label: c.label, palabras: c.palabras, diasDesde: dias, cadaCuantos: cada }
      }).filter(Boolean) as DatosChat['cuidados']

      // Solo la dosis más reciente de cada tipo: la regla del proyecto.
      const masReciente = (lista: any[] | null) => {
        const porNombre = new Map<string, any>()
        for (const x of (lista || [])) {
          const k = (x.nombre || '').toLowerCase().trim()
          if (!porNombre.has(k)) porNombre.set(k, x)
        }
        return Array.from(porNombre.values())
      }

      // Las visitas vienen de DOS lugares, igual que en Análisis.
      const fechasVisita = new Set<string>()
      for (const v of (visitasT || [])) if (v.fecha) fechasVisita.add(String(v.fecha).slice(0, 10))
      for (const r of (regs || [])) if ((r as any).fue_al_vet && r.fecha) fechasVisita.add(String(r.fecha).slice(0, 10))

      const MIN_RANGO: Record<string, number> = { '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180 }
      const paseosMes = (paseos || []).filter((r: any) => r.paseo && r.paseo !== 'no_paseo')
      const minutosMes = paseosMes.reduce((acc: number, r: any) =>
        acc + (typeof r.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0
          ? r.paseo_minutos_exactos : (MIN_RANGO[r.paseo] || 0)), 0)

      const activos = (meds || []).filter((x: any) =>
        x.estado === 'activo' && (!x.fecha_inicio || x.fecha_inicio <= hoy) && (!x.fecha_fin || x.fecha_fin >= hoy))

      setDatos({
        mascotaId: m.id,
        nombre: m.nombre || 'tu mascota',
        especie: m.especie || '',
        // La burbuja no muestra episodios agrupados: eso vive en
        // Análisis, que tiene el cálculo completo.
        episodios: [],
        totalRegistros: (regs || []).length,
        pctBien: 0,
        textoPeriodo: 'los últimos 30 días',
        paseosMes: m.especie === 'Perro'
          ? { cantidad: paseosMes.length, minutos: minutosMes, nombreMes: MESES_LARGO[Number(hoy.slice(5, 7)) - 1] }
          : null,
        peso: pesos && pesos.length > 0
          ? { actual: pesos[0].peso, fecha: fmt(pesos[0].fecha), anterior: pesos.length > 1 ? pesos[1].peso : null }
          : null,
        medicamentos: activos.map((x: any) => ({ nombre: x.nombre || 'Medicamento', desde: fmt(x.fecha_inicio) })),
        vacunas: masReciente(vac).map((v: any) => ({
          nombre: v.nombre || 'Vacuna',
          proxima: v.proxima_fecha ? fmt(v.proxima_fecha) : null,
          dias: diasHasta(v.proxima_fecha),
        })),
        antiparasitarios: masReciente(ant).map((a: any) => ({
          nombre: a.nombre || 'Antiparasitario',
          proxima: a.proxima_fecha ? fmt(a.proxima_fecha) : null,
          dias: diasHasta(a.proxima_fecha),
        })),
        senales,
        cuidados,
        examenes: (exs || []).map((e: any) => ({
          nombre: e.nombre || e.categoria || 'Examen',
          fecha: fmt(e.fecha),
        })),
        visitasVet: Array.from(fechasVisita).sort(),
        fmtVisita: fmt,
      })
    })()

    return () => { vivo = false }
  }, [oculto, pathname, idActivo])

  if (oculto || !datos) return null
  return <ChiquiChat datos={datos} flotante />
}
