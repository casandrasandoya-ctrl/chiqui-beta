const fs = require('fs');
const path = require('path');

// ============================================================
// generar_381_grilla_sin_order.js
// ============================================================
// QUE PASO
// El script 380 uso la propiedad `order` de CSS para que el panel de
// opciones cayera debajo de la FILA completa en vez de debajo del chip.
// En la practica no funciono: los chips quedaron dispersos en diagonal
// con celdas vacias, y el panel no aparecio.
//
// No tengo una explicacion segura de por que, y prefiero decirlo en vez
// de inventar una: lo verifique en logica, no en un navegador real.
//
// LA CORRECCION
// Se quita el `order` de los chips y del panel. Queda una grilla simple:
// los elementos se colocan en el orden en que estan escritos, tres por
// fila, y el panel se abre a lo ancho justo despues de su chip.
//
// EL COSTO, dicho claro: al abrir una categoria del medio de una fila,
// los chips que le siguen bajan debajo del panel. La fila se "parte".
// Es menos elegante que el diseño original, pero es predecible y no
// deja huecos dispersos.
//
// Se conserva todo lo demas del 380: la grilla de tres columnas, el
// orden tematico de las categorias y el chip compacto. Y el contenido
// del panel sigue sin tocarse.
//
// REQUISITO: script 380 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  {
    nombre: 'quitar el order del chip',
    viejo: [
      "                style={{",
      "                  order: Math.floor(i / 3) * 2,",
      "                  border: open ? '2px solid #FFBD59' : '2px solid transparent',",
      "                  background: open ? '#FFFCF8' : 'transparent',",
      "                }}",
    ].join('\n'),
    nuevo: [
      "                style={{",
      "                  border: open ? '2px solid #FFBD59' : '2px solid transparent',",
      "                  background: open ? '#FFFCF8' : 'transparent',",
      "                }}",
    ].join('\n'),
  },
  {
    nombre: 'quitar el order del panel',
    viejo: '                <div className="pb-3" style={{ order: Math.floor(i / 3) * 2 + 1, gridColumn: \'1 / -1\' }}>',
    nuevo: [
      "                /* A lo ancho de la grilla. Sin `order`: los chips que",
      "                   siguen bajan debajo del panel y la fila se parte,",
      "                   pero la colocación es predecible. El intento de",
      "                   ordenarlo con CSS dejó los chips dispersos. */",
      '                <div className="pb-3" style={{ gridColumn: \'1 / -1\' }}>',
    ].join('\n'),
  },
  {
    nombre: 'el indice ya no se necesita',
    viejo: "        {CATS.map((cat, i) => {",
    nuevo: "        {CATS.map(cat => {",
  },
  {
    nombre: 'comentario del contenedor',
    viejo: [
      "      {/* Grilla de tres columnas. El panel de opciones se coloca",
      "          debajo de la FILA completa usando el orden del CSS: los",
      "          chips llevan fila*2 y el panel fila*2+1, así la grilla los",
      "          acomoda sola sin dejar huecos. */}",
    ].join('\n'),
    nuevo: [
      "      {/* Grilla de tres columnas. El panel de opciones se abre a lo",
      "          ancho justo después de su chip. */}",
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

if (!contenido.includes('order: Math.floor(i / 3)')) {
  abortar('el archivo no tiene el order del script 380. Nada que corregir.');
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
if (contenido.includes('order: Math.floor')) {
  abortar('quedo algun order sin quitar.');
}
if (contenido.includes('Math.floor(i / 3)')) {
  abortar('quedo una referencia al indice que ya no existe: el build fallaria.');
}
const ESPERADOS = [
  "gridColumn: '1 / -1'",
  'grid grid-cols-3 gap-x-1.5 gap-y-1',
  "display: 'contents'",
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
console.log('Listo. Grilla simple, sin chips dispersos.');
