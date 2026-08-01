const fs = require('fs');
const path = require('path');

// ============================================================
// generar_319_fix_celo_fecha.js
// ============================================================
// Corrige el calculo del PROXIMO CELO ESTIMADO en el dashboard:
//
//   1) Reemplaza proximo.toISOString().split('T')[0] por
//      fechaChile(proximo). El toISOString() convierte a UTC, asi
//      que en Chile la fecha estimada podia quedar corrida un dia.
//
//   2) Reemplaza la comparacion "proximo > new Date()" (que compara
//      con HORA) por una comparacion por DIA. Antes, un celo estimado
//      para HOY se descartaba apenas pasaba la medianoche.
//
// Este script NO reescribe el archivo completo: hace un reemplazo
// exacto sobre el archivo que ya esta en el proyecto. Si no encuentra
// el texto tal cual lo espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/dashboard/page.tsx';

const VIEJO_COMPARACION = 'if (proximo > new Date()) {';
const NUEVO_COMPARACION = 'if (fechaChile(proximo) >= fechaChile()) {';

const VIEJO_ASIGNACION = "proximoCeloFecha = proximo.toISOString().split('T')[0]";
const NUEVO_ASIGNACION = 'proximoCeloFecha = fechaChile(proximo)';

const ESPERADAS = 2; // el patron aparece 2 veces (por historial y por especie)

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

// --- Verificacion 1: el helper fechaChile tiene que existir en el archivo
if (!contenido.includes('fechaChile')) {
  abortar('el archivo no usa fechaChile(). No puedo reemplazar sin ese helper.');
}

// --- Verificacion 2: los textos a reemplazar deben aparecer exactamente 2 veces
const nComparacion = contar(contenido, VIEJO_COMPARACION);
const nAsignacion = contar(contenido, VIEJO_ASIGNACION);

console.log('Encontrado: comparacion por hora -> ' + nComparacion + ' vez/veces');
console.log('Encontrado: toISOString del celo  -> ' + nAsignacion + ' vez/veces');

if (nComparacion !== ESPERADAS) {
  abortar('esperaba ' + ESPERADAS + ' comparaciones "proximo > new Date()" y encontre ' + nComparacion + '.');
}
if (nAsignacion !== ESPERADAS) {
  abortar('esperaba ' + ESPERADAS + ' usos de toISOString en el celo y encontre ' + nAsignacion + '.');
}

// --- Reemplazo
contenido = contenido.split(VIEJO_COMPARACION).join(NUEVO_COMPARACION);
contenido = contenido.split(VIEJO_ASIGNACION).join(NUEVO_ASIGNACION);

// --- Verificacion 3: no puede quedar ningun rastro de lo viejo
if (contenido.includes(VIEJO_COMPARACION) || contenido.includes(VIEJO_ASIGNACION)) {
  abortar('quedo texto viejo despues del reemplazo.');
}
if (contar(contenido, NUEVO_ASIGNACION) !== ESPERADAS) {
  abortar('el reemplazo no quedo completo.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Fecha del proximo celo estimado corregida (' + ESPERADAS + ' lugares).');
