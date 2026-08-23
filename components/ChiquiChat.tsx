'use client'
import { useState, useRef, useEffect } from 'react'

// ============================================================
// CHIQUI CHAT — conversación sobre lo registrado
// ============================================================
// NO ES UNA IA. Reconoce la INTENCIÓN de la pregunta y responde con los
// datos que la persona registró, o con consejos ya escritos.
//
// CÓMO RECONOCE LA INTENCIÓN
// Cada tema tiene una lista de palabras y frases. La pregunta se compara
// contra todas y gana la que más coincide, no la primera que calza. Eso
// evita el problema que teníamos: "vacunas" caía en el corte de uñas
// porque la raíz "una" está dentro de "vacUNAs".
//
// RECUERDA EL TEMA ANTERIOR
// "¿Y antes?" después de preguntar el peso se entiende como el peso
// anterior. Sin esto cada mensaje sería una consulta aislada y la
// conversación se sentiría con amnesia.
//
// LO QUE NO HACE
// No interpreta exámenes, no diagnostica y no gradúa urgencia. Los
// consejos de comportamiento son los que ya están escritos en la app.

export interface DatosChat {
  nombre: string
  especie: string
  episodios: string[]
  totalRegistros: number
  pctBien: number
  textoPeriodo: string
  paseosMes?: { cantidad: number; minutos: number; nombreMes: string } | null
  peso?: { actual: number; fecha: string; anterior?: number | null } | null
  medicamentos?: { nombre: string; desde: string }[]
  vacunas?: { nombre: string; proxima: string | null; dias: number | null }[]
  antiparasitarios?: { nombre: string; proxima: string | null; dias: number | null }[]
  senales?: { campo: string; etiqueta: string; fecha: string; nota: string }[]
  cuidados?: { label: string; palabras: string[]; diasDesde: number; cadaCuantos: number | null }[]
  examenes?: { nombre: string; fecha: string }[]
  visitasVet?: string[]
}

interface Mensaje { de: 'chiqui' | 'tu'; texto: string; opciones?: string[] }

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


// ============================================================
// CONSEJOS DE COMPORTAMIENTO
// ============================================================
// Los que ya viven en la app, reescritos como respuesta de
// conversación. Cada tema tiene VARIOS: se van rotando, así preguntar
// dos veces no devuelve lo mismo.
//
// PENDIENTE: que el veterinario de la familia los revise.
interface Consejo { tema: string; palabras: string[]; opciones: string[] }

const CONSEJOS: Consejo[] = [
  {
    tema: 'ansiedad',
    palabras: ['ansios', 'ansiedad', 'inquiet', 'nervios', 'estres', 'no para', 'no se queda quieto',
               'destroza', 'llora cuando', 'ladra cuando', 'solo en casa', 'dejarlo solo', 'quedarse solo',
               'se calme', 'calmarlo', 'relajarlo', 'tranquilizarlo'],
    opciones: [
      'Un Kong relleno y congelado le da algo en qué concentrarse justo cuando te vas. Lamer y masticar lo relaja de verdad.',
      'Deja algo con tu olor cerca de donde duerme: una polera usada le da compañía cuando no estás.',
      'Cansarlo antes de salir ayuda mucho. Quince minutos de buscar premios escondidos cansan más que una caminata larga.',
      'Que las despedidas y las llegadas sean tranquilas. Si te despides con mucha efusividad, le enseñas que irte es algo importante.',
      'Música tranquila o la radio de fondo ayuda a que el silencio no se sienta tan grande.',
    ],
  },
  {
    tema: 'aburrimiento',
    palabras: ['aburr', 'entreten', 'juego', 'juegos', 'jugar', 'que hago con', 'actividad para',
               'estimul', 'enriquec', 'kong', 'juguete'],
    opciones: [
      'Esconder premios por la casa y dejar que los busque: quince minutos de olfato cansan más que una hora de caminata.',
      'Un Kong relleno lo mantiene ocupado un buen rato. Si lo congelas, dura más.',
      'Cambiar los juguetes cada tanto en vez de tenerlos todos afuera: los guardados vuelven a ser nuevos.',
      'Enseñarle algo nuevo, aunque sea un truco simple, lo cansa mentalmente y refuerza la relación entre ustedes.',
    ],
  },
  {
    tema: 'heces',
    palabras: ['que significa', 'de que color', 'color de', 'como deben ser', 'normal las heces',
               'heces normales', 'caca normal'],
    opciones: [
      'Lo normal es que sean firmes, marrones y fáciles de recoger. Los cambios de un día suelen ser por algo que comió.',
      'Muy blandas o líquidas por más de un día, o con sangre o mucosidad, sí valen una consulta.',
      'Muy duras o secas pueden ser falta de agua o poca fibra. Si le cuesta hacer o pasa más de un día sin hacer, coméntalo.',
    ],
  },
]

