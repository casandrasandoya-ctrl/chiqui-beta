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
  // Identifica de qué mascota son estos datos. Cuando cambia, la
  // conversación se borra: preguntas hechas sobre un animal no pueden
  // quedar en pantalla como si fueran de otro.
  mascotaId?: string
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
  // fecha es para mostrar ("26 jul") y fechaISO para comparar contra
  // las visitas al veterinario.
  senales?: { campo: string; etiqueta: string; fecha: string; fechaISO?: string; nota: string }[]
  cuidados?: { label: string; palabras: string[]; diasDesde: number; cadaCuantos: number | null }[]
  examenes?: { nombre: string; fecha: string }[]
  visitasVet?: string[]
  // La fecha de hoy en Chile, para poder recortar al período pedido.
  hoyISO?: string
  // El perfil completo. Cada campo puede faltar: el chat dice dónde
  // anotarlo en vez de inventar.
  perfil?: {
    raza: string | null
    sexo: string | null
    nacimiento: string | null
    // La tabla tiene 'castrado' Y 'estado_reproductivo': el segundo es
    // más rico (puede decir "fértil", "castrado", "en celo") así que se
    // prefiere cuando existe.
    castrado: boolean | null
    estadoReproductivo: string | null
    alergias: string | null
    color: string | null
    microchip: string | null
    alimentacion: string | null
    veterinaria: string | null
    tamanoEsperado: string | null
  }
  // El historial completo, para "¿cuáles le he dado?" — distinto de
  // vacunas/antiparasitarios, que traen solo lo vigente.
  historialVacunas?: { nombre: string; aplicada: string }[]
  historialAntis?: { nombre: string; aplicada: string }[]
  celos?: { inicio: string; fin: string | null; inicioISO: string }[]
  examenesLab?: { tipo: string; fecha: string }[]
  temperatura?: { valor: number; fecha: string } | null
  respiracion?: { valor: number; fecha: string } | null
  ultimaRevision?: string | null
  momentos?: { titulo: string; fecha: string }[]
  enfermedades?: { diagnostico: string; fecha: string; proximaRevision: string | null }[]
  // Para poder mostrar la fecha en formato legible sin repetir el
  // formateador acá.
  fmtVisita?: (iso: string) => string
}

interface Mensaje { de: 'chiqui' | 'tu'; texto: string; opciones?: string[] }

// Quita tildes y baja a minúsculas: "cuánto" y "cuanto" tienen que
// encontrar lo mismo.
function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // El guion pasa a espacio: "co-tutor" y "co tutor" son lo mismo
    // para quien pregunta, y no debería importar cómo lo escriba.
    .replace(/[-_]/g, ' ')
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
    tema: 'viaje_casa',
    palabras: ['se queda en casa', 'dejarlo en casa', 'dejarla en casa', 'lo dejo solo', 'me voy de viaje',
               'salir de viaje', 'vacaciones', 'quien lo cuida', 'lo dejo en casa',
               'me voy unos dias', 'dejarlo solo varios dias'],
    opciones: [
      'Pide a alguien de confianza que lo visite al menos una vez al día: agua fresca, comida y limpiar el arenero o su espacio.',
      'Deja una prenda con tu olor y sus juguetes favoritos. Ayuda mucho a que la ausencia se sienta menos.',
      'Asegura ventanas y lugares peligrosos antes de irte, sobre todo si se queda solo varias horas.',
      'Un comedero automático ayuda, pero no reemplaza a alguien que lo vea. Si se enferma o se atasca algo, nadie se entera.',
    ],
  },
  {
    tema: 'viaje_auto',
    palabras: ['viajo con el', 'viajo con ella', 'viajar en auto', 'llevarlo en auto', 'en el auto', 'viaje en auto',
               'lo llevo en el auto', 'transportin', 'transportadora', 'se marea en el auto',
               'viajar con el', 'viajar con ella', 'llevarlo de viaje'],
    opciones: [
      'Nunca suelto: un transportín firme o un arnés de seguridad anclado al cinturón. En una frenada, un animal suelto sale despedido.',
      'No le des comida 3 o 4 horas antes de salir. Ayuda a prevenir mareos y vómitos.',
      'Para cada 2 horas: que estire las patas, tome agua y haga sus necesidades.',
      'Mantén el auto fresco y no lo dejes sacar la cabeza por la ventana: le puede entrar algo al ojo o al oído.',
      'Nunca lo dejes solo dentro del auto cerrado, ni con la ventana entreabierta. En minutos la temperatura sube lo suficiente para matarlo.',
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
    // Frases cortas: con el comparador nuevo, "deben ser heces" calza
    // con "¿cómo deben ser SUS heces?" aunque haya palabras en medio.
    palabras: ['color heces', 'significa color', 'deben ser heces', 'deben heces',
               'heces normales', 'caca normal', 'forma heces', 'como son heces',
               'normal heces', 'heces sanas'],
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
  // 'vitales' se partio en cuatro. Antes era UN tema con cuatro
  // opciones que rotaban, asi que preguntar "¿cuanta agua necesita?"
  // cuatro veces devolvia temperatura, corazon, agua y dientes en
  // orden. La rotacion solo tiene sentido cuando las opciones son
  // variaciones de LO MISMO — como en ansiedad, donde hay cinco formas
  // de ayudar con el mismo problema.
  {
    tema: 'agua',
    palabras: ['cuanta agua', 'agua al dia', 'agua necesita', 'agua debe tomar',
               'agua tiene que tomar', 'hidrata', 'cuanta agua toma'],
    opciones: [
      'Lo normal es cerca de 50 ml de agua por kilo de peso al día. Un perro de 10 kg toma alrededor de medio litro.\n\nCon calor o después de ejercicio, algo más. Si toma mucha más de lo habitual y no es por calor, vale anotarlo.',
    ],
  },
  {
    tema: 'temperatura',
    palabras: ['temperatura normal', 'cuanta temperatura', 'tiene fiebre', 'que temperatura',
               'temperatura corporal'],
    opciones: [
      'La temperatura normal está entre 38 °C y 39,2 °C. Sobre 40 °C necesita atención veterinaria.\n\nSe mide en el recto con un termómetro digital. La nariz seca o caliente no dice nada: es un mito.',
    ],
  },
  {
    tema: 'corazon',
    // 'cuanto respira' NO va: es una pregunta por el dato registrado,
    // no por lo que es normal. Las formas educativas llevan "normal".
    palabras: ['frecuencia cardiaca', 'corazon', 'latidos', 'pulso', 'respiracion normal',
               'respiraciones normales', 'cuanto es normal respirar'],
    opciones: [
      'En reposo el corazón late entre 60 y 140 veces por minuto: en razas pequeñas más rápido, en grandes más lento.\n\nLa respiración normal en reposo es de 10 a 30 veces por minuto.',
    ],
  },
  {
    tema: 'dientes',
    palabras: ['dientes', 'sarro', 'cepillar los dientes', 'higiene dental', 'boca',
               'mal aliento cuando'],
    opciones: [
      'Cepillarle los dientes dos o tres veces por semana evita el sarro. Usa pasta para mascotas: la de personas les hace mal.',
      'El sarro no es solo estético: las bacterias pueden llegar al corazón y a los riñones. Por eso importa.',
    ],
  },
  {
    tema: 'presentacion',
    // Raíces, no conjugaciones: 'present' cubre presentar, presento y
    // presentarlos. Las frases largas fallaban por una palabra en medio.
    palabras: ['present', 'se lleven bien', 'nueva mascota', 'nuevo perro', 'nuevo gato',
               'nueva perrita', 'nuevo cachorro', 'adopte', 'llego otro', 'se pelean',
               'convivencia', 'los junto', 'primer encuentro', 'aceptar al nuevo',
               'nueva gata', 'otro animal'],
    opciones: [
      'Los primeros días, cada uno en su espacio. Que el nuevo viva en una sola habitación mientras se acostumbran a oírse y olerse sin verse.',
      'Intercambia olores antes de que se vean: frota una manta en uno y déjasela al otro. Se van conociendo sin la tensión del encuentro.',
      'Recursos dobles y separados: dos platos de comida, dos de agua, dos camas, dos areneros. La mayoría de las peleas son por recursos, no por antipatía.',
      'El primer encuentro en terreno neutral. Si son perros, en la calle o un parque con la correa floja — no en la casa de uno de ellos.',
      'Si son gatos, que se vean primero a través de una puerta entreabierta o una reja. Verse sin poder llegar al otro baja mucho la tensión.',
      'Mantén la calma tú: si gritas o te pones nerviosa, ellos lo leen y se ponen peor. Tu tranquilidad los tranquiliza.',
      'Saluda y dale de comer primero al que ya vivía ahí. Respetar ese orden le baja la ansiedad y evita que sienta que perdió su lugar.',
      'No los dejes solos hasta que se vean cómodos de verdad. Puede tomar días o semanas, y apurarlo suele salir caro.',
      'Premia cuando estén cerca sin pelear: una galleta, unas palabras. Así aprenden que la presencia del otro trae cosas buenas.',
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
    if (c.palabras.some(p => coincide(q, p))) {
      const n = vecesPorTema[c.tema] || 0
      return { texto: c.opciones[n % c.opciones.length], tema: c.tema }
    }
  }
  return null
}

// ============================================================
// CÓMO SE COMPARA UNA PREGUNTA
// ============================================================
// El problema que resuelve: la comparación literal fallaba por una
// palabra en medio. "¿Cómo deben ser SUS heces?" no coincidía con
// "como deben ser LAS heces", y caía en la categoría equivocada.
//
// Ahora una frase de varias palabras coincide si TODAS sus palabras
// están presentes, en cualquier orden y con lo que sea en medio. Una
// frase de una sola palabra sigue comparándose como texto, para que
// "agua" encuentre "agua" dentro de "cuánta agua".
//
// Y las terminaciones se recortan: desparasit-ación, desparasit-ado y
// desparasit-arse llegan todas al mismo lugar.
function coincide(q: string, frase: string): boolean {
  const palabras = frase.split(/\s+/).filter(Boolean)
  if (palabras.length === 1) return q.includes(frase)
  return palabras.every(p => q.includes(p))
}

// Puntúa una lista de frases contra la pregunta. Gana la más
// específica: una frase de tres palabras vale más que una de una, y por
// eso "próxima desparasitación" le gana a "vacuna" suelto.
function puntuar(q: string, frases: string[]): number {
  let puntos = 0
  for (const f of frases) {
    if (coincide(q, f)) puntos += f.length
  }
  return puntos
}

// ============================================================
// "¿QUISISTE DECIR...?"
// ============================================================
// Solo se usa cuando el clasificador YA SE RINDIÓ. Nunca antes: si
// corrigiera de entrada podría "arreglar" una palabra que estaba bien y
// mandar la pregunta a otra categoría, que es peor que no entender.
//
// Y PREGUNTA, no asume. Corregir en silencio significa responder sobre
// algo que la persona no preguntó, con la misma seguridad de siempre.
// Preferimos una confirmación de un toque.
//
// Compara por DISTANCIA DE EDICIÓN: cuántas letras hay que cambiar para
// pasar de una palabra a otra. "desparacitada" a "desparasitada" es una
// sola letra, así que se ofrece. "programar" no se parece a nada de la
// lista, así que no se ofrece nada — que es lo correcto.
const VOCABULARIO: { palabra: string; pregunta: string }[] = [
  { palabra: 'desparasitacion', pregunta: '¿Cuándo le toca la próxima desparasitación?' },
  { palabra: 'desparasitar', pregunta: '¿Cuándo le toca la próxima desparasitación?' },
  { palabra: 'antiparasitario', pregunta: '¿Cuándo le toca el antiparasitario?' },
  { palabra: 'vacuna', pregunta: '¿Qué vacuna le toca?' },
  { palabra: 'vacunas', pregunta: '¿Qué vacunas tiene puestas?' },
  { palabra: 'medicamento', pregunta: '¿Qué medicamentos toma?' },
  { palabra: 'medicamentos', pregunta: '¿Qué medicamentos toma?' },
  { palabra: 'observacion', pregunta: '¿Dónde guardo una observación?' },
  { palabra: 'veterinario', pregunta: '¿Cuándo fue al veterinario?' },
  { palabra: 'examenes', pregunta: '¿Qué exámenes tiene?' },
  { palabra: 'alimentacion', pregunta: '¿Cómo ha estado su apetito?' },
  { palabra: 'movilidad', pregunta: '¿Ha cojeado?' },
  { palabra: 'ansiedad', pregunta: '¿Qué hago si está ansioso?' },
  { palabra: 'cotutor', pregunta: '¿Cómo agrego un co-tutor?' },
  { palabra: 'temperatura', pregunta: '¿Cuál es su temperatura normal?' },
  { palabra: 'chocolate', pregunta: '¿Puede comer chocolate?' },
  { palabra: 'digestion', pregunta: '¿Cómo ha estado su digestión?' },
  { palabra: 'antiparasitarios', pregunta: '¿Cuándo le toca el antiparasitario?' },
]

// Cuántas letras hay que cambiar para pasar de una palabra a otra.
// Corta apenas se pasa del máximo aceptable: no interesa saber si son
// 8 o 12 diferencias, solo si son pocas.
function distancia(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i]
    let minimoFila = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      const v = Math.min(nueva[j - 1] + 1, fila[j] + 1, fila[j - 1] + costo)
      nueva.push(v)
      if (v < minimoFila) minimoFila = v
    }
    // Si toda la fila ya supera el máximo, no hay forma de bajar.
    if (minimoFila > maximo) return maximo + 1
    fila = nueva
  }
  return fila[b.length]
}

