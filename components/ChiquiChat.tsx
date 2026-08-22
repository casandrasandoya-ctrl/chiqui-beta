'use client'
import { useState, useRef, useEffect } from 'react'

// ============================================================
// CHIQUI CHAT — responde sobre lo registrado
// ============================================================
// NO ES UNA IA. Responde con dos cosas:
//   1. Los datos que la persona registró: peso, vacunas, paseos,
//      cuándo lo bañó, cuánto falta para comprar alimento.
//   2. Una tabla de alimentos con respuesta directa.
//
// Y NADA MÁS. Una versión anterior buscaba por palabras entre todos
// los Chiqui Tips y llegó a responder sobre heces cuando le
// preguntaron por chocolate. Con temas de salud ese margen de error no
// sirve: es mejor decir que no se sabe.
//
// Lo que no reconoce, lo admite. Sin adivinar.

export interface DatosChat {
  nombre: string
  especie: string
  episodios: string[]
  totalRegistros: number
  pctBien: number
  textoPeriodo: string
  // Paseos del MES CALENDARIO (día 1 a hoy), no de 30 días móviles:
  // "este mes" tiene que significar agosto, no "los últimos 30 días".
  paseosMes?: { cantidad: number; minutos: number; nombreMes: string } | null
  peso?: { actual: number; fecha: string; anterior?: number | null } | null
  medicamentos?: { nombre: string; desde: string }[]
  vacunas?: { nombre: string; proxima: string | null; dias: number | null }[]
  antiparasitarios?: { nombre: string; proxima: string | null; dias: number | null }[]
  // Cuidados: cuándo fue la última vez y cada cuánto suele hacerse.
  // OJO: las palabras son RAÍCES y se comparan contra texto
  // NORMALIZADO (sin tildes ni ñ). Hay que escribirlas ya normalizadas
  // y cortas: 'ban' cubre bañé, bañar y baño; 'bañ' no cubriría
  // ninguna, porque la ñ desaparece al normalizar.
  cuidados?: { label: string; palabras: string[]; diasDesde: number; cadaCuantos: number | null }[]
  examenes?: { nombre: string; fecha: string }[]
}

interface Mensaje { de: 'chiqui' | 'tu'; texto: string }

// Quita tildes y baja a minúsculas: "cuánto" y "cuanto" tienen que
// encontrar lo mismo.
function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ============================================================
// ALIMENTOS — respuesta directa, sin buscador de por medio
// ============================================================
// Es una TABLA, no una busqueda por palabras: "chocolate" devuelve la
// respuesta del chocolate y nada mas. La version anterior usaba
// coincidencia de palabras y llego a responder sobre heces cuando se
// le pregunto por chocolate — con alimentos toxicos ese margen de
// error no es aceptable.
//
// PENDIENTE: que el veterinario de la familia revise esta lista. Yo la
// arme con lo que ya estaba en los Chiqui Tips mas lo establecido, pero
// esto le va a decir a alguien si su mascota esta en riesgo.
//
// El campo 'urgente' marca los casos donde NO se gradua por cantidad:
// en uvas no se conoce la dosis toxica —hay fallo renal con muy poca— y
// el xilitol actua en minutos. Para esos la respuesta es siempre
// veterinario ahora.
interface Alimento {
  nombres: string[]
  toxico: boolean
  urgente?: boolean
  texto: string
}

