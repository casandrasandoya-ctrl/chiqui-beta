const fs = require('fs');
const path = require('path');

// ============================================================
// generar_320_cumple_primer_anio.js
// ============================================================
// Dos cambios en components/Novedades.tsx:
//
//  1) BUG: la tarjeta de cuenta regresiva de cumpleanos (y la de
//     aniversario) usaba una clave con el ANIO. Al cerrarla una vez
//     con la X, quedaba silenciada los 7 dias completos e incluso el
//     mensaje de manana no aparecia. Ahora la clave usa el DIA:
//     cerrarla la silencia solo por hoy y manana vuelve actualizada.
//
//  2) NUEVO: mensaje especial para el PRIMER cumpleanos (o.anios === 1),
//     tanto el dia mismo como en la cuenta regresiva.
//
// Este script NO reescribe el archivo completo: hace reemplazos
// exactos sobre el archivo que ya esta en el proyecto. Si no encuentra
// algun texto tal cual lo espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'components/Novedades.tsx';

const PARES = [
  {
    "nombre": "clave cuenta regresiva cumpleanos",
    "viejo": "a2V5OiBgY3VtcGxlX3Byb3hfJHttLmlkfV8ke2FuaW99YCw=",
    "nuevo": "a2V5OiBgY3VtcGxlX3Byb3hfJHttLmlkfV8ke2hveVN0cn1gLA=="
  },
  {
    "nombre": "clave cuenta regresiva aniversario",
    "viejo": "a2V5OiBgdW5pb25fcHJveF8ke20uaWR9XyR7YW5pb31gLA==",
    "nuevo": "a2V5OiBgdW5pb25fcHJveF8ke20uaWR9XyR7aG95U3RyfWAs"
  },
  {
    "nombre": "mensaje del dia del cumpleanos",
    "viejo": "bWVuc2FqZTogYPCfjokgwqFIb3kgJHttLm5vbWJyZX0gZXN0w6EgZGUgY3VtcGxlYcOxb3MhIEN1bXBsZSAke28uYW5pb3N9ICR7by5hbmlvcyA9PT0gMSA/ICdhw7FvJyA6ICdhw7Fvcyd9LmAs",
    "nuevo": "bWVuc2FqZTogby5hbmlvcyA9PT0gMQogICAgICAgICAgICA/IGDwn46CIMKhSG95ICR7bS5ub21icmV9IGN1bXBsZSBzdSBwcmltZXIgYcOxbyEgR3JhY2lhcyBwb3IgY3VpZGFyIGNhZGEgc2XDsWFsIGRlIGVzdGUgcHJpbWVyIGHDsW8gZGUgdmlkYS4gUXVlIHZlbmdhbiBtdWNob3MsIG11Y2hvcyBtw6FzIPCfkptgCiAgICAgICAgICAgIDogYPCfjokgwqFIb3kgJHttLm5vbWJyZX0gZXN0w6EgZGUgY3VtcGxlYcOxb3MhIEN1bXBsZSAke28uYW5pb3N9IGHDsW9zLmAs"
  },
  {
    "nombre": "mensaje de manana",
    "viejo": "PyBg8J+OgiDCoU1hw7FhbmEgJHttLm5vbWJyZX0gY3VtcGxlIGHDsW9zIWA=",
    "nuevo": "PyAoby5hbmlvcyA9PT0gMQogICAgICAgICAgICAgICAgPyBg8J+OiSDCoU1hw7FhbmEgJHttLm5vbWJyZX0gY3VtcGxlIHN1IHByaW1lciBhw7FpdG8hIFByZXDDoXJlbnNlIHBhcmEgY2VsZWJyYXIuYAogICAgICAgICAgICAgICAgOiBg8J+OgiDCoU1hw7FhbmEgJHttLm5vbWJyZX0gY3VtcGxlIGHDsW9zIWAp"
  },
  {
    "nombre": "mensaje de cuenta regresiva",
    "viejo": "OiBg8J+OiCBGYWx0YW4gJHtvLmRpYXNGYWx0YW59IGTDrWFzIHBhcmEgZWwgY3VtcGxlYcOxb3MgZGUgJHttLm5vbWJyZX0uYCw=",
    "nuevo": "OiAoby5hbmlvcyA9PT0gMQogICAgICAgICAgICAgICAgPyBg8J+OiCBGYWx0YW4gJHtvLmRpYXNGYWx0YW59IGTDrWFzIHBhcmEgZWwgcHJpbWVyIGN1bXBsZWHDsW9zIGRlICR7bS5ub21icmV9LmAKICAgICAgICAgICAgICAgIDogYPCfjoggRmFsdGFuICR7by5kaWFzRmFsdGFufSBkw61hcyBwYXJhIGVsIGN1bXBsZWHDsW9zIGRlICR7bS5ub21icmV9LmApLA=="
  }
];

function d(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

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

// --- Verificacion previa: cada texto debe aparecer EXACTAMENTE 1 vez
for (const p of PARES) {
  const viejo = d(p.viejo);
  const n = contar(contenido, viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

// --- Reemplazo (solo si TODAS las verificaciones pasaron)
for (const p of PARES) {
  contenido = contenido.split(d(p.viejo)).join(d(p.nuevo));
}

// --- Verificacion final: no puede quedar texto viejo
for (const p of PARES) {
  if (contenido.includes(d(p.viejo))) {
    abortar('quedo texto viejo de [' + p.nombre + '] despues del reemplazo.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Cuenta regresiva de cumpleanos arreglada + mensaje de primer anio.');
