'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// ============================================================
// NOVEDADES — el único sistema de eventos del Dashboard
// ============================================================
// Evolución del antiguo componente "Celebraciones": ahora TODO pasa
// por aquí — cumpleaños, aniversario de unión, fechas especiales,
// estado del registro diario, rachas, mensajes positivos y
// recordatorios. Un solo diseño, una sola estructura, un solo botón
// de cerrar.
//
// Comportamiento:
// - Se muestra UNA sola tarjeta a la vez (la de mayor prioridad).
// - Al cerrarla aparece automáticamente la siguiente.
// - El encabezado muestra "Novedades (N)" con las pendientes; cuando
//   queda 1, el contador se oculta.
// - Cada cierre se recuerda en localStorage por ocurrencia (mascota +
//   tipo + fecha/año), así nada reaparece molestando.
// - Las novedades se derivan de las props en cada render: cuando el
//   usuario registra el día, el flujo vuelve al dashboard con datos
//   frescos y la cola se recalcula sola (desaparece "Aún no has
//   registrado", aparece la racha, etc.).
//
// ESCALABLE: para agregar una celebración, campaña o logro futuro,
// basta con sumar un bloque más en calcularNovedades() con su
// ilustración — sin crear componentes nuevos.

interface MascotaNovedades {
  id: string
  nombre: string
  especie?: string
  fecha_nacimiento?: string | null
  fecha_union?: string | null
}

interface Props {
  mascota: MascotaNovedades
  mascotas: { especie: string }[]
  tieneRegistroHoy: boolean
  color: string
  rachaRegistros: number
  seguimientos: { id: string; titulo: string; diasSinActualizar: number }[]
  diasSinCampo: { apetito: number | null; agua: number | null; heces: number | null; peso: number | null }
}

interface Novedad {
  key: string          // identifica la ocurrencia (para recordar el cierre)
  img: string          // ilustración de Chiqui
  mensaje: string
  destacada?: boolean  // true = celebración de HOY (tarjeta dorada)
  href?: string        // si existe, la tarjeta navega y la ✕ cierra
  accion?: string      // texto de acción subrayado (deja claro que es clickeable)
  efimera?: boolean    // true = el cierre NO se persiste: desaparece de la
                       // vista actual pero reaparece al volver al dashboard
                       // (para acciones que deben insistir hasta completarse)
}

export function fechaHoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

interface Ocurrencia {
  esHoy: boolean
  diasFaltan: number
  anios: number
}

// Próxima ocurrencia (este año o el siguiente) del mes/día de una
// fecha base, comparada con hoy en zona horaria de Chile.
export function proximaOcurrencia(fechaBase: string, hoyStr: string): Ocurrencia | null {
  const [aB, mB, dB] = fechaBase.split('-').map(Number)
  const [aH, mH, dH] = hoyStr.split('-').map(Number)
  if (!aB || !mB || !dB || !aH) return null
  const hoy = new Date(aH, mH - 1, dH)
  let evento = new Date(aH, mB - 1, dB)
  if (evento.getTime() < hoy.getTime()) {
    evento = new Date(aH + 1, mB - 1, dB)
  }
  const diasFaltan = Math.round((evento.getTime() - hoy.getTime()) / 86400000)
  const anios = evento.getFullYear() - aB
  return { esHoy: diasFaltan === 0, diasFaltan, anios }
}

