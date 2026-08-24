const fs = require('fs');
const path = require('path');

// ============================================================
// generar_463_analisis_al_dia.js
// ============================================================
// El script 462 solo toco ChiquiFlotante. En Analisis el chat quedo sin
// dos cosas:
//
//   hoyISO    -> sin ella los periodos no funcionan: preguntar por "la
//                ultima semana" seguia respondiendo 30 dias.
//   mascotaId -> sin el, la conversacion no se limpia al cambiar de
//                mascota, y el historial de una queda en pantalla
//                mientras se mira la otra.
//
// Las dos ya existen en el archivo: hoyChat y mascota.id. Solo faltaba
// pasarlas.
//
// REQUISITOS: scripts 460, 461 y 462 desplegados.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = "  const datosChat = {\n    nombre: mascota?.nombre || 'tu mascota',";
const NUEVO = "  const datosChat = {\n    // El id: al cambiar de mascota, el chat borra la conversaci\u00f3n. Sin\n    // esto el historial de una quedaba en pantalla al mirar la otra.\n    mascotaId: mascota?.id,\n    // La fecha de hoy: sin ella no se puede recortar al per\u00edodo que\n    // pide la persona (\"\u00bfc\u00f3mo ha estado esta semana?\").\n    hoyISO: hoyChat,\n    nombre: mascota?.nombre || 'tu mascota',";

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

if (c.includes('hoyISO: hoyChat')) {
  abortar('Analisis ya esta al dia. Parece que este script ya se corrio.');
}
// hoyChat viene del script 442.
if (!c.includes('const hoyChat')) {
  abortar('no encontre hoyChat. Corre primero el script 442.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'objeto de datos -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

for (const e of ['mascotaId: mascota?.id,', 'hoyISO: hoyChat,']) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion fallo para [' + e + '].');
  }
}
// El calculo sigue antes del uso.
if (c.indexOf('const hoyChat') > c.indexOf('hoyISO: hoyChat')) {
  abortar('hoyChat quedaria despues de usarse.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. En Analisis los periodos ya funcionan y la conversacion');
console.log('se limpia al cambiar de mascota.');
