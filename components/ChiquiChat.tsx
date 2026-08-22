'use client'
import { useState, useRef, useEffect } from 'react'

// ============================================================
// CHIQUI CHAT — conversación sobre lo registrado
// ============================================================
// NO ES UNA IA. No hay modelo de lenguaje detrás: reconoce palabras
// clave y responde con los datos que la persona ya registró. Si no
// entiende algo, lo dice y ofrece lo que sí sabe.
//
// Esa limitación es a propósito. Un modelo de lenguaje respondería
// cualquier cosa con seguridad, incluso lo que no sabe — y acá se
// habla de la salud de un animal.
//
// LO QUE NUNCA HACE
//  - Interpretar exámenes. Si preguntan por un valor de laboratorio,
//    dice que existe el registro y que eso lo lee el veterinario.
//  - Diagnosticar, graduar urgencia o recomendar tratamientos.
//  - Afirmar nada que no esté en los datos.
//
// Se abre contando lo que pasó estos días, sin que haya que preguntar:
// es lo que la persona querría saber al entrar.

export interface DatosChat {
  nombre: string
  especie: string
  episodios: string[]
  totalRegistros: number
  pctBien: number
  textoPeriodo: string
  paseosMes?: { cantidad: number; minutos: number } | null
  peso?: { actual: number; fecha: string; anterior?: number | null } | null
  medicamentos?: { nombre: string; desde: string }[]
  proximaVacuna?: { nombre: string; fecha: string } | null
  proximoAnti?: { nombre: string; fecha: string } | null
  ultimoVet?: string | null
  examenes?: { nombre: string; fecha: string }[]
}

interface Mensaje { de: 'chiqui' | 'tu'; texto: string }

