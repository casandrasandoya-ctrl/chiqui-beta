'use client'
import { useState } from 'react'

interface Props {
  examenesLab: any[]
}

const TIPOS_EXAMEN_LAB: Record<string,{icon:string,label:string}> = {
  bioquimico: { icon:'🧪', label:'Perfil bioquímico' },
  hemograma: { icon:'🩸', label:'Hemograma' },
  orina: { icon:'💛', label:'Examen de orina' },
  tiroides: { icon:'🦴', label:'Perfil tiroideo' },
  test_rapido: { icon:'🧪', label:'Test rápido' },
}

// Color del resultado de un test rápido: rojo si Positivo, naranjo si
// Indeterminado, verde si Negativo. Los tests rápidos no usan rangos
// numéricos -- su "fuera de rango" es simplemente un resultado
// Positivo.
function colorResultadoTest(resultado: string): string {
  if (resultado === 'Positivo') return '#E05252'
  if (resultado === 'Indeterminado') return '#F07A30'
  return '#4CAF7D'
}

function fmt(f: string): string {
  if (!f) return '—'
  const d = new Date(f + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
}

function fueraDeRango(valor: string, rangoMin: number | null, rangoMax: number | null): boolean {
  if (rangoMin === null || rangoMax === null) return false
  const v = parseFloat(String(valor).replace(',', '.'))
  if (isNaN(v)) return false
  return v < rangoMin || v > rangoMax
}

// Flecha direccional para el resumen compacto: ↑ si el valor está por
// sobre el máximo, ↓ si está por debajo del mínimo, '' si está dentro
// de rango o no se puede calcular (valor no numérico o sin rango).
function flechaDireccion(valor: string, rangoMin: number | null, rangoMax: number | null): string {
  if (rangoMin === null || rangoMax === null) return ''
  const v = parseFloat(String(valor).replace(',', '.'))
  if (isNaN(v)) return ''
  if (v > rangoMax) return '↑'
  if (v < rangoMin) return '↓'
  return ''
}

function TablaResultados({ resultados, testRapido = false }: { resultados: any[]; testRapido?: boolean }) {
  const ordenados = resultados.slice().sort((a, b) => a.orden - b.orden)
  return (
    <div className="bg-[#FBEAD9] rounded-xl p-2.5">
      {ordenados.map((r: any) => {
        const fuera = !testRapido && fueraDeRango(r.valor, r.rango_min, r.rango_max)
        const colorTR = testRapido ? colorResultadoTest(r.valor) : null
        return (
          <div key={r.id} className="py-1 border-b border-[#F5EDE3] last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#3D2B1F]">{r.parametro}</span>
              <span className="text-xs font-semibold" style={{ color: colorTR || (fuera ? '#993C1D' : '#3D2B1F') }}>
                {testRapido && r.valor === 'Positivo' ? '⚠️ ' : ''}{r.valor} {r.unidad || ''}
                {r.rango_min !== null && r.rango_max !== null && (
                  <span className="text-[10px] text-[#8A7560] font-normal ml-1">({r.rango_min}-{r.rango_max})</span>
                )}
              </span>
            </div>
            {r.observacion && <p className="text-[10px] text-[#8A7560] italic mt-0.5">{r.observacion}</p>}
          </div>
        )
      })}
    </div>
  )
}

function GrupoExamen({ tipo, examenes }: { tipo: string; examenes: any[] }) {
  const info = TIPOS_EXAMEN_LAB[tipo] || { icon: '🧫', label: tipo }
  const esTR = tipo === 'test_rapido'
  // Más reciente primero (ya viene ordenado así desde el RPC, pero por
  // seguridad se reordena aquí también).
  const ordenados = examenes.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
  const ultimo = ordenados[0]
  const anteriores = ordenados.slice(1)

  const [verAnteriores, setVerAnteriores] = useState(false)
  const [comparando, setComparando] = useState(false)
  const [expandidoAnterior, setExpandidoAnterior] = useState<string | null>(null)
  const [verCompleto, setVerCompleto] = useState(false)

  const resultadosUltimo = (ultimo.resultados || [])
  const fueraDeRangoUltimo = esTR ? [] : resultadosUltimo.filter((r: any) => fueraDeRango(r.valor, r.rango_min, r.rango_max))
  // Test rápido: el equivalente a "fuera de rango" es un resultado
  // Positivo. Por defecto se muestra SOLO el examen más reciente, con
  // todos sus tests listados (son pocos) y los positivos destacados.
  const positivosUltimo = esTR ? resultadosUltimo.filter((r: any) => r.valor === 'Positivo') : []

  // Para la comparación: unión de parámetros de todos los exámenes de
  // este tipo, en orden ascendente por fecha (igual que en la vista del
  // tutor), con scroll horizontal si hay muchas fechas.
  const parametrosUnion: string[] = []
  for (const ex of ordenados) {
    for (const r of (ex.resultados || [])) {
      if (!parametrosUnion.includes(r.parametro)) parametrosUnion.push(r.parametro)
    }
  }
  const examenesAsc = ordenados.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="pb-4 border-b border-[#EEE2D4] last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-sm">{info.icon} {info.label}</p>
        {examenes.length >= 2 && (
          <button
            onClick={() => { setComparando(v => !v); setVerAnteriores(false) }}
            className="text-[11px] font-semibold text-[#4AABDB]"
          >
            {comparando ? 'Ver solo el último' : `↔ Comparar (${examenes.length})`}
          </button>
        )}
      </div>

      {comparando ? (
        <div className="overflow-x-auto border border-[#EEE2D4] rounded-xl">
          <table className="text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[#FBEAD9] text-left px-2 py-1.5 font-semibold text-[#8A7560] border-b border-[#EEE2D4] min-w-[110px]">Parámetro</th>
                {examenesAsc.map(ex => (
                  <th key={ex.id} className="px-2 py-1.5 font-semibold text-[#8A7560] border-b border-l border-[#EEE2D4] min-w-[70px] whitespace-nowrap">
                    {fmt(ex.fecha)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parametrosUnion.map(p => (
                <tr key={p}>
                  <td className="sticky left-0 bg-[#FFFCF8] px-2 py-1.5 text-[#3D2B1F] border-b border-[#F5EDE3] whitespace-nowrap">{p}</td>
                  {examenesAsc.map(ex => {
                    const r = (ex.resultados || []).find((rr: any) => rr.parametro === p)
                    const positivo = esTR && r?.valor === 'Positivo'
                    const fuera = !esTR && r ? fueraDeRango(r.valor, r.rango_min, r.rango_max) : false
                    return (
                      <td key={ex.id} className="px-2 py-1.5 border-b border-l border-[#F5EDE3] text-center" style={(fuera || positivo) ? { color: '#993C1D', fontWeight: 600, background: '#FDEAEA' } : { color: '#3D2B1F' }}>
                        {r ? `${r.valor}${positivo ? ' ⚠️' : ''}` : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Examen más reciente -- RESUMIDO por defecto: fecha, peso,
              y la lista de parámetros fuera de rango con flecha (↑/↓).
              La tabla completa con TODOS los parámetros solo aparece al
              tocar "Ver examen completo". */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8A7560]">Último examen: {fmt(ultimo.fecha)}</span>
            {ultimo.peso_kg && <span className="text-xs text-[#8A7560]">Peso: {ultimo.peso_kg} kg</span>}
          </div>

          {esTR ? (
            <>
              <div className={`rounded-xl p-2.5 mb-2 ${positivosUltimo.length > 0 ? 'bg-[#FDEAEA]' : 'bg-[#FBEAD9]'}`}>
                {positivosUltimo.length > 0 ? (
                  <p className="text-xs font-bold text-[#993C1D] mb-1.5">
                    ⚠️ {positivosUltimo.length} test positivo{positivosUltimo.length === 1 ? '' : 's'}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-[#4CAF7D] mb-1.5">✅ Sin resultados positivos</p>
                )}
                <div className="space-y-0.5">
                  {resultadosUltimo.slice().sort((a: any, b: any) => a.orden - b.orden).map((r: any) => (
                    <div key={r.id}>
                      <p className="text-xs" style={{ color: colorResultadoTest(r.valor) }}>
                        {r.valor === 'Positivo' ? '⚠️ ' : ''}<span className="font-semibold">{r.parametro}:</span> {r.valor}
                      </p>
                      {r.observacion && <p className="text-[10px] text-[#8A7560] italic">{r.observacion}</p>}
                    </div>
                  ))}
                </div>
              </div>
              {ultimo.nota && <p className="text-xs text-[#8A7560] italic mb-1">📝 {ultimo.nota}</p>}
            </>
          ) : (
            <>
              {fueraDeRangoUltimo.length > 0 ? (
                <div className="bg-[#FDEAEA] rounded-xl p-2.5 mb-2">
                  <p className="text-xs font-bold text-[#993C1D] mb-1.5">
                    ⚠️ {fueraDeRangoUltimo.length} parámetro{fueraDeRangoUltimo.length === 1 ? '' : 's'} fuera de rango
                  </p>
                  <div className="space-y-0.5">
                    {fueraDeRangoUltimo.map((r: any) => (
                      <p key={r.id} className="text-xs text-[#993C1D]">
                        {r.parametro} {flechaDireccion(r.valor, r.rango_min, r.rango_max)}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#4CAF7D] mb-2">✅ Todos los parámetros dentro de rango</p>
              )}

              <button onClick={() => setVerCompleto(v => !v)} className="text-[11px] font-semibold text-[#8C572F]">
                {verCompleto ? '⌃ Ocultar examen completo' : '▼ Ver examen completo'}
              </button>

              {verCompleto && (
                <div className="mt-2">
                  <TablaResultados resultados={resultadosUltimo} />
                  {ultimo.nota && <p className="text-xs text-[#8A7560] mt-2 italic">📝 {ultimo.nota}</p>}
                </div>
              )}
            </>
          )}

          {/* Exámenes anteriores del mismo tipo -- colapsados por defecto */}
          {anteriores.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setVerAnteriores(v => !v)} className="text-[11px] font-semibold text-[#8C572F]">
                {verAnteriores ? '⌃ Ocultar anteriores' : `⌄ Ver anteriores (${anteriores.length})`}
              </button>
              {verAnteriores && (
                <div className="mt-2 space-y-2">
                  {anteriores.map(ex => {
                    const abierto = expandidoAnterior === ex.id
                    const resultados = ex.resultados || []
                    const cantidadFuera = esTR
                      ? resultados.filter((r: any) => r.valor === 'Positivo').length
                      : resultados.filter((r: any) => fueraDeRango(r.valor, r.rango_min, r.rango_max)).length
                    return (
                      <div key={ex.id} className="border border-[#EEE2D4] rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandidoAnterior(abierto ? null : ex.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left bg-[#FBEAD9]"
                        >
                          <span className="text-xs font-semibold text-[#3D2B1F]">
                            {fmt(ex.fecha)}{cantidadFuera > 0 ? ` · ⚠️ ${cantidadFuera}` : ''}
                          </span>
                          <span className="text-[#8A7560] text-xs">{abierto ? '⌃' : '⌄'}</span>
                        </button>
                        {abierto && (
                          <div className="p-2.5">
                            <TablaResultados resultados={resultados} testRapido={esTR} />
                            {ex.nota && <p className="text-xs text-[#8A7560] mt-2 italic">📝 {ex.nota}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ExamenesLabVet({ examenesLab }: Props) {
  if (!examenesLab || examenesLab.length === 0) return null

  const tipos = ['bioquimico', 'hemograma', 'orina', 'tiroides', 'test_rapido']
  const grupos = tipos
    .map(t => ({ tipo: t, examenes: examenesLab.filter(e => e.tipo === t) }))
    .filter(g => g.examenes.length > 0)

  return (
    <div className="space-y-4">
      {grupos.map(g => (
        <GrupoExamen key={g.tipo} tipo={g.tipo} examenes={g.examenes} />
      ))}
    </div>
  )
}
