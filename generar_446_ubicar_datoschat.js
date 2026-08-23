const fs = require('fs');
const path = require('path');

// ============================================================
// generar_446_ubicar_datoschat.js
// ============================================================
// EL ERROR
//
//   Type error: Cannot find name 'datosChat'.
//   <ChiquiChat datos={datosChat} />
//
// El script 444 movio el bloque de datosChat a un lugar equivocado: lo
// puso antes de UN return, pero no antes del return que contiene el
// JSX del chat. El archivo tiene varios.
//
// EL ARREGLO
// Se ubica el bloque justo antes del return QUE CONTIENE al chat, no
// antes de cualquiera. Se encuentra buscando hacia atras desde el
// <ChiquiChat> hasta el "return (" mas cercano.
//
// Y se comprueba que el destino sea posterior a donde se declaran
// insights y todas las variables que el bloque usa. Si no lo fuera,
// aborta en vez de mover a otro lugar equivocado.
//
// REQUISITOS: scripts 442 a 445 desplegados.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

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

let c = fs.readFileSync(destino, 'utf8');

// --- 1. Delimitar el bloque
const INI = '  // --- Datos para el chat ---';
if (contar(c, INI) !== 1) {
  abortar('no encontre el bloque de datos del chat.');
}
const posIni = c.indexOf(INI);

const posObj = c.indexOf('  const datosChat = {', posIni);
if (posObj === -1) {
  abortar('no encontre el objeto datosChat.');
}
let nivel = 0;
let posFin = -1;
for (let i = c.indexOf('{', posObj); i < c.length; i++) {
  if (c[i] === '{') nivel++;
  else if (c[i] === '}') {
    nivel--;
    if (nivel === 0) { posFin = i + 1; break; }
  }
}
if (posFin === -1) {
  abortar('no encontre el cierre del objeto datosChat.');
}
const bloque = c.slice(posIni, posFin);

for (const s of ['const datosChat = {', 'const cuidadosChat', 'const paseosDelMes']) {
  if (!bloque.includes(s)) {
    abortar('el bloque a mover no contiene [' + s + ']. No se escribio nada.');
  }
}
console.log('  OK  bloque delimitado (' + bloque.split('\n').length + ' lineas)');

// --- 2. Quitarlo de donde este
const sinBloque = c.slice(0, posIni) + c.slice(posFin);

// --- 3. Encontrar el return QUE CONTIENE al chat
const posChat = sinBloque.indexOf('<ChiquiChat datos={datosChat}');
if (posChat === -1) {
  abortar('no encontre el uso del chat en el JSX.');
}
const posReturn = sinBloque.lastIndexOf('  return (', posChat);
if (posReturn === -1) {
  abortar('no encontre el return que contiene al chat.');
}
console.log('  OK  encontrado el return que contiene al chat');

// --- 4. Comprobar que ahi ya existen las variables que el bloque usa
const antes = sinBloque.slice(0, posReturn);
const NECESITA = ['const insights', 'const total', 'paseoHistorial', 'medsVigentes', 'pesoChat', 'vacunasChat', 'antisChat', 'examenesChat', 'function fechaChile'];
const faltan = NECESITA.filter(v => !antes.includes(v));
if (faltan.length > 0) {
  abortar('en ese punto todavia no existen: ' + faltan.join(', ') + '. No se movio nada.');
}
console.log('  OK  todas las variables que usa ya existen ahi');

c = sinBloque.slice(0, posReturn) + bloque + '\n\n' + sinBloque.slice(posReturn);

// --- Verificaciones finales
if (contar(c, 'const datosChat = {') !== 1) {
  abortar('el bloque quedo duplicado o desaparecio.');
}
const nuevoPosDecl = c.indexOf('const datosChat = {');
const nuevoPosUso = c.indexOf('<ChiquiChat datos={datosChat}');
if (nuevoPosDecl > nuevoPosUso) {
  abortar('datosChat sigue quedando despues de su uso.');
}
if (c.indexOf('const insights') > nuevoPosDecl) {
  abortar('insights quedaria despues de datosChat.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. datosChat quedo antes del return que lo usa.');
