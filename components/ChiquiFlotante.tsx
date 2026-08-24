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
      try {
      const supabase = createClient()
      // Los tres cortes de abajo son a propósito: sin sesión o sin
      // mascotas el chat no tiene de qué hablar. Cualquier OTRO fallo
      // debe dejarlo aparecer igual — de eso se encarga el catch.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // SOLO LO IMPRESCINDIBLE. Esta consulta decide si el chat existe:
      // si falla, nada más se ejecuta y el chat no aparece en ninguna
      // pantalla.
      //
      // Pedir columnas de más acá es peligroso: si una no existe, toda
      // la consulta falla. El resto del perfil se pide aparte, donde un
      // fallo solo significa que ese dato no está.
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

      // El resto del perfil, aparte y protegido: si alguna columna no
      // existe, esto llega vacío y el chat sigue funcionando.
      let perfilM: any = {}
      try {
        const { data } = await supabase
          .from('mascotas')
          // Los nombres REALES de la tabla: 'castrado' y
          // 'estado_reproductivo', no 'esterilizado'. Pedir una columna
          // que no existe hace fallar TODA la consulta — por eso antes
          // no llegaba ni la raza ni la edad.
          .select('raza, sexo, fecha_nacimiento, castrado, estado_reproductivo, alergias, color, microchip, peso_actual, alimentacion_tipo, alimentacion_marca, veterinaria, tamano_esperado')
          .eq('id', m.id)
          .single()
        if (data) perfilM = data
      } catch {
        // Sin perfil extendido: el chat lo dirá cuando se lo pregunten.
      }

      const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
      // Mediodía: restar días sobre medianoche falla en los cambios de
      // horario de verano.
      const d30 = new Date(hoy + 'T12:00:00')
      d30.setDate(d30.getDate() - 30)
      const desde = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d30)
      const inicioMes = hoy.slice(0, 7) + '-01'

      // Una consulta que falla NO puede tumbar el chat entero. Si una
      // tabla no existe o cambia de nombre, esa parte llega vacía y el
      // chat dice que no tiene ese dato — pero aparece igual.
      //
      // Antes, cualquier error hacía que setDatos nunca se llamara y el
      // flotante no se mostraba en ninguna pantalla.
      const seguro = async <T,>(p: PromiseLike<{ data: T[] | null }>): Promise<{ data: T[] | null }> => {
        try {
          return await p
        } catch {
          return { data: null }
        }
      }

      const [
        { data: regs }, { data: pesos }, { data: vac }, { data: ant },
        { data: meds }, { data: exs }, { data: visitasT }, { data: paseos },
        { data: celos }, { data: lab }, { data: temps }, { data: resp },
        { data: revis }, { data: momentos }, { data: enfs },
      ] = await Promise.all([
        seguro(supabase.from('registros_diarios').select('*').eq('mascota_id', m.id).eq('user_id', user.id)
          .gte('fecha', desde).order('fecha', { ascending: false })),
        seguro(supabase.from('historial_peso').select('peso, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(2)),
        seguro(supabase.from('vacunas').select('nombre, fecha_aplicacion, proxima_fecha')
          .eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false })),
        seguro(supabase.from('antiparasitarios').select('nombre, fecha_aplicacion, proxima_fecha')
          .eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false })),
        seguro(supabase.from('medicamentos').select('nombre, fecha_inicio, fecha_fin, estado')
          .eq('mascota_id', m.id)),
        seguro(supabase.from('examenes').select('nombre, categoria, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(5)),
        seguro(supabase.from('visitas_veterinarias').select('fecha').eq('mascota_id', m.id).eq('user_id', user.id)),
        seguro(supabase.from('registros_diarios').select('fecha, paseo, paseo_minutos_exactos')
          .eq('mascota_id', m.id).eq('user_id', user.id).gte('fecha', inicioMes).lte('fecha', hoy)),
        // Lo que faltaba: celos, exámenes de laboratorio, temperatura,
        // respiración, revisiones corporales, momentos y enfermedades.
        // La tabla 'celos' no existe en esta base: se pide de
        // seguimiento_reproductivo, que es donde vive el dato.
        seguro(supabase.from('mascotas').select('seguimiento_reproductivo').eq('id', m.id)),
        seguro(supabase.from('examenes_lab').select('tipo, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(5)),
        seguro(supabase.from('temperatura_corporal').select('temperatura, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(2)),
        seguro(supabase.from('frecuencia_respiratoria').select('respiraciones, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(2)),
        seguro(supabase.from('revisiones_corporales').select('fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(1)),
        seguro(supabase.from('momentos').select('titulo, fecha').eq('mascota_id', m.id)
          .order('fecha', { ascending: false }).limit(5)),
        seguro(supabase.from('enfermedades').select('diagnostico, fecha_diagnostico, proxima_revision')
          .eq('mascota_id', m.id).order('fecha_diagnostico', { ascending: false })),
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

      // Episodios: los días con señales, agrupados en rachas. Antes el
      // flotante abría sin nada porque este cálculo solo existía en
      // Análisis, y el saludo quedaba pobre.
      //
      // Se agrupan los días seguidos o separados por uno: un malestar
      // de tres días es distinto a tres malestares sueltos en el mes.
      const porDia = new Map<string, { etiquetas: string[]; nota: string }>()
      for (const x of (senales || [])) {
        // fechaISO es opcional en el tipo, así que hay que comprobarlo:
        // acá siempre viene, pero TypeScript no lo sabe.
        const f = x.fechaISO
        if (!f) continue
        const prev = porDia.get(f) || { etiquetas: [] as string[], nota: '' }
        if (!prev.etiquetas.includes(x.etiqueta)) prev.etiquetas.push(x.etiqueta)
        if (!prev.nota && x.nota) prev.nota = x.nota
        porDia.set(f, prev)
      }
      const dias = Array.from(porDia.keys()).sort()
      const grupos: string[][] = []
      for (const f of dias) {
        const ultimo = grupos[grupos.length - 1]
        const fin = ultimo?.[ultimo.length - 1]
        const sep = fin
          ? Math.round((new Date(f + 'T12:00:00').getTime() - new Date(fin + 'T12:00:00').getTime()) / 86400000)
          : 999
        if (ultimo && sep <= 2) ultimo.push(f)
        else grupos.push([f])
      }
      // Los más recientes primero, y solo los tres últimos: el saludo
      // no puede ser una pared de texto.
      const episodios = grupos.slice().reverse().slice(0, 3).map(g => {
        const desde = g[0], hasta = g[g.length - 1]
        const titulo = desde === hasta ? `El ${fmt(desde)}` : `Del ${fmt(desde)} al ${fmt(hasta)}`
        const etiquetas: string[] = []
        let nota = ''
        for (const f of g) {
          const d = porDia.get(f)!
          for (const e of d.etiquetas) if (!etiquetas.includes(e)) etiquetas.push(e)
          if (!nota && d.nota) nota = d.nota
        }
        return `${titulo} — ${etiquetas.join(', ')}.${nota ? ` 💬 "${nota}"` : ''}`
      })

      setDatos({
        mascotaId: m.id,
        nombre: m.nombre || 'tu mascota',
        especie: m.especie || '',
        episodios,
        totalRegistros: (regs || []).length,
        // Días sin nada anotado fuera de lo normal.
        pctBien: (regs || []).length > 0
          ? Math.round(((regs || []).length - porDia.size) / (regs || []).length * 100)
          : 0,
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
        // El perfil completo. Cada campo puede faltar: el chat dice
        // dónde anotarlo en vez de inventar.
        perfil: {
          raza: perfilM.raza || null,
          sexo: perfilM.sexo || null,
          nacimiento: perfilM.fecha_nacimiento || null,
          castrado: perfilM.castrado ?? null,
          estadoReproductivo: perfilM.estado_reproductivo || null,
          alergias: perfilM.alergias || null,
          color: perfilM.color || null,
          microchip: perfilM.microchip || null,
          alimentacion: perfilM.alimentacion_marca || perfilM.alimentacion_tipo || null,
          veterinaria: perfilM.veterinaria || null,
          tamanoEsperado: perfilM.tamano_esperado || null,
        },
        celos: [],
        examenesLab: (lab || []).map((x: any) => ({ tipo: x.tipo || 'Examen', fecha: fmt(x.fecha) })),
        temperatura: temps && temps.length > 0 ? { valor: temps[0].temperatura, fecha: fmt(temps[0].fecha) } : null,
        respiracion: resp && resp.length > 0 ? { valor: resp[0].respiraciones, fecha: fmt(resp[0].fecha) } : null,
        ultimaRevision: revis && revis.length > 0 ? fmt(revis[0].fecha) : null,
        momentos: (momentos || []).map((x: any) => ({ titulo: x.titulo || 'Momento', fecha: fmt(x.fecha) })),
        enfermedades: (enfs || []).map((x: any) => ({
          diagnostico: x.diagnostico || 'Diagnóstico',
          fecha: fmt(x.fecha_diagnostico),
          proximaRevision: x.proxima_revision ? fmt(x.proxima_revision) : null,
        })),
        fmtVisita: fmt,
      })
      } catch (e) {
        // Si algo se rompió, el chat aparece igual con lo mínimo. Es
        // preferible un chat que solo sabe el nombre a ningún chat: la
        // persona puede seguir preguntando por alimentos, por cómo usar
        // la app, o recibir las instrucciones de una urgencia.
        console.error('ChiquiFlotante:', e)
        if (vivo) {
          setDatos(prev => prev || {
            nombre: 'tu mascota',
            especie: '',
            episodios: [],
            totalRegistros: 0,
            pctBien: 0,
            textoPeriodo: 'los últimos 30 días',
          })
        }
      }
    })()

    return () => { vivo = false }
  }, [oculto, pathname, idActivo])

  if (oculto || !datos) return null
  return <ChiquiChat datos={datos} flotante />
}
