const fs = require('fs');
const path = require('path');

// ============================================================
// generar_372_mal_aliento.js
// ============================================================
// Agrega "Mal aliento" como opcion de Digestion, con el mismo detalle
// de "¿desde cuando?" que ya usan Agua y otras opciones del formulario.
//
// POR QUE IMPORTA EL DETALLE
// El mal aliento de un dia no dice casi nada; el que lleva semanas si.
// Preguntar desde cuando convierte un dato suelto en una tendencia, que
// es lo unico que un veterinario puede usar.
//
// UNA LIMITACION QUE CONVIENE TENER PRESENTE
// Digestion es de SELECCION UNICA — hay un comentario en el propio
// codigo explicando que por eso separaron Heces, para poder registrar
// vomito y diarrea el mismo dia sin que se pisen.
//
// Eso significa que quien tenga vomito Y mal aliento tendra que elegir
// uno. Y el mal aliento no es un evento del dia: es un estado que
// convive con todo lo demas.
//
// Se agrega igual porque poder registrarlo es mejor que no poder. Si
// con el uso resulta que la gente lo marca seguido, lo correcto seria
// sacarlo a su propia categoria de seleccion multiple, igual que se
// hizo con Heces.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = [
  "      {value:'nauseas',emoji:'🤢',label:'Náuseas'},",
  "      {value:'vomito',emoji:'🤮',label:'Vómito',detalle:[",
].join('\n');

const NUEVO = [
  "      {value:'nauseas',emoji:'🤢',label:'Náuseas'},",
  "      // El mal aliento de un día no dice casi nada; el que lleva",
  "      // semanas sí. Por eso se pregunta desde cuándo: convierte un",
  "      // dato suelto en una tendencia, que es lo que un veterinario",
  "      // puede usar.",
  "      {value:'mal_aliento',emoji:'😷',label:'Mal aliento',detalle:[",
  "        {titulo:'¿Desde cuándo lo notas?',opciones:[",
  "          {value:'hoy',emoji:'📅',label:'Hoy solo'},",
  "          {value:'varios',emoji:'📆',label:'Varios días'},",
  "          {value:'semanas',emoji:'🗓',label:'Hace semanas'},",
  "        ]},",
  "      ]},",
  "      {value:'vomito',emoji:'🤮',label:'Vómito',detalle:[",
].join('\n');

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('mal_aliento')) {
  abortar('la opcion ya existe. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'opciones de Digestion -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = [
  "{value:'mal_aliento',emoji:'😷',label:'Mal aliento'",
  "'¿Desde cuándo lo notas?'",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las opciones que ya existian tienen que seguir ahi
for (const o of ['Normal', 'Gases', 'Náuseas', 'Vómito']) {
  if (!contenido.includes("label:'" + o + "'")) {
    abortar('se perdio la opcion [' + o + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya se puede registrar el mal aliento.');
