const fs = require('fs');
const path = require('path');

// ============================================================
// generar_444_mover_datoschat.js
// ============================================================
// EL ERROR, POR TERCERA VEZ
//
//   Type error: Variable 'insights' implicitly has an 'any[]' type.
//
// El script 443 intento arreglarlo con un "as", y no basta: TypeScript
// no se queja del TIPO, se queja de que la variable se USA ANTES DE
// DECLARARSE. Un cast no cambia el orden.
//
// LA CAUSA REAL
// El bloque de datosChat quedo insertado justo antes del return, y ahi
// todavia no existe insights — que se declara mas arriba en el flujo
// pero mas abajo en el archivo.
//
// EL ARREGLO CORRECTO
// Mover el bloque para DESPUES de que insights este armado. No forzar
// tipos: reordenar.
//
// Se busca el final del bloque de insights y se inserta ahi. Antes de
// mover, se comprueba que el destino sea posterior a la declaracion.
//
// REQUISITOS: scripts 442 y 443 desplegados.
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

// --- Delimitar el bloque a mover
const INI = '  // --- Datos para el chat ---';
if (contar(c, INI) !== 1) {
  abortar('no encontre el bloque de datos del chat. Corre primero el script 442.');
}
const posIni = c.indexOf(INI);

// El bloque termina donde cierra el objeto datosChat.
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

// --- Guardas
for (const s of ['const datosChat = {', 'const cuidadosChat', 'const paseosDelMes']) {
  if (!bloque.includes(s)) {
    abortar('el bloque a mover no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloque.length > 9000) {
  abortar('el bloque a mover es demasiado largo (' + bloque.length + '). No se escribio nada.');
}
console.log('  OK  bloque delimitado (' + bloque.split('\n').length + ' lineas)');

// --- Donde va: despues de que insights este completo.
// El bloque de insights termina con el cierre del else que los arma.
const MARCA_FIN = "  // ---------- Actividad de Chiqui ----------";
let destinoPos = c.indexOf(MARCA_FIN);
if (destinoPos === -1) {
  // Alternativa: justo antes del return, PERO despues de quitar el
  // bloque de su lugar actual (que esta antes de insights).
  destinoPos = -1;
}

// Se quita de su lugar actual primero.
const sinBloque = c.slice(0, posIni) + c.slice(posFin);

// Y se inserta justo antes del return, que ahora SI es posterior a
// insights (el bloque ya no esta estorbando en medio).
const posReturn = sinBloque.lastIndexOf('  return (');
if (posReturn === -1) {
  abortar('no encontre el return del componente.');
}
const posInsights = sinBloque.indexOf('const insights');
if (posInsights === -1) {
  abortar('no encontre donde se declara insights.');
}
if (posReturn < posInsights) {
  abortar('el return quedaria antes de insights. El archivo no es el esperado.');
}
console.log('  OK  el destino es posterior a insights');

// El cast del 443 ya no hace falta, pero no molesta: se deja para no
// depender de que ese script se haya corrido.
c = sinBloque.slice(0, posReturn) + bloque + '\n\n' + sinBloque.slice(posReturn);

// --- Verificaciones
if (contar(c, 'const datosChat = {') !== 1) {
  abortar('el bloque quedo duplicado o desaparecio.');
}
if (c.indexOf('const insights') > c.indexOf('const datosChat = {')) {
  abortar('datosChat sigue quedando antes de insights.');
}
if (c.indexOf('const datosChat = {') > c.lastIndexOf('  return (')) {
  abortar('datosChat quedo despues del return.');
}
if (contar(c, '<ChiquiChat datos={datosChat} />') !== 1) {
  abortar('se perdio el uso del chat.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. datosChat ya se calcula despues de insights.');
