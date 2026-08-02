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
// Son 60 días de datos ya agrupados (no filas crudas), así que el peso
// es mínimo y se evitan 60 consultas.
//
// LA TIRA DE 14 DÍAS
// Muestra los 14 días que terminan en el elegido. Es la ventana que
// Google Play pide demostrar para salir de closed testing: 12+ testers
// activos durante 14 días seguidos. Sirve de navegación y de evidencia
// a la vez. Verde desde 12, amarillo desde 6, naranjo con al menos 1.

interface MascotaDia {
  nombre: string
  especie: string
}
interface UsuarioDia {
  nombre: string
  mascotas: MascotaDia[]
}
export interface DiaPanel {
  fecha: string
  usuarios: UsuarioDia[]
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

  return (
    <div className="mx-4 mb-4">
      <h2 className="text-xs font-bold text-[#8C572F] uppercase tracking-wider mb-2">Registros por día</h2>
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

        {dia.usuarios.length === 0 ? (
          <p className="text-xs text-[#8A7560] mt-2 text-center">
            {esHoy ? 'Todavía nadie ha registrado hoy.' : 'Nadie registró ese día.'}
          </p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {dia.usuarios.map((u, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-[#3D2B1F] truncate">{u.nombre}</p>
                <p className="text-[10px] text-[#8A7560] flex-shrink-0 truncate">
                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}

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