// --- Hitos de racha: continúan indefinidamente ---
// Los días "exactos" (7, 15, 30, 45, 100, 365) tienen su ilustración y
// mensaje propios; los rangos usan la suya. Si la racha se rompe,
// simplemente vuelve a partir desde chiqui_racha_inicio.
function hitoRacha(dias: number): { img: string; mensaje: string } {
  const base = '/chiqui/'
  if (dias >= 500) return { img: base + 'chiqui_racha_superheroe.png', mensaje: `🔥 ${dias} días. ¡LEYENDA! Tu dedicación inspira. Sigue escribiendo esta historia.` }
  if (dias >= 400) return { img: base + 'chiqui_racha_corona_3.png', mensaje: `🔥 ${dias} días seguidos. ¡Estás entre los tutores más comprometidos!` }
  if (dias >= 366) return { img: base + 'chiqui_racha_corona_2.png', mensaje: `🔥 ${dias} días seguidos. ¡La constancia ya es parte de ti!` }
  if (dias === 365) return { img: base + 'chiqui_racha_corona_1.png', mensaje: '👑 ¡Un año completo! Gracias por cuidar con tanto amor.' }
  if (dias >= 101) return { img: base + 'chiqui_racha_trofeo_2.png', mensaje: `🔥 ${dias} días seguidos. ¡Increíble! Cada registro aporta a la salud de tu mascota.` }
  if (dias === 100) return { img: base + 'chiqui_racha_100.png', mensaje: '💯 ¡100 días! Un logro espectacular.' }
  if (dias >= 46) return { img: base + 'chiqui_racha_trofeo_1.png', mensaje: `🔥 ${dias} días seguidos. ¡Qué gran constancia! Sigue construyendo este hábito.` }
  if (dias === 45) return { img: base + 'chiqui_racha_45.png', mensaje: '🎉 ¡45 días! Tu compromiso marca la diferencia.' }
  if (dias >= 31) return { img: base + 'chiqui_racha_feliz.png', mensaje: `🔥 ${dias} días seguidos. ¡No pierdas la racha! Vas excelente.` }
  if (dias === 30) return { img: base + 'chiqui_racha_30.png', mensaje: '🥇 ¡Un mes completo! Gran trabajo.' }
  if (dias >= 16) return { img: base + 'chiqui_racha_feli.png', mensaje: `🔥 ${dias} días seguidos. ¡Sigue así! Tu mascota te lo agradecerá.` }
  if (dias === 15) return { img: base + 'chiqui_racha_15.png', mensaje: '🏅 ¡15 días! Excelente constancia.' }
  if (dias >= 8) return { img: base + 'chiqui_racha_cool.png', mensaje: `🔥 ${dias} días seguidos. ¡Vas muy bien! Mantén el ritmo.` }
  if (dias === 7) return { img: base + 'chiqui_racha_7.png', mensaje: '📅 ¡Una semana registrando! Sigue así.' }
  return { img: base + 'chiqui_racha_inicio.png', mensaje: `❤️ ¡Comenzaste tu racha! ${dias === 1 ? 'Cada día cuenta.' : `${dias} días — cada día cuenta.`}` }
}

// Mensajes positivos (última prioridad antes del recordatorio) — rotan
// por día para no repetirse siempre.
const MENSAJES_POSITIVOS = [
  'Gracias por cuidar hoy a {nombre} 💖',
  'Gracias por observar hoy a {nombre}. Excelente trabajo 🐾',
  'Cada registro ayuda a comprender mejor la salud de {nombre} ✨',
  'Pequeños registros, gran diferencia. Gracias por estar ahí 💛',
]

