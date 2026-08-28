'use client'
import { useEffect, useState } from 'react'

// ============================================================
// MODAL DE LOGRO — el momento después de guardar
// ============================================================
// Aparece al guardar el registro del día. Es el momento en que la
// persona YA hizo el esfuerzo: reconocerlo ahí es lo que hace que
// vuelva mañana.
//
// Antes esto solo se veía en Novedades, donde casi nadie entra.
//
// QUÉ MUESTRA
// Su propia historia, no comparaciones con otros: la racha, cuántos
// días lleva este mes, qué días de la semana registró. "Llevas 12 días
// seguidos" le importa más a la mayoría que "estás en el 20% más
// constante" — y además es un dato que sí tenemos.
//
// Comparar con la comunidad requeriría consultar datos de todos los
// usuarios desde el navegador de cada uno, que no es algo que se pueda
// hacer bien sin una vista agregada en el servidor.

interface Props {
  nombre: string
  racha: number
  // La mejor racha histórica. Ver cuánto le falta para superarla es más
  // motivador que el número actual solo.
  mejorRacha: number
  diasDelMes: number
  diasMesPasado: number
  // Los últimos 7 días TERMINANDO HOY, con su nombre real. Empezar en
  // domingo dejaba la mayoría de los checks fuera de vista los lunes.
  ultimos7: { letra: string; hecho: boolean }[]
  editando: boolean
  onCerrar: () => void
}

export default function ModalLogro({
  nombre, racha, diasDelMes, diasMesPasado, semana, editando, onCerrar,
}: Props) {
  const [entrando, setEntrando] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setEntrando(false), 50)
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.body.style.overflow = '' }
  }, [])

  // El mensaje se elige por el hito más alto que se haya alcanzado. El
  // orden importa: primero los hitos grandes, después los cotidianos.
  const { imagen, mensaje } = (() => {
    if (editando) {
      return {
        imagen: '/chiqui/chiqui_amor.png',
        mensaje: `Corregiste el registro de ${nombre}. Los datos al día valen más que los datos a medias.`,
      }
    }
    if (racha >= 100) {
      return {
        imagen: '/chiqui/chiqui_cool.png',
        mensaje: `Cien días es muchísimo. Tienes una historia de ${nombre} que casi nadie tiene de su mascota.`,
      }
    }
    if (racha >= 30) {
      return {
        imagen: '/chiqui/chiqui_cool.png',
        mensaje: `Un mes entero sin fallar. Con esto ya se pueden ver patrones de verdad en ${nombre}.`,
      }
    }
    if (racha >= 7) {
      return {
        imagen: '/chiqui/chiquiverde.png',
        mensaje: `Una semana completa. Es justo cuando los registros empiezan a servir para algo.`,
      }
    }
    if (racha >= 3) {
      return {
        imagen: '/chiqui/chiquiverde.png',
        mensaje: `Vas tomando el ritmo. Tres días seguidos ya es un hábito empezando.`,
      }
    }
    if (racha === 1 && diasDelMes === 1) {
      return {
        imagen: '/chiqui/chiqui_amor.png',
        mensaje: `Este es tu primer registro de ${nombre}. Cada día que anotes hace el siguiente más útil.`,
      }
    }
    return {
      imagen: '/chiqui/chiquiverde.png',
      mensaje: `Un día más de la historia de ${nombre}.`,
    }
  })()

  // La comparación con el mes pasado solo se muestra si es favorable y
  // si hay con qué comparar. Recordarle a alguien que va peor que el mes
  // pasado justo cuando acaba de registrar es contraproducente.
  const mejorQueAntes = diasMesPasado > 0 && diasDelMes > diasMesPasado
  const diferencia = diasDelMes - diasMesPasado

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 overflow-y-auto"
      style={{
        background: '#FBEAD9',
        opacity: entrando ? 0 : 1,
        transition: 'opacity .3s ease',
      }}
    >
      <p className="font-heading text-xl font-extrabold text-[#8C572F] mb-8">Racha diaria</p>

      <img
        src={imagen}
        alt=""
        className="w-32 h-32 object-contain"
        style={{
          transform: entrando ? 'scale(.7)' : 'scale(1)',
          transition: 'transform .45s cubic-bezier(.34,1.56,.64,1) .1s',
        }}
      />

      <p className="font-heading text-6xl font-extrabold text-[#CD7421] mt-6 leading-none">
        {racha}
      </p>
      <p className="font-heading text-xl font-extrabold text-[#CD7421] mt-1">
        {racha === 1 ? 'día seguido' : 'días seguidos'}
      </p>

      {/* La mejor racha: ver cuánto falta para superarla motiva más que
          el número actual solo. Solo se muestra si ya hubo una mejor. */}
      {mejorRacha > racha && (
        <div className="bg-[#FFFCF8] rounded-full px-5 py-2 mt-3">
          <p className="text-[13px] font-semibold text-[#8A7560]">
            Tu mejor racha: <strong className="text-[#3D2B1F]">{mejorRacha}</strong>
          </p>
        </div>
      )}
      {racha > 0 && racha === mejorRacha && racha > 1 && (
        <div className="rounded-full px-5 py-2 mt-3" style={{ background: '#4CAF7D' }}>
          <p className="text-[13px] font-bold text-white">Es tu mejor racha</p>
        </div>
      )}

      {/* Los últimos 7 días terminando hoy. Con el nombre real del día:
          es más fácil reconocer "ayer no registré" que contar posiciones
          en una semana que empieza el domingo. */}
      <div className="flex gap-2 mt-7">
        {ultimos7.map((d, i) => {
          const esHoy = i === ultimos7.length - 1
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className={`text-[10px] font-bold uppercase ${esHoy ? 'text-[#CD7421]' : 'text-[#B5A38F]'}`}>
                {d.letra}
              </span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={d.hecho
                  ? { background: '#FFBD59', color: '#FFFCF8' }
                  : { background: '#F0E2CE', color: '#D6C3AB' }}
              >
                {d.hecho ? '✓' : '·'}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[14px] text-[#8A7560] text-center leading-relaxed mt-7 max-w-xs">
        {mensaje}
      </p>

      {mejorQueAntes && (
        <p className="text-[13px] text-[#8A7560] text-center mt-3">
          Este mes llevas <strong className="text-[#CD7421]">{diferencia} {diferencia === 1 ? 'día' : 'días'} más</strong> que el mes pasado.
        </p>
      )}

      <button
        onClick={onCerrar}
        className="mt-8 mb-4 w-full max-w-xs py-4 rounded-2xl font-heading font-extrabold text-lg text-white active:scale-[0.98] transition-transform"
        style={{ background: '#CD7421', boxShadow: '0 4px 0 #A85C18' }}
      >
        Continuar
      </button>
    </div>
  )
}
