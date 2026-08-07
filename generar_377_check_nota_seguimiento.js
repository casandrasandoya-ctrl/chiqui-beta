const fs = require('fs');
const path = require('path');

// ============================================================
// generar_377_check_nota_seguimiento.js
// ============================================================
// Agrega el check "Esto me preocupa — preguntame mañana" junto a la
// nota del dia.
//
// EL CASO
// "Comio algo en la calle y no alcance a ver que era." La mascota esta
// bien, el dia es normal, pero eso es justo lo que uno quiere tener a
// mano si mañana vomita.
//
// Hoy hay 82 notas escritas entre 688 registros —una de cada ocho
// veces— y TODAS estan enterradas: no generan alerta, no aparecen en
// Analisis, y nadie las vuelve a leer.
//
// DOS DECISIONES DE DISEÑO
//
// 1. El check solo aparece si hay algo escrito. Pedir seguimiento de
//    una nota vacia no significa nada, y un control que no hace nada
//    solo estorba.
//
// 2. El dia SIGUE EN VERDE. El estado del dia mide lo que se observo en
//    la mascota; si una nota pudiera pintarlo de amarillo, ese color
//    dejaria de significar "vi algo raro" y arrastraria el porcentaje
//    de normalidad de Analisis y el conteo de signos de alerta. La
//    marca del seguimiento vive aparte.
//
// COMO SE INSERTA
// El bloque va justo despues del textarea. Se ubica por POSICION —desde
// el placeholder hasta el cierre de la etiqueta— porque no tengo el
// cierre exacto del textarea. Antes de escribir se comprueba que el
// tramo cortado sea corto y no contenga otro elemento: si el cierre
// estuviera mas lejos de lo esperado, aborta.
//
// REQUISITO: el .sql notas_seguimiento.sql ya corrido.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const MARCA = 'placeholder="¿Algo que quieras recordar de hoy?"';

const BLOQUE = [
  "",
  "        {/* Seguimiento de la nota. Solo aparece si hay algo escrito:",
  "            pedir seguimiento de una nota vacía no significa nada.",
  "            NO cambia el estado del día — sigue verde. El color mide lo",
  "            que se observó en la mascota, no lo que se anotó. */}",
  "        {nota.trim().length > 0 && (",
  "          <button",
  '            type="button"',
  "            onClick={() => setNotaSeguimiento(v => !v)}",
  '            className="w-full mt-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-left"',
  "            style={notaSeguimiento",
  "              ? { background: '#F07A3018', border: '1.5px solid #F07A30' }",
  "              : { background: '#FBEAD9', border: '1.5px solid #EEE2D4' }}",
  "          >",
  "            <span",
  '              className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"',
  "              style={notaSeguimiento",
  "                ? { background: '#F07A30', color: '#FFFCF8' }",
  "                : { background: '#FFFCF8', border: '1.5px solid #EEE2D4', color: 'transparent' }}",
  "            >",
  "              ✓",
  "            </span>",
  '            <span className="flex-1 min-w-0">',
  '              <span className="block text-xs font-semibold text-[#3D2B1F]">Esto me preocupa — pregúntame mañana</span>',
  '              <span className="block text-[10px] text-[#8A7560] leading-snug mt-0.5">',
  "                Te lo recordamos los próximos días y queda destacado para tu veterinario.",
  "              </span>",
  "            </span>",
  "          </button>",
  "        )}",
].join('\n');

const PARES = [
  {
    nombre: 'estado del seguimiento',
    viejo: "  const [nota, setNota] = useState('')",
    nuevo: [
      "  const [nota, setNota] = useState('')",
      "  // Check de la nota del día: \"esto me preocupa, pregúntame mañana\".",
      "  const [notaSeguimiento, setNotaSeguimiento] = useState(false)",
    ].join('\n'),
  },
];

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

if (contenido.includes('notaSeguimiento')) {
  abortar('el archivo ya tiene el seguimiento. Parece que este script ya se corrio.');
}

// --- Estado
for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

// --- El bloque, ubicado por posicion tras el textarea
const nMarca = contar(contenido, MARCA);
console.log('  ' + (nMarca === 1 ? 'OK ' : 'X  ') + 'campo de nota del dia -> ' + nMarca + ' coincidencia(s)');
if (nMarca !== 1) {
  abortar('esperaba 1 campo de nota y encontre ' + nMarca + '.');
}

const posMarca = contenido.indexOf(MARCA);
const posCierre = contenido.indexOf('/>', posMarca);
if (posCierre === -1) {
  abortar('no encontre el cierre del textarea de la nota.');
}

// Guardas: el tramo entre el placeholder y el cierre tiene que ser
// corto y no contener otro elemento. Si el cierre estuviera mas lejos,
// estariamos insertando en un lugar equivocado.
const tramo = contenido.slice(posMarca, posCierre);
if (tramo.length > 500) {
  abortar('el cierre del textarea quedo demasiado lejos (' + tramo.length + ' caracteres). No se escribio nada.');
}
if (tramo.includes('<div') || tramo.includes('<button')) {
  abortar('entre el campo y su cierre hay otro elemento. El corte seria erroneo.');
}
console.log('  OK el cierre del campo esta a ' + tramo.length + ' caracteres');

const corte = posCierre + 2;
contenido = contenido.slice(0, corte) + BLOQUE + contenido.slice(corte);

// --- Verificaciones finales
const ESPERADOS = [
  'const [notaSeguimiento, setNotaSeguimiento]',
  'Esto me preocupa — pregúntame mañana',
  'setNotaSeguimiento(v => !v)',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya se puede marcar una nota para seguimiento.');
