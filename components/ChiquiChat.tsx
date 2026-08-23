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
               'se calme', 'calmarlo', 'relajarlo', 'tranquilizarlo', 'kong', 'lick mat', 'snuffle'],
    opciones: [
      'Un Kong relleno y congelado le da algo en qué concentrarse justo cuando te vas. Lamer y masticar lo relaja de verdad.',
      'Deja algo con tu olor cerca de donde duerme: una polera usada le da compañía cuando no estás.',
      'Buscar comida con el olfato despierta su instinto y lo relaja. Un snuffle mat lo puedes hacer en casa con una alfombra y tiras de polar.',
      'Lamer libera serotonina y lo calma. Un lick mat antes de quedarse solo puede ser un buen compañero.',
      'Que las despedidas y las llegadas sean tranquilas. Si te despides con mucha efusividad, le enseñas que irte es algo importante.',
    ],
  },
  {
    tema: 'juego',
    palabras: ['aburr', 'entreten', 'juego', 'juegos', 'jugar', 'que hago con', 'actividad para',
               'estimul', 'enriquec', 'juguete', 'caja', 'catnip'],
    opciones: [
      'Esconder premios por la casa y dejar que los busque: quince minutos de olfato cansan más que una hora de caminata.',
      'Cambiar los juguetes cada tanto en vez de tenerlos todos afuera: los guardados vuelven a ser nuevos.',
      'Enseñarle algo nuevo, aunque sea un truco simple, lo cansa mentalmente y refuerza la relación entre ustedes.',
      'A los gatos una caja de cartón les basta para pasarlo bien. Y una ventana con vista los entretiene horas.',
    ],
  },
  {
    tema: 'heces',
    palabras: ['color de las heces', 'que significa el color', 'como deben ser las heces',
               'heces normales', 'caca normal', 'forma de las heces', 'heces blandas cuando'],
    opciones: [
      'Lo normal es que sean marrón chocolate, firmes y fáciles de recoger. Si son verdes, amarillas, blancas, grises, negras o con sangre, vale anotarlo y consultar si el cambio persiste.',
      'Muy duras suelen ser falta de agua. Blandas, que el intestino está irritado. Líquidas ya es diarrea.',
      'Heces blandas una vez pueden ser por algo que comió o por estrés. Si duran más de 48 horas, o vienen con vómitos, sangre o decaimiento, necesita que lo revisen.',
    ],
  },
  {
    tema: 'movilidad',
    palabras: ['le cuesta levantarse', 'no quiere saltar', 'se cansa mas rapido', 'articulacion',
               'rigidez', 'dolor al caminar', 'camina raro', 'cojea', 'cojera', 'renguea'],
    opciones: [
      'Si necesita unos segundos para levantarse después de dormir, podría estar sintiendo rigidez o molestias articulares.',
      'Una cojera nunca es normal, aunque dure solo un rato. Anótala en la app para comentarla con tu veterinario.',
      'Si antes saltaba con facilidad y ahora duda o necesita ayuda, puede ser dolor al moverse.',
      'Si camina más lento, se detiene seguido o se cansa antes de lo habitual, vale la pena observarlo.',
      'El dolor también cambia el ánimo. Si evita jugar, se aísla o se molesta cuando lo tocan, obsérvalo.',
    ],
  },
  {
    tema: 'peso',
    palabras: ['peso ideal', 'peso saludable', 'esta gordo', 'esta flaco', 'sobrepeso', 'bajo peso',
               'cuanto deberia pesar', 'esta en su peso'],
    opciones: [
      'Está en buen peso cuando se le ve la cintura desde arriba, las costillas se palpan sin verse marcadas, y se mantiene activo.',
      'Si las costillas, la columna o la pelvis se ven demasiado, o perdió masa muscular, podría estar bajo peso.',
      'Si cuesta palpar las costillas, ya no se le ve cintura, o se cansa más fácil en los paseos, podría tener sobrepeso.',
      'El peso ideal depende del tamaño, la raza y la edad. Los rangos generales son orientativos: quien lo evalúa de verdad es el veterinario.',
    ],
  },
  {
    tema: 'vitales',
    palabras: ['temperatura normal', 'frecuencia cardiaca', 'corazon', 'latidos', 'respiracion normal',
               'cuanta agua', 'agua al dia', 'dientes', 'sarro', 'cepillar los dientes'],
    opciones: [
      'La temperatura normal está entre 38 °C y 39,2 °C. Sobre 40 °C necesita atención veterinaria.',
      'En reposo el corazón late entre 60 y 140 veces por minuto. En razas pequeñas, un poco más rápido.',
      'Lo normal es cerca de 50 ml de agua por kilo de peso al día. Con calor o mucho ejercicio, algo más.',
      'Cepillarle los dientes dos o tres veces por semana evita el sarro, que puede llegar a afectar el corazón.',
    ],
  },
  {
    tema: 'seguridad',
    palabras: ['planta', 'plantas', 'toxica', 'peligro en casa', 'azalea', 'lirio', 'hortensia',
               'que es peligroso'],
    opciones: [
      'Las azaleas, hortensias, lirios y áloe vera son peligrosas. Mejor mantenerlas lejos de su alcance.',
      'Los lirios son especialmente graves en gatos: incluso el polen puede causarles daño renal.',
    ],
  },
  {
    tema: 'alerta',
    palabras: ['signo de alerta', 'signos de alerta', 'emergencia', 'urgencia', 'convulsion',
               'atragant', 'golpe de calor', 'intoxic', 'no respira', 'se desmayo'],
    opciones: [
      'Los signos que necesitan veterinario de inmediato: convulsiones, dificultad para respirar, pérdida de conciencia, sangrado abundante, golpe de calor, intoxicación, un accidente o parálisis.',
      'Ante una convulsión: aleja objetos, cronometra cuánto dura y llévalo al veterinario. No lo sujetes ni le pongas nada en la boca.',
      'Ante un golpe de calor: llévalo a un lugar fresco, mójale las patas y la barriga con agua a temperatura ambiente, y al veterinario. Nunca agua helada.',
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

// El menú que se ofrece cuando no se entiende o cuando no hay datos.
// Dos caminos: los botones son seguros, el texto libre es más rápido
// para quien ya sabe qué preguntar.
const MENU = [
  '📋 ¿Cómo ha estado?',
  '💉 Vacunas',
  '⚖️ Peso',
  '💊 Medicamentos',
  '🧪 Exámenes',
  '💡 Chiqui Tips',
]

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
  // Se quitan los emojis: los botones del menú los traen y no aportan
  // a reconocer la intención.
  const q = normalizar(pregunta)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // --- 0. EMERGENCIAS: antes que absolutamente todo ---
  // Si alguien escribe que su mascota convulsiona, no es momento de
  // conversar. Se dice qué hacer y se corta.
  const EMERGENCIAS: { palabras: string[]; que: string; haz: string[] }[] = [
    { palabras: ['convuls', 'ataque', 'se sacude', 'temblando sin control'],
      que: 'Una convulsión',
      haz: ['Aleja los objetos que tenga cerca', 'Cronometra cuánto dura', 'No lo sujetes ni le pongas nada en la boca'] },
    { palabras: ['no respira', 'le cuesta respirar', 'dificultad para respirar', 'se ahoga', 'ahogando'],
      que: 'La dificultad para respirar',
      haz: ['Mantenlo tranquilo y en un lugar fresco', 'No le des agua ni comida', 'Ve al veterinario ahora'] },
    { palabras: ['se desmayo', 'perdio el conocimiento', 'no reacciona', 'no responde', 'inconsciente'],
      que: 'La pérdida de conciencia',
      haz: ['Ponlo de costado en un lugar seguro', 'Revisa si respira', 'Ve al veterinario ahora'] },
    { palabras: ['sangra mucho', 'sangrado', 'mucha sangre', 'hemorragia'],
      que: 'Un sangrado abundante',
      haz: ['Presiona la herida con un paño limpio', 'No le quites el paño si se empapa: pon otro encima', 'Ve al veterinario ahora'] },
    { palabras: ['golpe de calor', 'muy caliente', 'jadea sin parar', 'se sobrecalento'],
      que: 'Un golpe de calor',
      haz: ['Llévalo a un lugar fresco y con sombra', 'Mójale patas y barriga con agua a temperatura ambiente, nunca helada', 'Ve al veterinario ahora'] },
    { palabras: ['se intoxic', 'comio veneno', 'intoxicacion', 'tomo veneno'],
      que: 'Una posible intoxicación',
      haz: ['No lo hagas vomitar sin que te lo indiquen', 'Lleva el envase de lo que comió si lo tienes', 'Ve al veterinario ahora'] },
    { palabras: ['lo atropell', 'se cayo de', 'accidente', 'lo golpeo un auto'],
      que: 'Un accidente o golpe fuerte',
      haz: ['Muévelo lo menos posible', 'Usa una superficie plana para trasladarlo', 'Ve al veterinario aunque se vea bien'] },
    { palabras: ['no puede caminar', 'no mueve las patas', 'paralisis', 'arrastra las patas'],
      que: 'No poder caminar',
      haz: ['Muévelo lo menos posible', 'Trasládalo en una superficie plana', 'Ve al veterinario ahora'] },
  ]
  const emerg = EMERGENCIAS.find(e => e.palabras.some(p => q.includes(p)))
  if (emerg) {
    return {
      texto: `🚨 **${emerg.que} puede ser una urgencia.**\n\n${emerg.haz.map(h => `· ${h}`).join('\n')}\n\nSi está pasando ahora, ve al veterinario de inmediato. Yo no puedo evaluarlo.`,
      tema: null,
      opciones: ['Registrar signo de alerta'],
    }
  }

  // --- 1. ALIMENTOS: siempre primero, y por nombre exacto ---
  const alimento = buscarAlimento(pregunta)
  if (alimento) return { texto: respuestaAlimento(alimento), tema: null }

  if (/\b(puede comer|puedo darle|le doy|es toxic|es venenos|hace mal|le hace daño|le hace dano)\b/.test(q)) {
    return {
      texto: `De ese no estoy seguro, y prefiero no arriesgarme.\n\nLo que sí sé que es tóxico: chocolate, cebolla, ajo, uvas, pasas, palta, xilitol, alcohol, café y nueces de macadamia.\n\nSi ya lo comió y no estás segura, llama a tu veterinario.`,
      tema: null,
    }
  }

  // --- 2. PALABRA SUELTA: preguntar, no adivinar ---
  // "heces" puede ser "¿cómo han estado?" o "¿qué significa el color?".
  // Son cosas distintas y adivinar mal es peor que preguntar.
  const AMBIGUAS: { palabras: string[]; pregunta: string; opciones: string[] }[] = [
    { palabras: ['heces', 'caca', 'popo'],
      pregunta: '¿Quieres saber cómo han estado sus heces, o qué significan el color y la forma?',
      opciones: ['¿Cómo han estado sus heces?', '¿Qué significa el color de las heces?'] },
    { palabras: ['vomito', 'vomitos'],
      pregunta: '¿Quieres saber cuándo vomitó, o cuándo el vómito preocupa?',
      opciones: ['¿Cuándo vomitó?', '¿Cuándo el vómito preocupa?'] },
    { palabras: ['peso', 'kilos'],
      pregunta: '¿Quieres saber cuánto pesa, o cómo saber si está en su peso ideal?',
      opciones: ['¿Cuánto pesa?', '¿Está en su peso ideal?'] },
    { palabras: ['vacuna', 'vacunas'],
      pregunta: '¿Quieres saber cuál le toca ahora, o cuáles tiene puestas?',
      opciones: ['¿Qué vacuna le toca?', '¿Qué vacunas tiene puestas?'] },
    { palabras: ['movilidad', 'cojera', 'patas'],
      pregunta: '¿Quieres saber si registraste cojera, o las señales de molestias articulares?',
      opciones: ['¿Ha cojeado?', '¿Cuáles son las señales de dolor articular?'] },
    { palabras: ['ansiedad', 'ansioso'],
      pregunta: '¿Quieres ideas para ayudarlo con la ansiedad, o ver si la registraste estos días?',
      opciones: ['¿Qué hago si está ansioso?', '¿Registré ansiedad?'] },
    { palabras: ['agua', 'sed'],
      pregunta: '¿Quieres saber cómo ha tomado agua, o cuánta necesita al día?',
      opciones: ['¿Cómo ha tomado agua?', '¿Cuánta agua necesita al día?'] },
    { palabras: ['alimentacion', 'comida', 'comer'],
      pregunta: '¿Quieres saber cómo ha estado su apetito, o qué puede comer?',
      opciones: ['¿Cómo ha estado su apetito?', '¿Qué frutas puede comer?'] },
    { palabras: ['temperatura', 'fiebre'],
      pregunta: '¿Quieres saber su temperatura normal, o si registraste algo?',
      opciones: ['¿Cuál es su temperatura normal?', '¿Cómo ha estado?'] },
  ]
  const soloUna = q.split(/\s+/).filter(Boolean).length === 1
  if (soloUna) {
    const amb = AMBIGUAS.find(a => a.palabras.includes(q))
    if (amb) return { texto: amb.pregunta, tema: null, opciones: amb.opciones }
  }

  // --- 3. ¿ES UN TEMA NUEVO O UNA CONTINUACIÓN? ---
  // Solo es continuación si empieza con "y/pero/entonces" Y no trae
  // ningún tema propio. Antes bastaba con ser corta, y por eso
  // "¿cuánto pesa?" seguía respondiendo sobre ansiedad.
  const empiezaConY = /^(y|pero|entonces|ademas|tambien)\b/.test(q)
  const muyCorta = q.split(/\s+/).filter(Boolean).length <= 3

  // "Chiqui Tips" desde el menú: se ofrecen los temas disponibles.
  if (/\bchiqui tips\b|\btips\b/.test(q)) {
    return {
      texto: `Puedo contarte sobre estos temas:`,
      tema: null,
      opciones: ['¿Qué puede comer?', '¿Qué hago si está ansioso?', '¿Cómo deben ser sus heces?',
                 '¿Cuánta agua necesita?', '¿Está en su peso ideal?', '¿Cuáles son los signos de alerta?'],
    }
  }

  // --- 4. ¿PIDE DATOS O PIDE CONSEJO? ---
  // "¿ha cojeado?" pregunta por SUS registros. "¿por qué cojea?" pide
  // explicación. Sin esta distinción los consejos se comían todas las
  // preguntas por datos.
  const pideDatos = /\b(ha |han |hubo|cuando|cuantas veces|registr|esta semana|este mes|ultimos dias|ayer|hoy)\b/.test(q)

  const consejo = pideDatos ? null : buscarConsejo(pregunta, vecesPorTema)
  if (consejo) {
    return { texto: consejo.texto, tema: `consejo:${consejo.tema}` as Tema }
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

  // CONTINUACIÓN: solo si la pregunta NO trae tema propio. Un tema
  // nuevo siempre le gana al anterior — antes bastaba con que la
  // pregunta fuera corta, y por eso "¿cuánto pesa?" seguía respondiendo
  // sobre ansiedad.
  // SOLO con "y/pero/entonces" al principio. Antes bastaba con que la
  // pregunta fuera corta, y por eso "calor", "vet" o "codifica"
  // heredaban el tema anterior y respondian cualquier cosa.
  if (mejor.puntos === 0 && empiezaConY && ultimoTema) {
    // "¿Y qué más?" después de un consejo: el siguiente del mismo tema.
    if (ultimoTema.startsWith('consejo:')) {
      const temaConsejo = ultimoTema.slice('consejo:'.length)
      const c = CONSEJOS.find(x => x.tema === temaConsejo)
      if (c) {
        const n = vecesPorTema[temaConsejo] || 0
        return { texto: c.opciones[n % c.opciones.length], tema: ultimoTema }
      }
    }
    // "¿Y antes?" después del peso.
    if (ultimoTema === 'peso' && /\b(antes|anterior|previo|era|estaba)\b/.test(q)) {
      if (d.peso?.anterior != null) return { texto: `Antes pesaba ${d.peso.anterior} kg.`, tema: 'peso' }
      return { texto: `Solo tengo un control de peso, así que no puedo comparar.`, tema: 'peso' }
    }
    mejor = { tema: ultimoTema, puntos: 1 }
  }

  switch (mejor.tema) {
    case 'peso': {
      if (!d.peso) {
        return {
          texto: `No tengo controles de peso de ${d.nombre}. Puedes anotarlos en Salud → Peso: sirven mucho para ver cambios a tiempo.`,
          tema: 'peso',
          opciones: MENU,
        }
      }
      // Se cuenta la historia completa, no solo el número: de dónde
      // viene, cuánto cambió y desde cuándo. Es lo que hace que se
      // sienta como alguien que conoce a la mascota.
      let r = `🐾 Revisé los registros de ${d.nombre}.\n\nSu último peso fue **${d.peso.actual} kg**, del ${d.peso.fecha}.`
      if (d.peso.anterior != null) {
        const dif = +(d.peso.actual - d.peso.anterior).toFixed(1)
        if (dif === 0) {
          r += ` El control anterior fue igual: ${d.peso.anterior} kg. Se ha mantenido estable.`
        } else {
          const pct = Math.abs(dif / d.peso.anterior) * 100
          const gramos = Math.abs(dif) < 1 ? `${Math.round(Math.abs(dif) * 1000)} g` : `${Math.abs(dif)} kg`
          r += ` El anterior fue ${d.peso.anterior} kg.\n\nHas registrado ${dif > 0 ? 'un aumento' : 'una baja'} de **${gramos}**.`
          // El 5% es el mismo umbral que usa la vista del veterinario.
          // Se menciona el hecho, no se diagnostica.
          if (pct >= 5) r += ` Es más del 5% de su peso, así que vale la pena comentarlo en la próxima consulta.`
        }
      } else {
        r += ` Es el único control que tengo, así que todavía no puedo compararlo.`
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

  // Si pedía datos pero no calzó ninguna intención, se ofrece el
  // consejo como segunda opción antes de rendirse.
  if (pideDatos) {
    const c = buscarConsejo(pregunta, vecesPorTema)
    if (c) return { texto: c.texto, tema: `consejo:${c.tema}` as Tema }
  }

  // --- No se entendió ---
  // Se admite sin rodeos y se ofrece el menú. Antes heredaba el tema
  // anterior y respondía sobre exámenes a "¿sabes codificar?", que es
  // peor que decir que no se sabe.
  return {
    texto: `Eso está fuera de lo que puedo consultar 🐾\n\nYo conozco la historia de ${d.nombre}: lo que registras día a día, sus cuidados y su salud. Sobre otros temas no sé.\n\n¿Qué quieres hacer?`,
    tema: null,
    opciones: MENU,
  }
}

export default function ChiquiChat({ datos }: { datos: DatosChat }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  // Chiqui "escribiendo": una pausa corta antes de responder. Sin ella
  // la respuesta aparece instantánea y se siente a máquina.
  const [pensando, setPensando] = useState(false)
  const [ultimoTema, setUltimoTema] = useState<Tema>(null)
  const [veces, setVeces] = useState<Record<string, number>>({})
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto || mensajes.length > 0) return
    const saludo = `Hola 🐾 Soy Chiqui.\n\n**No soy una inteligencia artificial**: conozco la historia de ${datos.nombre} porque tú la registras.`
    const resumen = datos.episodios.length > 0
      ? `En ${datos.textoPeriodo} anotaste esto:\n\n${datos.episodios.map(e => `· ${e}`).join('\n\n')}`
      : `En ${datos.textoPeriodo} no hubo episodios destacables. Vas bien.`
    setMensajes([
      { de: 'chiqui', texto: saludo },
      { de: 'chiqui', texto: resumen, opciones: MENU },
    ])
  }, [abierto, mensajes.length, datos])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, pensando])
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  function enviar(pregunta?: string) {
    const q = (pregunta ?? texto).trim()
    if (!q || pensando) return
    setTexto('')
    setMensajes(m => [...m, { de: 'tu', texto: q }])
    setPensando(true)

    // La pausa es corta a propósito: suficiente para que se sienta una
    // conversación, no tanto como para impacientar.
    setTimeout(() => {
      const r = responder(q, datos, ultimoTema, veces)
      setUltimoTema(r.tema)
      const c = buscarConsejo(q, veces)
      const temaConsejo = c ? c.tema : (r.tema && r.tema.startsWith('consejo:') ? r.tema.slice(8) : null)
      if (temaConsejo) setVeces(v => ({ ...v, [temaConsejo]: (v[temaConsejo] || 0) + 1 }))
      setPensando(false)
      setMensajes(m => [...m, { de: 'chiqui', texto: r.texto, opciones: r.opciones }])
    }, 420)
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="mx-4 mb-4 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
        style={{
          width: 'calc(100% - 2rem)',
          background: 'linear-gradient(135deg, #FFFCF8 0%, #FBEAD9 100%)',
          border: '1.5px solid #EEE2D4',
        }}
      >
        <div className="relative flex-shrink-0">
          <img src="/chiqui/chiqui_ia.png" alt="" className="w-12 h-12 object-contain" />
          {/* Punto verde: señal de que está disponible, como en las apps
              de mensajería. */}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#FFFCF8]" style={{ background: '#4CAF7D' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#3D2B1F]">Habla conmigo</p>
          <p className="text-[11px] text-[#8A7560] leading-snug">Conozco la historia de {datos.nombre}</p>
        </div>
        <span className="text-[#CD7421] text-xl flex-shrink-0">›</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#F5EDE3' }}>
          {/* Encabezado */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: '#FFFCF8', borderBottom: '1px solid #EEE2D4' }}>
            <div className="relative flex-shrink-0">
              <img src="/chiqui/chiqui_ia.png" alt="" className="w-10 h-10 object-contain" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#FFFCF8]" style={{ background: '#4CAF7D' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#3D2B1F] leading-tight">Chiqui</p>
              <p className="text-[10px] text-[#8A7560]">No es una IA · conoce lo que registras</p>
            </div>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8C572F] text-lg active:scale-95 transition-transform"
              style={{ background: '#F0E2CE' }}>✕</button>
          </div>

          {/* Conversación */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {mensajes.map((m, i) => (
              <div key={i}>
                <div className={m.de === 'tu' ? 'flex justify-end' : 'flex justify-start gap-2 items-end'}>
                  {/* La carita solo en el primer mensaje de una tanda:
                      repetirla en cada burbuja satura. */}
                  {m.de === 'chiqui' && (
                    <img src="/chiqui/chiqui_ia.png" alt=""
                      className="w-7 h-7 object-contain flex-shrink-0 mb-0.5"
                      style={{ visibility: i > 0 && mensajes[i - 1].de === 'chiqui' ? 'hidden' : 'visible' }} />
                  )}
                  <div className="max-w-[80%] px-4 py-2.5 text-[14px] leading-[1.55] whitespace-pre-line"
                    style={m.de === 'tu'
                      ? { background: '#FFBD59', color: '#1A1200',
                          borderRadius: '18px 18px 4px 18px' }
                      : { background: '#FFFCF8', color: '#3D2B1F',
                          borderRadius: '18px 18px 18px 4px',
                          boxShadow: '0 1px 2px rgba(61,43,31,0.06)' }}>
                    {m.texto.split('**').map((parte, j) => j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte)}
                  </div>
                </div>
                {m.opciones && m.opciones.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5 ml-9">
                    {m.opciones.map(o => (
                      <button key={o} onClick={() => enviar(o)}
                        className="text-[12px] font-semibold text-[#8C572F] px-3.5 py-2 active:scale-95 transition-transform"
                        style={{ background: '#FFFCF8', border: '1.5px solid #E8D5BE', borderRadius: '14px' }}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Escribiendo */}
            {pensando && (
              <div className="flex justify-start gap-2 items-end">
                <img src="/chiqui/chiqui_ia.png" alt="" className="w-7 h-7 object-contain flex-shrink-0 mb-0.5" />
                <div className="px-4 py-3.5 flex gap-1.5"
                  style={{ background: '#FFFCF8', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 2px rgba(61,43,31,0.06)' }}>
                  {[0, 1, 2].map(n => (
                    <span key={n} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#CD7421', animation: `chiquiPunto 1.2s ${n * 0.18}s infinite ease-in-out` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Escribir */}
          <div className="flex-shrink-0" style={{ background: '#FFFCF8', borderTop: '1px solid #EEE2D4' }}>
            <div className="flex gap-2 px-3 py-3">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                placeholder={`Pregúntame sobre ${datos.nombre}...`}
                className="flex-1 px-4 py-3 text-[14px] text-[#3D2B1F] placeholder-[#B5A38F] focus:outline-none"
                style={{ background: '#F5EDE3', border: '1.5px solid #EEE2D4', borderRadius: '22px' }} />
              <button onClick={() => enviar()} disabled={!texto.trim() || pensando}
                aria-label="Enviar"
                className="w-12 h-12 flex items-center justify-center text-[#1A1200] text-lg font-bold flex-shrink-0 disabled:opacity-35 active:scale-95 transition-transform"
                style={{ background: '#FFBD59', borderRadius: '50%' }}>↑</button>
            </div>
          </div>

          <style>{`
            @keyframes chiquiPunto {
              0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
              30% { opacity: 1; transform: translateY(-3px); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