// Cola de novedades del día, EN ORDEN DE PRIORIDAD:
// 1 cumpleaños · 2 aniversario · 3 fechas especiales · 4 estado del
// registro diario · 5 seguimientos pendientes · 6 racha ·
// 7 recordatorio inteligente · 8 mensaje positivo · 9 notificaciones.
function calcularNovedades(
  m: MascotaNovedades,
  especies: Set<string>,
  tieneRegistroHoy: boolean,
  color: string,
  rachaRegistros: number,
  sinPermisoNotif: boolean,
  hoyStr: string,
  seguimientos: Props['seguimientos'],
  diasSinCampo: Props['diasSinCampo'],
): Novedad[] {
  const lista: Novedad[] = []
  const anio = hoyStr.slice(0, 4)
  const mesDia = hoyStr.slice(5) // "MM-DD"
  const VENTANA = 7

  // ---- 1. CUMPLEAÑOS ----
  if (m.fecha_nacimiento) {
    const o = proximaOcurrencia(m.fecha_nacimiento, hoyStr)
    if (o && o.anios >= 1) {
      if (o.esHoy) {
        lista.push({
          key: `cumple_hoy_${m.id}_${anio}`,
          img: '/chiqui/chiqui_cumple.png',
          destacada: true,
          mensaje: `🎉 ¡Hoy ${m.nombre} está de cumpleaños! Cumple ${o.anios} ${o.anios === 1 ? 'año' : 'años'}.`,
        })
      } else if (o.diasFaltan <= VENTANA) {
        lista.push({
          key: `cumple_prox_${m.id}_${anio}`,
          img: '/chiqui/chiqui_cumple.png',
          mensaje: o.diasFaltan === 1
            ? `🎂 ¡Mañana ${m.nombre} cumple años!`
            : `🎈 Faltan ${o.diasFaltan} días para el cumpleaños de ${m.nombre}.`,
        })
      }
    }
  }

  // ---- 2. ANIVERSARIO DE UNIÓN A LA FAMILIA ----
  if (m.fecha_union) {
    const o = proximaOcurrencia(m.fecha_union, hoyStr)
    if (o && o.anios >= 1) {
      if (o.esHoy) {
        lista.push({
          key: `union_hoy_${m.id}_${anio}`,
          img: '/chiqui/chiqui_familia.png',
          destacada: true,
          mensaje: `❤️ ¡Hoy ${m.nombre} cumple ${o.anios === 1 ? 'un año' : `${o.anios} años`} junto a su familia!`,
        })
      } else if (o.diasFaltan <= VENTANA) {
        lista.push({
          key: `union_prox_${m.id}_${anio}`,
          img: '/chiqui/chiqui_familia.png',
          mensaje: o.diasFaltan === 1
            ? `🏡 ¡Mañana celebrarán un nuevo aniversario juntos!`
            : `🏡 En ${o.diasFaltan} días celebrarán un nuevo aniversario juntos.`,
        })
      }
    }
  }

  // ---- 3. FECHAS ESPECIALES (solo el día exacto) ----
  // Personalización por especie: Día del Perro solo si el usuario tiene
  // perros registrados; Día del Gato solo si tiene gatos; ambas
  // especies = ambas celebraciones. Para agregar una fecha nueva:
  // sumar una entrada aquí con su ilustración.
  const FECHAS_ESPECIALES: { mesDia: string; img: string; mensaje: string; especie?: string }[] = [
    { mesDia: '12-25', img: '/chiqui/chiqui_navidad.png', mensaje: `🎄 ¡Feliz Navidad! Chiqui y ${m.nombre} te desean unas fiestas llenas de cariño.` },
    { mesDia: '10-31', img: '/chiqui/chiqui_halloween.png', mensaje: `🎃 ¡Feliz Halloween! Cuida que ${m.nombre} no llegue a los dulces 😉` },
    { mesDia: '08-26', img: '/chiqui/dia_del_perro.png', mensaje: '🐶 ¡Hoy es el Día Internacional del Perro! Celebra a tu compañero.', especie: 'Perro' },
    { mesDia: '08-08', img: '/chiqui/dia_del_gato.png', mensaje: '🐱 ¡Hoy es el Día Internacional del Gato! Celebra a tu compañero.', especie: 'Gato' },
  ]
  for (const f of FECHAS_ESPECIALES) {
    if (f.mesDia !== mesDia) continue
    if (f.especie && !especies.has(f.especie)) continue
    lista.push({
      key: `especial_${f.mesDia.replace('-', '')}_${anio}`,
      img: f.img,
      destacada: true,
      mensaje: f.mensaje,
    })
  }

  // ---- 4. ESTADO DEL REGISTRO DIARIO ----
  // Mayor prioridad que las rachas: incentiva la acción principal.
  if (!tieneRegistroHoy) {
    lista.push({
      key: `estado_sinregistro_${m.id}_${hoyStr}`,
      img: '/chiqui/chiqui_registro.png',
      href: '/registro-diario',
      accion: '✏️ Registrar hoy',
      // Efímera: cerrar la tarjeta la oculta solo por ahora — al volver
      // a entrar al dashboard reaparece, hasta que el registro exista.
      // Registrar es LA acción central de la app y no debe poder
      // silenciarse por todo el día con una ✕.
      efimera: true,
      mensaje: `📝 Aún no has registrado hoy. ¿Cómo estuvo ${m.nombre}?`,
    })
  } else {
    let msg = `💚 Gracias por registrar hoy. Todo se ve normal en ${m.nombre}.`
    let img = '/chiqui/chiqui_feliz.png'
    let tipo = 'verde'
    if (color === '#F5C842') {
      msg = `👀 Hoy registraste algo fuera de lo normal en ${m.nombre}. Obsérvalo con cariño.`
      img = '/chiqui/chiqui_ladeado.png'
      tipo = 'amarillo'
    } else if (color === '#F07A30') {
      msg = `🧡 Hoy registraste un síntoma importante. Mantén a ${m.nombre} en observación.`
      img = '/chiqui/chiqui_preocupado.png'
      tipo = 'naranjo'
    } else if (color === '#E05252') {
      msg = `🚨 Hoy registraste un signo de alerta. Coméntalo con tu veterinario.`
      img = '/chiqui/chiqui_alerta.png'
      tipo = 'rojo'
    }
    lista.push({
      key: `estado_${tipo}_${m.id}_${hoyStr}`,
      img,
      mensaje: msg,
    })
  }

  // ---- 5. SEGUIMIENTOS PENDIENTES (15+ días sin actualizar) ----
  // El dashboard ya no recuerda permanentemente el problema: pide
  // acción solo cuando toca. Al registrar una evolución, el contador
  // se reinicia y la novedad desaparece. Si el caso sigue abierto,
  // reaparece en el siguiente bloque de 15 días (la clave incluye el
  // número de bloque, así el cierre manual no la silencia para
  // siempre) hasta que se marque como resuelto.
  for (const seg of seguimientos) {
    const bloque = Math.floor(seg.diasSinActualizar / 15)
    lista.push({
      key: `seguimiento_${seg.id}_b${bloque}`,
      img: '/chiqui/chiqui_vet.png',
      href: '/prevencion',
      accion: '🩺 Actualizar seguimiento',
      mensaje: `🩺 Hace ${seg.diasSinActualizar} días que no actualizas el seguimiento de "${seg.titulo}". ¿Cómo sigue ${m.nombre}?`,
    })
  }

  // ---- 6. RACHA (solo tras registrar; se genera al registrar el día) ----
  if (tieneRegistroHoy && rachaRegistros > 0) {
    const hito = hitoRacha(rachaRegistros)
    lista.push({
      key: `racha_${m.id}_${hoyStr}`,
      img: hito.img,
      mensaje: hito.mensaje,
    })
  }

  // ---- 7. RECORDATORIO INTELIGENTE (solo el más atrasado) ----
  // Aparece únicamente cuando aporta valor real: el campo se registró
  // alguna vez y lleva demasiados días sin dato nuevo. Se muestra UNO
  // por día (el más atrasado en proporción a su umbral) para no
  // saturar la cola. Desaparece solo al completar el registro.
  const RECORDATORIOS_INTELIGENTES: { tipo: string; dias: number | null; umbral: number; href: string; mensaje: (d: number) => string }[] = [
    { tipo: 'apetito', dias: diasSinCampo.apetito, umbral: 3, href: '/registro-diario', mensaje: d => `🍽️ Hace ${d} días que no registras el apetito de ${m.nombre}.` },
    { tipo: 'agua', dias: diasSinCampo.agua, umbral: 3, href: '/registro-diario', mensaje: d => `💧 Hace ${d} días que no registras cuánta agua toma ${m.nombre}.` },
    { tipo: 'heces', dias: diasSinCampo.heces, umbral: 3, href: '/registro-diario', mensaje: d => `💩 Hace ${d} días que no registras las deposiciones de ${m.nombre}.` },
    { tipo: 'peso', dias: diasSinCampo.peso, umbral: 30, href: '/prevencion', mensaje: d => `⚖️ ¿Quieres actualizar el peso de ${m.nombre}? El último registro fue hace ${d} días.` },
  ]
  const candidatos = RECORDATORIOS_INTELIGENTES
    .filter(r => r.dias !== null && r.dias >= r.umbral)
    .sort((a, b) => (b.dias as number) / b.umbral - (a.dias as number) / a.umbral)
  if (candidatos.length > 0) {
    const r = candidatos[0]
    lista.push({
      key: `recinte_${r.tipo}_${m.id}_${hoyStr}`,
      img: '/chiqui/chiqui_lupa.png',
      href: r.href,
      accion: r.tipo === 'peso' ? '⚖️ Actualizar peso' : '✏️ Registrar ahora',
      mensaje: r.mensaje(r.dias as number),
    })
  }

  // ---- 8. MENSAJE POSITIVO (cuando ya no hay nada más importante) ----
  if (tieneRegistroHoy) {
    const [aH, mH, dH] = hoyStr.split('-').map(Number)
    const idx = (aH * 366 + mH * 31 + dH) % MENSAJES_POSITIVOS.length
    lista.push({
      key: `positivo_${m.id}_${hoyStr}`,
      img: '/chiqui/chiqui_corazon.png',
      mensaje: MENSAJES_POSITIVOS[idx].replace('{nombre}', m.nombre),
    })
  }

  // ---- 9. RECORDATORIO DE NOTIFICACIONES ----
  if (sinPermisoNotif) {
    lista.push({
      key: `recordatorio_notif_${hoyStr}`,
      img: '/chiqui/chiqui_recordatorio.png',
      href: '/perfil',
      accion: '🔔 Activar recordatorios',
      mensaje: `🔔 Activa los recordatorios diarios para no olvidar registrar a ${m.nombre}.`,
    })
  }

  return lista
}

