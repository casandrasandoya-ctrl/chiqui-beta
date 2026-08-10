const fs = require('fs');
const path = require('path');

// ============================================================
// generar_388_titulo_huerfano.js
// ============================================================
// EL PROBLEMA
// El script 385 movio los cuidados a la grilla, pero dejo su
// encabezado donde estaba:
//
//   "Cuidados de hoy · opcional, puedes marcar varios"
//
// Debajo ya no hay cuidados: quedaron Hitos y Momentos, que estaban en
// el mismo contenedor. Asi que el titulo encabeza algo que no describe,
// y ademas parece una seccion vacia.
//
// EL ARREGLO
// El titulo pasa a decir lo que de verdad hay debajo. No se toca el
// contenedor, porque adentro siguen viviendo Hitos y Momentos: quitarlo
// se llevaria las dos secciones por delante.
//
// REQUISITO: script 385 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = [
  '        <label className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2 block">',
  "          Cuidados de hoy · opcional, puedes marcar varios",
  "        </label>",
  "        {/* Los cuidados ahora viven en la grilla de arriba, junto a la",
  "            observación con la que se relacionan. */}",
].join('\n');

const NUEVO = [
  "        {/* Los cuidados se mudaron a la grilla de arriba, junto a la",
  "            observación con la que se relacionan. Aquí abajo quedaron",
  "            Hitos y Momentos, así que el título dice eso. */}",
  '        <label className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2 block">',
  "          Hitos y momentos · opcional",
  "        </label>",
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

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('Hitos y momentos · opcional')) {
  abortar('el titulo ya esta corregido. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'titulo huerfano -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

// --- Verificaciones
if (contenido.includes('Cuidados de hoy · opcional')) {
  abortar('quedo el titulo viejo.');
}
if (contar(contenido, 'Hitos y momentos · opcional') !== 1) {
  abortar('el titulo nuevo no quedo aplicado.');
}
// Hitos y Momentos tienen que seguir ahi: viven en el mismo contenedor
// y quitarlo se los habria llevado por delante.
for (const s of ['MOMENTOS_CATALOGO', 'hitosLogrados', 'momentosAbierto']) {
  if (!contenido.includes(s)) {
    abortar('se perdio [' + s + ']. No deberia haberse tocado.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El titulo ya describe lo que hay debajo.');