const ALIMENTOS: Alimento[] = [
  // --- TÓXICOS ---
  { nombres: ['chocolate', 'cacao', 'cocoa'], toxico: true,
    texto: 'Sí, el chocolate es tóxico. Tiene teobromina, que afecta el corazón y el sistema nervioso. El chocolate amargo y el de repostería son los peores.' },
  { nombres: ['cebolla', 'cebollin', 'puerro', 'ciboulette', 'chalota'], toxico: true,
    texto: 'Sí, la cebolla es tóxica — y también el ajo, el puerro y el ciboulette. Destruyen los glóbulos rojos y pueden causar anemia. Cocidos siguen siendo peligrosos.' },
  { nombres: ['ajo'], toxico: true,
    texto: 'Sí, el ajo es tóxico. Igual que la cebolla, destruye los glóbulos rojos y puede causar anemia. Cocido sigue siendo peligroso.' },
  { nombres: ['uva', 'uvas', 'pasa', 'pasas'], toxico: true, urgente: true,
    texto: 'Sí, las uvas y las pasas son tóxicas. Pueden causar falla renal, y no se conoce una cantidad segura: hay casos graves con muy poca cantidad.' },
  { nombres: ['xilitol', 'edulcorante', 'endulzante'], toxico: true, urgente: true,
    texto: 'Sí, el xilitol es muy tóxico. Provoca una caída brusca del azúcar en la sangre y daño al hígado, y actúa rápido. Está en chicles, dulces sin azúcar y algunas mantequillas de maní.' },
  { nombres: ['alcohol', 'cerveza', 'vino', 'trago'], toxico: true, urgente: true,
    texto: 'Sí, el alcohol es tóxico. Afecta el sistema nervioso mucho más rápido que en las personas, y una cantidad pequeña ya es peligrosa.' },
  { nombres: ['palta', 'aguacate'], toxico: true,
    texto: 'Sí, la palta puede hacerle daño. Contiene persina, y el carozo además es un riesgo de atragantamiento y obstrucción.' },
  { nombres: ['macadamia', 'nuez', 'nueces'], toxico: true,
    texto: 'Sí, las nueces de macadamia son tóxicas: afectan el sistema nervioso y muscular. Los frutos secos en general son grasos y difíciles de digerir.' },
  // 'te' NO va en la lista: capturaba el "te" de "cuánTE mes" y
  // respondía sobre café a una pregunta de paseos.
  { nombres: ['cafe', 'cafeina', 'bebida energetica'], toxico: true,
    texto: 'Sí, el café y la cafeína son tóxicos. Afectan el corazón y el sistema nervioso, igual que el chocolate.' },
  // 'masa' suelto es demasiado generico: capturaria "masajes". Solo
  // las formas especificas.
  { nombres: ['masa cruda', 'levadura'], toxico: true,
    texto: 'Sí, la masa cruda con levadura es peligrosa. Se expande en el estómago y además produce alcohol al fermentar.' },
  { nombres: ['hueso cocido', 'huesos cocidos'], toxico: true,
    texto: 'Los huesos cocidos son peligrosos: se astillan y pueden perforar el aparato digestivo. Los crudos son más seguros, siempre con supervisión.' },

  // --- SEGUROS ---
  { nombres: ['manzana'], toxico: false,
    texto: 'La manzana sí puede comerla, sin semillas ni cáscara. Es un buen premio.' },
  { nombres: ['pera'], toxico: false, texto: 'La pera sí puede comerla, sin semillas. Es un buen premio.' },
  { nombres: ['sandia'], toxico: false, texto: 'La sandía sí puede comerla, sin semillas ni cáscara.' },
  { nombres: ['melon'], toxico: false, texto: 'El melón sí puede comerlo, sin semillas ni cáscara.' },
  { nombres: ['arandano', 'arandanos'], toxico: false, texto: 'Los arándanos sí puede comerlos. Son un buen premio.' },
  { nombres: ['platano', 'banana'], toxico: false, texto: 'El plátano sí puede comerlo, en poca cantidad — tiene bastante azúcar.' },
  { nombres: ['zanahoria'], toxico: false,
    texto: 'La zanahoria sí puede comerla. Cruda incluso ayuda a mantener sus dientes más limpios.' },
  { nombres: ['pepino'], toxico: false, texto: 'El pepino sí puede comerlo. Es bajo en calorías y refrescante.' },
  { nombres: ['brocoli'], toxico: false, texto: 'El brócoli sí puede comerlo, en poca cantidad — mucho puede darle gases.' },
  { nombres: ['zapallo', 'calabaza'], toxico: false,
    texto: 'El zapallo sí puede comerlo, cocido y sin sal. Le ayuda a la digestión.' },
  { nombres: ['pollo'], toxico: false,
    texto: 'El pollo cocido sin sal ni condimentos sí puede comerlo. Sin huesos cocidos.' },
  { nombres: ['arroz'], toxico: false,
    texto: 'El arroz cocido sin sal sí puede comerlo. Es parte de la dieta blanda que a veces recomienda el veterinario.' },
  { nombres: ['huevo'], toxico: false, texto: 'El huevo cocido sí puede comerlo. Crudo no: puede traer salmonella.' },
  { nombres: ['queso'], toxico: false,
    texto: 'El queso en poca cantidad no es tóxico, pero muchos son intolerantes a la lactosa y puede caerle mal.' },
  { nombres: ['leche', 'lacteo', 'lacteos'], toxico: false,
    texto: 'La leche no es tóxica, pero la mayoría son intolerantes a la lactosa y puede darle diarrea. El agua siempre es mejor.' },
]