// Qué consejo toca. Se rota por el número de veces que ya se preguntó
// por ese tema: la primera vez el primero, la segunda el segundo.
function buscarConsejo(pregunta: string, vecesPorTema: Record<string, number>): { texto: string; tema: string } | null {
  const q = normalizar(pregunta)
  for (const c of CONSEJOS) {
    if (c.palabras.some(p => q.includes(p))) {
      const n = vecesPorTema[c.tema] || 0
      return { texto: c.opciones[n % c.opciones.length], tema: c.tema }
    }
  }
  return null
}

// ============================================================
// INTENCIONES
// ============================================================
// Cada tema con sus formas de preguntarlo. Se puntúa por cuántas
// coinciden y gana la que más — no la primera que calza. Así "¿qué
// vacunas vienen?" no cae en el corte de uñas por la raíz "una".
type Tema = 'peso' | 'vacunas' | 'antiparasitarios' | 'medicamentos' | 'paseos'
  | 'senal' | 'cuidado' | 'examenes' | 'resumen' | 'vet'
  // Los consejos también son un tema, para que "¿y qué más?" después de
  // uno de ansiedad devuelva el siguiente en vez de no entender.
  | 'consejo:ansiedad' | 'consejo:aburrimiento' | 'consejo:heces' | null

interface Intencion { tema: Exclude<Tema, null>; frases: string[] }

const INTENCIONES: Intencion[] = [
  { tema: 'peso', frases: ['peso', 'pesa', 'pesando', 'kilo', 'kilos', 'engord', 'adelgaz',
      'bajo de peso', 'subio de peso', 'esta gordo', 'esta flaco', 'cuanto pesa'] },
  { tema: 'vacunas', frases: ['vacuna', 'vacunas', 'vacunar', 'vacunado', 'refuerzo',
      'le toca alguna', 'proxima que le corresponde'] },
  { tema: 'antiparasitarios', frases: ['antiparasit', 'desparasit', 'pulga', 'garrapata',
      'parasito', 'simparica', 'pipeta'] },
  { tema: 'medicamentos', frases: ['medicament', 'remedio', 'pastilla', 'tratamiento',
      'antibiotic', 'dosis', 'esta tomando'] },
  { tema: 'paseos', frases: ['pase', 'paseo', 'paseos', 'camin', 'salid', 'ejercicio',
      'cuanto camina', 'lo saque', 'salio'] },
  { tema: 'examenes', frases: ['examen', 'examenes', 'hemograma', 'creatinina', 'urea',
      'perfil bio', 'resultado', 'laboratorio', 'analisis de sangre'] },
  { tema: 'vet', frases: ['que le cuento', 'le cuento al', 'llevar al vet', 'para la consulta',
      'preparar la consulta', 'que le digo al'] },
  { tema: 'resumen', frases: ['como ha estado', 'como esta', 'que le paso', 'que paso',
      'ha estado enfermo', 'estuvo enfermo', 'ultimamente', 'todo', 'resumen', 'episodi'] },
]

