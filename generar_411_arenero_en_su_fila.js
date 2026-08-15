const fs = require('fs');
const path = require('path');

// ============================================================
// generar_411_arenero_en_su_fila.js
// ============================================================
// El grupo Arenero sube a la fila de "¿Cómo estuvo su piel y su aseo?",
// junto a Pelaje e Higiene.
//
// POR QUE
// Hoy cae al final, bajo "¿Algo más que registrar?", porque no estaba
// en ninguna fila explicita — la red de seguridad lo recogia ahi. Con
// esto, en gatos la ultima fila queda pareja: Pelaje · Higiene ·
// Arenero, tres casillas, en vez de dos y una suelta abajo.
//
// En PERROS no cambia nada: el grupo Arenero solo existe en gatos, y
// una fila filtra los elementos que no aplican antes de dibujarse.
//
// La red de seguridad se mantiene: si mañana aparece un grupo nuevo,
// sigue apareciendo al final en vez de desaparecer.
//
// REQUISITO: script 389 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = "    { titulo: '¿Cómo estuvo su piel y su aseo?', items: [buscarCat('pelaje'), buscarGrupo('Higiene y bienestar')] },";

const NUEVO = [
  "    // Arenero va aquí y no al final: en gatos deja la última fila",
  "    // pareja (Pelaje · Higiene · Arenero) en vez de dos y una suelta.",
  "    // En perros no aplica, y las filas filtran lo que no existe.",
  "    { titulo: '¿Cómo estuvo su piel y su aseo?', items: [buscarCat('pelaje'), buscarGrupo('Higiene y bienestar'), buscarGrupo('Arenero')] },",
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

if (c.includes("buscarGrupo('Higiene y bienestar'), buscarGrupo('Arenero')")) {
  abortar('el arenero ya esta en esa fila. Parece que este script ya se corrio.');
}
if (!c.includes('const FILAS:')) {
  abortar('falta la grilla por filas. Corre primero el script 387.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'fila de piel y aseo -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
if (contar(c, "buscarGrupo('Arenero')") !== 1) {
  abortar('el arenero no quedo exactamente una vez.');
}
// Pelaje e Higiene tienen que seguir en la fila.
for (const s of ["buscarCat('pelaje')", "buscarGrupo('Higiene y bienestar')"]) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}
// La red de seguridad se mantiene: un grupo nuevo debe seguir
// apareciendo al final en vez de desaparecer.
if (!c.includes("texto: '¿Algo más que registrar?'")) {
  abortar('se perdio la red de seguridad de los grupos sobrantes.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. En gatos la ultima fila queda pareja.');