// Cada tema tiene sus palabras y su respuesta. El orden importa: la
// primera que coincide gana, así que lo más específico va primero.
function responder(pregunta: string, d: DatosChat): string {
  const q = pregunta.toLowerCase()
  const tiene = (...palabras: string[]) => palabras.some(p => q.includes(p))

  // Exámenes: SIEMPRE antes que nada. Si alguien pregunta por un valor
  // de laboratorio, la respuesta no depende de qué más diga.
  if (tiene('examen', 'hemograma', 'sangre', 'creatinina', 'urea', 'perfil',
           'resultado', 'laboratorio', 'analisis de', 'análisis de')) {
    const n = d.examenes?.length || 0
    if (n === 0) {
      return `No tengo exámenes registrados de ${d.nombre}. Puedes agregarlos en Salud → Exámenes.\n\nEso sí: leer un examen es cosa de tu veterinario. Yo solo los guardo para que los tengas a mano.`
    }
    const lista = (d.examenes || []).slice(0, 3).map(e => `· ${e.nombre} — ${e.fecha}`).join('\n')
    return `Tengo ${n} examen${n === 1 ? '' : 'es'} guardado${n === 1 ? '' : 's'}:\n${lista}\n\nNo puedo interpretar sus valores — eso lo lee tu veterinario, que conoce a ${d.nombre}. Si quieres, genera el link desde tu perfil y los ve todos.`
  }

  // Qué contarle al veterinario
  if (tiene('vet', 'veterinari', 'consulta', 'qué le cuento', 'que le cuento', 'llevar')) {
    const partes = [`Esto es lo que llevaría de ${d.nombre}:`]
    if (d.episodios.length > 0) partes.push(d.episodios.map(e => `· ${e}`).join('\n'))
    else partes.push(`· Sin episodios destacables en ${d.textoPeriodo}.`)
    if (d.peso) partes.push(`· Peso actual: ${d.peso.actual} kg (${d.peso.fecha})`)
    if (d.medicamentos && d.medicamentos.length > 0) {
      partes.push(`· En tratamiento: ${d.medicamentos.map(m => m.nombre).join(', ')}`)
    }
    partes.push(`\nDesde tu perfil puedes generar un link para que lo vea completo, sin crear cuenta.`)
    return partes.join('\n')
  }

  // Paseos
  if (tiene('pase', 'camin', 'salid', 'ejercicio', 'actividad')) {
    if (d.especie !== 'Perro') return `El registro de paseos es para perros. En gatos registramos el juego, que cumple una función parecida.`
    if (!d.paseosMes || d.paseosMes.cantidad === 0) return `No tengo paseos registrados este mes.`
    const h = Math.floor(d.paseosMes.minutos / 60)
    const m = d.paseosMes.minutos % 60
    const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m} min`
    return `Este mes registraste ${d.paseosMes.cantidad} paseo${d.paseosMes.cantidad === 1 ? '' : 's'}, ${dur} en total.`
  }

  // Peso
  if (tiene('peso', 'pesa', 'kilo', 'engord', 'adelgaz', 'flaco', 'gordo')) {
    if (!d.peso) return `No tengo el peso de ${d.nombre} registrado. Puedes anotarlo en Salud → Peso.`
    let r = `${d.nombre} pesa ${d.peso.actual} kg, según el control del ${d.peso.fecha}.`
    if (d.peso.anterior != null) {
      const dif = +(d.peso.actual - d.peso.anterior).toFixed(1)
      if (dif === 0) r += ` Igual que el control anterior.`
      else r += ` ${dif > 0 ? 'Subió' : 'Bajó'} ${Math.abs(dif)} kg desde el control anterior (${d.peso.anterior} kg).`
    }
    return r
  }

  // Medicamentos
  if (tiene('medicament', 'remedio', 'pastilla', 'tratamiento', 'dosis', 'antibiotic')) {
    if (!d.medicamentos || d.medicamentos.length === 0) {
      return `${d.nombre} no tiene tratamientos activos registrados.`
    }
    const lista = d.medicamentos.map(m => `· ${m.nombre} — desde el ${m.desde}`).join('\n')
    return `${d.nombre} está con:\n${lista}\n\nSi notas algo distinto durante el tratamiento, anótalo — sirve para la próxima consulta.`
  }

  // Vacunas y antiparasitarios
  if (tiene('vacuna', 'antiparasit', 'desparasit', 'pulga', 'garrapata', 'refuerzo')) {
    const partes: string[] = []
    if (d.proximaVacuna) partes.push(`· Vacuna: ${d.proximaVacuna.nombre} — ${d.proximaVacuna.fecha}`)
    if (d.proximoAnti) partes.push(`· Antiparasitario: ${d.proximoAnti.nombre} — ${d.proximoAnti.fecha}`)
    if (partes.length === 0) return `No tengo próximas fechas de vacunas ni antiparasitarios. Puedes agregarlas en Salud.`
    return `Lo que viene:\n${partes.join('\n')}`
  }

  // Síntomas y episodios
  if (tiene('vomit', 'diarre', 'heces', 'caca', 'sintoma', 'síntoma', 'malestar',
           'enferm', 'raro', 'pasó', 'paso', 'episodi', 'ultimo', 'último',
           'como ha estado', 'cómo ha estado', 'como esta', 'cómo está')) {
    if (d.episodios.length === 0) {
      return `En ${d.textoPeriodo} no registraste episodios destacables en ${d.nombre}. Energía y ánimo normales o mejores en el ${d.pctBien}% de los días.`
    }
    return `Esto registraste en ${d.textoPeriodo}:\n\n${d.episodios.map(e => `· ${e}`).join('\n\n')}`
  }

  // Constancia
  if (tiene('registr', 'cuanto llevo', 'cuánto llevo', 'racha', 'constancia', 'dias')) {
    return `Llevas ${d.totalRegistros} registro${d.totalRegistros === 1 ? '' : 's'} de ${d.nombre} en ${d.textoPeriodo}.`
  }

  // No reconocida: se dice, y se ofrece lo que sí sabe.
  return `De eso no sé. Yo solo puedo contarte lo que has registrado de ${d.nombre}.\n\nPrueba preguntándome por sus síntomas, paseos, peso, medicamentos, vacunas o qué contarle al veterinario.`
}

export default function ChiquiChat({ datos }: { datos: DatosChat }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const finRef = useRef<HTMLDivElement>(null)

  // Apertura: cuenta lo que pasó sin que haya que preguntar. Es lo que
  // la persona querría saber al entrar.
  useEffect(() => {
    if (!abierto || mensajes.length > 0) return
    const saludo = `Hola 🐾 Soy Chiqui. **No soy una inteligencia artificial**: me alimento de lo que tú registras, nada más.`
    const resumen = datos.episodios.length > 0
      ? `En ${datos.textoPeriodo} anotaste esto de ${datos.nombre}:\n\n${datos.episodios.map(e => `· ${e}`).join('\n\n')}`
      : `En ${datos.textoPeriodo} no hubo episodios destacables en ${datos.nombre}. Vas bien.`
    setMensajes([
      { de: 'chiqui', texto: saludo },
      { de: 'chiqui', texto: resumen },
      { de: 'chiqui', texto: `Pregúntame por sus paseos, peso, medicamentos, vacunas, o qué contarle al veterinario.` },
    ])
  }, [abierto, mensajes.length, datos])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  function enviar(pregunta?: string) {
    const q = (pregunta ?? texto).trim()
    if (!q) return
    setTexto('')
    setMensajes(m => [...m, { de: 'tu', texto: q }, { de: 'chiqui', texto: responder(q, datos) }])
  }

  const SUGERENCIAS = ['¿Cómo ha estado?', '¿Qué le cuento al vet?', '¿Cuánto pesa?', '¿Qué vacunas vienen?']

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="w-full mx-4 mb-4 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
        style={{ width: 'calc(100% - 2rem)' }}
      >
        <img src="/chiqui/chiqui_ia.png" alt="" className="w-11 h-11 object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#3D2B1F]">Habla conmigo</p>
          <p className="text-[11px] text-[#8A7560] leading-snug">
            Te cuento lo que registraste de {datos.nombre}
          </p>
        </div>
        <span className="text-[#8C572F] text-lg flex-shrink-0">›</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#F5EDE3' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEE2D4] bg-[#FFFCF8] flex-shrink-0">
            <img src="/chiqui/chiqui_ia.png" alt="" className="w-9 h-9 object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#3D2B1F]">Chiqui</p>
              <p className="text-[10px] text-[#8A7560]">Sobre lo que registras · no es una IA</p>
            </div>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-full bg-[#F0E2CE] text-[#8C572F] font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
            {mensajes.map((m, i) => (
              <div key={i} className={m.de === 'tu' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line"
                  style={m.de === 'tu'
                    ? { background: '#FFBD59', color: '#1A1200' }
                    : { background: '#FFFCF8', color: '#3D2B1F', border: '1px solid #EEE2D4' }}
                >
                  {m.texto.split('**').map((parte, j) =>
                    j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte
                  )}
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <div className="flex-shrink-0 border-t border-[#EEE2D4] bg-[#FFFCF8]">
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
              {SUGERENCIAS.map(s => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="flex-shrink-0 text-[11px] font-semibold text-[#8C572F] bg-[#FBEAD9] border border-[#EEE2D4] rounded-full px-3 py-1.5"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <input
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                placeholder="Pregúntame algo..."
                className="flex-1 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3.5 py-2.5 text-sm text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none"
              />
              <button
                onClick={() => enviar()}
                disabled={!texto.trim()}
                className="bg-[#FFBD59] text-[#1A1200] font-bold px-4 rounded-xl text-sm disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