// Señales del registro diario, cada una con sus formas de preguntarse.
const SENALES_INT: { campo: string; nombre: string; frases: string[] }[] = [
  { campo: 'digestion', nombre: 'su digestión', frases: ['vomit', 'vomito', 'devolvio', 'gases', 'nausea', 'digestion', 'aliento'] },
  { campo: 'heces', nombre: 'sus heces', frases: ['heces', 'caca', 'diarre', 'popo', 'deposicion', 'hizo bien'] },
  { campo: 'arenero', nombre: 'su orina', frases: ['orina', 'pipi', 'arenero', 'orino', 'hace pis'] },
  { campo: 'apetito', nombre: 'su apetito', frases: ['apetito', 'comio', 'comiendo', 'esta comiendo', 'con hambre', 'sin hambre'] },
  { campo: 'agua', nombre: 'el agua', frases: ['agua', 'tomando agua', 'sed', 'bebe', 'toma agua'] },
  { campo: 'energia', nombre: 'su energía', frases: ['energia', 'decaid', 'cansad', 'activ', 'sin ganas', 'con ganas'] },
  { campo: 'animo', nombre: 'su ánimo', frases: ['animo', 'triste', 'humor', 'irritab', 'contento', 'feliz'] },
  { campo: 'movilidad', nombre: 'su movilidad', frases: ['cojera', 'cojea', 'movilidad', 'camina bien', 'la pata', 'rigidez', 'renguea'] },
  { campo: 'pelaje', nombre: 'su piel y pelaje', frases: ['pelaje', 'el pelo', 'rasca', 'rascando', 'la piel', 'se lame', 'picazon'] },
  { campo: 'conducta', nombre: 'su conducta', frases: ['conducta', 'comporta', 'se escond', 'raro'] },
]

// Puntúa: gana la intención con más coincidencias, y entre empates la
// que coincide con una frase más larga (más específica).
function detectar(q: string, frases: string[]): number {
  let puntos = 0
  for (const f of frases) {
    if (q.includes(f)) puntos += f.length
  }
  return puntos
}

// ============================================================
// LA RESPUESTA
// ============================================================
interface Respuesta { texto: string; tema: Tema; opciones?: string[] }

