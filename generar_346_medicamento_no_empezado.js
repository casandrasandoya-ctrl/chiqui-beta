const fs = require('fs');
const path = require('path');

// ============================================================
// generar_346_medicamento_no_empezado.js
// ============================================================
// EL BUG (reportado por una usuaria)
// Creo un medicamento que parte el 10 de agosto y el dashboard le
// pregunto ese mismo dia: "¿Ya le diste el medicamento hoy?".
//
// LA CAUSA
// En toda la app, "tratamiento activo" se calcula asi:
//
//     estado === 'activo'  Y  (sin fecha_fin  O  fecha_fin >= hoy)
//
// Es decir, solo se comprueba que NO HAYA TERMINADO. Nunca se
// comprueba que YA HAYA EMPEZADO. Un tratamiento con fecha_inicio
// futura pasa el filtro sin problema.
//
// DONDE ESTABA
//  1. app/dashboard/page.tsx  -> la novedad que pregunta por la dosis
//  2. app/vet/page.tsx        -> mostraba "Activo" un tratamiento que
//                                aun no empieza, y contaba adherencia
//                                sobre dias que no habian llegado
//  3. app/analisis/page.tsx   -> mismo criterio incompleto
//
// El caso de la vista del veterinario es el mas delicado: un vet
// podria leer "Activo · 0 de 8 dosis registradas" y concluir que el
// tutor no esta cumpliendo, cuando el tratamiento todavia no comienza.
//
// REQUISITO: scripts 333 y 336 desplegados (los de Analisis).
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  {
    ruta: 'app/dashboard/page.tsx',
    nombre: 'novedad de medicamento en el dashboard',
    viejo: [
      "    .select('id,nombre,frecuencia,fecha_fin,dosis_por_dia')",
      "    .eq('mascota_id', m.id)",
      "    .eq('estado', 'activo')",
      "  const medsActivos = (medsActivosRaw || []).filter((med: any) =>",
      "    !med.fecha_fin || med.fecha_fin >= hoy",
      "  )",
    ].join('\n'),
    nuevo: [
      "    .select('id,nombre,frecuencia,fecha_inicio,fecha_fin,dosis_por_dia')",
      "    .eq('mascota_id', m.id)",
      "    .eq('estado', 'activo')",
      "  // Un tratamiento esta activo si YA EMPEZO y AUN NO TERMINA.",
      "  // Antes solo se miraba el final, asi que uno que partia el 10 de",
      "  // agosto ya preguntaba por su dosis el dia 2.",
      "  const medsActivos = (medsActivosRaw || []).filter((med: any) =>",
      "    (!med.fecha_inicio || med.fecha_inicio <= hoy) &&",
      "    (!med.fecha_fin || med.fecha_fin >= hoy)",
      "  )",
    ].join('\n'),
  },
  {
    ruta: 'app/vet/page.tsx',
    nombre: 'estado del medicamento en la vista del veterinario',
    viejo: [
      "  if (med.estado !== 'activo') return false",
      "  if (!med.fecha_fin) return true",
    ].join('\n'),
    nuevo: [
      "  if (med.estado !== 'activo') return false",
      "  // Un tratamiento que empieza el 10 no esta activo el 2. Sin esta",
      "  // comprobacion, el veterinario veia \"Activo · 0 de 8 dosis\" en un",
      "  // tratamiento que aun no comienza, y podia concluir que el tutor",
      "  // no estaba cumpliendo.",
      "  const hoyInicio = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
      "  if (med.fecha_inicio && med.fecha_inicio > hoyInicio) return false",
      "  if (!med.fecha_fin) return true",
    ].join('\n'),
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'tratamientos vigentes en Analisis',
    viejo: "    const vigentes = (medsAct || []).filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyMedStr)",
    nuevo: [
      "    // Vigente = ya empezo y aun no termina. La condicion de inicio",
      "    // faltaba: un tratamiento futuro se contaba como en curso.",
      "    const vigentes = (medsAct || []).filter((md: any) =>",
      "      (!md.fecha_inicio || md.fecha_inicio <= hoyMedStr) &&",
      "      (!md.fecha_fin || md.fecha_fin >= hoyMedStr)",
      "    )",
    ].join('\n'),
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// --- Verificar los tres archivos ANTES de escribir ninguno
const preparados = [];

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  const contenido = fs.readFileSync(destino, 'utf8');
  const n = contar(contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  preparados.push({ destino, ruta: c.ruta, contenido: contenido.split(c.viejo).join(c.nuevo) });
}

// --- Verificar el resultado antes de tocar el disco
for (const p of preparados) {
  if (!p.contenido.includes('fecha_inicio')) {
    abortar('la comprobacion de fecha_inicio no quedo aplicada en ' + p.ruta + '.');
  }
}

// --- Escribir
console.log('');
for (const p of preparados) {
  fs.writeFileSync(p.destino, p.contenido, 'utf8');
  console.log('OK: ' + p.ruta);
}

console.log('');
console.log('Listo. Un tratamiento que aun no empieza ya no se cuenta como activo.');