// Busca una palabra parecida a alguna de la pregunta. Devuelve la
// sugerencia o null si nada se parece lo suficiente.
function quisisteDecir(q: string): string | null {
  const palabras = q.split(/\s+/).filter(p => p.length >= 5)
  let mejor: { pregunta: string; dist: number } | null = null

  for (const p of palabras) {
    for (const v of VOCABULARIO) {
      // El margen crece con el largo: en una palabra de 15 letras un
      // par de erratas es normal; en una de 5, dos ya la vuelven otra
      // palabra distinta.
      const maximo = p.length >= 12 ? 3 : p.length >= 8 ? 2 : 1
      const d = distancia(p, v.palabra, maximo)
      if (d <= maximo && d > 0 && (!mejor || d < mejor.dist)) {
        mejor = { pregunta: v.pregunta, dist: d }
      }
    }
  }
  return mejor ? mejor.pregunta : null
}

// La edad, en palabras. Devuelve null si no hay fecha de nacimiento o
// si algo sale mal — nunca "NaN meses", que es lo que aparecía cuando
// hoyISO no llegaba.
function calcularEdad(nacimiento: string | null, hoyISO?: string): string | null {
  if (!nacimiento) return null
  const nace = new Date(String(nacimiento).slice(0, 10) + 'T12:00:00')
  // Si hoyISO no viene, se usa la fecha del dispositivo. Es preferible
  // a no responder: la diferencia de zona horaria no cambia una edad.
  const hoy = hoyISO ? new Date(hoyISO + 'T12:00:00') : new Date()
  if (isNaN(nace.getTime()) || isNaN(hoy.getTime())) return null

  let meses = (hoy.getFullYear() - nace.getFullYear()) * 12 + (hoy.getMonth() - nace.getMonth())
  // Si aún no llega el día del mes, ese mes no se cumplió.
  if (hoy.getDate() < nace.getDate()) meses--
  if (meses < 0) return null

  const años = Math.floor(meses / 12)
  const resto = meses % 12
  if (años === 0) return meses === 0 ? 'menos de un mes' : `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  if (resto === 0) return `${años} ${años === 1 ? 'año' : 'años'}`
  return `${años} ${años === 1 ? 'año' : 'años'} y ${resto} ${resto === 1 ? 'mes' : 'meses'}`
}

// ============================================================
// PERÍODOS DE TIEMPO
// ============================================================
// Antes no existían: todo respondía "los últimos 30 días" aunque se
// preguntara por la última semana. Ahora el período que pide la persona
// manda sobre el valor por defecto, y la respuesta dice cuál se usó.
interface Periodo { dias: number; texto: string }

const PERIODOS: { frases: string[]; dias: number; texto: string }[] = [
  { frases: ['hoy'], dias: 0, texto: 'hoy' },
  { frases: ['ayer'], dias: 1, texto: 'ayer' },
  { frases: ['anteayer', 'antes de ayer'], dias: 2, texto: 'los últimos dos días' },
  { frases: ['ultimos 3 dias', 'ultimos tres dias'], dias: 3, texto: 'los últimos 3 días' },
  { frases: ['ultima semana', 'ultimos 7 dias', 'ultimos siete dias', 'esta semana',
             'semana pasada'], dias: 7, texto: 'la última semana' },
  { frases: ['ultimos 14 dias', 'ultimas dos semanas', 'ultimas 2 semanas'], dias: 14, texto: 'las últimas dos semanas' },
  { frases: ['este mes', 'ultimo mes', 'ultimos 30 dias', 'ultimos treinta dias'], dias: 30, texto: 'este mes' },
  { frases: ['ultimos 3 meses', 'ultimos tres meses'], dias: 90, texto: 'los últimos 3 meses' },
  { frases: ['este año', 'ultimo año', 'ultimos 12 meses'], dias: 365, texto: 'el último año' },
  // "recientemente" y "ultimamente" son vagos a propósito: una semana
  // es lo que la gente suele tener en mente al decirlo.
  { frases: ['recientemente', 'ultimamente', 'estos dias'], dias: 7, texto: 'los últimos días' },
]

// Extrae el período de la pregunta. Si no hay ninguno, devuelve null y
// quien llama decide el valor por defecto.
function detectarPeriodo(q: string): Periodo | null {
  let mejor: { dias: number; texto: string; largo: number } | null = null
  for (const p of PERIODOS) {
    for (const f of p.frases) {
      if (coincide(q, f) && (!mejor || f.length > mejor.largo)) {
        mejor = { dias: p.dias, texto: p.texto, largo: f.length }
      }
    }
  }
  return mejor ? { dias: mejor.dias, texto: mejor.texto } : null
}

// Filtra las señales al período pedido. Trabaja sobre fechaISO, que es
// la fecha sin formatear.
function filtrarPorPeriodo<T extends { fechaISO?: string }>(
  lista: T[], dias: number, hoyISO: string,
): T[] {
  // Mediodía: restar días sobre medianoche se cae en los cambios de
  // horario de verano.
  const limite = new Date(hoyISO + 'T12:00:00')
  limite.setDate(limite.getDate() - dias)
  const desde = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(limite)
  return lista.filter(x => {
    if (!x.fechaISO) return true
    // "hoy" y "ayer" son días puntuales, no ventanas.
    if (dias === 0) return x.fechaISO === hoyISO
    if (dias === 1) return x.fechaISO === desde
    return x.fechaISO >= desde
  })
}

// ============================================================
// CÓMO USAR LA APP
// ============================================================
// Preguntarle a Chiqui dónde se hace algo es más natural que buscar un
// tutorial, y él ya está en todas las pantallas.
//
// Cada respuesta es el CAMINO CONCRETO, no una explicación general:
// "toca Salud abajo, entra a Vacunas, toca + Agregar". Quien pregunta
// esto quiere hacer algo ahora, no entender el sistema.
interface Comolo { palabras: string[]; texto: string }

const COMOLO: Comolo[] = [
  { palabras: ['vacuna'],
    texto: 'Toca **Salud** en la barra de abajo, entra a **Vacunas** y usa **+ Agregar**.\n\nAnota el nombre, la fecha en que se la pusieron y cuándo toca la próxima. Con eso te aviso antes de que venza.' },

  { palabras: ['antiparasit', 'desparasit'],
    texto: 'Toca **Salud**, entra a **Antiparasitarios** y usa **+ Agregar**.\n\nSi anotas cada cuántos días toca, te aviso cuando se acerque la próxima dosis.' },

  { palabras: ['perfil', 'sus datos', 'el nombre', 'la raza', 'el sexo', 'la foto', 'esterilizad'],
    texto: 'Toca las **tres líneas** de arriba a la derecha, entra a **Perfil y cuenta**, y ahí abre **Datos del perfil**.\n\nCon el botón **Editar** puedes corregir el nombre, la raza, el sexo, la fecha de nacimiento y todo lo demás. La foto se cambia tocando el botoncito sobre la imagen.' },

  // "cotutor" y "co-tutor" a secas faltaban: preguntar "¿cómo creo un
  // co-tutor?" caía en "no sé" porque solo reconocía las formas
  // indirectas ("otra persona", "mi pareja").
  { palabras: ['cotutor', 'co tutor', 'co-tutor', 'cuidador', 'otra persona',
               'mi pareja', 'mi familia', 'alguien mas', 'segunda persona',
               'compartir mascota', 'codigo de invitacion'],
    texto: 'En el **Perfil** hay una tarjeta de **Co-tutor**. Toca **+ Generar código** y comparte ese código con quien quieras.\n\nEsa persona lo ingresa desde el botón **+** del selector de mascotas, en "Tengo un código". Desde ahí las dos pueden registrar a la misma mascota.' },

  { palabras: ['observacion', 'herida', 'masa', 'bulto', 'lesion', 'seguimiento'],
    texto: 'Toca **Salud** y entra a **Observaciones**. Usa **+ Agregar** y describe lo que viste.\n\nDespués puedes ir sumando su evolución con fotos: cómo estaba el primer día, cómo va después. Eso es justo lo que tu veterinario necesita ver.' },

  { palabras: ['el peso', 'pesar', 'los kilos'],
    texto: 'Toca **Salud** y entra a **Peso**. Ahí anotas los kilos y la fecha.\n\nCon dos o más controles ya puedo decirte si subió o bajó, y cuánto.' },

  { palabras: ['medicament', 'remedio', 'tratamiento'],
    texto: 'Toca **Salud**, entra a **Medicamentos** y usa **+ Agregar**.\n\nAnota cada cuántos días toca la dosis: así te aviso los días que corresponde y llevas la cuenta de las que ya diste.' },

  { palabras: ['bano', 'banarlo', 'cuidado', 'corte de unas', 'las unas', 'cepillar'],
    texto: 'Los cuidados van en el **registro diario**: toca el lápiz del centro, baja a la fila de **piel y aseo** y marca lo que hiciste.\n\nSi fue otro día, entra al **Calendario**, toca ese día y regístralo ahí.' },

  { palabras: ['registro diario', 'para que sirve', 'que es el registro', 'cada dia'],
    texto: 'El registro diario es el corazón de la app: son las señales de cada día —cómo estuvo su energía, si comió bien, cómo fueron sus heces.\n\nUn día suelto no dice mucho. Pero con varios ya se ven patrones, y eso es lo que le sirve a tu veterinario cuando algo pasa.\n\nSi todo estuvo normal, con el botón **Todo normal** lo registras en un toque.' },

  { palabras: ['ayer', 'otro dia', 'dia pasado', 'dia anterior', 'atrasad'],
    texto: 'Entra al **Calendario**, toca el día que te faltó y registra ahí. Puedes completar días anteriores sin problema.' },

  { palabras: ['visita', 'agendar', 'consulta'],
    texto: 'Toca **Salud** y entra a **Visitas veterinarias**. Puedes anotar una que ya pasó o agendar la próxima.\n\nSi la agendas, te aviso la noche antes.' },

  // 'compart' como raíz: cubre comparto, compartir y compartirle.
  { palabras: ['link', 'compart', 'enviarle', 'que vea el vet', 'mostrarle', 'al veterinario'],
    texto: 'En el **Perfil** hay una tarjeta de **Link para tu vet**. Toca **Copiar link** y envíaselo.\n\nÉl lo abre sin crear cuenta y ve todo el historial: registros, vacunas, peso, exámenes y observaciones.' },

  { palabras: ['otra mascota', 'nueva mascota', 'otro perro', 'otro gato', 'segunda mascota'],
    texto: 'Toca el botón **+** al lado de las fotos de tus mascotas, arriba. Ahí eliges **Agregar otra mascota**.\n\nPuedes tener todas las que quieras y cambiar entre ellas tocando su foto.' },

  { palabras: ['notificacion', 'recordatorio', 'que me avise', 'aviso'],
    texto: 'En el **Perfil**, baja hasta **Recordatorio diario** y actívalo. Puedes elegir a qué hora.\n\nSi no te llegan, revisa también los ajustes de tu teléfono: Ajustes → Aplicaciones → CHIQUI → Notificaciones.' },

  { palabras: ['revision corporal', 'revisarlo', 'revisar cuerpo', 'bultos', 'reviso'],
    texto: 'Desde el dashboard, en **Próximos**, toca **Revisión corporal**. Te voy guiando parte por parte: ojos, oídos, boca, piel, patas.\n\nNo es una evaluación médica — es tu mirada de siempre, con más atención. Aparece desde los 5 años, cada 3 meses (o cada mes si ya es senior).' },

  { palabras: ['respiratoria', 'respiraciones', 'respira'],
    texto: 'Toca **Salud** y busca **Frecuencia respiratoria**. Cuentas cuántas veces respira en reposo durante un minuto y lo anotas.\n\nEs uno de los datos que más le sirve a tu veterinario, sobre todo si hay algo del corazón.' },

  { palabras: ['temperatura'],
    texto: 'Toca **Salud** y busca **Temperatura corporal**. Ahí anotas los grados y la fecha.\n\nSe mide en el recto con un termómetro digital: la nariz seca no dice nada, es un mito.' },

  { palabras: ['celo', 'celos'],
    texto: 'Toca **Salud** y busca **Celos**. Anota cuándo empieza y cuándo termina cada uno.\n\nCon dos o más registrados puedo estimarte cuándo viene el próximo, y aparece en **Próximos** en el dashboard.' },

  { palabras: ['enfermedad', 'enfermedades', 'diagnostic', 'condicion cronica'],
    texto: 'Toca **Salud** y entra a **Enfermedades**. Anota el diagnóstico, la fecha y cuándo toca el próximo control.\n\nSi anotas ese control, te aviso cuando se acerque y aparece en **Próximos**.' },

  { palabras: ['momento', 'momentos', 'hito', 'hitos', 'recuerdo'],
    texto: 'En el **Perfil**, baja hasta **Momentos**. Ahí puedes guardar los hitos: su primer día en casa, su primer paseo, cuando se le cayó el primer diente.\n\nEs la parte menos clínica de la app, y a veces la más linda de mirar después.' },

  { palabras: ['calendario', 'ver el mes', 'mis registros', 'historial dias'],
    texto: 'Toca **Calendario** en la barra de abajo. Cada día tiene su color según cómo estuvo: verde si todo normal, amarillo o naranjo si hubo algo, rojo si fue un día de alerta.\n\nToca cualquier día para ver o completar su registro. Y puedes deslizar el dedo para cambiar de mes.' },

  { palabras: ['analisis', 'tendencias', 'estadisticas', 'graficos'],
    texto: 'Toca **Análisis** en la barra de abajo. Ahí ves cómo ha venido: qué porcentaje de días estuvo bien, sus rutinas, su actividad, y lo que se repitió.\n\nY arriba está el chat, donde puedes preguntarme lo que quieras sobre lo registrado.' },

  { palabras: ['signos alerta', 'algo grave', 'urgencia'],
    texto: 'En el **registro diario**, en la fila de salud, está **🚨 Alerta**. Ahí marcas eventos graves: convulsiones, dificultad para respirar, sangrado, golpe de calor.\n\nSi marcas alguno, el día queda en rojo y aparece destacado para tu veterinario.' },

  { palabras: ['borrar', 'eliminar', 'corrig', 'corrij', 'me equivoque', 'editar registro', 'modificar registro'],
    texto: 'En cualquier sección de **Salud**, cada tarjeta tiene un botón **⋮** arriba a la derecha. Desde ahí puedes editarla o eliminarla.\n\nPara un registro diario, entra al **Calendario**, toca ese día y modifica lo que necesites.' },

  { palabras: ['archiv', 'eliminar mascota', 'fallecio', 'se murio', 'ya no esta conmigo'],
    texto: 'En el **Perfil**, dentro de **Datos del perfil**, está la opción de archivar.\n\nArchivar no borra nada: su historial queda guardado y puedes volver a verlo cuando quieras. Simplemente deja de aparecer en el día a día.' },

  { palabras: ['todo normal', 'registrar rapido'],
    texto: 'En el **registro diario**, arriba, está el botón **Todo normal ✓**. Con un toque marca todas las señales como normales.\n\nEstá pensado justo para los días en que no pasó nada: registrar igual esos días es lo que después permite ver qué es lo habitual en tu mascota.' },

  { palabras: ['cerrar sesion', 'salir cuenta', 'cambiar de cuenta'],
    texto: 'Toca las **tres líneas** de arriba a la derecha y busca **Cerrar sesión** al final del menú.' },

  { palabras: ['contraseña', 'clave', 'password'],
    texto: 'Si no puedes entrar, en la pantalla de inicio de sesión hay un enlace de **¿Olvidaste tu contraseña?**. Te llega un correo para crear una nueva.' },

  { palabras: ['examen', 'hemograma', 'perfil bioquimico'],
    texto: 'Toca **Salud** y entra a **Exámenes**. Puedes anotar los valores de un hemograma, un perfil bioquímico y otros, con sus rangos de referencia.\n\nAsí los tienes a mano cuando tu veterinario los pida.' },
]

// Verbos que indican que la pregunta es sobre CÓMO HACER algo, no
// sobre los datos: "¿dónde registro una vacuna?" pregunta el camino,
// "¿qué vacunas vienen?" pregunta el dato.
const VERBOS_COMO = /\b(donde|como|puedo|quiero|necesito|se puede|hago para|agrego|agregar|registro|registrar|anoto|anotar|guardo|guardar|pongo|poner|edito|editar|cambio|cambiar|creo|crear|comparto|compartir|subo|subir|olvide|falta|le salio|tiene una|encontre|que son|que es|para que sirve|funciona|anoto|reviso|corrijo|corrijo|elimino|borro|archivo)\b/

function buscarComolo(pregunta: string): string | null {
  const q = normalizar(pregunta)
  // Sin un verbo de acción no es una pregunta de navegación. Sin esto,
  // "¿qué vacunas vienen?" caería acá en vez de dar las fechas.
  if (!VERBOS_COMO.test(q)) return null

  // Gana el que más raíces comparte. Una frase literal no sirve: la
  // gente escribe "¿dónde registro UNA vacuna?" y la palabra sobrante
  // rompe la coincidencia exacta.
  let mejor: { texto: string; puntos: number } | null = null
  for (const c of COMOLO) {
    let puntos = 0
    for (const p of c.palabras) {
      if (coincide(q, p)) puntos += p.length
    }
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) {
      mejor = { texto: c.texto, puntos }
    }
  }
  return mejor ? mejor.texto : null
}

// ============================================================
// INTENCIONES
// ============================================================
// Cada tema con sus formas de preguntarlo. Se puntúa por cuántas
// coinciden y gana la que más — no la primera que calza. Así "¿qué
// vacunas vienen?" no cae en el corte de uñas por la raíz "una".
type Tema = 'peso' | 'vacunas' | 'antiparasitarios' | 'medicamentos' | 'paseos'
  | 'senal' | 'cuidado' | 'examenes' | 'resumen' | 'vet' | 'visitas'
  | 'perfil' | 'alergias' | 'celos' | 'lab' | 'temperatura' | 'respiracion'
  | 'revision' | 'momentos' | 'enfermedades'
  // Los consejos también son un tema, para que "¿y qué más?" después de
  // uno de ansiedad devuelva el siguiente en vez de no entender.
  | 'consejo:ansiedad' | 'consejo:juego' | 'consejo:heces' | 'consejo:movilidad'
  | 'consejo:peso' | 'consejo:agua' | 'consejo:temperatura' | 'consejo:corazon'
  | 'consejo:dientes' | 'consejo:seguridad' | 'consejo:alerta'
  | 'consejo:viaje_casa' | 'consejo:viaje_auto' | 'consejo:presentacion' | null

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
  // 'salio' NO va: capturaba "le salió una masa" y respondía sobre
  // paseos. Las formas específicas sí.
  { tema: 'paseos', frases: ['pase', 'paseo', 'paseos', 'camin', 'salid', 'ejercicio',
      'cuanto camina', 'lo saque', 'salio a pasear', 'salieron'] },
  { tema: 'examenes', frases: ['examen', 'examenes', 'hemograma', 'creatinina', 'urea',
      'perfil bio', 'resultado', 'laboratorio', 'analisis de sangre'] },
  { tema: 'vet', frases: ['que le cuento', 'le cuento al', 'llevarlo al vet', 'para la consulta',
      'preparar la consulta', 'que le digo al', 'que le muestro'] },
  // Preguntar por la ÚLTIMA visita es distinto de preparar la próxima.
  { tema: 'visitas', frases: ['fue al veterinario', 'fue al vet', 'fuimos al vet', 'ultima vez al vet',
      'cuando fue al vet', 'lo lleve al vet', 'la lleve al vet', 'visita al veterinario',
      'visitas al vet', 'ha ido al vet', 'consulta veterinaria', 'ultima consulta',
      'ultima visita', 'cuando lo lleve', 'cuando fuimos'] },
  // Las frases van SIN ñ ni tildes: se comparan contra texto ya
  // normalizado, donde "años" quedó como "anos".
  { tema: 'perfil', frases: ['edad', 'que raza', 'raza es', 'de que raza', 'cuantos anos', 'que edad',
      'cuando nacio', 'su cumpleanos', 'es macho', 'es hembra', 'que sexo', 'esterilizad',
      'castrad', 'operad', 'de que color', 'microchip', 'chip', 'sus datos', 'su perfil'] },
  { tema: 'alergias', frases: ['alergia', 'alergias', 'es alergic', 'le hace alergia'] },
  { tema: 'celos', frases: ['celo', 'celos', 'esta en celo', 'ultimo celo', 'proximo celo'] },
  { tema: 'lab', frases: ['examen de laboratorio', 'examenes de laboratorio', 'hemograma',
      'perfil bioquimico', 'examenes lab', 'analisis de sangre', 'lab'] },
  { tema: 'temperatura', frases: ['que temperatura tiene', 'su temperatura', 'temperatura registrada',
      'ultima temperatura'] },
  { tema: 'respiracion', frases: ['frecuencia respiratoria', 'cuanto respira', 'sus respiraciones',
      'respiracion registrada'] },
  { tema: 'revision', frases: ['revision corporal', 'ultima revision', 'lo revise'] },
  { tema: 'momentos', frases: ['momentos', 'sus hitos', 'sus recuerdos', 'que momentos'] },
  // 'que tiene' NO va: capturaba "¿qué EDAD TIENE?" y respondía sobre
  // diagnósticos. Las formas específicas sí.
  { tema: 'enfermedades', frases: ['enfermedad', 'enfermedades', 'diagnostic',
      'condicion cronica', 'esta enferm', 'le detectaron'] },
  { tema: 'resumen', frases: ['como ha estado', 'como esta', 'que le paso', 'que paso',
      'ha estado enfermo', 'estuvo enfermo', 'ultimamente', 'todo', 'resumen', 'episodi'] },
]

// Señales del registro diario, cada una con sus formas de preguntarse.
const SENALES_INT: { campo: string; nombre: string; frases: string[] }[] = [
  { campo: 'digestion', nombre: 'su digestión', frases: ['vomit', 'vomito', 'devolvio', 'gases', 'nausea', 'digestion', 'aliento'] },
  { campo: 'heces', nombre: 'sus heces', frases: ['heces', 'caca', 'diarre', 'popo', 'deposicion', 'hizo bien'] },
  { campo: 'arenero', nombre: 'su orina', frases: ['orina', 'pipi', 'arenero', 'orino', 'hace pis'] },
  // 'comida' y 'alimentacion' faltaban: preguntar por la comida no
  // encontraba nada y respondia que no habia registros.
  { campo: 'apetito', nombre: 'su apetito', frases: ['apetito', 'comio', 'comiendo', 'esta comiendo',
      'con hambre', 'sin hambre', 'la comida', 'su comida', 'alimentacion', 'come bien'] },
  { campo: 'agua', nombre: 'el agua', frases: ['agua', 'tomando agua', 'sed', 'bebe', 'toma agua'] },
  { campo: 'energia', nombre: 'su energía', frases: ['energia', 'decaid', 'cansad', 'activ', 'sin ganas', 'con ganas'] },
  { campo: 'animo', nombre: 'su ánimo', frases: ['animo', 'triste', 'humor', 'irritab', 'contento', 'feliz'] },
  { campo: 'movilidad', nombre: 'su movilidad', frases: ['cojera', 'cojea', 'movilidad', 'camina bien', 'la pata', 'rigidez', 'renguea'] },
  { campo: 'pelaje', nombre: 'su piel y pelaje', frases: ['pelaje', 'el pelo', 'rasca', 'rascando', 'la piel', 'se lame', 'picazon'] },
  { campo: 'conducta', nombre: 'su conducta', frases: ['conducta', 'comporta', 'se escond', 'raro'] },
]

// Puntúa: gana la intención con más coincidencias, y entre empates la
// que coincide con una frase más larga (más específica).
// Se mantiene el nombre por compatibilidad: ahora delega en puntuar,
// que tolera palabras intermedias.
function detectar(q: string, frases: string[]): number {
  return puntuar(q, frases)
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
  '❓ ¿Cómo uso la app?',
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

  // El período que pide la persona, si hay alguno.
  const periodo = detectarPeriodo(q)

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

  // --- 1b. CÓMO SE HACE ALGO EN LA APP ---
  // Va antes que los datos: "¿dónde registro el peso?" pregunta por el
  // camino, no por cuántos kilos pesa.
  const como = buscarComolo(pregunta)
  if (como) return { texto: como, tema: null }

  // "No, era otra cosa": se ofrece el menú completo.
  if (/\bno era otra cosa\b|\bera otra cosa\b/.test(q)) {
    return { texto: `Dime entonces: ¿qué quieres hacer?`, tema: null, opciones: MENU }
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
    { palabras: ['vet', 'veterinario', 'veterinaria'],
      pregunta: '¿Quieres saber cuándo fue la última visita, o preparar la próxima consulta?',
      opciones: ['¿Cuándo fue al veterinario?', '¿Qué le cuento al veterinario?'] },
    { palabras: ['viaje', 'viajar', 'vacaciones'],
      pregunta: '¿Viajas con él, o se queda en casa?',
      opciones: ['Viajo con él en auto', 'Se queda en casa'] },
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
  // Formas de pedir "sigue con lo mismo". Van explícitas en vez de
  // "cualquier pregunta corta": esa regla hacía que "calor" o "vet"
  // heredaran el tema anterior y respondieran cualquier cosa.
  const esContinuacion = /^(y|pero|entonces|ademas|tambien)\b/.test(q)
    || /\b(algo mas|otra cosa|que mas|mas tips|mas consejos|otro consejo|dime mas|cuentame mas|sigue|continua)\b/.test(q)

  // "¿Cómo uso la app?" desde el menú: las cosas que más se preguntan.
  if (/como uso la app|como funciona|no se usar|ayuda con la app/.test(q)) {
    return {
      texto: `Dime qué quieres hacer y te digo dónde:`,
      tema: null,
      opciones: ['¿Para qué sirve el registro diario?', '¿Dónde registro una vacuna?',
                 '¿Cómo edito su perfil?', '¿Cómo agrego un co-tutor?',
                 '¿Dónde guardo una observación?', '¿Cómo le comparto al veterinario?',
                 '¿Cómo funciona el calendario?', '¿Cómo corrijo un registro?'],
    }
  }

  // "Chiqui Tips" desde el menú: se ofrecen los temas disponibles.
  if (/\bchiqui tips\b|\btips\b/.test(q)) {
    return {
      texto: `Puedo contarte sobre estos temas:`,
      tema: null,
      opciones: ['¿Qué puede comer?', '¿Qué hago si está ansioso?', '¿Cómo deben ser sus heces?',
                 '¿Cuánta agua necesita?', '¿Está en su peso ideal?', '¿Cuáles son los signos de alerta?',
                 'Voy a viajar', 'Llega una nueva mascota'],
    }
  }

  // --- 4. ¿PIDE DATOS O PIDE CONSEJO? ---
  // "¿ha cojeado?" pregunta por SUS registros. "¿por qué cojea?" pide
  // explicación. Sin esta distinción los consejos se comían todas las
  // preguntas por datos.
  // ¿PREGUNTA POR SUS DATOS O POR CÓMO DEBERÍA SER?
  //
  //   "¿cómo HAN SIDO sus heces?"   -> sus registros
  //   "¿cómo DEBEN SER sus heces?"  -> información general
  //
  // La diferencia está en el tiempo verbal y en el posesivo, no en el
  // tema. Antes esto era un regex de diez palabras y cualquier forma
  // fuera de esas diez caía del lado equivocado.
  // "tiene" pide el dato: "¿qué temperatura TIENE?" quiere el valor
  // registrado, no la explicación de cuál es lo normal.
  const SENAL_DATOS = /\b(ha |han |hubo|tuvo|tiene|estuvo|cuando|cuantas veces|registr|anote|le paso|esta semana|este mes|ultimos|ayer|hoy|ultimamente|recientemente|su |sus )\b/
  const SENAL_EDUCATIVA = /\b(deben|debe|deberia|es normal|son normales|se supone|cuanto es|cuanta es|que significa|por que|para que|sirve|cual es|como son|normalmente)\b/

  const pideDatos = SENAL_DATOS.test(q) && !SENAL_EDUCATIVA.test(q)
  const pideEducativa = SENAL_EDUCATIVA.test(q)

  // Si hay período explícito, es una pregunta por datos: nadie dice
  // "¿cómo deben ser sus heces esta semana?".
  const esPorDatos = pideDatos || (periodo !== null && !pideEducativa)

  const consejo = esPorDatos ? null : buscarConsejo(pregunta, vecesPorTema)
  if (consejo) {
    return { texto: consejo.texto, tema: `consejo:${consejo.tema}` as Tema }
  }

  // --- 5. LA INTENCIÓN QUE MÁS COINCIDE ---
  let mejor: { tema: Tema; puntos: number; campo?: string; nombre?: string } = { tema: null, puntos: 0 }
  for (const i of INTENCIONES) {
    // 'resumen' es el CAJÓN DE SASTRE: se evalúa solo si nada
    // específico calzó. Sin esto, "¿cómo ha estado su ÁNIMO?" caía en
    // resumen porque la frase "como ha estado" es más larga que
    // "animo", y devolvía el mes entero en vez del ánimo.
    if (i.tema === 'resumen') continue
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

  // Recién ahora el resumen, y solo si nada específico calzó.
  if (mejor.puntos === 0) {
    const intResumen = INTENCIONES.find(i => i.tema === 'resumen')
    if (intResumen) {
      const p = detectar(q, intResumen.frases)
      if (p > 0) mejor = { tema: 'resumen', puntos: p }
    }
  }

  // CONTINUACIÓN: solo si la pregunta NO trae tema propio. Un tema
  // nuevo siempre le gana al anterior — antes bastaba con que la
  // pregunta fuera corta, y por eso "¿cuánto pesa?" seguía respondiendo
  // sobre ansiedad.
  // Solo continúa si la pregunta PIDE continuar. Un tema nuevo siempre
  // gana.
  // LA CATEGORÍA NUNCA SE HEREDA POR NO ENTENDER.
  //
  // Antes, si el clasificador daba cero puntos y la frase empezaba con
  // "y", se asumía continuación. Un error de tipeo bastaba: "Y si
  // próxima desparaCitada?" daba cero, heredaba vacunas y respondía
  // Felocell a una pregunta de antiparasitarios.
  //
  // Ahora se exige que la frase PIDA continuar explícitamente. Si no
  // entiende, se admite — que es lo correcto.
  const PIDE_CONTINUAR = /^(y|pero|entonces|ademas|tambien)\s+(que|cual|cuando|como|cuanto|antes|despues|ahora|el|la|los|las|mas)\b/
    .test(q) || /\b(algo mas|otra cosa|que mas|mas tips|mas consejos|otro consejo|dime mas|cuentame mas|sigue|continua)\b/.test(q)

  if (mejor.puntos === 0 && PIDE_CONTINUAR && ultimoTema) {
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
        // La concordancia va explícita: "vacunas anotadas", no
        // "vacunas anotados".
        const frase = mejor.tema === 'vacunas'
          ? `No tengo vacunas anotadas de ${d.nombre}. Puedes agregarlas`
          : `No tengo antiparasitarios anotados de ${d.nombre}. Puedes agregarlos`
        return {
          texto: `${frase} en Salud → Prevención.\n\nSi anotas su próxima fecha, te aviso antes de que venza.`,
          tema: mejor.tema,
        }
      }
      const linea = (x: { nombre: string; proxima: string | null; dias: number | null }) => {
        if (!x.proxima) return `· ${x.nombre} — sin próxima fecha anotada`
        if (x.dias === null) return `· ${x.nombre} — ${x.proxima}`
        if (x.dias < 0) return `· ${x.nombre} — venció hace ${Math.abs(x.dias)} ${Math.abs(x.dias) === 1 ? 'día' : 'días'} (${x.proxima})`
        if (x.dias === 0) return `· ${x.nombre} — toca hoy`
        return `· ${x.nombre} — en ${x.dias} ${x.dias === 1 ? 'día' : 'días'} (${x.proxima})`
      }

      // "¿CUÁL LE TOCA?" y "¿CUÁLES TIENE?" son preguntas distintas.
      // La primera quiere UNA respuesta: la más próxima. La segunda
      // quiere el historial completo.
      // Formas de pedir el HISTORIAL en vez de lo próximo. "le he dado"
      // y "lleva" faltaban, y por eso preguntar cuáles le habían dado
      // devolvía el próximo.
      const quiereHistorial = /\b(tiene puestas?|tiene|le han puesto|le puse|le he dado|le has dado|le di|historial|todas|todos|cuales|lista|lleva|ha recibido)\b/.test(q)
        && !/\b(toca|proxim|viene|cuando)\b/.test(q)

      if (!quiereHistorial) {
        // La más urgente primero: vencida antes que pendiente, y entre
        // pendientes la más cercana.
        const conFecha = lista.filter(x => x.dias !== null)
        if (conFecha.length === 0) {
          return {
            texto: `${lista.map(linea).join('\n')}\n\nNinguna tiene próxima fecha anotada. Si la agregas, te aviso antes de que venza.`,
            tema: mejor.tema,
          }
        }
        const proxima = conFecha.slice().sort((a, b) => (a.dias as number) - (b.dias as number))[0]
        const resto = lista.length - 1
        const cola = resto > 0
          ? `\n\n(tiene ${resto} ${resto === 1 ? 'más registrada' : 'más registradas'})`
          : ''
        return {
          texto: `${linea(proxima)}${cola}`,
          tema: mejor.tema,
          opciones: resto > 0 ? [mejor.tema === 'vacunas' ? '¿Qué vacunas tiene puestas?' : '¿Qué antiparasitarios le he dado?'] : undefined,
        }
      }

      // El historial completo: TODAS las dosis, no una por nombre.
      const hist = mejor.tema === 'vacunas' ? d.historialVacunas : d.historialAntis
      if (hist && hist.length > 0) {
        const que = mejor.tema === 'vacunas' ? 'vacunas' : 'antiparasitarios'
        return {
          texto: `${d.nombre} lleva ${hist.length} ${hist.length === 1 ? que.slice(0, -1) : que}:\n${hist.map(x => `· ${x.nombre} — ${x.aplicada}`).join('\n')}`,
          tema: mejor.tema,
        }
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
      // El período que pidió la persona manda. Sin esto, preguntar por
      // "la última semana" respondía con 30 días y encima lo decía.
      const todas = (d.senales || []).filter(s => s.campo === mejor.campo)
      const suyas = periodo && d.hoyISO
        ? filtrarPorPeriodo(todas, periodo.dias, d.hoyISO)
        : todas
      const cuando = periodo ? periodo.texto : d.textoPeriodo

      if (suyas.length === 0) {
        // Si en el período pedido no hay nada pero SÍ hay antes, se
        // dice: es más útil que un "no hay nada" a secas.
        if (periodo && todas.length > 0) {
          return {
            texto: `En ${cuando} no registraste nada fuera de lo normal en ${mejor.nombre}.\n\nSí hay registros más atrás: ${todas.length} en ${d.textoPeriodo}.`,
            tema: 'senal',
            opciones: [`¿Cómo ha estado ${mejor.nombre} este mes?`],
          }
        }
        return { texto: `No registraste nada fuera de lo normal en ${mejor.nombre} durante ${cuando}.`, tema: 'senal' }
      }
      const lineas = suyas.slice(0, 6).map(s => `· ${s.fecha} — ${s.etiqueta}${s.nota ? ` 💬 "${s.nota}"` : ''}`)
      const cabecera = suyas.length === 1 ? `Una vez en ${cuando}:` : `${suyas.length} veces en ${cuando}:`
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

    case 'visitas': {
      if (!d.visitasVet || d.visitasVet.length === 0) {
        return {
          texto: `No tengo visitas al veterinario registradas de ${d.nombre}.\n\nPuedes anotarlas en Salud → Visitas, o marcando "fue al vet" en el registro del día.`,
          tema: 'visitas',
          opciones: MENU,
        }
      }
      // La última primero: es la que importa.
      const ordenadas = d.visitasVet.slice().sort().reverse()
      const ultima = ordenadas[0]

      // Lo que estaba pasando esa semana. Es el cruce que hace útil el
      // dato: una visita sola no dice nada, una visita con lo que se
      // registró alrededor sí.
      const cerca = (d.senales || []).filter(s => s.fechaISO && Math.abs(
        (new Date(s.fechaISO + 'T12:00:00').getTime() - new Date(ultima + 'T12:00:00').getTime()) / 86400000
      ) <= 5)

      let r = `La última vez que fueron al veterinario fue el **${d.fmtVisita ? d.fmtVisita(ultima) : ultima}**.`
      if (cerca.length > 0) {
        const etiquetas = Array.from(new Set(cerca.map(s => s.etiqueta)))
        r += `\n\nEsos días habías registrado: ${etiquetas.join(', ')}.`
        const conNota = cerca.find(s => s.nota)
        if (conNota) r += `\n💬 "${conNota.nota}"`
      } else {
        r += `\n\nEsos días no habías registrado nada fuera de lo normal.`
      }
      if (ordenadas.length > 1) {
        r += `\n\nEn total llevas ${ordenadas.length} visitas registradas.`
      }
      return { texto: r, tema: 'visitas' }
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

    case 'perfil': {
      const p = d.perfil
      // Si la pregunta es POR UN CAMPO en particular, se responde solo
      // ese. Soltar la ficha entera cuando alguien pregunta la edad es
      // ruido: la respuesta correcta son tres palabras.
      if (p) {
        if (/\b(edad|anos|cumple|nacio|viejo|joven|cachorro)/.test(q)) {
          const e = calcularEdad(p.nacimiento, d.hoyISO)
          return {
            texto: e
              ? `${d.nombre} tiene **${e}**.`
              : `No tengo la fecha de nacimiento de ${d.nombre}. Puedes agregarla en su perfil: sirve para saber en qué etapa de vida está.`,
            tema: 'perfil',
          }
        }
        // Sin \b al final: 'esteriliz' tiene que calzar con
        // esterilizado, esterilizada y esterilizar.
        if (/\b(esteriliz|castrad|operad|reproductiv|fertil|entero)/.test(q)) {
          const estado = p.estadoReproductivo || (p.castrado === true ? 'Esterilizado/a' : p.castrado === false ? 'Fértil' : null)
          return {
            texto: estado
              ? `${d.nombre} está registrado/a como **${estado.toLowerCase()}**.`
              : `No tengo el estado reproductivo de ${d.nombre}. Puedes anotarlo en su perfil.`,
            tema: 'perfil',
          }
        }
        if (/\braza\b/.test(q)) {
          return {
            texto: p.raza
              ? `${d.nombre} es **${p.raza}**.`
              : `No tengo la raza de ${d.nombre} anotada. Puedes agregarla en su perfil.`,
            tema: 'perfil',
          }
        }
        if (/\b(microchip|chip)\b/.test(q)) {
          return {
            texto: p.microchip
              ? `El microchip de ${d.nombre} es **${p.microchip}**.`
              : `No tengo microchip registrado en ${d.nombre}.`,
            tema: 'perfil',
          }
        }
      }
      if (!p) return { texto: `No tengo los datos del perfil de ${d.nombre} a mano.`, tema: 'perfil' }
      const lineas: string[] = []
      if (p.raza) lineas.push(`· Raza: ${p.raza}`)
      const edad = calcularEdad(p.nacimiento, d.hoyISO)
      if (edad) lineas.push(`· Edad: ${edad}`)
      if (p.sexo) {
        // El estado reproductivo va junto al sexo: son la misma
        // pregunta para quien la hace. Se prefiere el texto de
        // estado_reproductivo, que dice más que un sí/no.
        const estado = p.estadoReproductivo
          ? `, ${p.estadoReproductivo.toLowerCase()}`
          : p.castrado === true ? ', esterilizado/a'
          : p.castrado === false ? ', fértil' : ''
        lineas.push(`· Sexo: ${p.sexo}${estado}`)
      }
      if (p.color) lineas.push(`· Color: ${p.color}`)
      if (p.microchip) lineas.push(`· Microchip: ${p.microchip}`)
      if (d.peso) lineas.push(`· Peso: ${d.peso.actual} kg (${d.peso.fecha})`)
      if (p.alimentacion) lineas.push(`· Alimento: ${p.alimentacion}`)
      if (p.veterinaria) lineas.push(`· Veterinaria: ${p.veterinaria}`)
      if (p.alergias) lineas.push(`· ⚠️ Alergia: ${p.alergias}`)

      if (lineas.length === 0) {
        return {
          texto: `Todavía no tengo datos del perfil de ${d.nombre}.\n\nPuedes completarlos desde el menú de las tres líneas → Perfil y cuenta → Datos del perfil.`,
          tema: 'perfil',
        }
      }
      return { texto: `${d.nombre}:\n${lineas.join('\n')}`, tema: 'perfil' }
    }

    case 'alergias': {
      if (!d.perfil?.alergias) {
        return {
          texto: `No tengo alergias registradas en ${d.nombre}.\n\nSi tiene alguna, anótala en su perfil: aparece marcada en rojo para que tu veterinario la vea de inmediato.`,
          tema: 'alergias',
        }
      }
      return {
        texto: `⚠️ ${d.nombre} tiene registrada alergia a: **${d.perfil.alergias}**.\n\nSi alguna vez lo atiende otro veterinario, es lo primero que conviene mencionar.`,
        tema: 'alergias',
      }
    }

    case 'celos': {
      const cs = d.celos || []
      if (cs.length === 0) {
        // El seguimiento reproductivo se activa desde el perfil, no hay
        // una sección de celos aparte.
        return {
          texto: `No tengo celos registrados de ${d.nombre}.\n\nEl seguimiento reproductivo se activa desde el perfil, en Datos del perfil. Con eso puedo llevarte la cuenta.`,
          tema: 'celos',
        }
      }
      const lineas = cs.slice(0, 3).map(c => `· ${c.inicio}${c.fin ? ` al ${c.fin}` : ' (sin fecha de término)'}`)
      let cola = ''
      if (cs.length >= 2 && d.hoyISO) {
        // El intervalo promedio entre celos, para estimar el próximo.
        const difs: number[] = []
        for (let i = 0; i < Math.min(cs.length - 1, 3); i++) {
          const a = new Date(cs[i].inicioISO + 'T12:00:00').getTime()
          const b = new Date(cs[i + 1].inicioISO + 'T12:00:00').getTime()
          difs.push(Math.round((a - b) / 86400000))
        }
        const prom = Math.round(difs.reduce((x, y) => x + y, 0) / difs.length)
        if (prom > 0) {
          const desde = Math.round(
            (new Date(d.hoyISO + 'T12:00:00').getTime() - new Date(cs[0].inicioISO + 'T12:00:00').getTime()) / 86400000
          )
          const faltan = prom - desde
          cola = faltan > 0
            ? `\n\nSuelen venirle cada ${prom} días, así que el próximo sería en unos ${faltan}.`
            : `\n\nSuelen venirle cada ${prom} días, y ya pasaron ${desde} desde el último.`
        }
      }
      return { texto: `Últimos celos:\n${lineas.join('\n')}${cola}`, tema: 'celos' }
    }

    case 'lab': {
      const ls = d.examenesLab || []
      if (ls.length === 0) {
        return {
          texto: `No tengo exámenes de laboratorio de ${d.nombre}.\n\nSe guardan en Salud → Exámenes de laboratorio, con sus valores y rangos de referencia.`,
          tema: 'lab',
        }
      }
      return {
        texto: `Exámenes de laboratorio guardados:\n${ls.map(x => `· ${x.tipo} — ${x.fecha}`).join('\n')}\n\nInterpretarlos es cosa de tu veterinario: los valores dependen de la edad y del laboratorio.`,
        tema: 'lab',
      }
    }

    case 'temperatura': {
      if (!d.temperatura) {
        return {
          texto: `No tengo temperaturas registradas de ${d.nombre}.\n\nSe anotan en Salud → Temperatura corporal. Lo normal está entre 38 °C y 39,2 °C.`,
          tema: 'temperatura',
        }
      }
      const t = d.temperatura.valor
      // Se dice si está fuera del rango normal, sin diagnosticar.
      const nota = t >= 40 ? '\n\nEso está sobre el rango normal (38 a 39,2 °C). Sobre 40 °C conviene consultar.'
        : t < 37.5 ? '\n\nEso está bajo el rango normal (38 a 39,2 °C). Vale la pena comentarlo.'
        : '\n\nEstá dentro del rango normal (38 a 39,2 °C).'
      return { texto: `La última temperatura que anotaste fue **${t} °C**, el ${d.temperatura.fecha}.${nota}`, tema: 'temperatura' }
    }

    case 'respiracion': {
      if (!d.respiracion) {
        return {
          texto: `No tengo frecuencias respiratorias de ${d.nombre}.\n\nSe anotan en Salud → Frecuencia respiratoria: cuentas cuántas veces respira en reposo durante un minuto.`,
          tema: 'respiracion',
        }
      }
      const r = d.respiracion.valor
      const nota = r > 30 ? '\n\nEn reposo lo normal son 10 a 30 por minuto, así que vale la pena comentarlo.'
        : '\n\nEstá dentro de lo normal en reposo (10 a 30 por minuto).'
      return { texto: `La última que anotaste fue **${r} respiraciones por minuto**, el ${d.respiracion.fecha}.${nota}`, tema: 'respiracion' }
    }

    case 'revision': {
      if (!d.ultimaRevision) {
        return {
          texto: `Todavía no has hecho una revisión corporal de ${d.nombre}.\n\nEstá en el dashboard, en Próximos. Te va guiando parte por parte: ojos, oídos, boca, piel, patas.`,
          tema: 'revision',
        }
      }
      return { texto: `La última revisión corporal fue el **${d.ultimaRevision}**.`, tema: 'revision' }
    }

    case 'momentos': {
      const ms = d.momentos || []
      if (ms.length === 0) {
        return {
          texto: `Todavía no has guardado momentos de ${d.nombre}.\n\nEstán en el Perfil, más abajo. Sirven para los hitos: su primer día en casa, su primer paseo, lo que quieras recordar.`,
          tema: 'momentos',
        }
      }
      return { texto: `Momentos guardados:\n${ms.map(x => `· ${x.fecha} — ${x.titulo}`).join('\n')}`, tema: 'momentos' }
    }

    case 'enfermedades': {
      const es = d.enfermedades || []
      if (es.length === 0) {
        return {
          texto: `No tengo diagnósticos registrados de ${d.nombre}.\n\nSi le diagnostican algo, anótalo en Salud → Enfermedades: puedes guardar la fecha y cuándo toca el próximo control.`,
          tema: 'enfermedades',
        }
      }
      const lineas = es.map(x => `· ${x.diagnostico} — desde el ${x.fecha}${x.proximaRevision ? `, control el ${x.proximaRevision}` : ''}`)
      return { texto: `Diagnósticos registrados:\n${lineas.join('\n')}`, tema: 'enfermedades' }
    }

    case 'resumen': {
      // Con período pedido se responde desde las señales, que sí se
      // pueden recortar. Los episodios vienen ya agrupados por mes.
      if (periodo && d.hoyISO && d.senales && d.senales.length > 0) {
        const enRango = filtrarPorPeriodo(d.senales, periodo.dias, d.hoyISO)
        if (enRango.length === 0) {
          return { texto: `En ${periodo.texto} no registraste nada fuera de lo normal en ${d.nombre}.`, tema: 'resumen' }
        }
        const lineas = enRango.slice(0, 8).map(x => `· ${x.fecha} — ${x.etiqueta}${x.nota ? ` 💬 "${x.nota}"` : ''}`)
        return { texto: `Esto registraste en ${periodo.texto}:\n${lineas.join('\n')}`, tema: 'resumen' }
      }
      if (d.episodios.length === 0) return { texto: `En ${d.textoPeriodo} no registraste episodios destacables en ${d.nombre}. Energía y ánimo normales o mejores en el ${d.pctBien}% de los días.`, tema: 'resumen' }
      return { texto: `Esto registraste en ${d.textoPeriodo}:\n\n${d.episodios.map(e => `· ${e}`).join('\n\n')}`, tema: 'resumen' }
    }
  }

  // Si pedía datos pero no calzó ninguna intención, se ofrece el
  // consejo como segunda opción antes de rendirse.
  if (esPorDatos) {
    const c = buscarConsejo(pregunta, vecesPorTema)
    if (c) return { texto: c.texto, tema: `consejo:${c.tema}` as Tema }
  }

  // --- No se entendió ---
  // Se admite sin rodeos y se ofrece el menú. Antes heredaba el tema
  // anterior y respondía sobre exámenes a "¿sabes codificar?", que es
  // peor que decir que no se sabe.
  // UN CUIDADO QUE TODAVÍA NO SE REGISTRA.
  // Va al final, no antes de la clasificación: la raíz "unas" está
  // dentro de "vacUNAS" y respondía sobre uñas a preguntas de vacunas.
  // Acá solo se llega si ninguna categoría calzó, así que no puede
  // robarle nada a nadie.
  const CUIDADOS_CONOCIDOS: { label: string; palabras: string[]; donde: string }[] = [
    { label: 'baños', palabras: ['ban', 'ducha'], donde: 'la fila de piel y aseo' },
    { label: 'cortes de uñas', palabras: ['cortar las unas', 'corte de unas', 'las unitas'], donde: 'la fila de piel y aseo' },
    { label: 'limpiezas dentales', palabras: ['diente', 'dental', 'cepill'], donde: 'la fila de piel y aseo' },
    { label: 'limpiezas de oídos', palabras: ['oido', 'oreja'], donde: 'la fila de piel y aseo' },
    { label: 'compras de alimento', palabras: ['comprar', 'saco', 'croqueta'], donde: 'la fila de alimentación' },
    { label: 'cargas del dispensador', palabras: ['dispensador'], donde: 'la fila de alimentación' },
  ]
  const preguntado = CUIDADOS_CONOCIDOS.find(c => c.palabras.some(p => coincide(q, p)))
  if (preguntado) {
    return {
      texto: `Todavía no tengo ${preguntado.label} registrados de ${d.nombre}.\n\nSe anotan en el registro diario, en ${preguntado.donde}. Con dos o más ya puedo decirte cada cuánto los sueles hacer.`,
      tema: 'cuidado',
    }
  }

  // No se entendió. Se admite sin inventar y sin heredar: devolver algo
  // de otra categoría "para no quedar mal" es peor que decir que no se
  // sabe, porque suena igual de seguro.
  // Antes de rendirse del todo: ¿se parece a algo conocido? Se ofrece
  // como PREGUNTA, no se corrige en silencio.
  const sugerido = quisisteDecir(q)
  if (sugerido) {
    return {
      texto: `No estoy segura de qué quieres consultar 🐾\n\n¿Quizás quisiste preguntar esto?`,
      tema: null,
      opciones: [sugerido, 'No, era otra cosa'],
    }
  }

  return {
    texto: `No estoy segura de qué quieres consultar 🐾\n\nConozco la historia de ${d.nombre}: lo que registras día a día, sus cuidados y su salud. También puedo decirte si un alimento le hace mal, o dónde se hace algo en la app.\n\n¿Qué quieres hacer?`,
    tema: null,
    opciones: MENU,
  }
}

export default function ChiquiChat({
  datos,
  flotante = false,
}: {
  datos: DatosChat
  // En Análisis es una tarjeta dentro del contenido. En el resto de las
  // pantallas es una burbuja fija abajo a la derecha, que aparece unos
  // segundos después de entrar.
  flotante?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  // Chiqui "escribiendo": una pausa corta antes de responder. Sin ella
  // la respuesta aparece instantánea y se siente a máquina.
  const [pensando, setPensando] = useState(false)
  const [ultimoTema, setUltimoTema] = useState<Tema>(null)
  const [veces, setVeces] = useState<Record<string, number>>({})
  const finRef = useRef<HTMLDivElement>(null)
  // La burbuja no aparece de inmediato: unos segundos después, para no
  // competir con lo que la persona vino a hacer.
  const [visible, setVisible] = useState(!flotante)
  const [saludo, setSaludo] = useState(false)

  useEffect(() => {
    if (!flotante) return
    const t1 = setTimeout(() => setVisible(true), 2500)
    const t2 = setTimeout(() => setSaludo(true), 3200)
    // El saludo se retira solo: si nadie lo toca, deja de estorbar.
    const t3 = setTimeout(() => setSaludo(false), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [flotante])

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

  // Cambió la mascota: se borra todo. El historial de Chiquito no puede
  // quedar en pantalla mientras se mira a Michi.
  const idPrevio = useRef<string | undefined>(datos.mascotaId)
  useEffect(() => {
    if (idPrevio.current !== undefined && idPrevio.current !== datos.mascotaId) {
      setMensajes([])
      setUltimoTema(null)
      setVeces({})
      setAbierto(false)
    }
    idPrevio.current = datos.mascotaId
  }, [datos.mascotaId])

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
      {flotante ? (
        // Burbuja flotante, sobre la barra de abajo.
        <div
          className="fixed right-4 z-40 flex items-center gap-2"
          style={{
            bottom: '88px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity .35s ease, transform .35s ease',
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          {saludo && (
            <button
              onClick={() => setAbierto(true)}
              className="px-3.5 py-2.5 text-[12px] font-semibold text-[#3D2B1F] whitespace-nowrap"
              style={{
                background: '#FFFCF8',
                border: '1.5px solid #EEE2D4',
                borderRadius: '16px 16px 4px 16px',
                boxShadow: '0 2px 8px rgba(61,43,31,0.10)',
                animation: 'chiquiEntra .3s ease',
              }}
            >
              Soy Chiqui, ¿hablamos?
            </button>
          )}
          <button
            onClick={() => setAbierto(true)}
            aria-label="Hablar con Chiqui"
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #FFBD59 0%, #CD7421 100%)',
              boxShadow: '0 4px 14px rgba(140,87,47,0.30)',
            }}
          >
            <img src="/chiqui/chiqui_ia.png" alt="" className="w-10 h-10 object-contain" />
          </button>
        </div>
      ) : (
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
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#FFFCF8]" style={{ background: '#4CAF7D' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#3D2B1F]">Habla conmigo</p>
            <p className="text-[11px] text-[#8A7560] leading-snug">Conozco la historia de {datos.nombre}</p>
          </div>
          <span className="text-[#CD7421] text-xl flex-shrink-0">›</span>
        </button>
      )}

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
            @keyframes chiquiEntra {
              from { opacity: 0; transform: scale(0.9) translateX(8px); }
              to { opacity: 1; transform: scale(1) translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