function responder(
  pregunta: string,
  d: DatosChat,
  ultimoTema: Tema,
  vecesPorTema: Record<string, number>,
): Respuesta {
  const q = normalizar(pregunta).replace(/[¿?¡!.,;:]/g, ' ')

  // --- 1. ALIMENTOS: siempre primero, y por nombre exacto ---
  const alimento = buscarAlimento(pregunta)
  if (alimento) return { texto: respuestaAlimento(alimento), tema: null }

  if (/\b(puede comer|puedo darle|le doy|es toxic|es venenos|hace mal|le hace daño|le hace dano)\b/.test(q)) {
    return {
      texto: `De ese no estoy seguro, y prefiero no arriesgarme.\n\nLo que sí sé que es tóxico: chocolate, cebolla, ajo, uvas, pasas, palta, xilitol, alcohol, café y nueces de macadamia.\n\nSi ya lo comió y no estás segura, llama a tu veterinario.`,
      tema: null,
    }
  }

  // --- 2. PREGUNTA INCOMPLETA: usa el tema anterior ---
  // "¿Y antes?" o "¿y las uñas?" solo se entienden sabiendo de qué se
  // venía hablando.
  const esSeguimiento = /^\s*(y|pero|entonces)\b/.test(q) || q.trim().length < 12
  if (esSeguimiento && ultimoTema === 'peso' && /\b(antes|anterior|previo|era|estaba)\b/.test(q)) {
    if (d.peso?.anterior != null) {
      return { texto: `Antes pesaba ${d.peso.anterior} kg.`, tema: 'peso' }
    }
    return { texto: `Solo tengo un control de peso, así que no puedo comparar.`, tema: 'peso' }
  }

  // --- 3. CONSEJOS DE COMPORTAMIENTO ---
  // (esSeguimiento ya está declarado arriba, en el bloque 2)
  const consejo = buscarConsejo(pregunta, vecesPorTema)
  if (consejo) {
    return { texto: consejo.texto, tema: `consejo:${consejo.tema}` as Tema }
  }

  // "¿Y qué más?" después de un consejo: se da el siguiente del mismo
  // tema en vez de responder que no se entiende.
  if (esSeguimiento && ultimoTema && ultimoTema.startsWith('consejo:')) {
    const temaConsejo = ultimoTema.slice('consejo:'.length)
    const c = CONSEJOS.find(x => x.tema === temaConsejo)
    if (c) {
      const n = vecesPorTema[temaConsejo] || 0
      return { texto: c.opciones[n % c.opciones.length], tema: ultimoTema }
    }
  }

  // --- 4. AMBIGUAS: preguntar en vez de adivinar ---
  const soloUnaPalabra = q.trim().split(/\s+/).length === 1
  if (soloUnaPalabra) {
    if (/^\s*vacunas?\s*$/.test(q)) {
      return {
        texto: `¿Quieres saber cuál le toca ahora, o cuáles tiene puestas?`,
        tema: null,
        opciones: ['¿Qué vacuna le toca?', '¿Qué vacunas tiene puestas?'],
      }
    }
  }

  // --- 5. LA INTENCIÓN QUE MÁS COINCIDE ---
  let mejor: { tema: Tema; puntos: number; campo?: string; nombre?: string } = { tema: null, puntos: 0 }
  for (const i of INTENCIONES) {
    const p = detectar(q, i.frases)
    if (p > mejor.puntos) mejor = { tema: i.tema, puntos: p }
  }
  for (const s of SENALES_INT) {
    const p = detectar(q, s.frases)
    if (p > mejor.puntos) mejor = { tema: 'senal', puntos: p, campo: s.campo, nombre: s.nombre }
  }
  // Los cuidados compiten con el resto, no van antes ni después.
  let cuidadoElegido: { label: string; diasDesde: number; cadaCuantos: number | null } | null = null
  for (const c of (d.cuidados || [])) {
    const p = detectar(q, c.palabras)
    if (p > mejor.puntos) {
      mejor = { tema: 'cuidado', puntos: p }
      cuidadoElegido = c
    }
  }

  // Seguimiento sin intención propia: se hereda el tema anterior.
  if (mejor.puntos === 0 && esSeguimiento && ultimoTema) {
    mejor = { tema: ultimoTema, puntos: 1 }
  }

  switch (mejor.tema) {
    case 'peso': {
      if (!d.peso) return { texto: `No tengo controles de peso de ${d.nombre}. Puedes anotarlos en Salud → Peso: sirven mucho para ver cambios a tiempo.`, tema: 'peso' }
      let r = `${d.nombre} pesa ${d.peso.actual} kg, del control del ${d.peso.fecha}.`
      if (d.peso.anterior != null) {
        const dif = +(d.peso.actual - d.peso.anterior).toFixed(1)
        if (dif === 0) r += ' Igual que el control anterior.'
        else {
          const pct = Math.abs(dif / d.peso.anterior) * 100
          r += ` ${dif > 0 ? 'Subió' : 'Bajó'} ${Math.abs(dif)} kg desde el anterior (${d.peso.anterior} kg).`
          // El 5% es el mismo umbral que usa la vista del veterinario.
          // Se menciona, no se diagnostica.
          if (pct >= 5) r += ` Es más del 5%, así que vale la pena comentarlo en la próxima consulta.`
        }
      }
      return { texto: r, tema: 'peso' }
    }

    case 'vacunas':
    case 'antiparasitarios': {
      const lista = mejor.tema === 'vacunas' ? d.vacunas : d.antiparasitarios
      const que = mejor.tema === 'vacunas' ? 'vacunas' : 'antiparasitarios'
      if (!lista || lista.length === 0) {
        return { texto: `No tengo ${que} anotados de ${d.nombre}. Puedes agregarlos en Salud → Prevención.`, tema: mejor.tema }
      }
      const linea = (x: { nombre: string; proxima: string | null; dias: number | null }) => {
        if (!x.proxima) return `· ${x.nombre} — sin próxima fecha anotada`
        if (x.dias === null) return `· ${x.nombre} — ${x.proxima}`
        if (x.dias < 0) return `· ${x.nombre} — venció hace ${Math.abs(x.dias)} ${Math.abs(x.dias) === 1 ? 'día' : 'días'} (${x.proxima})`
        if (x.dias === 0) return `· ${x.nombre} — toca hoy`
        return `· ${x.nombre} — en ${x.dias} ${x.dias === 1 ? 'día' : 'días'} (${x.proxima})`
      }
      return { texto: `${lista.map(linea).join('\n')}`, tema: mejor.tema }
    }

    case 'medicamentos': {
      if (!d.medicamentos || d.medicamentos.length === 0) return { texto: `${d.nombre} no tiene tratamientos activos.`, tema: 'medicamentos' }
      const lista = d.medicamentos.map(m => `· ${m.nombre}${m.desde ? ` — desde el ${m.desde}` : ''}`).join('\n')
      return { texto: `${d.nombre} está con:\n${lista}\n\nSi notas algo distinto durante el tratamiento, anótalo: sirve para la próxima consulta.`, tema: 'medicamentos' }
    }

    case 'paseos': {
      if (d.especie !== 'Perro') return { texto: `El registro de paseos es para perros. En gatos registramos el juego, que cumple una función parecida.`, tema: 'paseos' }
      if (!d.paseosMes || d.paseosMes.cantidad === 0) return { texto: `No tengo paseos registrados en ${d.paseosMes?.nombreMes || 'este mes'}.`, tema: 'paseos' }
      const h = Math.floor(d.paseosMes.minutos / 60)
      const m = d.paseosMes.minutos % 60
      const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m} min`
      return { texto: `En ${d.paseosMes.nombreMes} llevas ${d.paseosMes.cantidad} paseo${d.paseosMes.cantidad === 1 ? '' : 's'}, ${dur} en total.`, tema: 'paseos' }
    }

    case 'senal': {
      const suyas = (d.senales || []).filter(s => s.campo === mejor.campo)
      if (suyas.length === 0) {
        return { texto: `No registraste nada fuera de lo normal en ${mejor.nombre} durante ${d.textoPeriodo}.`, tema: 'senal' }
      }
      const lineas = suyas.slice(0, 6).map(s => `· ${s.fecha} — ${s.etiqueta}${s.nota ? ` 💬 "${s.nota}"` : ''}`)
      const cabecera = suyas.length === 1 ? `Una vez en ${d.textoPeriodo}:` : `${suyas.length} veces en ${d.textoPeriodo}:`
      const cola = suyas.length > 6 ? `\n\n(te muestro las 6 más recientes)` : ''
      return { texto: `${cabecera}\n${lineas.join('\n')}${cola}`, tema: 'senal' }
    }

    case 'cuidado': {
      if (!cuidadoElegido) break
      const c = cuidadoElegido
      const cuando = c.diasDesde === 0 ? 'hoy' : c.diasDesde === 1 ? 'ayer' : `hace ${c.diasDesde} días`
      let r = `${c.label}: la última vez fue ${cuando}.`
      if (c.cadaCuantos) {
        const faltan = c.cadaCuantos - c.diasDesde
        r += faltan > 1 ? ` Sueles hacerlo cada ${c.cadaCuantos} días, así que te quedan unos ${faltan}.`
          : faltan === 1 ? ` Sueles hacerlo cada ${c.cadaCuantos} días: mañana tocaría.`
          : faltan === 0 ? ` Sueles hacerlo cada ${c.cadaCuantos} días: hoy tocaría.`
          : ` Sueles hacerlo cada ${c.cadaCuantos} días, así que va ${Math.abs(faltan)} ${Math.abs(faltan) === 1 ? 'día' : 'días'} atrasado.`
      }
      return { texto: r, tema: 'cuidado' }
    }

    case 'examenes': {
      const n = d.examenes?.length || 0
      if (n === 0) return { texto: `Los exámenes los guardo en Salud → Exámenes.\n\nEso sí, leerlos es cosa de tu veterinario: los valores dependen de la edad, el estado de ${d.nombre} y el laboratorio.`, tema: 'examenes' }
      const lista = (d.examenes || []).slice(0, 3).map(e => `· ${e.nombre} — ${e.fecha}`).join('\n')
      return { texto: `Tengo ${n} examen${n === 1 ? '' : 'es'} guardado${n === 1 ? '' : 's'}:\n${lista}\n\nInterpretarlos es cosa de tu veterinario. Si quieres, genera el link desde tu perfil y los ve todos.`, tema: 'examenes' }
    }

    case 'vet': {
      const partes = [`Esto es lo que llevaría de ${d.nombre}:`]
      if (d.episodios.length > 0) partes.push(d.episodios.map(e => `· ${e}`).join('\n'))
      else partes.push(`· Sin episodios destacables en ${d.textoPeriodo}.`)
      if (d.peso) partes.push(`· Peso: ${d.peso.actual} kg (${d.peso.fecha})`)
      if (d.medicamentos && d.medicamentos.length > 0) partes.push(`· En tratamiento: ${d.medicamentos.map(m => m.nombre).join(', ')}`)
      partes.push('\nDesde tu perfil puedes generar un link para que lo vea completo, sin crear cuenta.')
      return { texto: partes.join('\n'), tema: 'vet' }
    }

    case 'resumen': {
      if (d.episodios.length === 0) return { texto: `En ${d.textoPeriodo} no registraste episodios destacables en ${d.nombre}. Energía y ánimo normales o mejores en el ${d.pctBien}% de los días.`, tema: 'resumen' }
      return { texto: `Esto registraste en ${d.textoPeriodo}:\n\n${d.episodios.map(e => `· ${e}`).join('\n\n')}`, tema: 'resumen' }
    }
  }

  // --- No se entendió: se dice, sin inventar ---
  return {
    texto: `No estoy segura de qué quieres saber. Puedo ayudarte con los registros de ${d.nombre}, sus cuidados, o si un alimento le hace mal.`,
    tema: null,
    opciones: ['¿Cómo ha estado?', '¿Cuánto pesa?', '¿Qué vacuna le toca?'],
  }
}

export default function ChiquiChat({ datos }: { datos: DatosChat }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  // El tema de la última respuesta, para entender "¿y antes?".
  const [ultimoTema, setUltimoTema] = useState<Tema>(null)
  // Cuántas veces se preguntó por cada tema de consejos, para ir
  // rotando: preguntar dos veces por ansiedad no debe dar lo mismo.
  const [veces, setVeces] = useState<Record<string, number>>({})
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto || mensajes.length > 0) return
    const saludo = `Hola 🐾 Soy Chiqui. **No soy una inteligencia artificial**: te cuento lo que tú misma registras, nada más.`
    const resumen = datos.episodios.length > 0
      ? `En ${datos.textoPeriodo} anotaste esto de ${datos.nombre}:\n\n${datos.episodios.map(e => `· ${e}`).join('\n\n')}`
      : `En ${datos.textoPeriodo} no hubo episodios destacables en ${datos.nombre}. Vas bien.`
    setMensajes([
      { de: 'chiqui', texto: saludo },
      { de: 'chiqui', texto: resumen },
      { de: 'chiqui', texto: `Pregúntame por su peso, vacunas, paseos, cuándo lo bañaste, si un alimento le hace mal, o qué hacer si anda ansioso.` },
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
    const r = responder(q, datos, ultimoTema, veces)
    setUltimoTema(r.tema)
    // Se cuenta el tema del consejo para rotar la próxima vez. También
    // cuando se continúa uno con "¿y qué más?", que no pasa por
    // buscarConsejo pero sí consume una opción.
    const c = buscarConsejo(q, veces)
    const temaConsejo = c ? c.tema : (r.tema && r.tema.startsWith('consejo:') ? r.tema.slice(8) : null)
    if (temaConsejo) setVeces(v => ({ ...v, [temaConsejo]: (v[temaConsejo] || 0) + 1 }))
    setMensajes(m => [...m, { de: 'tu', texto: q }, { de: 'chiqui', texto: r.texto, opciones: r.opciones }])
  }

  const SUGERENCIAS = ['¿Cómo ha estado?', '¿Cuánto pesa?', '¿Qué vacuna le toca?', '¿Anda ansioso?']

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
              <div key={i}>
                <div className={m.de === 'tu' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line"
                    style={m.de === 'tu'
                      ? { background: '#FFBD59', color: '#1A1200' }
                      : { background: '#FFFCF8', color: '#3D2B1F', border: '1px solid #EEE2D4' }}>
                    {m.texto.split('**').map((parte, j) => j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte)}
                  </div>
                </div>
                {/* Opciones para desambiguar: en vez de adivinar qué
                    quiso decir, se le pregunta. */}
                {m.opciones && m.opciones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.opciones.map(o => (
                      <button key={o} onClick={() => enviar(o)}
                        className="text-[11px] font-semibold text-[#8C572F] bg-[#FBEAD9] border border-[#EEE2D4] rounded-full px-3 py-1.5">
                        {o}
                      </button>
                    ))}
                  </div>
                )}
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
