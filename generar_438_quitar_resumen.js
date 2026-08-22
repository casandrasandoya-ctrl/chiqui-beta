const fs = require('fs');
const path = require('path');

// ============================================================
// generar_438_quitar_resumen.js
// ============================================================
// Quita la seccion "Lo que Chiqui aprendio este mes" de Analisis.
//
// POR QUE
// Su contenido ahora vive en el chat, que lo cuenta al abrirse y ademas
// permite seguir preguntando. Tenerlo en los dos lugares alarga una
// pantalla que ya era larga y repite lo mismo.
//
// COMO SE DELIMITA
// Desde `{resumenInteligente && vozChiqui && (` hasta su cierre,
// CONTANDO PARENTESIS. Buscar un texto de cierre seria fragil: el
// bloque tiene parentesis anidados y comentarios adentro, y ya nos
// paso antes que un corte por texto rompiera el JSX.
//
// Las variables resumenInteligente y vozChiqui NO se borran: se siguen
// calculando y puede que otras partes las usen. Solo desaparece su
// tarjeta.
//
// Hace un corte verificado. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';
const MARCA = '{resumenInteligente && vozChiqui && (';

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

if (!c.includes('ChiquiChat')) {
  abortar('el chat no esta en Analisis. Corre primero el script 437: quitar el resumen antes dejaria la pantalla sin nada.');
}
console.log('  OK  el chat ya esta en Analisis');

const n = contar(c, MARCA);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'seccion del resumen -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

// --- Delimitar contando parentesis desde la marca
const ini = c.indexOf(MARCA);
// La llave de apertura del bloque JSX esta justo antes de la marca.
const iniLlave = c.lastIndexOf('{', ini);
let nivel = 0;
let fin = -1;
for (let i = iniLlave; i < c.length; i++) {
  if (c[i] === '{') nivel++;
  else if (c[i] === '}') {
    nivel--;
    if (nivel === 0) { fin = i + 1; break; }
  }
}
if (fin === -1) {
  abortar('no pude encontrar el cierre del bloque.');
}

const bloque = c.slice(iniLlave, fin);

// --- Guardas: lo que se quita TIENE que ser esa tarjeta
for (const s of ['vozChiqui.apertura', 'resumenInteligente.sintesis', 'chiqui_ia.png']) {
  if (!bloque.includes(s)) {
    abortar('el bloque a quitar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloque.length > 6000) {
  abortar('el bloque a quitar es demasiado largo (' + bloque.length + '). No se escribio nada.');
}
// No puede alcanzar a otras secciones.
for (const s of ['ChiquiChat', 'SelectorMascota', 'BottomNav', 'Lo observado este mes']) {
  if (bloque.includes(s)) {
    abortar('el corte alcanzaria a [' + s + ']. No se escribio nada.');
  }
}
console.log('  OK  bloque delimitado (' + bloque.split('\n').length + ' lineas, ' + bloque.length + ' caracteres)');

c = c.slice(0, iniLlave)
  + '{/* "Lo que Chiqui aprendió este mes" se movió al chat, que lo\n          cuenta al abrirse y además deja seguir preguntando. */}'
  + c.slice(fin);

// --- Verificaciones
if (c.includes('vozChiqui.apertura')) {
  abortar('quedo parte de la tarjeta.');
}
for (const s of ['<ChiquiChat datos=', 'SelectorMascota mascotas={mascotas}', 'BottomNav']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al cortar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: resumenInteligente y vozChiqui se siguen calculando pero');
console.log('puede que ya no se usen. No rompen el build. Si Vercel los marca,');
console.log('avisale a Claude.');
console.log('');
console.log('Listo. Analisis quedo mas corto.');
