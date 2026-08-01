const fs = require('fs');
const path = require('path');

// ============================================================
// generar_330_ajustes_juego_gatos.js
// ============================================================
// Dos ajustes a la seccion "Juego y vinculo" de Analisis:
//
//  1. ICONO: chiqui_juguetes.png se ve con fondo blanco detras dentro
//     del contenedor de color. Se cambia por chiqui_paseo.png, que es
//     el que usa la seccion equivalente de perros y calza con el fondo.
//     Solo se toca el encabezado de la seccion felina (w-7 h-7); el
//     chiqui_juguetes.png del bloque de perros (w-6 h-6) queda igual.
//
//  2. SEGUNDA TARJETA: "Dias con juego" medía casi lo mismo que la
//     racha (constancia), asi que era redundante. Se reemplaza por
//     VARIEDAD DE JUEGO — cuantos tipos distintos de los 6 se han
//     usado. Mide otra dimension: no cuan seguido, sino cuan rico.
//     Un gato que solo persigue la misma caña recibe menos
//     estimulacion que uno que alterna caza, olfato y puzzle.
//     Los dias y los minutos no se pierden: quedan en una linea
//     secundaria debajo del numero.
//
// ANTES verifica que exista chiqui_paseo.png en public/chiqui/.
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';
const RUTA_ICONO = 'public/chiqui/chiqui_paseo.png';

const PARES = [
  // ---------------------------------------------------------
  // 1. Total de minutos, para la linea secundaria
  // ---------------------------------------------------------
  {
    nombre: 'total de minutos de juego',
    viejo: "        const ordenadas = Object.entries(porAct).sort((x, y) => y[1].sesiones - x[1].sesiones)",
    nuevo: [
      "        const ordenadas = Object.entries(porAct).sort((x, y) => y[1].sesiones - x[1].sesiones)",
      "        // La duracion es opcional al registrar, asi que este total",
      "        // puede quedar en 0 aunque si haya habido juego. Por eso va",
      "        // como dato secundario y solo se muestra si hay minutos.",
      "        const minutosTotales = Object.values(porAct).reduce((a, v) => a + v.minutos, 0)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Icono del encabezado
  // ---------------------------------------------------------
  {
    nombre: 'icono de la seccion felina',
    viejo: '                <img src="/chiqui/chiqui_juguetes.png" alt="" className="w-7 h-7 object-contain" />',
    nuevo: '                <img src="/chiqui/chiqui_paseo.png" alt="" className="w-7 h-7 object-contain" />',
  },

  // ---------------------------------------------------------
  // 3. Segunda tarjeta: variedad en vez de dias
  // ---------------------------------------------------------
  {
    nombre: 'tarjeta de variedad de juego',
    viejo: [
      '                <div className="flex items-center gap-1.5 mb-1">',
      '                  <span className="text-sm">📅</span>',
      '                  <span className="text-[10px] text-[#8A7560]">Días con juego</span>',
      '                </div>',
      '                <div className="font-bold text-lg text-[#3D2B1F]">{diasConJuego} <span className="text-xs font-normal text-[#8A7560]">de 30</span></div>',
    ].join('\n'),
    nuevo: [
      '                <div className="flex items-center gap-1.5 mb-1">',
      '                  <span className="text-sm">🎲</span>',
      '                  <span className="text-[10px] text-[#8A7560]">Variedad de juego</span>',
      '                </div>',
      '                <div className="font-bold text-lg text-[#3D2B1F]">{ordenadas.length} <span className="text-xs font-normal text-[#8A7560]">de 6 tipos</span></div>',
      '                <p className="text-[10px] text-[#8A7560] mt-0.5">',
      '                  {diasConJuego} {diasConJuego === 1 ? \'día\' : \'días\'}{minutosTotales > 0 ? ` · ${fmtMinG(minutosTotales)}` : \'\'}',
      '                </p>',
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

// --- El icono nuevo tiene que existir
const destinoIcono = path.join(process.cwd(), RUTA_ICONO);
if (!fs.existsSync(destinoIcono)) {
  abortar('no existe ' + RUTA_ICONO + '. Confirma el nombre exacto del archivo en public/chiqui/.');
}
console.log('  OK existe ' + RUTA_ICONO);

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (!contenido.includes('Juego y vínculo')) {
  abortar('no encontre la seccion "Juego y vinculo". Corre primero el script 329.');
}
if (contenido.includes('Variedad de juego')) {
  abortar('el archivo ya tiene la tarjeta de variedad. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

// Verificaciones finales
const ESPERADOS = [
  'Variedad de juego',
  'const minutosTotales',
  '/chiqui/chiqui_juguetes.png" alt="" className="w-6 h-6 object-contain"',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('Días con juego')) {
  abortar('la tarjeta vieja sigue presente.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Icono corregido y variedad de juego en vez de dias.');
