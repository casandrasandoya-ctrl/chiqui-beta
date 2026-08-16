const fs = require('fs');
const path = require('path');

// ============================================================
// generar_422_codigo_mas_chico.js
// ============================================================
// El codigo de invitacion seguia demasiado grande al generarlo: la
// caja de co-tutor crecia al doble que la del veterinario y el
// "CHIQ-HXJ7" ocupaba media tarjeta.
//
// Pasa a text-[15px] con tracking normal y whitespace-nowrap, que
// garantiza que nunca se parta en dos lineas.
//
// SIGUE SIENDO LEGIBLE Y SELECCIONABLE: conserva la clase "copiable" y
// el peso font-black. Es un codigo de nueve caracteres que ademas
// tiene su boton de copiar al lado — no necesita ser un titular.
//
// El script acepta las DOS formas posibles: la que dejo el script 419 y
// la original, por si aquel no llego a aplicarse.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/GestionCotutor.tsx';

// Se busca por PATRON y no por texto exacto: la indentacion puede
// variar y el script 419 pudo o no haberse aplicado. Lo unico fijo es
// la clase "copiable" seguida del tamaño y el peso.
const PATRON = /className="copiable text-\S+ font-black [^"]*"/;
const CLASE_NUEVA = 'className="copiable text-[15px] font-black tracking-normal text-[#8C572F] whitespace-nowrap"';

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

if (c.includes('text-[15px] font-black tracking-normal')) {
  abortar('el codigo ya esta chico. Parece que este script ya se corrio.');
}

const coincidencias = c.match(new RegExp(PATRON.source, 'g')) || [];
console.log('  ' + (coincidencias.length === 1 ? 'OK ' : 'X  ') + 'clase del codigo -> ' + coincidencias.length + ' coincidencia(s)');
if (coincidencias.length === 0) {
  abortar('no encontre la clase del codigo. Pasale a Claude la linea donde se muestra.');
}
if (coincidencias.length > 1) {
  abortar('encontre ' + coincidencias.length + ' clases iguales. Esperaba 1.');
}
console.log('  --  antes: ' + coincidencias[0]);

c = c.replace(PATRON, CLASE_NUEVA);

// --- Verificaciones
if (!c.includes('copiable')) {
  abortar('se perdio la clase copiable: el codigo dejaria de ser seleccionable.');
}
if (!c.includes('whitespace-nowrap')) {
  abortar('el codigo podria partirse en dos lineas.');
}
if (!c.includes('{invitacion.codigo_invitacion}')) {
  abortar('se perdio el codigo mismo.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El codigo ya cabe sin agrandar la tarjeta.');
