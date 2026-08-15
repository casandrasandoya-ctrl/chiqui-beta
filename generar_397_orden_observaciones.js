const fs = require('fs');
const path = require('path');

// ============================================================
// generar_397_orden_observaciones.js
// ============================================================
// Las observaciones pasan a ordenarse por ULTIMA ACTUALIZACION, no por
// fecha de inicio.
//
// POR QUE
// Una observacion que empezo hace tres meses pero se actualizo ayer
// esta viva: el tutor la sigue mirando. Una de la semana pasada sin
// evoluciones, quiza no. Ordenar por fecha de inicio deja arriba lo mas
// nuevo, no lo mas relevante.
//
// Para el veterinario la diferencia es mayor todavia: en una consulta
// de diez minutos, lo primero que ve deberia ser lo que el tutor ha
// estado siguiendo.
//
// EL CRITERIO
// La ultima actualizacion de una observacion es la fecha de su
// evolucion mas reciente, o su fecha de inicio si no tiene ninguna. Es
// EXACTAMENTE el mismo calculo que ya usa el dashboard para decidir a
// que seguimiento le recuerda al tutor — asi las tres pantallas
// coinciden.
//
// SE APLICA EN LOS DOS LUGARES:
//   - app/vet/page.tsx        (obsConEvoluciones, que ya trae las
//                              evoluciones cargadas)
//   - app/prevencion/page.tsx (obsActivas y obsResueltas)
//
// En Prevencion las evoluciones se cargan solo al desplegar una
// observacion, asi que ahi se ordena con lo que haya en memoria y se
// cae de vuelta en fecha_inicio cuando no hay nada. No es perfecto,
// pero es correcto: sin evoluciones cargadas, la fecha de inicio ES la
// ultima actualizacion conocida.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_VET = 'app/vet/page.tsx';
const RUTA_PREV = 'app/prevencion/page.tsx';

const CAMBIOS = [
  {
    ruta: RUTA_VET,
    nombre: 'orden en la vista del veterinario',
    viejo: [
      "      return { ...o, evoluciones: evos || [] }",
      "    })",
      "  )",
    ].join('\n'),
    nuevo: [
      "      return { ...o, evoluciones: evos || [] }",
      "    })",
      "  )",
      "",
      "  // Ordenadas por ÚLTIMA ACTUALIZACIÓN: la evolución más reciente, o",
      "  // la fecha de inicio si no tiene ninguna. En una consulta de diez",
      "  // minutos, lo primero que debe verse es lo que el tutor ha estado",
      "  // siguiendo — no lo que empezó hace más tiempo.",
      "  //",
      "  // Mismo criterio que usa el dashboard para sus recordatorios, así",
      "  // las tres pantallas coinciden.",
      "  const ultimaActualizacion = (o: any): string => {",
      "    const fechas = (o.evoluciones || []).map((e: any) => e.fecha).filter(Boolean)",
      "    if (fechas.length === 0) return o.fecha_inicio || ''",
      "    return fechas.slice().sort().reverse()[0]",
      "  }",
      "  obsConEvoluciones.sort((a: any, b: any) => ultimaActualizacion(b).localeCompare(ultimaActualizacion(a)))",
    ].join('\n'),
  },
];

// En Prevencion el anclaje depende de como esten declaradas obsActivas
// y obsResueltas, que no alcanzo a ver completo. Se buscan varias
// formas posibles y se aplica la que exista.
const VARIANTES_PREV = [
  {
    // El filtro real usa !== 'resuelta', no === 'activa': asi incluye
    // cualquier estado que no sea resuelta, no solo el literal 'activa'.
    viejo: "  const obsActivas = obs.filter(o => o.estado !== 'resuelta')",
    nuevo: [
      "  // Ordenadas por última actualización: la evolución más reciente,",
      "  // o la fecha de inicio si no tiene ninguna. Una observación de",
      "  // hace tres meses actualizada ayer está viva; una de la semana",
      "  // pasada sin evoluciones, quizá no.",
      "  //",
      "  // Las evoluciones se cargan solo al desplegar, así que acá se",
      "  // ordena con lo que haya en memoria. Sin ellas, la fecha de inicio",
      "  // ES la última actualización conocida.",
      "  const ultimaActualizacionObs = (o: any): string => {",
      "    const evos = evoluciones[o.id] || []",
      "    const fechas = evos.map((e: any) => e.fecha).filter(Boolean)",
      "    if (fechas.length === 0) return o.fecha_inicio || ''",
      "    return fechas.slice().sort().reverse()[0]",
      "  }",
      "  const ordenarPorActualizacion = (lista: any[]) =>",
      "    lista.slice().sort((a, b) => ultimaActualizacionObs(b).localeCompare(ultimaActualizacionObs(a)))",
      "",
      "  const obsActivas = ordenarPorActualizacion(obs.filter(o => o.estado !== 'resuelta'))",
    ].join('\n'),
  },
  {
    viejo: "  const obsResueltas = obs.filter(o => o.estado === 'resuelta')",
    nuevo: "  const obsResueltas = ordenarPorActualizacion(obs.filter(o => o.estado === 'resuelta'))",
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoVet = path.join(process.cwd(), RUTA_VET);
const destinoPrev = path.join(process.cwd(), RUTA_PREV);

for (const [ruta, destino] of [[RUTA_VET, destinoVet], [RUTA_PREV, destinoPrev]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let vet = fs.readFileSync(destinoVet, 'utf8');
let prev = fs.readFileSync(destinoPrev, 'utf8');

if (vet.includes('const ultimaActualizacion')) {
  abortar('las observaciones ya estan ordenadas. Parece que este script ya se corrio.');
}

// --- Vista del veterinario
for (const c of CAMBIOS) {
  const n = contar(vet, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] y encontre ' + n + '.');
  }
  vet = vet.split(c.viejo).join(c.nuevo);
}

// --- Prevencion: al menos la de activas tiene que calzar
let aplicadasPrev = 0;
for (const v of VARIANTES_PREV) {
  const n = contar(prev, v.viejo);
  if (n === 1) {
    prev = prev.split(v.viejo).join(v.nuevo);
    aplicadasPrev++;
    console.log('  OK  orden en Prevencion -> aplicado');
  } else if (n === 0) {
    console.log('  --  una variante de Prevencion no calzo (puede ser normal)');
  } else {
    abortar('encontre ' + n + ' coincidencias en Prevencion. Esperaba 0 o 1.');
  }
}

if (aplicadasPrev === 0) {
  abortar('no pude ubicar obsActivas en Prevencion. Pasale a Claude la linea donde se declara.');
}
if (aplicadasPrev === 1 && !prev.includes('ordenarPorActualizacion(obs.filter')) {
  abortar('el orden no quedo aplicado en Prevencion.');
}

// --- Verificaciones finales
if (!vet.includes('obsConEvoluciones.sort(')) {
  abortar('el orden no quedo aplicado en la vista del veterinario.');
}
if (prev.includes('ordenarPorActualizacion') && !prev.includes('const ultimaActualizacionObs')) {
  abortar('quedo el orden sin su funcion: el build fallaria.');
}

fs.writeFileSync(destinoVet, vet, 'utf8');
console.log('');
console.log('OK: ' + RUTA_VET);
fs.writeFileSync(destinoPrev, prev, 'utf8');
console.log('OK: ' + RUTA_PREV);
console.log('');
console.log('Listo. Arriba queda lo que se actualizo ultimo.');