// Busca un alimento por nombre EXACTO dentro de la pregunta. Nada de
// puntajes ni aproximaciones: o el nombre esta, o no esta.
function buscarAlimento(pregunta: string): Alimento | null {
  // Se compara contra PALABRAS COMPLETAS, no fragmentos: buscar "te"
  // dentro del texto encontraba el "te" de "cuánte mes" y respondía
  // sobre café a una pregunta de paseos.
  const q = ` ${normalizar(pregunta).replace(/[¿?¡!.,;:]/g, ' ')} `
  for (const a of ALIMENTOS) {
    for (const n of a.nombres) {
      // El nombre puede tener dos palabras ("hueso cocido"), por eso se
      // busca con espacios alrededor en vez de partir la frase.
      if (q.includes(` ${n} `) || q.includes(` ${n}s `)) return a
    }
  }
  return null
}

// Respuesta completa sobre un alimento, con el qué hacer si ya lo comió.
function respuestaAlimento(a: Alimento): string {
  if (!a.toxico) return a.texto
  if (a.urgente) {
    return `${a.texto}\n\nSi ya lo comió, llama a tu veterinario ahora mismo, sin esperar a que aparezcan síntomas.`
  }
  return `${a.texto}\n\nSi comió poco, mantenlo en observación: si vomita, se ve decaído o cambia su ánimo, llévalo al veterinario. Si fue una cantidad grande, ve al veterinario más cercano sin esperar.`
}


