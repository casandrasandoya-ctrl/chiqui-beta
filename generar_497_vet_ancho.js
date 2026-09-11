const fs = require('fs');
const path = require('path');

// ============================================================
// generar_497_vet_ancho.js
// ============================================================
// La vista quedo en dos columnas, pero DEMASIADO ANGOSTA: el contenido
// se apreto contra el centro y quedo media pantalla en blanco a la
// izquierda.
//
// LA CAUSA: max-w-6xl son 1152px, pero el header seguia limitado y las
// columnas quedaron mas estrechas que la columna unica original.
//
// EL ARREGLO
//   - El contenedor sube a 1280px, que es el ancho comodo de una
//     pantalla de portatil sin llegar a bordes.
//   - Y se agrega separacion entre columnas para que se lean como dos
//     bloques y no como texto partido.
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

if (c.includes('lg:max-w-[1280px]')) {
  abortar('el ancho ya esta corregido. Parece que este script ya se corrio.');
}
if (!c.includes('lg:columns-2')) {
  abortar('falta el script 495. Correlo primero.');
}

// --- 1. Mas ancho
const VIEJO_ANCHO = 'max-w-lg lg:max-w-6xl mx-auto';
const n1 = contar(c, VIEJO_ANCHO);
console.log('  ' + (n1 >= 1 ? 'OK ' : 'X  ') + 'contenedor -> ' + n1 + ' vez/veces');
if (n1 < 1) abortar('no encontre el contenedor.');
c = c.split(VIEJO_ANCHO).join('max-w-lg lg:max-w-[1280px] mx-auto');

// --- 2. Mas separacion entre columnas
const VIEJO_COLS = 'lg:columns-2 lg:gap-4 lg:space-y-0';
const n2 = contar(c, VIEJO_COLS);
console.log('  ' + (n2 === 1 ? 'OK ' : 'X  ') + 'columnas -> ' + n2 + ' coincidencia(s)');
if (n2 !== 1) abortar('no encontre las columnas.');
// gap-8 son 32px: suficiente para que se lean como dos bloques.
c = c.split(VIEJO_COLS).join('lg:columns-2 lg:gap-8 lg:space-y-0 lg:px-8');

// --- Verificaciones
if (!c.includes('lg:max-w-[1280px]')) abortar('el ancho no quedo aplicado.');
if (!c.includes('lg:gap-8')) abortar('la separacion no quedo aplicada.');
for (const s of ['SeccionVet', 'Vista veterinaria']) {
  if (!c.includes(s)) abortar('se perdio [' + s + '] al reemplazar.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Recarga con Ctrl+Shift+R. Deberia ocupar bien el ancho de la');
console.log('pantalla, con las dos columnas separadas.');
