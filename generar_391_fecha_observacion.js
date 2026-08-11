const fs = require('fs');
const path = require('path');

// ============================================================
// generar_391_fecha_observacion.js
// ============================================================
// EL BUG
// Al crear una observacion sin poner fecha, la fecha de inicio se
// calculaba asi:
//
//   fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0]
//
// toISOString() convierte a UTC, y Chile va cuatro horas atras. Una
// observacion creada despues de las 20:00 se guarda CON LA FECHA DE
// MAÑANA.
//
// POR QUE IMPORTA MAS QUE EN OTROS LADOS
// Las observaciones son seguimientos de sintomas. Una que empieza
// "mañana" descuadra el conteo de dias de evolucion, y llega mal a la
// vista del veterinario — que es justo donde ese dato tiene que ser
// exacto.
//
// Ademas, quien registra de noche es precisamente quien nota que algo
// anda mal despues de todo el dia. O sea, el caso mas probable es
// tambien el que se guardaba mal.
//
// Es el mismo patron que el script 347 arreglo en medicamentos. Este
// cierra el que quedaba.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/prevencion/page.tsx';

const VIEJO = [
  "        const { data: nuevaObs } = await supabase.from('observaciones').insert({",
  "          ...base, ...form,",
  "          estado: 'activa',",
  "          fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0]",
  "        }).select('id').single()",
].join('\n');

const NUEVO = [
  "        // La fecha de hoy con zona horaria de Chile. Antes se usaba",
  "        // toISOString(), que convierte a UTC: una observación creada",
  "        // después de las 20:00 quedaba fechada MAÑANA, y eso descuadra",
  "        // los días de evolución del seguimiento.",
  "        //",
  "        // Quien registra de noche es justamente quien nota que algo",
  "        // anda mal después de todo el día: el caso más probable era",
  "        // también el que se guardaba mal.",
  "        const hoyObs = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
  "        const { data: nuevaObs } = await supabase.from('observaciones').insert({",
  "          ...base, ...form,",
  "          estado: 'activa',",
  "          fecha_inicio: form.fecha_inicio || hoyObs",
  "        }).select('id').single()",
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

if (contenido.includes('const hoyObs')) {
  abortar('la fecha de observacion ya esta corregida. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'fecha de la observacion -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

if (contar(contenido, 'const hoyObs') !== 1) {
  abortar('el arreglo no quedo aplicado.');
}
if (contenido.includes("fecha_inicio: form.fecha_inicio || new Date().toISOString()")) {
  abortar('quedo el calculo viejo de la fecha.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);

// --- Aviso, no error: revisar si quedan otros toISOString en el
// archivo. Algunos son legitimos (comparar timestamps), otros no.
const restantes = contar(contenido, 'toISOString');
console.log('');
if (restantes > 0) {
  console.log('AVISO: quedan ' + restantes + ' usos de toISOString en este archivo.');
  console.log('No todos son un problema: comparar timestamps con toISOString');
  console.log('esta bien. El bug aparece solo cuando se usa para calcular un');
  console.log('DIA. Pasale este numero a Claude para revisarlos.');
} else {
  console.log('No quedan usos de toISOString en este archivo.');
}
console.log('');
console.log('Listo. Una observacion creada de noche ya no se fecha mañana.');
