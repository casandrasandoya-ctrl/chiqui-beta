const fs = require('fs');
const path = require('path');

// ============================================================
// generar_443_tipo_insights.js
// ============================================================
// EL ERROR DEL BUILD
//
//   Type error: Variable 'insights' implicitly has an 'any[]' type.
//   episodios: insights.filter(i => i.icon === '🔍').map(i => i.text),
//
// POR QUE
// El calculo de datosChat quedo ANTES de donde se declara insights.
// TypeScript lee de arriba hacia abajo: en ese punto todavia no sabe
// que tipo tiene, y con strict activado no deja usarlo.
//
// EL ARREGLO
// Declarar el tipo en el filter. Es lo minimo que TypeScript necesita
// para seguir, y no cambia el comportamiento: en tiempo de ejecucion
// insights ya esta armado cuando el componente se dibuja.
//
// Babel no ve esto —valida sintaxis, no tipos— asi que solo aparece en
// el build. Es el mismo caso del script 386.
//
// REQUISITO: script 442 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = "    episodios: insights.filter(i => i.icon === '🔍').map(i => i.text),";
const NUEVO = [
  "    // El tipo va explicito: este bloque se calcula ANTES de donde se",
  "    // declara insights, y ahi TypeScript todavia no sabe que contiene.",
  "    episodios: (insights as { icon: string; text: string; tipo: string }[])",
  "      .filter(i => i.icon === '🔍')",
  "      .map(i => i.text),",
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

if (c.includes('insights as { icon: string')) {
  abortar('el tipo ya esta declarado. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'uso de insights -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

if (!c.includes('insights as { icon: string')) {
  abortar('el tipo no quedo aplicado.');
}
// El filtro tiene que seguir siendo el mismo.
if (!c.includes("filter(i => i.icon === '🔍')")) {
  abortar('se altero el filtro de los episodios.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El build deberia pasar.');
