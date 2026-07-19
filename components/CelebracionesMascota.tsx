'use client'
import { useState, useEffect } from 'react'

// ============================================================
// CELEBRACIONES — cumpleaños y aniversario de unión a la familia
// ============================================================
// Muestra banners cálidos y cerrables en el dashboard:
// - HOY:      tarjeta destacada con ilustración especial de Chiqui.
// - PRÓXIMOS: (hasta 7 días antes) banner sutil de una línea.
// Al tocar el banner se cierra, y queda cerrado para ESA ocurrencia
// (se recuerda en localStorage por mascota + ocasión + año), así no
// vuelve a aparecer cada vez que se entra — sutil, no invasivo.
//
// EXTENSIBLE: para agregar fechas especiales futuras (Día del Perro,
// Día del Gato, etc.) basta con sumar una entrada al catálogo OCASIONES
// con su fecha fija, su ilustración de Chiqui y sus mensajes — no hay
// que tocar el render.

interface MascotaCelebracion {
  id: string
  nombre: string
  especie?: string
  fecha_nacimiento?: string | null
  fecha_union?: string | null
}

interface Ocurrencia {
  esHoy: boolean
  diasFaltan: number
  anios: number
}

function fechaHoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

// Próxima ocurrencia (este año o el siguiente) del mes/día de una
// fecha base, comparada con hoy en zona horaria de Chile.
function proximaOcurrencia(fechaBase: string, hoyStr: string): Ocurrencia | null {
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

interface EventoCelebracion {
  key: string
  esHoy: boolean
  img: string
  mensaje: string
}

// Catálogo de ocasiones. Cada una sabe calcular su ocurrencia y armar
// sus mensajes de "hoy" y "próximo".
function calcularEventos(m: MascotaCelebracion, hoyStr: string): EventoCelebracion[] {
  const eventos: EventoCelebracion[] = []
  const VENTANA_PROXIMOS = 7 // días de anticipación para los avisos

  // 🎂 Cumpleaños (usa la fecha de nacimiento que la app ya registra)
  if (m.fecha_nacimiento) {
    const o = proximaOcurrencia(m.fecha_nacimiento, hoyStr)
    if (o && o.anios >= 1) {
      if (o.esHoy) {
        eventos.push({
          key: `cumple_hoy_${m.id}_${hoyStr.slice(0, 4)}`,
          esHoy: true,
          img: '/chiqui/chiqui_cumple.png',
          mensaje: `🎉 ¡Hoy ${m.nombre} está de cumpleaños! Cumple ${o.anios} ${o.anios === 1 ? 'año' : 'años'}.`,
        })
      } else if (o.diasFaltan <= VENTANA_PROXIMOS) {
        eventos.push({
          key: `cumple_prox_${m.id}_${hoyStr.slice(0, 4)}`,
          esHoy: false,
          img: '/chiqui/chiqui_cumple.png',
          mensaje: o.diasFaltan === 1
            ? `🎈 ¡Mañana es el cumpleaños de ${m.nombre}!`
            : `🎈 Faltan ${o.diasFaltan} días para el cumpleaños de ${m.nombre}.`,
        })
      }
    }
  }

  // 🏡 Aniversario de "Se unió a tu familia"
  if (m.fecha_union) {
    const o = proximaOcurrencia(m.fecha_union, hoyStr)
    if (o && o.anios >= 1) {
      if (o.esHoy) {
        eventos.push({
          key: `union_hoy_${m.id}_${hoyStr.slice(0, 4)}`,
          esHoy: true,
          img: '/chiqui/chiqui_familia.png',
          mensaje: `❤️ ¡Hoy se ${o.anios === 1 ? 'cumple 1 año' : `cumplen ${o.anios} años`} desde que ${m.nombre} se unió a tu familia!`,
        })
      } else if (o.diasFaltan <= VENTANA_PROXIMOS) {
        eventos.push({
          key: `union_prox_${m.id}_${hoyStr.slice(0, 4)}`,
          esHoy: false,
          img: '/chiqui/chiqui_familia.png',
          mensaje: o.diasFaltan === 1
            ? `🏡 ¡Mañana celebrarán un nuevo aniversario juntos!`
            : `🏡 En ${o.diasFaltan} días celebrarán un nuevo aniversario juntos.`,
        })
      }
    }
  }

  // 🔮 FUTURO: fechas especiales fijas por especie, ej.:
  // if (m.especie === 'Perro') → 21 de julio, Día Mundial del Perro
  //   (img: /chiqui/chiqui_felicidad_racha.png o una nueva ilustración)
  // if (m.especie === 'Gato') → 8 de agosto, Día Internacional del Gato
  // Basta con replicar el patrón de arriba con una fecha fija.

  return eventos
}

const PREFIJO_STORAGE = 'chiqui_celebracion_'

export default function CelebracionesMascota({ mascota }: { mascota: MascotaCelebracion }) {
  const [cerrados, setCerrados] = useState<Set<string>>(new Set())
  // Se espera al montaje para leer localStorage (evita diferencias
  // entre el HTML del servidor y el del cliente).
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const guardados = new Set<string>()
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(PREFIJO_STORAGE)) guardados.add(k.slice(PREFIJO_STORAGE.length))
      }
    } catch { /* localStorage no disponible: los banners simplemente reaparecen */ }
    setCerrados(guardados)
    setMontado(true)
  }, [mascota.id])

  function cerrar(key: string) {
    try { localStorage.setItem(PREFIJO_STORAGE + key, '1') } catch { /* sin persistencia */ }
    setCerrados(prev => new Set(prev).add(key))
  }

  if (!montado) return null

  const eventos = calcularEventos(mascota, fechaHoyChile()).filter(e => !cerrados.has(e.key))
  if (eventos.length === 0) return null

  return (
    <div className="mx-4 mb-3 space-y-2">
      {eventos.map(e => (
        e.esHoy ? (
          // Celebración de HOY: tarjeta destacada, cálida, con la
          // ilustración especial de Chiqui. Se cierra al tocarla.
          <button
            key={e.key}
            onClick={() => cerrar(e.key)}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
            style={{ background: 'linear-gradient(135deg, #FFBD5926, #FBEAD9)', border: '1.5px solid #FFBD59' }}
          >
            <img src={e.img} alt="Chiqui celebrando" className="w-14 h-14 object-contain flex-shrink-0" />
            <p className="flex-1 text-sm font-bold text-[#3D2B1F] leading-snug">{e.mensaje}</p>
            <span className="text-[#8A7560] text-sm flex-shrink-0">✕</span>
          </button>
        ) : (
          // Aviso de PRÓXIMO evento: banner sutil de una línea.
          <button
            key={e.key}
            onClick={() => cerrar(e.key)}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left bg-[#FFFCF8] border border-[#EEE2D4]"
          >
            <img src={e.img} alt="Chiqui" className="w-8 h-8 object-contain flex-shrink-0" />
            <p className="flex-1 text-[11px] text-[#8A7560] leading-snug">{e.mensaje}</p>
            <span className="text-[#8A7560]/60 text-xs flex-shrink-0">✕</span>
          </button>
        )
      ))}
    </div>
  )
}
