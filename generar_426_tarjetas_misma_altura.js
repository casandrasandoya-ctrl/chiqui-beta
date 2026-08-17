const fs = require('fs');
const path = require('path');

// ============================================================
// generar_426_tarjetas_misma_altura.js
// ============================================================
// Las tarjetas del veterinario y del co-tutor seguian de distinto
// tamaño, y acortar textos no lo resuelve: EL CONTENIDO CAMBIA SEGUN
// EL ESTADO. Sin codigo generado son cuatro lineas; con codigo son
// ocho. Siempre va a haber una mas larga.
//
// LA SOLUCION son las dos cosas juntas:
//
//   1. items-stretch en la grilla (en vez de items-start): la fila mide
//      lo del contenido mas largo y las dos columnas ocupan eso.
//   2. [&>div]:h-full para que cada tarjeta llene su columna.
//
// Asi el espacio sobrante queda ABAJO en la mas corta, en vez de que
// una crezca y la otra no.
//
// TAMBIEN achica el codigo de invitacion, que seguia grande — el script
// 422 pudo no haberse aplicado. Se busca por patron para que funcione
// en cualquiera de sus formas.
//
// REQUISITO: script 415 desplegado.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_PF = 'app/perfil/page.tsx';
const RUTA_GC = 'components/GestionCotutor.tsx';

const PATRON_CODIGO = /className="copiable text-\S+ font-black [^"]*"/;
const CLASE_CODIGO = 'className="copiable text-[15px] font-black tracking-normal text-[#8C572F] whitespace-nowrap"';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoPF = path.join(process.cwd(), RUTA_PF);
const destinoGC = path.join(process.cwd(), RUTA_GC);

for (const [ruta, destino] of [[RUTA_PF, destinoPF], [RUTA_GC, destinoGC]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let pf = fs.readFileSync(destinoPF, 'utf8');
let gc = fs.readFileSync(destinoGC, 'utf8');

if (pf.includes('[&>div]:h-full')) {
  abortar('las tarjetas ya tienen la misma altura. Parece que este script ya se corrio.');
}

// --- 1. Altura pareja
const nCont = contar(pf, "        <div className=\"mx-4 mb-4 grid grid-cols-2 gap-2 items-start [&>div]:mx-0 [&>div]:mb-0\">");
console.log('  ' + (nCont === 1 ? 'OK ' : 'X  ') + 'contenedor de las dos tarjetas -> ' + nCont + ' coincidencia(s)');
if (nCont !== 1) {
  abortar('esperaba 1 coincidencia del contenedor y encontre ' + nCont + '.');
}
pf = pf.split("        <div className=\"mx-4 mb-4 grid grid-cols-2 gap-2 items-start [&>div]:mx-0 [&>div]:mb-0\">").join("        <div className=\"mx-4 mb-4 grid grid-cols-2 gap-2 items-stretch [&>div]:mx-0 [&>div]:mb-0 [&>div]:h-full\">");

// --- 2. El codigo, si sigue grande
const coincidencias = gc.match(new RegExp(PATRON_CODIGO.source, 'g')) || [];
if (coincidencias.length === 0) {
  abortar('no encontre la clase del codigo en GestionCotutor.');
}
if (coincidencias.length > 1) {
  abortar('encontre ' + coincidencias.length + ' clases iguales. Esperaba 1.');
}
if (coincidencias[0] === CLASE_CODIGO) {
  console.log('  --  el codigo ya estaba chico');
} else {
  console.log('  OK  codigo achicado');
  console.log('  --  antes: ' + coincidencias[0]);
  gc = gc.replace(PATRON_CODIGO, CLASE_CODIGO);
}

// --- Verificaciones
if (!pf.includes('items-stretch')) {
  abortar('la grilla no quedo con items-stretch.');
}
if (!pf.includes('[&>div]:h-full')) {
  abortar('las tarjetas no quedaron a la misma altura.');
}
if (!gc.includes('copiable')) {
  abortar('se perdio la clase copiable.');
}
if (contar(pf, '<LinkVet') !== 1 || contar(pf, '<GestionCotutor') !== 1) {
  abortar('alguno de los dos componentes se perdio.');
}

fs.writeFileSync(destinoPF, pf, 'utf8');
console.log('');
console.log('OK: ' + RUTA_PF);
fs.writeFileSync(destinoGC, gc, 'utf8');
console.log('OK: ' + RUTA_GC);
console.log('');
console.log('Listo. Las dos tarjetas miden lo mismo.');
