const fs = require('fs');
const path = require('path');

// ============================================================
// generar_382_grilla_por_anchos.js
// ============================================================
// QUE PASABA
// Los chips saltaban DOS celdas en vez de una: columna 1, columna 3,
// columna 2, columna 1... La grilla estaba contando algo invisible
// entre cada chip.
//
// EL CULPABLE es el display:contents que use en el 380 para no tener
// que eliminar el contenedor de cada categoria. Hace que sus hijos se
// vuelvan elementos de la grilla, pero en la practica genero elementos
// fantasma que ocupaban celda.
//
// LA SOLUCION: NADA DE GRILLA
// Se reemplaza por la tecnica mas simple que existe: anchos.
//   - El contenedor es flex con wrap.
//   - Cada categoria cerrada ocupa un tercio del ancho.
//   - La categoria ABIERTA ocupa el ancho completo, asi que toma su
//     propia linea y empuja a las demas hacia abajo.
//
// No depende de ningun algoritmo de colocacion automatica: los
// elementos se ponen uno tras otro y bajan cuando no caben. Es
// aburrido, y por eso funciona.
//
// De paso desaparece el display:contents, asi que el contenedor de cada
// categoria vuelve a ser un elemento normal — y el panel puede quedarse
// adentro sin necesidad de abarcar columnas.
//
// EFECTO SECUNDARIO, y creo que a favor: al abrir una categoria, su
// chip tambien pasa a ancho completo. Queda claro cual esta abierta.
//
// REQUISITO: scripts 380 y 381 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  {
    nombre: 'contenedor por anchos',
    viejo: [
      "      {/* Grilla de tres columnas. El panel de opciones se abre a lo",
      "          ancho justo después de su chip. */}",
      '      <div className="mx-4 mt-2 grid grid-cols-3 gap-x-1.5 gap-y-1">',
    ].join('\n'),
    nuevo: [
      "      {/* Tres por línea usando ANCHOS, no grilla. La categoría",
      "          abierta pasa a ancho completo y empuja las demás hacia",
      "          abajo. Sin colocación automática de por medio: los",
      "          elementos se ponen uno tras otro y bajan cuando no caben. */}",
      '      <div className="mx-4 mt-2 flex flex-wrap gap-1.5">',
    ].join('\n'),
  },
  {
    nombre: 'ancho de cada categoria',
    viejo: [
      "            /* display:contents hace que el chip y el panel sean hijos",
      "               directos de la grilla, sin tener que eliminar este div. */",
      "            <div key={cat.id} style={{ display: 'contents' }}>",
    ].join('\n'),
    nuevo: [
      "            /* Un tercio del ancho cerrada; completo al abrirse. El",
      "               display:contents anterior creaba elementos fantasma que",
      "               ocupaban celda y descuadraban todo. */",
      "            <div key={cat.id} className={open ? 'w-full' : 'w-[calc(33.333%-0.25rem)]'}>",
    ].join('\n'),
  },
  {
    nombre: 'chip a lo ancho de su contenedor',
    viejo: '                className="flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
    nuevo: '                className="w-full flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
  },
  {
    nombre: 'panel sin abarcar columnas',
    viejo: [
      "                /* A lo ancho de la grilla. Sin `order`: los chips que",
      "                   siguen bajan debajo del panel y la fila se parte,",
      "                   pero la colocación es predecible. El intento de",
      "                   ordenarlo con CSS dejó los chips dispersos. */",
      '                <div className="pb-3" style={{ gridColumn: \'1 / -1\' }}>',
    ].join('\n'),
    nuevo: [
      "                /* Ya no necesita abarcar columnas: su contenedor pasa",
      "                   a ancho completo cuando la categoría está abierta. */",
      '                <div className="pb-3">',
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

if (!contenido.includes("display: 'contents'")) {
  abortar('el archivo no tiene display:contents. Revisa que el 380 y el 381 esten corridos.');
}
if (contenido.includes('flex flex-wrap gap-1.5')) {
  abortar('el registro ya usa anchos. Parece que este script ya se corrio.');
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

// --- Verificaciones finales
if (contenido.includes("display: 'contents'")) {
  abortar('quedo el display:contents que causaba los elementos fantasma.');
}
if (contenido.includes("gridColumn: '1 / -1'")) {
  abortar('quedo una referencia a columnas de grilla.');
}
if (contenido.includes('grid grid-cols-3 gap-x-1.5')) {
  abortar('quedo el contenedor de grilla.');
}
const ESPERADOS = [
  'flex flex-wrap gap-1.5',
  "className={open ? 'w-full' : 'w-[calc(33.333%-0.25rem)]'}",
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
console.log('Listo. Tres por linea, sin grilla de por medio.');
