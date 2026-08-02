'use client'
import { useState } from 'react'

// ============================================================
// PANEL SEMANAS — el mes desglosado, semana por semana
// ============================================================
// POR QUÉ
// Un mes en 31 barras es ilegible en un teléfono: los números quedan
// diminutos y se pisan entre ellos. Pero promediar el mes en 4 o 5
// barras borra el detalle (qué día fue el récord, cuándo empezó a
// subir).
//
// Acá se conservan las dos cosas: cada semana muestra su resumen sin
// desplegar, y adentro está el detalle día por día con su propio
// gráfico. Así se revisa solo la semana que interesa.
//
// SEMANAS DE CALENDARIO, NO BLOQUES DE 7 DÍAS
// Se agrupa de lunes a domingo. Si se cortara cada 7 días desde el 1,
// las "semanas" de julio 2026 irían de miércoles a martes, mezclando
// fines de semana y volviendo el promedio poco comparable.
//
// Como consecuencia, un mes puede dar 4, 5 o hasta 6 semanas, y la
// primera y la última suelen estar incompletas. Eso se indica: una
// semana de 3 días no se compara con una de 7, y por eso el resumen
// muestra el PROMEDIO diario y no el total.

interface DiaSerie {
  fecha: string
  valor: number
}

const LETRA_DIA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Mediodía: a medianoche los cambios de horario de verano pueden
// correr el día de la semana.
function indiceDiaSemana(iso: string): number {
  const d = new Date(iso + 'T12:00:00')
  return (d.getDay() + 6) % 7 // 0 = lunes
}

function numDia(iso: string): number {
  return Number(iso.slice(8, 10))
}

function Semana({ n, dias, maxMes }: { n: number; dias: DiaSerie[]; maxMes: number }) {
  const [abierta, setAbierta] = useState(false)

  const total = dias.reduce((a, d) => a + d.valor, 0)
  const promedio = dias.length > 0 ? total / dias.length : 0
  const max = Math.max(0, ...dias.map(d => d.valor))
  const mejor = dias.find(d => d.valor === max)
  const incompleta = dias.length < 7

  const color = promedio >= 12 ? '#4CAF7D' : promedio >= 6 ? '#F5C842' : promedio >= 1 ? '#F07A30' : '#B5A38F'
  const mesNombre = dias.length > 0 ? MESES_LARGO[Number(dias[0].fecha.slice(5, 7)) - 1] : ''
  const rango = dias.length > 0
    ? `${numDia(dias[0].fecha)} al ${numDia(dias[dias.length - 1].fecha)} de ${mesNombre}`
    : ''

  return (
    <div className="border-b border-[#EEE2D4] last:border-0">
      <button onClick={() => setAbierta(v => !v)} className="w-full py-2.5 text-left">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#3D2B1F]">
              Semana {n}
              {incompleta && <span className="text-[10px] font-normal text-[#B5A38F]"> · {dias.length} días</span>}
            </p>
            <p className="text-[10px] text-[#8A7560]">{rango}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold" style={{ color }}>{promedio.toFixed(1)}</p>
            <p className="text-[9px] text-[#8A7560]">prom. diario</p>
          </div>
          <span className="text-[#8C572F] text-sm font-bold flex-shrink-0">{abierta ? '▲' : '▼'}</span>
        </div>
      </button>

      {abierta && (
        <div className="pb-3">
          {/* Las barras se escalan contra el máximo del MES completo, no
              contra el de la semana: si cada semana usara su propia
              escala, una semana floja se vería igual de alta que la
              mejor del mes. */}
          <div className="flex items-end gap-1 h-20 mb-1">
            {dias.map(d => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[9px] text-[#8A7560] mb-0.5">{d.valor > 0 ? d.valor : ''}</span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(2, (d.valor / Math.max(1, maxMes)) * 78)}%`,
                    background: d.valor > 0 ? '#FFBD59' : '#EEE2D4',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {dias.map(d => {
              const idx = indiceDiaSemana(d.fecha)
              const finde = idx >= 5
              return (
                <div key={d.fecha} className="flex-1 text-center">
                  <span className="block text-[9px]" style={{ color: finde ? '#CD7421' : '#8A7560' }}>
                    {LETRA_DIA[idx]}
                  </span>
                  <span className="block text-[9px] text-[#B5A38F]">{numDia(d.fecha)}</span>
                </div>
              )
            })}
          </div>
          {mejor && max > 0 && (
            <p className="text-[10px] text-[#8A7560] mt-2">
              Mejor día: {numDia(mejor.fecha)} con {max} {max === 1 ? 'persona' : 'personas'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PanelSemanas({ dias }: { dias: DiaSerie[] }) {
  if (dias.length === 0) return null

  // Agrupación por semanas de calendario: se abre una semana nueva cada
  // vez que aparece un lunes.
  const semanas: DiaSerie[][] = []
  let actual: DiaSerie[] = []
  for (const d of dias) {
    if (actual.length > 0 && indiceDiaSemana(d.fecha) === 0) {
      semanas.push(actual)
      actual = []
    }
    actual.push(d)
  }
  if (actual.length > 0) semanas.push(actual)

  const maxMes = Math.max(1, ...dias.map(d => d.valor))
  const totalMes = dias.reduce((a, d) => a + d.valor, 0)
  const promMes = dias.length > 0 ? totalMes / dias.length : 0

  return (
    <div className="mx-4 mb-4">
      <h2 className="text-xs font-bold text-[#8C572F] uppercase tracking-wider mb-2">Personas activas por semana</h2>
      <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] px-4 py-1">
        {semanas.map((s, i) => (
          <Semana key={s[0].fecha} n={i + 1} dias={s} maxMes={maxMes} />
        ))}
      </div>
      <p className="text-[10px] text-[#8A7560] mt-1.5 px-1">
        Promedio del mes: {promMes.toFixed(1)} personas al día · Mejor día: {maxMes}
      </p>
    </div>
  )
}
