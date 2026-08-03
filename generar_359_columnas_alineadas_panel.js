const fs = require('fs');
const path = require('path');

// ============================================================
// generar_359_columnas_alineadas_panel.js
// ============================================================
// Las listas del panel pasan a comportarse como una TABLA de verdad:
// la linea divisoria queda siempre a la misma distancia, en vez de
// moverse segun el largo de cada nombre.
//
// COMO
//  - Se reemplaza el flex por una grilla de dos columnas con la primera
//    de ancho FIJO. Con flex, cada fila se acomodaba sola y por eso la
//    linea bailaba de una fila a otra.
//  - El separador deja de ser el caracter "|" y pasa a ser un BORDE
//    izquierdo de la segunda columna. Un caracter siempre queda sujeto
//    a la linea base del texto; un borde recorre la fila completa y se
//    ve recto.
//  - Los nombres muy largos se recortan con puntos suspensivos en vez
//    de empujar la columna.
//
// El ancho elegido es 7rem (112px) para los nombres: alcanza para
// "Eduardo Mendoza" a 12px, que es de los mas largos de la lista.
//
// En la lista de otra actividad la columna fija va a la DERECHA (quien
// lo hizo), porque ahi lo que varia mas de largo es la descripcion.
//
// REQUISITO: script 356 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/PanelDia.tsx';

const PARES = [
  {
    nombre: 'columnas de quienes registraron',
    viejo: [
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 flex items-baseline gap-2"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      '                <p className="text-xs text-[#3D2B1F] flex-shrink-0">{u.nombre}</p>',
      '                <span className="text-[#D6C3AC] text-xs flex-shrink-0">|</span>',
      '                <p className="text-[11px] text-[#8A7560] truncate">',
      "                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}",
      "                </p>",
      "              </div>",
    ].join('\n'),
    nuevo: [
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 grid grid-cols-[7rem_1fr] items-baseline"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      '                <p className="text-xs text-[#3D2B1F] truncate pr-2">{u.nombre}</p>',
      "                {/* El separador es un BORDE, no un carácter: un \"|\"",
      "                    queda sujeto a la línea base del texto y se ve",
      "                    torcido entre filas; el borde recorre la fila",
      "                    completa y queda recto. */}",
      '                <p className="text-[11px] text-[#8A7560] truncate border-l border-[#E0CDB6] pl-2.5">',
      "                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}",
      "                </p>",
      "              </div>",
    ].join('\n'),
  },
  {
    nombre: 'columnas del detalle de actividad',
    viejo: [
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 flex items-baseline gap-2"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      '                <p className="text-xs text-[#3D2B1F] flex-shrink-0">{o.emoji} {o.detalle}</p>',
      '                <span className="text-[#D6C3AC] text-xs flex-shrink-0">|</span>',
      '                <p className="text-[11px] text-[#8A7560] truncate">{o.quien}</p>',
      "              </div>",
    ].join('\n'),
    nuevo: [
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 grid grid-cols-[1fr_8rem] items-baseline"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      "                {/* Aquí la columna fija va a la DERECHA: lo que más",
      "                    varía de largo es la descripción, no el nombre. */}",
      '                <p className="text-xs text-[#3D2B1F] truncate pr-2">{o.emoji} {o.detalle}</p>',
      '                <p className="text-[11px] text-[#8A7560] truncate border-l border-[#E0CDB6] pl-2.5">{o.quien}</p>',
      "              </div>",
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

if (contenido.includes('grid-cols-[7rem_1fr]')) {
  abortar('el panel ya tiene las columnas alineadas. Parece que este script ya se corrio.');
}
if (!contenido.includes("i % 2 === 0 ? '#FBEAD9'")) {
  abortar('faltan las filas alternadas. Corre primero el script 356.');
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

// Las dos listas deben quedar en grilla
if (contar(contenido, 'grid grid-cols-[7rem_1fr]') !== 1) {
  abortar('la lista de quienes registraron no quedo en grilla.');
}
if (contar(contenido, 'grid grid-cols-[1fr_8rem]') !== 1) {
  abortar('la lista de actividad no quedo en grilla.');
}
// El borde reemplaza al caracter en las dos
if (contar(contenido, 'border-l border-[#E0CDB6] pl-2.5') !== 2) {
  abortar('el separador de borde no quedo en las dos listas.');
}
// No puede quedar ningun separador de caracter
if (contenido.includes('text-[#D6C3AC] text-xs flex-shrink-0">|<')) {
  abortar('quedo un separador escrito como caracter.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. La linea divisoria ya queda siempre a la misma distancia.');