function responder(pregunta: string, d: DatosChat): string {
  const q = normalizar(pregunta)
  const tiene = (...palabras: string[]) => palabras.some(p => q.includes(p))

  // --- 1. ALIMENTOS: antes que nada, y por nombre exacto ---
  const alimento = buscarAlimento(pregunta)
  if (alimento) return respuestaAlimento(alimento)

  // Preguntan por comida pero no reconozco cuál.
  if (tiene('puede comer', 'puedo darle', 'le doy', 'es toxic', 'es venenos', 'hace mal', 'le hace daño', 'le hace dano')) {
    return `De ese no estoy seguro, y prefiero no arriesgarme.\n\nLo que sí sé que es tóxico: chocolate, cebolla, ajo, uvas, pasas, palta, xilitol, alcohol, café y nueces de macadamia.\n\nSi ya lo comió y no estás segura, llama a tu veterinario.`
  }

  // --- 2. EXÁMENES: el límite duro ---
  if (tiene('examen', 'hemograma', 'creatinina', 'urea', 'perfil bio', 'resultado', 'laboratorio')) {
    const n = d.examenes?.length || 0
    if (n === 0) return `Los exámenes los guardo en Salud → Exámenes.\n\nEso sí, leerlos es cosa de tu veterinario: los valores dependen de la edad, el estado de ${d.nombre} y el laboratorio.`
    const lista = (d.examenes || []).slice(0, 3).map(e => `· ${e.nombre} — ${e.fecha}`).join('\n')
    return `Tengo ${n} examen${n === 1 ? '' : 'es'} guardado${n === 1 ? '' : 's'}:\n${lista}\n\nInterpretarlos es cosa de tu veterinario. Si quieres, genera el link desde tu perfil y los ve todos.`
  }

  // --- 3. CUIDADOS: cuándo fue la última vez, cuánto falta ---
  if (d.cuidados && d.cuidados.length > 0) {
    // Se compara por RAIZ, no por palabra completa: "bañé" normalizado
    // queda "bane", y exigir la palabra entera nunca calzaria con
    // "banar" ni con "bano". Con la raiz "ban" los tres funcionan.
    const c = d.cuidados.find(x => x.palabras.some(p => q.includes(p)))
    if (c) {
      const cuando = c.diasDesde === 0 ? 'hoy' : c.diasDesde === 1 ? 'ayer' : `hace ${c.diasDesde} días`
      let r = `${c.label}: la última vez fue ${cuando}.`
      if (c.cadaCuantos) {
        const faltan = c.cadaCuantos - c.diasDesde
        r += faltan > 1 ? ` Sueles hacerlo cada ${c.cadaCuantos} días, así que te quedan unos ${faltan}.`
          : faltan === 1 ? ` Sueles hacerlo cada ${c.cadaCuantos} días: mañana tocaría.`
          : faltan === 0 ? ` Sueles hacerlo cada ${c.cadaCuantos} días: hoy tocaría.`
          : ` Sueles hacerlo cada ${c.cadaCuantos} días, así que va ${Math.abs(faltan)} ${Math.abs(faltan) === 1 ? 'día' : 'días'} atrasado.`
      }
      return r
    }
  }

  // --- 4. PESO ---
  if (tiene('peso', 'pesa', 'kilo', 'engord', 'adelgaz', 'bajo de peso', 'subio de peso')) {
    if (!d.peso) return `No tengo controles de peso de ${d.nombre}. Puedes anotarlos en Salud → Peso: sirven mucho para ver cambios a tiempo.`
    let r = `${d.nombre} pesa ${d.peso.actual} kg, según el control del ${d.peso.fecha}.`
    if (d.peso.anterior != null) {
      const dif = +(d.peso.actual - d.peso.anterior).toFixed(1)
      if (dif === 0) r += ' Igual que el control anterior.'
      else {
        const pct = Math.abs(dif / d.peso.anterior) * 100
        r += ` ${dif > 0 ? 'Subió' : 'Bajó'} ${Math.abs(dif)} kg desde el control anterior (${d.peso.anterior} kg).`
        // Un 5% de cambio sin causa conocida es el umbral que la app ya
        // usa en la vista del veterinario. Se menciona, no se diagnostica.
        if (pct >= 5) r += ` Es un cambio de más del 5%, así que vale la pena comentarlo en la próxima consulta.`
      }
    }
    return r
  }

  // --- 5. VACUNAS Y ANTIPARASITARIOS ---
  if (tiene('vacuna', 'antiparasit', 'desparasit', 'pulga', 'garrapata', 'refuerzo')) {
    const soloAnti = tiene('antiparasit', 'desparasit', 'pulga', 'garrapata')
    const soloVac = tiene('vacuna', 'refuerzo') && !soloAnti
    const partes: string[] = []
    const linea = (x: { nombre: string; proxima: string | null; dias: number | null }) => {
      if (!x.proxima) return `· ${x.nombre} — sin próxima fecha anotada`
      if (x.dias === null) return `· ${x.nombre} — ${x.proxima}`
      if (x.dias < 0) return `· ${x.nombre} — venció hace ${Math.abs(x.dias)} ${Math.abs(x.dias) === 1 ? 'día' : 'días'} (${x.proxima})`
      if (x.dias === 0) return `· ${x.nombre} — toca hoy`
      return `· ${x.nombre} — en ${x.dias} ${x.dias === 1 ? 'día' : 'días'} (${x.proxima})`
    }
    if (!soloAnti && d.vacunas && d.vacunas.length > 0) {
      partes.push(`Vacunas:\n${d.vacunas.map(linea).join('\n')}`)
    }
    if (!soloVac && d.antiparasitarios && d.antiparasitarios.length > 0) {
      partes.push(`Antiparasitarios:\n${d.antiparasitarios.map(linea).join('\n')}`)
    }
    if (partes.length === 0) return `No tengo vacunas ni antiparasitarios anotados de ${d.nombre}. Puedes agregarlos en Salud → Prevención.`
    return partes.join('\n\n')
  }

  // --- 6. MEDICAMENTOS ---
  if (tiene('medicament', 'remedio', 'pastilla', 'tratamiento', 'antibiotic', 'dosis')) {
    if (!d.medicamentos || d.medicamentos.length === 0) return `${d.nombre} no tiene tratamientos activos.`
    const lista = d.medicamentos.map(m => `· ${m.nombre}${m.desde ? ` — desde el ${m.desde}` : ''}`).join('\n')
    return `${d.nombre} está con:\n${lista}\n\nSi notas algo distinto durante el tratamiento, anótalo: sirve para la próxima consulta.`
  }

  // --- 7. PASEOS ---
  if (tiene('pase', 'camin', 'salid', 'ejercicio', 'actividad')) {
    if (d.especie !== 'Perro') return `El registro de paseos es para perros. En gatos registramos el juego, que cumple una función parecida.`
    if (!d.paseosMes || d.paseosMes.cantidad === 0) return `No tengo paseos registrados en ${d.paseosMes?.nombreMes || 'este mes'}.`
    const h = Math.floor(d.paseosMes.minutos / 60)
    const m = d.paseosMes.minutos % 60
    const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m} min`
    return `En ${d.paseosMes.nombreMes} llevas ${d.paseosMes.cantidad} paseo${d.paseosMes.cantidad === 1 ? '' : 's'}, ${dur} en total.`
  }

  // --- 8. SÍNTOMAS Y EPISODIOS ---
  if (tiene('vomit', 'diarre', 'heces', 'caca', 'sintoma', 'malestar', 'enferm', 'raro',
           'episodi', 'como ha estado', 'como esta', 'que le paso', 'que paso')) {
    if (d.episodios.length === 0) return `En ${d.textoPeriodo} no registraste episodios destacables en ${d.nombre}. Energía y ánimo normales o mejores en el ${d.pctBien}% de los días.`
    return `Esto registraste en ${d.textoPeriodo}:\n\n${d.episodios.map(e => `· ${e}`).join('\n\n')}`
  }

  // --- 9. QUÉ CONTARLE AL VETERINARIO ---
  if (tiene('veterinari', ' vet', 'consulta', 'le cuento', 'llevar')) {
    const partes = [`Esto es lo que llevaría de ${d.nombre}:`]
    if (d.episodios.length > 0) partes.push(d.episodios.map(e => `· ${e}`).join('\n'))
    else partes.push(`· Sin episodios destacables en ${d.textoPeriodo}.`)
    if (d.peso) partes.push(`· Peso: ${d.peso.actual} kg (${d.peso.fecha})`)
    if (d.medicamentos && d.medicamentos.length > 0) partes.push(`· En tratamiento: ${d.medicamentos.map(m => m.nombre).join(', ')}`)
    partes.push('\nDesde tu perfil puedes generar un link para que lo vea completo, sin crear cuenta.')
    return partes.join('\n')
  }

  // --- 10. CONSTANCIA ---
  if (tiene('registr', 'cuanto llevo', 'racha', 'constancia')) {
    return `Llevas ${d.totalRegistros} registro${d.totalRegistros === 1 ? '' : 's'} de ${d.nombre} en ${d.textoPeriodo}.`
  }

  // --- No reconocida: se admite, sin adivinar ---
  return `De eso no sé.\n\nPuedo contarte sobre ${d.nombre}: su peso, sus vacunas, sus paseos, sus medicamentos, cuándo lo bañaste, o qué síntomas registraste. También si un alimento es tóxico.`
}

export default function ChiquiChat({ datos }: { datos: DatosChat }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const finRef = useRef<HTMLDivElement>(null)

  // Al abrirse cuenta lo que pasó, sin que haya que preguntar.
  useEffect(() => {
    if (!abierto || mensajes.length > 0) return
    const saludo = `Hola 🐾 Soy Chiqui. **No soy una inteligencia artificial**: te cuento lo que tú misma registras, nada más.`
    const resumen = datos.episodios.length > 0
      ? `En ${datos.textoPeriodo} anotaste esto de ${datos.nombre}:\n\n${datos.episodios.map(e => `· ${e}`).join('\n\n')}`
      : `En ${datos.textoPeriodo} no hubo episodios destacables en ${datos.nombre}. Vas bien.`
    setMensajes([
      { de: 'chiqui', texto: saludo },
      { de: 'chiqui', texto: resumen },
      { de: 'chiqui', texto: `Pregúntame por su peso, vacunas, paseos, medicamentos, o si un alimento le hace mal.` },
    ])
  }, [abierto, mensajes.length, datos])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])
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

  const SUGERENCIAS = ['¿Cuánto pesa?', '¿Qué vacunas vienen?', '¿Hace cuánto lo bañé?', '¿Puede comer chocolate?']

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="mx-4 mb-4 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
        style={{ width: 'calc(100% - 2rem)' }}
      >
        <img src="/chiqui/chiqui_ia.png" alt="" className="w-11 h-11 object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#3D2B1F]">Habla conmigo</p>
          <p className="text-[11px] text-[#8A7560] leading-snug">Te cuento lo que registraste de {datos.nombre}</p>
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
            <button onClick={() => setAbierto(false)} aria-label="Cerrar"
              className="w-8 h-8 rounded-full bg-[#F0E2CE] text-[#8C572F] font-bold flex items-center justify-center">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
            {mensajes.map((m, i) => (
              <div key={i} className={m.de === 'tu' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line"
                  style={m.de === 'tu'
                    ? { background: '#FFBD59', color: '#1A1200' }
                    : { background: '#FFFCF8', color: '#3D2B1F', border: '1px solid #EEE2D4' }}>
                  {m.texto.split('**').map((parte, j) => j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte)}
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <div className="flex-shrink-0 border-t border-[#EEE2D4] bg-[#FFFCF8]">
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => enviar(s)}
                  className="flex-shrink-0 text-[11px] font-semibold text-[#8C572F] bg-[#FBEAD9] border border-[#EEE2D4] rounded-full px-3 py-1.5">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                placeholder="Pregúntame algo..."
                className="flex-1 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3.5 py-2.5 text-sm text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none" />
              <button onClick={() => enviar()} disabled={!texto.trim()}
                className="bg-[#FFBD59] text-[#1A1200] font-bold px-4 rounded-xl text-sm disabled:opacity-40">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
