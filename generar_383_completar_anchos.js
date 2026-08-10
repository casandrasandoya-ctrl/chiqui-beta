const fs = require('fs');
const path = require('path');

// ============================================================
// generar_383_completar_anchos.js
// ============================================================
// QUE PASO CON EL 382
// El script 382 se aplico A MEDIAS. Cambio el contenedor a flex, pero
// NO alcanzo a cambiar el ancho de cada categoria ni el chip: esas dos
// piezas siguen con display:contents.
//
// Y la culpa es de como escribi sus verificaciones: la primera
// comprobacion buscaba 'flex flex-wrap gap-1.5' y, al encontrarlo,
// abortaba con "ya se corrio". Asi que al reintentar nunca completo lo
// que faltaba, y encima informaba que estaba todo hecho.
//
// La mezcla resultante —contenedor flex con hijos en display:contents—
// es exactamente lo que produce el zigzag: cada categoria se convierte
// en dos elementos y ocupa dos lugares.
//
// ESTE SCRIPT COMPLETA LO QUE FALTO
//  - El contenedor de cada categoria pasa a tener ancho: un tercio
//    cerrada, completo al abrirse.
//  - El chip ocupa el ancho de su contenedor.
//  - El panel deja de necesitar abarcar columnas.
//
// Y sus comprobaciones ahora miran CADA pieza por separado, no una sola
// que pueda dar por hecho el resto.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

// Cada pieza se busca y se corrige por separado, y ninguna es
// obligatoria: si el 382 alcanzo a aplicar alguna, se salta sin
// abortar. Lo unico que se exige es que al final NO quede nada del
// display:contents.
const PIEZAS = [
  {
    nombre: 'ancho de cada categoria',
    viejo: "            <div key={cat.id} style={{ display: 'contents' }}>",
    nuevo: "            <div key={cat.id} className={open ? 'w-full' : 'w-[calc(33.333%-0.25rem)]'}>",
  },
  {
    nombre: 'comentario del contenedor',
    viejo: [
      "            /* display:contents hace que el chip y el panel sean hijos",
      "               directos de la grilla, sin tener que eliminar este div. */",
    ].join('\n'),
    nuevo: [
      "            /* Un tercio del ancho cerrada; completo al abrirse. El",
      "               display:contents anterior convertia cada categoria en",
      "               dos elementos, y por eso los chips saltaban celdas. */",
    ].join('\n'),
  },
  {
    nombre: 'chip a lo ancho de su contenedor',
    viejo: '                className="flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
    nuevo: '                className="w-full flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
  },
  {
    nombre: 'panel sin abarcar columnas',
    viejo: '                <div className="pb-3" style={{ gridColumn: \'1 / -1\' }}>',
    nuevo: '                <div className="pb-3">',
  },
  {
    nombre: 'contenedor por anchos',
    viejo: '      <div className="mx-4 mt-2 grid grid-cols-3 gap-x-1.5 gap-y-1">',
    nuevo: '      <div className="mx-4 mt-2 flex flex-wrap gap-1.5">',
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

if (!contenido.includes("display: 'contents'") && contenido.includes("w-[calc(33.333%-0.25rem)]")) {
  abortar('el archivo ya esta completo. Parece que este script ya se corrio.');
}

let aplicadas = 0;
for (const p of PIEZAS) {
  const n = contar(contenido, p.viejo);
  if (n === 0) {
    console.log('  --  ' + p.nombre + ' -> ya estaba aplicada');
    continue;
  }
  if (n !== 1) {
    abortar('esperaba 0 o 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  contenido = contenido.split(p.viejo).join(p.nuevo);
  aplicadas++;
  console.log('  OK  ' + p.nombre + ' -> corregida');
}

if (aplicadas === 0) {
  abortar('no habia nada que corregir. Avisale a Claude.');
}

// --- Verificaciones finales, una por pieza
const PROHIBIDOS = [
  ["display: 'contents'", 'quedo el display:contents que causa el zigzag'],
  ["gridColumn: '1 / -1'", 'quedo una referencia a columnas de grilla'],
  ['grid grid-cols-3 gap-x-1.5', 'quedo el contenedor de grilla'],
  ['order: Math.floor', 'quedo un order de la version anterior'],
];
for (const [texto, motivo] of PROHIBIDOS) {
  if (contenido.includes(texto)) abortar(motivo);
}

const REQUERIDOS = [
  'flex flex-wrap gap-1.5',
  "className={open ? 'w-full' : 'w-[calc(33.333%-0.25rem)]'}",
  'w-full flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left',
];
for (const r of REQUERIDOS) {
  if (contar(contenido, r) !== 1) {
    abortar('falta la pieza [' + r + '] despues de corregir.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Las ' + aplicadas + ' piezas que faltaban quedaron aplicadas.');
