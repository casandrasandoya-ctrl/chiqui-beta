const fs = require('fs');
const path = require('path');

// ============================================================
// generar_445_tipo_insights_declaracion.js
// ============================================================
// LA CAUSA RAIZ, por fin.
//
//   Type error: Variable 'insights' implicitly has type 'any[]' in some
//   locations where its type cannot be determined.
//   const insights = []
//
// insights NUNCA tuvo tipo declarado. Antes no importaba: TypeScript lo
// deducia de los push() que venian despues. Pero al agregarse un uso
// que lo LEE (los episodios del chat), esa deduccion deja de alcanzar y
// exige el tipo explicito.
//
// LOS INTENTOS ANTERIORES atacaban el sintoma:
//   443 puso un "as" en el uso -> no sirve, el problema no era el tipo
//       del uso sino la declaracion.
//   444 reordeno el bloque -> necesario, pero no suficiente.
//
// EL ARREGLO
//   const insights: { icon: string; text: string; tipo: string }[] = []
//
// Y de paso se quita el "as" del 443, que ya no hace falta y solo
// confunde a quien lea el codigo despues.
//
// REQUISITO: script 444 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const TIPO = '{ icon: string; text: string; tipo: string }[]';

const DECL_VIEJA = '  const insights = []';
const DECL_NUEVA = [
  '  // El tipo va explicito: sin el, TypeScript lo deducia de los push()',
  '  // de mas abajo, y eso dejo de alcanzar cuando el chat empezo a LEER',
  '  // los insights para armar sus episodios.',
  '  const insights: ' + TIPO + ' = []',
].join('\n');

const USO_VIEJO = [
  "    // El tipo va explicito: este bloque se calcula ANTES de donde se",
  "    // declara insights, y ahi TypeScript todavia no sabe que contiene.",
  "    episodios: (insights as { icon: string; text: string; tipo: string }[])",
  "      .filter(i => i.icon === '🔍')",
  "      .map(i => i.text),",
].join('\n');

const USO_NUEVO = [
  "    // Las mismas frases que ya se muestran en pantalla, sin el ícono.",
  "    episodios: insights.filter(i => i.icon === '🔍').map(i => i.text),",
].join('\n');

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

if (c.includes('const insights: ' + TIPO)) {
  abortar('el tipo ya esta declarado. Parece que este script ya se corrio.');
}

// --- La declaracion
const nDecl = contar(c, DECL_VIEJA);
console.log('  ' + (nDecl === 1 ? 'OK ' : 'X  ') + 'declaracion de insights -> ' + nDecl + ' coincidencia(s)');
if (nDecl !== 1) {
  abortar('esperaba 1 coincidencia de la declaracion y encontre ' + nDecl + '.');
}
c = c.split(DECL_VIEJA).join(DECL_NUEVA);

// --- El "as" del 443, si esta
const nUso = contar(c, USO_VIEJO);
if (nUso === 1) {
  c = c.split(USO_VIEJO).join(USO_NUEVO);
  console.log('  OK  se quito el "as" del script 443, que ya no hace falta');
} else {
  console.log('  --  no habia "as" que quitar (' + nUso + ' coincidencias)');
}

// --- Verificaciones
if (!c.includes('const insights: ' + TIPO + ' = []')) {
  abortar('el tipo no quedo aplicado.');
}
// Los push tienen que seguir calzando con el tipo declarado.
if (!c.includes("insights.push({ icon:")) {
  abortar('no encontre los push de insights: el tipo podria no calzar.');
}
// Y el uso en el chat tiene que seguir.
if (!c.includes("insights.filter(i => i.icon === '🔍')")) {
  abortar('se perdio el uso de insights en los datos del chat.');
}
// El orden que arreglo el 444 no debe romperse.
if (c.indexOf('const insights') > c.indexOf('const datosChat = {')) {
  abortar('insights quedaria despues de datosChat.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. insights tiene tipo propio y ya no depende de deducciones.');
