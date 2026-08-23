const fs = require('fs');
const path = require('path');

// ============================================================
// generar_462_hoy_para_periodos.js
// ============================================================
// Le pasa al chat la fecha de hoy, sin la cual no puede recortar al
// periodo pedido: "¿como ha estado esta semana?" necesita saber cuando
// empieza esa semana.
//
// REQUISITO: script 461 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ChiquiFlotante.tsx';

const VIEJO = "        textoPeriodo: 'los últimos 30 días',";
const NUEVO = [
  "        textoPeriodo: 'los últimos 30 días',",
  "        // La fecha de hoy en Chile: sin ella el chat no puede",
  "        // recortar las señales al período que pide la persona.",
  "        hoyISO: hoy,",
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
  abortar('no se encontro ' + RUTA + '.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('hoyISO:')) {
  abortar('la fecha ya se pasa. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'punto de insercion -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

if (!c.includes('hoyISO: hoy,')) {
  abortar('la fecha no quedo aplicada.');
}
// hoy tiene que existir en ese ambito.
if (!c.includes("const hoy = new Intl.DateTimeFormat")) {
  abortar('no encontre la variable hoy. Avisale a Claude.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los periodos ya se pueden recortar.');
