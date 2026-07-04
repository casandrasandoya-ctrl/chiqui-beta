'use client'
import { useState, useEffect } from 'react'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

interface Props {
  value: string
  onChange: (v: string) => void
  label?: string
  opcional?: boolean
  placeholder?: string
}

export default function FechaSelector({ value, onChange, label, opcional, placeholder }: Props) {
  const [abierto, setAbierto] = useState(false)
  const anioActual = new Date().getFullYear()

  const [anio, mes, dia] = value ? value.split('-').map(Number) : [null, null, null]

  const [selAnio, setSelAnio] = useState<number | null>(anio || null)
  const [selMes, setSelMes] = useState<number | null>(mes ? mes - 1 : null)
  const [selDia, setSelDia] = useState<number | null>(dia || null)
  const [paso, setPaso] = useState<'anio' | 'mes' | 'dia'>('anio')

  useEffect(() => {
    if (value) {
      const [a, m, d] = value.split('-').map(Number)
      setSelAnio(a); setSelMes(m - 1); setSelDia(d)
    }
  }, [value])

  function diasEnMes(a: number, m: number) {
    return new Date(a, m + 1, 0).getDate()
  }

  function elegirAnio(a: number) {
    setSelAnio(a); setPaso('mes')
    if (selMes !== null && selDia !== null) {
      const maxDias = diasEnMes(a, selMes)
      if (selDia > maxDias) setSelDia(null)
    }
  }

  function elegirMes(m: number) {
    setSelMes(m); setPaso('dia')
    if (selAnio !== null && selDia !== null) {
      const maxDias = diasEnMes(selAnio, m)
      if (selDia > maxDias) setSelDia(null)
    }
  }

  function elegirDia(d: number) {
    setSelDia(d)
    if (selAnio !== null && selMes !== null) {
      const mm = String(selMes + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      onChange(`${selAnio}-${mm}-${dd}`)
    }
    setAbierto(false)
    setPaso('anio')
  }

  function limpiar(e: React.MouseEvent) {
    e.stopPropagation()
    setSelAnio(null); setSelMes(null); setSelDia(null)
    onChange('')
    setPaso('anio')
  }

  function formatearFecha() {
    if (!selAnio || selMes === null || !selDia) return placeholder || 'Seleccionar fecha'
    return `${selDia} ${MESES[selMes]} ${selAnio}`
  }

  const IC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl"
  const anios = Array.from({ length: 15 }, (_, i) => anioActual - i)
  const maxDias = selAnio !== null && selMes !== null ? diasEnMes(selAnio, selMes) : 31
  const dias = Array.from({ length: maxDias }, (_, i) => i + 1)
  const tieneValor = selAnio && selMes !== null && selDia

  return (
    <div className="relative">
      {label && (
        <p className="text-xs text-[#8A7560] mb-1">
          {label} {opcional && <span className="text-[#8A7560]">(opcional)</span>}
        </p>
      )}
      <button
        type="button"
        onClick={() => { setAbierto(v => !v); setPaso('anio') }}
        className={`${IC} px-3 py-2.5 text-sm text-left flex items-center justify-between`}
      >
        <span className={tieneValor ? 'text-[#3D2B1F]' : 'text-[#8A7560]'}>
          {formatearFecha()}
        </span>
        <div className="flex items-center gap-1">
          {tieneValor && (
            <span onClick={limpiar} className="text-[#8A7560] text-xs px-1">✕</span>
          )}
          <span className="text-[#8A7560] text-xs">{abierto ? '⌃' : '⌄'}</span>
        </div>
      </button>
      {abierto && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EEE2D4] bg-[#FBEAD9]">
            <div className="flex gap-2">
              {['anio','mes','dia'].map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => i <= (paso === 'anio' ? 0 : paso === 'mes' ? 1 : 2) && setPaso(p as any)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${paso === p ? 'bg-[#FFBD59] text-[#1A1200]' : selAnio && i === 0 ? 'text-[#8C572F]' : selMes !== null && i === 1 ? 'text-[#8C572F]' : 'text-[#8A7560]'}`}
                >
                  {i === 0 ? (selAnio || 'Año') : i === 1 ? (selMes !== null ? MESES[selMes].substring(0,3) : 'Mes') : (selDia || 'Día')}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAbierto(false)} className="text-[#8A7560] text-sm">✕</button>
          </div>
          {paso === 'anio' && (
            <div className="grid grid-cols-3 gap-1 p-3 max-h-48 overflow-y-auto">
              {anios.map(a => (
                <button key={a} type="button" onClick={() => elegirAnio(a)}
                  className={`py-2.5 rounded-xl text-sm font-semibold ${selAnio === a ? 'bg-[#FFBD59] text-[#1A1200]' : 'bg-[#F5EDE3] text-[#3D2B1F]'}`}>
                  {a}
                </button>
              ))}
            </div>
          )}
          {paso === 'mes' && (
            <div className="grid grid-cols-3 gap-1 p-3">
              {MESES.map((m, i) => (
                <button key={i} type="button" onClick={() => elegirMes(i)}
                  className={`py-2.5 rounded-xl text-xs font-semibold ${selMes === i ? 'bg-[#FFBD59] text-[#1A1200]' : 'bg-[#F5EDE3] text-[#3D2B1F]'}`}>
                  {m.substring(0,3)}
                </button>
              ))}
            </div>
          )}
          {paso === 'dia' && (
            <div className="p-3">
              {/* Cabecera días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['L','M','M','J','V','S','D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-[#8A7560] py-0.5">{d}</div>
                ))}
              </div>
              {/* Grilla de días con offset según el primer día del mes */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  if (selAnio === null || selMes === null) return null
                  // getDay() devuelve 0=Dom..6=Sab, convertir a 0=Lun..6=Dom
                  const primerDia = new Date(selAnio, selMes, 1)
                  const offsetDom = primerDia.getDay() // 0=Dom
                  const offsetLun = offsetDom === 0 ? 6 : offsetDom - 1
                  const celdas = []
                  // Celdas vacías al inicio
                  for (let i = 0; i < offsetLun; i++) {
                    celdas.push(<div key={`e${i}`} />)
                  }
                  // Días del mes
                  for (let d = 1; d <= maxDias; d++) {
                    const diaSemana = new Date(selAnio, selMes, d).getDay()
                    const esFinde = diaSemana === 0 || diaSemana === 6
                    celdas.push(
                      <button key={d} type="button" onClick={() => elegirDia(d)}
                        className={`py-1.5 rounded-lg text-center flex flex-col items-center leading-none ${selDia === d ? 'bg-[#FFBD59] text-[#1A1200]' : esFinde ? 'bg-[#F5EDE3] text-[#8C572F]' : 'bg-[#F5EDE3] text-[#3D2B1F]'}`}>
                        <span className="text-[9px] font-semibold opacity-70">
                          {['D','L','M','M','J','V','S'][diaSemana]}
                        </span>
                        <span className="text-xs font-bold">{d}</span>
                      </button>
                    )
                  }
                  return celdas
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
