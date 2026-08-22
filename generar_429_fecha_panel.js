const fs = require('fs');
const path = require('path');

// ============================================================
// generar_429_fecha_panel.js
// ============================================================
// EL SINTOMA
// El panel decia "0 de 83 hicieron su registro diario" mientras la base
// tenia 13 registros de hoy. Pero SI mostraba la otra actividad del
// mismo dia: 1 vacuna y 1 peso.
//
// Eso descarto casi todo: la fecha estaba bien calculada, los usuarios
// tenian perfil, las mascotas estaban activas y no se llegaba a ningun
// limite de filas.
//
// LA CAUSA, comparando los dos bloques del propio archivo:
//
//   Otra actividad (funciona):  const f = String(fecha).slice(0, 10)
//   Registros diarios (falla):  regsPorFecha.get(r.fecha)
//
// Uno NORMALIZA la fecha antes de usarla como clave; el otro confia en
// que venga exactamente como YYYY-MM-DD. Si Supabase la devuelve con
// hora o con cualquier variacion, la clave no coincide con la que arma
// sumarDias() y el dia entero queda vacio.
//
// EL ARREGLO es aplicar el mismo .slice(0, 10) que ya usaba el bloque
// que si funcionaba.
//
// Es el mismo patron de errores de fecha que ya corregimos en
// medicamentos, observaciones y el dashboard: confiar en el formato en
// vez de normalizarlo.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const VIEJO = "  const regsPorFecha = new Map<string, any[]>()\n  for (const r of regs) {\n    const arr = regsPorFecha.get(r.fecha) || []\n    arr.push(r)\n    regsPorFecha.set(r.fecha, arr)\n  }";
const NUEVO = "  const regsPorFecha = new Map<string, any[]>()\n  for (const r of regs) {\n    // La fecha se NORMALIZA a YYYY-MM-DD antes de usarla como clave.\n    // Sin esto, si Supabase la devuelve con hora (\"2026-08-21T00:00:00\")\n    // o con cualquier variacion de formato, nunca coincide con la clave\n    // que arma sumarDias() y los registros de ese dia desaparecen.\n    //\n    // El bloque de \"otra actividad\" mas abajo ya hacia esto con\n    // .slice(0, 10), y por eso la vacuna y el peso SI se veian mientras\n    // los registros diarios no.\n    const f = String(r.fecha).slice(0, 10)\n    const arr = regsPorFecha.get(f) || []\n    arr.push(r)\n    regsPorFecha.set(f, arr)\n  }";

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

if (c.includes('const f = String(r.fecha).slice(0, 10)')) {
  abortar('la fecha ya se normaliza. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'agrupacion por fecha -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
if (!c.includes('const f = String(r.fecha).slice(0, 10)')) {
  abortar('la normalizacion no quedo aplicada.');
}
if (c.includes('regsPorFecha.get(r.fecha)')) {
  abortar('quedo el acceso sin normalizar.');
}
// El bucle que consume el mapa no se toca: sigue buscando por la clave
// que arma sumarDias, que ya viene en formato YYYY-MM-DD.
if (!c.includes('regsPorFecha.get(f)')) {
  abortar('se perdio el uso del mapa en el bucle de los dias.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El panel ya deberia ver los registros de hoy.');
