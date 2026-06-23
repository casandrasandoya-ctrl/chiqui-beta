'use client'
import { useState, useEffect } from 'react'

// Reemplaza el input type="date" nativo (que en celular es incomodo de
// usar) por un picker visual con:
//   - Grid 4x3 de meses para elegir el mes de un vistazo
//   - Grid de dias del mes seleccionado
//   - Navegacion de ano con flechas
//   - Boton que muestra la fecha elegida en formato legible
//
// Uso:
//   <DatePickerModal
//     value="2024-06-15"          // formato YYYY-MM-DD (igual que input type=date)
//     onChange={v => setFecha(v)} // recibe YYYY-MM-DD
//     label="Fecha de aplicación" // texto del label encima del boton
//     placeholder="Seleccionar fecha"
//   />

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

interface Props {
  value: string           // YYYY-MM-DD o ''
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  className?: string
}

export default function DatePickerModal({ value, onChange, label, placeholder = 'Seleccionar fecha', className }: Props) {
  const hoy = new Date()

  // Estado interno del picker
  const [abierto, setAbierto] = useState(false)
  const [ano, setAno] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth()) // 0-11
  const [dia, setDia] = useState<number | null>(null)

  // Sincronizar estado interno con el valor externo
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      setAno(y)
      setMes(m - 1)
      setDia(d)
    }
  }, [value])

  function abrir() {
    if (!value) {
      setAno(hoy.getFullYear())
      setMes(hoy.getMonth())
      setDia(null)
    }
    setAbierto(true)
  }

  function confirmar() {
    if (!dia) return
    const mm = String(mes + 1).padStart(2, '0')
    const dd = String(dia).padStart(2, '0')
    onChange(`${ano}-${mm}-${dd}`)
    setAbierto(false)
  }

  function cancelar() {
    // Restaurar estado al valor guardado
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      setAno(y); setMes(m - 1); setDia(d)
    } else {
      setDia(null)
    }
    setAbierto(false)
  }

  // Calcular dias del mes y offset del primer dia (lunes = 0)
  const diasEnMes = new Date(ano, mes + 1, 0).getDate()
  const primerDia = new Date(ano, mes, 1).getDay() // 0=dom,1=lun...
  const offset = primerDia === 0 ? 6 : primerDia - 1 // convertir a lunes=0

  // Formatear fecha para mostrar en el boton
  function formatearFecha(v: string): string {
    if (!v) return ''
    const [y, m, d] = v.split('-').map(Number)
    return `${d} ${MESES_FULL[m - 1]} ${y}`
  }

  const IC = className || "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none text-left"

  return (
    <>
      {label && <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">{label}</label>}

      <button type="button" onClick={abrir} className={IC}>
        {value ? formatearFecha(value) : <span className="text-[#8A7560]">{placeholder}</span>}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={cancelar}>
          <div
            className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-4 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[#EEE2D4] rounded-full mx-auto mb-4" />

            {/* Fecha seleccionada actual */}
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-xs text-[#8A7560]">{label || 'Fecha'}</p>
              <p className="text-sm font-bold text-[#3D2B1F]">
                {dia ? `${dia} ${MESES_FULL[mes]} ${ano}` : 'Sin seleccionar'}
              </p>
            </div>

            {/* Navegacion de ano */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={() => setAno(a => a - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FBEAD9] text-[#8C572F] font-bold text-lg"
              >‹</button>
              <span className="text-sm font-bold text-[#3D2B1F]">{ano}</span>
              <button
                type="button"
                onClick={() => setAno(a => a + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FBEAD9] text-[#8C572F] font-bold text-lg"
              >›</button>
            </div>

            {/* Grid de meses 4x3 */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {MESES.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMes(i); setDia(null) }}
                  className={`py-2 text-xs rounded-xl font-medium transition-colors ${
                    i === mes
                      ? 'bg-[#FFBD59] text-[#3D2B1F] font-bold'
                      : 'bg-[#FBEAD9] text-[#5C4A3A]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Divisor */}
            <div className="h-px bg-[#EEE2D4] mb-3" />

            {/* Cabecera dias semana */}
            <div className="grid grid-cols-7 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[10px] text-[#8A7560] py-1">{d}</div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-0.5 mb-4">
              {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(diasEnMes).fill(null).map((_, i) => {
                const d = i + 1
                const sel = d === dia
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDia(d)}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg font-medium transition-colors ${
                      sel
                        ? 'bg-[#FFBD59] text-[#3D2B1F] font-bold'
                        : 'text-[#3D2B1F] hover:bg-[#FBEAD9]'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cancelar}
                className="py-3 rounded-xl text-sm font-semibold bg-[#EEE2D4] text-[#8A7560]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={!dia}
                className="py-3 rounded-xl text-sm font-bold bg-[#8C572F] text-white disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
