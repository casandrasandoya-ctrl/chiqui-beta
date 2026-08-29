'use client'
import { useEffect, useState } from 'react'
import { hitoRacha } from '@/components/Novedades'

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
  // null = todavía calculándose. El modal aparece igual y el número
  // llega después: es preferible ver algo en 100ms y que el número
  // aparezca, a mirar una pantalla en blanco un segundo entero.
  racha: number | null
  // La mejor racha histórica. Ver cuánto le falta para superarla es más
  // motivador que el número actual solo.
  mejorRacha: number | null
  diasDelMes: number | null
  diasMesPasado: number | null
  // Los últimos 7 días TERMINANDO HOY, con su nombre real. Empezar en
  // domingo dejaba la mayoría de los checks fuera de vista los lunes.
  ultimos7: { letra: string; hecho: boolean }[] | null
  editando: boolean
  onCerrar: () => void
}

export default function ModalLogro({
  nombre, racha, mejorRacha, diasDelMes, diasMesPasado, ultimos7, editando, onCerrar,
}: Props) {
  const [entrando, setEntrando] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setEntrando(false), 50)
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.body.style.overflow = '' }
  }, [])

  // La imagen y el mensaje salen de hitoRacha(), la misma función que
  // usa Novedades. Hay 15 niveles ya diseñados —inicio, 7, 15, 30, 45,
  // 100, corona, superhéroe— y duplicarlos acá habría significado dos
  // sistemas que se desincronizan.
  const cargando = racha === null
  const hito = editando
    ? { img: '/chiqui/chiqui_amor.png', mensaje: `Actualizaste el registro de ${nombre}. Los datos al día valen más que los datos a medias.` }
    // Mientras carga se muestra la imagen de inicio: es la única que
    // sirve para cualquier racha, así no hay salto visual cuando llega
    // el número real.
    : hitoRacha(racha ?? 1)
  const imagen = hito.img
  // El mensaje de hitoRacha ya trae el número de días adelante; acá el
  // número va aparte y en grande, así que se recorta esa parte.
  const mensaje = hito.mensaje.replace(/^🔥 \d+ días?( seguidos)?\.\s*/, '')

  // La comparación con el mes pasado solo se muestra si es favorable y
  // si hay con qué comparar. Recordarle a alguien que va peor que el mes
  // pasado justo cuando acaba de registrar es contraproducente.
  const mejorQueAntes = diasMesPasado !== null && diasDelMes !== null && diasMesPasado > 0 && diasDelMes > diasMesPasado
  const diferencia = (diasDelMes ?? 0) - (diasMesPasado ?? 0)

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

      <p
        className="font-heading text-6xl font-extrabold text-[#CD7421] mt-6 leading-none"
        style={{ opacity: cargando ? 0.25 : 1, transition: 'opacity .25s ease' }}
      >
        {cargando ? '·' : racha}
      </p>
      <p className="font-heading text-xl font-extrabold text-[#CD7421] mt-1">
        {cargando ? 'contando...' : racha === 1 ? 'día seguido' : 'días seguidos'}
      </p>

      {/* La mejor racha: ver cuánto falta para superarla motiva más que
          el número actual solo. Solo se muestra si ya hubo una mejor. */}
      {!cargando && mejorRacha !== null && racha !== null && mejorRacha > racha && (
        <div className="bg-[#FFFCF8] rounded-full px-5 py-2 mt-3">
          <p className="text-[13px] font-semibold text-[#8A7560]">
            Tu mejor racha: <strong className="text-[#3D2B1F]">{mejorRacha}</strong>
          </p>
        </div>
      )}
      {!cargando && racha !== null && racha > 1 && racha === mejorRacha && (
        <div className="rounded-full px-5 py-2 mt-3" style={{ background: '#4CAF7D' }}>
          <p className="text-[13px] font-bold text-white">Es tu mejor racha</p>
        </div>
      )}

      {/* Los últimos 7 días terminando hoy. Con el nombre real del día:
          es más fácil reconocer "ayer no registré" que contar posiciones
          en una semana que empieza el domingo. */}
      <div className="flex gap-2 mt-7">
        {(ultimos7 || Array.from({ length: 7 }, () => ({ letra: '·', hecho: false }))).map((d, i) => {
          const esHoy = i === 6
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

      <p
        className="text-[14px] text-[#8A7560] text-center leading-relaxed mt-7 max-w-xs"
        style={{ opacity: cargando ? 0 : 1, transition: 'opacity .3s ease' }}
      >
        {cargando ? '\u00A0' : mensaje}
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