const PREFIJO_STORAGE = 'chiqui_novedad_'

export default function Novedades({ mascota, mascotas, tieneRegistroHoy, color, rachaRegistros, seguimientos, diasSinCampo }: Props) {
  const [cerradas, setCerradas] = useState<Set<string>>(new Set())
  const [sinPermisoNotif, setSinPermisoNotif] = useState(false)
  // Se espera al montaje para leer localStorage y Notification (evita
  // diferencias entre el HTML del servidor y el del cliente).
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const guardadas = new Set<string>()
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(PREFIJO_STORAGE)) guardadas.add(k.slice(PREFIJO_STORAGE.length))
      }
    } catch { /* sin localStorage: las novedades simplemente reaparecen */ }
    setCerradas(guardadas)
    try {
      setSinPermisoNotif(typeof Notification !== 'undefined' && Notification.permission === 'default')
    } catch { /* Notification no disponible (ej. iOS fuera de PWA) */ }
    setMontado(true)
  }, [mascota.id])

  function cerrar(n: Novedad) {
    // Las novedades efímeras solo se cierran "por ahora" (memoria):
    // al remontar el componente (volver al dashboard) reaparecen.
    if (!n.efimera) {
      try { localStorage.setItem(PREFIJO_STORAGE + n.key, '1') } catch { /* sin persistencia */ }
    }
    setCerradas(prev => new Set(prev).add(n.key))
  }

  if (!montado) return null

  const especies = new Set(mascotas.map(ms => ms.especie))
  const pendientes = calcularNovedades(
    mascota, especies, tieneRegistroHoy, color, rachaRegistros, sinPermisoNotif, fechaHoyChile(),
    seguimientos, diasSinCampo,
  ).filter(n => !cerradas.has(n.key))

  if (pendientes.length === 0) return null

  // Solo la primera (mayor prioridad); al cerrarla, el filtro deja
  // pasar a la siguiente automáticamente.
  const actual = pendientes[0]

  const contenidoTarjeta = (
    <>
      <img src={actual.img} alt="Chiqui" className="w-14 h-14 object-contain flex-shrink-0" />
      <div className="flex-1">
        <p className={`leading-snug ${actual.destacada ? 'text-sm font-bold text-[#3D2B1F]' : 'text-xs font-semibold text-[#5C4A3A]'}`}>
          {actual.mensaje}
        </p>
        {/* Línea de acción subrayada: deja claro que la tarjeta se
            puede tocar (además de poder cerrarla con la ✕) */}
        {actual.href && actual.accion && (
          <span className="inline-block mt-1 text-[11px] font-bold text-[#CD7421] underline underline-offset-2">
            {actual.accion}
          </span>
        )}
      </div>
    </>
  )
  const estiloTarjeta = actual.destacada
    ? { background: 'linear-gradient(135deg, #FFBD5926, #FBEAD9)', border: '1.5px solid #FFBD59' }
    : { background: '#FFFCF8', border: '1px solid #EEE2D4' }

  return (
    <div className="mb-3">
      {/* Encabezado de sección, con la misma identidad del Dashboard */}
      <div className="flex items-center justify-between px-5 pb-2">
        <div className="flex items-center gap-2">
          <img src="/chiqui/chiqui_recordatorio.png" alt="" className="w-8 h-8 object-contain" />
          <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Novedades</span>
          {pendientes.length > 1 && (
            <span className="text-[11px] font-bold text-[#8A7560]">({pendientes.length})</span>
          )}
        </div>
      </div>

      {/* UNA sola tarjeta a la vez — misma estructura para todas.
          key={actual.key} reinicia la animación fade al cambiar. */}
      {actual.href ? (
        <div key={actual.key} className="mx-4 fade-in relative">
          <Link href={actual.href} className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 pr-10 text-left" style={estiloTarjeta}>
            {contenidoTarjeta}
          </Link>
          <button
            onClick={() => cerrar(actual)}
            className="absolute top-1/2 -translate-y-1/2 right-3 text-[#8A7560] text-sm p-1"
            aria-label="Cerrar novedad"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          key={actual.key}
          onClick={() => cerrar(actual)}
          className="mx-4 fade-in w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
          style={estiloTarjeta}
        >
          {contenidoTarjeta}
          <span className="text-[#8A7560] text-sm flex-shrink-0">✕</span>
        </button>
      )}
    </div>
  )
}
