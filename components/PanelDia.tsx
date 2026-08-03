'use client'
import { useState } from 'react'

// ============================================================
// PANEL DÍA — selector de día del panel interno
// ============================================================
// POR QUÉ ES UN COMPONENTE DE CLIENTE
// La primera versión movía el día con enlaces (?d=...), lo que
// recargaba la página entera en cada click. Acá el servidor manda de
// una vez los últimos 60 días ya calculados y el cambio de día es
// puro estado local: instantáneo, sin ida y vuelta.
//
// QUÉ MUESTRA
//  1. Tira de 14 días con la cantidad de personas activas cada uno. Es
//     la ventana que Google Play pide demostrar para salir de closed
//     testing (12+ testers activos durante 14 días seguidos), así que
//     sirve de navegación y de evidencia a la vez.
//  2. Quiénes hicieron su REGISTRO DIARIO ese día, con sus mascotas.
//  3. OTRA ACTIVIDAD de ese día: vacunas, visitas al veterinario,
//     pesos, exámenes, momentos... todo lo que la gente guarda en la
//     app y que no es el registro diario.
//
// Las dos listas van plegadas por defecto: con 24 usuarios ya ocupaban
// media pantalla, y la idea es que esto siga sirviendo con 100.

interface MascotaDia {
  nombre: string
  especie: string
}
interface UsuarioDia {
  nombre: string
  mascotas: MascotaDia[]
}
interface OtroRegistro {
  emoji: string
  label: string
  quien: string
  detalle: string
}
export interface DiaPanel {
  fecha: string
  usuarios: UsuarioDia[]
  otros: OtroRegistro[]
}

