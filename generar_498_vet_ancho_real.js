const fs = require('fs');
const path = require('path');

// ============================================================
// generar_498_vet_ancho_real.js
// ============================================================
// Las dos columnas funcionan, pero el contenido sigue apretado en el
// centro: el ancho no crece.
//
// LA CAUSA PROBABLE: lg:max-w-[1280px] es una clase ARBITRARIA. Si
// Tailwind no la genero en el build, simplemente no existe y el
// contenedor se queda en max-w-lg (512px).
//
// EL ARREGLO: usar clases estandar, que Tailwind siempre incluye.
//   lg:max-w-5xl  = 1024px
//   xl:max-w-7xl  = 1280px
//
// Y se agrega un ancho minimo a cada columna para que el contenido no
// quede en tiras estrechas.
//
// En el telefono NO cambia nada.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/vet/page.tsx';

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
if (!fs.existsSync(destino)) abortar('no se encontro ' + RUTA + '.');

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('xl:max-w-7xl')) {
  abortar('el ancho ya usa clases estandar. Parece que este script ya se corrio.');
}

// --- 1. Ancho con clases ESTANDAR, no arbitrarias
const ANCHOS = [
  'max-w-lg lg:max-w-[1280px] mx-auto',
  'max-w-lg lg:max-w-6xl mx-auto',
];
const ancho = ANCHOS.find(a => contar(c, a) >= 1);
if (!ancho) abortar('no encontre el contenedor con el ancho.');
console.log('  OK  contenedor encontrado');
// 5xl desde 1024px, 7xl desde 1280px: crece con la pantalla.
c = c.split(ancho).join('max-w-lg lg:max-w-5xl xl:max-w-7xl mx-auto');

// --- 2. Columnas con ancho minimo
const COLS = [
  'lg:columns-2 lg:gap-8 lg:space-y-0 lg:px-8',
  'lg:columns-2 lg:gap-4 lg:space-y-0',
];
const col = COLS.find(x => contar(c, x) === 1);
if (!col) abortar('no encontre las columnas.');
// columns-2 con gap generoso; cada columna queda sobre 400px en 1024
// y sobre 580px en 1280.
c = c.split(col).join('lg:columns-2 lg:gap-6 lg:space-y-0 lg:px-6');
console.log('  OK  columnas ajustadas');

// --- 3. Que ninguna tarjeta se parta entre columnas
// El estilo real de las tarjetas de esta pagina.
const TARJETA = 'className="bg-[#FFFCF8] rounded-2xl p-4 border border-[#EEE2D4]"';
const nT = contar(c, TARJETA);
if (nT >= 1) {
  c = c.split(TARJETA).join('className="bg-[#FFFCF8] rounded-2xl p-4 border border-[#EEE2D4] break-inside-avoid lg:mb-4"');
  console.log('  OK  ' + nT + ' tarjeta(s) protegida(s) de partirse');
} else {
  console.log('  --  no encontre ese estilo de tarjeta');
}

// --- Verificaciones
if (!c.includes('lg:max-w-5xl xl:max-w-7xl')) abortar('el ancho no quedo aplicado.');
if (!c.includes('lg:columns-2')) abortar('se perdieron las columnas.');
for (const s of ['Vista veterinaria', 'Ficha del paciente']) {
  if (!c.includes(s)) abortar('se perdio [' + s + '] al reemplazar.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Si SIGUE angosto despues de esto, el problema esta en otro');
console.log('contenedor padre: avisale a Claude para revisar el layout.');