const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Mediodía: construir la fecha a medianoche se cae en los cambios de
// horario de verano y puede correr el día de la semana.
function fmtLarga(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`
}

function emojiEspecie(especie: string): string {
  if (especie === 'Perro') return '🐶'
  if (especie === 'Gato') return '🐱'
  return '🐾'
}

function colorDia(n: number): string {
  if (n >= 12) return '#4CAF7D'
  if (n >= 6) return '#F5C842'
  if (n >= 1) return '#F07A30'
  return '#EEE2D4'
}

function Plegable({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  if (n === 0) return null
  return (
    <div className="mt-3 pt-2.5 border-t border-[#EEE2D4]">
      <button onClick={() => setAbierto(v => !v)} className="w-full flex items-center gap-2 text-left">
        <p className="flex-1 text-[11px] font-bold text-[#8C572F]">{titulo}</p>
        <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{n}</span>
        <span className="text-[#8C572F] text-sm font-bold">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && <div className="mt-2.5">{children}</div>}
    </div>
  )
}

export default function PanelDia({ dias, totalUsuarios }: { dias: DiaPanel[]; totalUsuarios: number }) {
  // El último elemento es hoy: el servidor los manda en orden.
  const ultimo = dias.length - 1
  const [sel, setSel] = useState(ultimo)

  if (dias.length === 0) return null

  const dia = dias[sel]
  const esHoy = sel === ultimo
  const anterior = sel > 0 ? dias[sel - 1] : null

  // Los 14 días que terminan en el elegido.
  const desde = Math.max(0, sel - 13)
  const tira = dias.slice(desde, sel + 1)

  // Resumen de la otra actividad, agrupado por tipo, para mostrarlo
  // como una línea corta sin tener que desplegar nada.
  const porTipo = new Map<string, { emoji: string; n: number }>()
  for (const o of dia.otros) {
    const actual = porTipo.get(o.label) || { emoji: o.emoji, n: 0 }
    actual.n++
    porTipo.set(o.label, actual)
  }
  const resumenOtros = Array.from(porTipo.entries()).sort((a, b) => b[1].n - a[1].n)

  return (
    <div className="mx-4 mb-4">
      <h2 className="text-xs font-bold text-[#8C572F] uppercase tracking-wider mb-2">Actividad por día</h2>
      <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">

        <div className="flex gap-0.5 mb-3">
          {tira.map((t, i) => {
            const idx = desde + i
            const n = t.usuarios.length
            return (
              <button
                key={t.fecha}
                onClick={() => setSel(idx)}
                className="flex-1 text-center rounded-lg py-1"
                style={idx === sel
                  ? { background: colorDia(n), border: '2px solid #3D2B1F' }
                  : { background: colorDia(n), border: '2px solid transparent' }}
              >
                <span className="block text-[8px] text-[#3D2B1F]/70">{Number(t.fecha.slice(8, 10))}</span>
                <span className="block text-[11px] font-bold text-[#3D2B1F]">{n}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSel(s => Math.max(0, s - 1))}
            disabled={sel === 0}
            className="text-lg px-2 disabled:opacity-25"
            style={{ color: '#8C572F' }}
          >
            ◀
          </button>
          <div className="text-center flex-1">
            <p className="text-xs text-[#8A7560] capitalize">
              {fmtLarga(dia.fecha)}{esHoy ? ' · hoy' : ''}
            </p>
            <p className="font-bold text-2xl mt-0.5" style={{ color: dia.usuarios.length > 0 ? '#4CAF7D' : '#B5A38F' }}>
              {dia.usuarios.length} <span className="text-sm font-normal text-[#8A7560]">de {totalUsuarios}</span>
            </p>
            <p className="text-[10px] text-[#8A7560]">hicieron su registro diario</p>
          </div>
          <button
            onClick={() => setSel(s => Math.min(ultimo, s + 1))}
            disabled={esHoy}
            className="text-lg px-2 disabled:opacity-25"
            style={{ color: '#8C572F' }}
          >
            ▶
          </button>
        </div>

        {dia.usuarios.length === 0 && dia.otros.length === 0 && (
          <p className="text-xs text-[#8A7560] mt-2 text-center">
            {esHoy ? 'Todavía no hay actividad hoy.' : 'Sin actividad ese día.'}
          </p>
        )}

        <Plegable titulo="Quiénes registraron" n={dia.usuarios.length}>
          {/* Filas alternadas y el nombre de la mascota junto al de
              la persona: con veinte nombres seguidos, cruzar el ancho
              para emparejar cada línea cansa y se pierde el hilo.
              El -mx-4 lleva la banda hasta el borde de la tarjeta. */}
          <div className="-mx-4">
            {dia.usuarios.map((u, i) => (
              <div
                key={i}
                className="px-4 py-1.5 grid grid-cols-[7rem_1fr] items-baseline"
                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}
              >
                <p className="text-xs text-[#3D2B1F] truncate pr-2">{u.nombre}</p>
                {/* El separador es un BORDE, no un carácter: un "|"
                    queda sujeto a la línea base del texto y se ve
                    torcido entre filas; el borde recorre la fila
                    completa y queda recto. */}
                <p className="text-[11px] text-[#8A7560] truncate border-l border-[#E0CDB6] pl-2.5">
                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </Plegable>

        {/* Otra actividad: todo lo que la gente guarda en la app y que
            NO es el registro diario. El resumen por tipo se ve sin
            desplegar; el detalle de quién hizo qué, adentro. */}
        {resumenOtros.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[#EEE2D4]">
            <p className="text-[11px] text-[#3D2B1F] leading-relaxed">
              {resumenOtros.map(([label, v]) => `${v.emoji} ${v.n} ${label}${v.n > 1 ? 's' : ''}`).join(' · ')}
            </p>
          </div>
        )}

        <Plegable titulo="Detalle de la otra actividad" n={dia.otros.length}>
          {/* Mismo tratamiento que la lista de arriba, para que las
              dos se lean igual. */}
          <div className="-mx-4">
            {dia.otros.map((o, i) => (
              <div
                key={i}
                className="px-4 py-1.5 grid grid-cols-[1fr_8rem] items-baseline"
                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}
              >
                {/* Aquí la columna fija va a la DERECHA: lo que más
                    varía de largo es la descripción, no el nombre. */}
                <p className="text-xs text-[#3D2B1F] truncate pr-2">{o.emoji} {o.detalle}</p>
                <p className="text-[11px] text-[#8A7560] truncate border-l border-[#E0CDB6] pl-2.5">{o.quien}</p>
              </div>
            ))}
          </div>
        </Plegable>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EEE2D4]">
          <p className="text-[10px] text-[#8A7560]">
            {anterior
              ? `El día anterior: ${anterior.usuarios.length} ${anterior.usuarios.length === 1 ? 'usuario' : 'usuarios'}`
              : 'Sin datos anteriores'}
          </p>
          {!esHoy && (
            <button onClick={() => setSel(ultimo)} className="text-[10px] font-bold text-[#CD7421]">
              Volver a hoy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
