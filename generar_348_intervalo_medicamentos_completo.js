const fs = require('fs');
const path = require('path');

// ============================================================
// generar_348_intervalo_medicamentos_completo.js
// ============================================================
// Cierra los medicamentos no diarios. El script 347 dejo GUARDAR el
// intervalo; este hace que la app efectivamente lo USE, en los cuatro
// lugares donde hoy asume que todo tratamiento es diario:
//
//  1. app/dashboard/page.tsx      -> la novedad pregunta solo los dias
//                                    que corresponden
//  2. app/registro-diario/page.tsx-> la lista de activos solo muestra
//                                    los que tocan hoy
//  3. app/analisis/page.tsx       -> adherencia sobre las dosis que de
//                                    verdad correspondian
//  4. app/vet/page.tsx            -> lo mismo, en la vista del vet
//
// De paso, registro-diario recibe el arreglo del script 346 (no habia
// sido incluido ahi): un tratamiento que aun no empieza tampoco debe
// aparecer para marcar.
//
// EL CRITERIO
// Los dias con dosis se cuentan DESDE fecha_inicio:
//     dias transcurridos % intervalo === 0
// Empieza el 10 con intervalo 2 -> toca 10, 12, 14, 16...
// Saltarse una dosis NO corre la pauta: si el veterinario dijo lunes,
// miercoles y viernes, olvidar el miercoles no convierte el jueves en
// dia de dosis.
//
// Las fechas se construyen a MEDIODIA para que los cambios de horario
// de verano no desplacen el conteo de dias.
//
// REQUISITOS: el .sql del intervalo corrido, y los scripts 335, 336,
// 346 y 347 desplegados.
//
// Verifica los cuatro archivos ANTES de escribir ninguno. Si algo no
// calza, ABORTA sin tocar nada.
// ============================================================

const CAMBIOS = [
  // ---------------------------------------------------------
  // 1. DASHBOARD — la novedad
  // ---------------------------------------------------------
  {
    ruta: 'app/dashboard/page.tsx',
    nombre: 'novedad del dashboard',
    viejo: [
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
    nuevo: [
      "    .select('id,nombre,frecuencia,fecha_inicio,fecha_fin,dosis_por_dia,intervalo_dias')",
      "    .eq('mascota_id', m.id)",
      "    .eq('estado', 'activo')",
      "  // Un tratamiento cuenta para HOY si ya empezo, aun no termina, y",
      "  // ademas HOY le toca dosis. Este ultimo punto faltaba: la app",
      "  // asumia que todo tratamiento era diario, asi que a quien tenia",
      "  // uno dia por medio le preguntaba todos los dias.",
      "  //",
      "  // Los dias con dosis se cuentan desde fecha_inicio. Saltarse una",
      "  // dosis no corre la pauta.",
      "  const medsActivos = (medsActivosRaw || []).filter((med: any) => {",
      "    if (med.fecha_inicio && med.fecha_inicio > hoy) return false",
      "    if (med.fecha_fin && med.fecha_fin < hoy) return false",
      "    const intervalo = Math.max(1, Number(med.intervalo_dias) || 1)",
      "    if (intervalo === 1 || !med.fecha_inicio) return true",
      "    // Mediodia: restar 24 horas sobre medianoche falla en los",
      "    // cambios de horario de verano.",
      "    const iniMed = new Date(med.fecha_inicio + 'T12:00:00')",
      "    const hoyMed = new Date(hoy + 'T12:00:00')",
      "    const diasPasados = Math.round((hoyMed.getTime() - iniMed.getTime()) / 86400000)",
      "    return diasPasados % intervalo === 0",
      "  })",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. REGISTRO DIARIO — la lista para marcar
  // ---------------------------------------------------------
  {
    ruta: 'app/registro-diario/page.tsx',
    nombre: 'lista de medicamentos del registro diario',
    viejo: [
      "          .select('id,nombre,frecuencia,fecha_fin,estado,dosis_por_dia')",
      "          .eq('mascota_id', mascotaId)",
      "          .eq('estado', 'activo')",
      "        const activosBase = (medsRaw || [])",
      "          .filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyStr)",
    ].join('\n'),
    nuevo: [
      "          .select('id,nombre,frecuencia,fecha_inicio,fecha_fin,estado,dosis_por_dia,intervalo_dias')",
      "          .eq('mascota_id', mascotaId)",
      "          .eq('estado', 'activo')",
      "        // Solo los tratamientos que YA EMPEZARON, aun no terminan, y",
      "        // que HOY les toca dosis. Antes se ofrecia marcar la dosis de",
      "        // un tratamiento que ni siquiera habia comenzado.",
      "        const activosBase = (medsRaw || []).filter((md: any) => {",
      "          if (md.fecha_inicio && md.fecha_inicio > hoyStr) return false",
      "          if (md.fecha_fin && md.fecha_fin < hoyStr) return false",
      "          const intervalo = Math.max(1, Number(md.intervalo_dias) || 1)",
      "          if (intervalo === 1 || !md.fecha_inicio) return true",
      "          const iniMd = new Date(md.fecha_inicio + 'T12:00:00')",
      "          const hoyMd = new Date(hoyStr + 'T12:00:00')",
      "          const diasMd = Math.round((hoyMd.getTime() - iniMd.getTime()) / 86400000)",
      "          return diasMd % intervalo === 0",
      "        })",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. ANALISIS — traer el intervalo y usarlo en la adherencia
  // ---------------------------------------------------------
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'consulta de medicamentos en Analisis',
    viejo: "        .select('id, nombre, dosis, frecuencia, dosis_por_dia, fecha_inicio, fecha_fin')",
    nuevo: "        .select('id, nombre, dosis, frecuencia, dosis_por_dia, intervalo_dias, fecha_inicio, fecha_fin')",
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'adherencia en Analisis',
    viejo: [
      "  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)",
      "  const esperadas = dias * porDia",
      "  if (esperadas <= 0) return null",
      "  return { esperadas, dadas: Number(med.tomas) || 0, pct: Math.round(((Number(med.tomas) || 0) / esperadas) * 100) }",
    ].join('\n'),
    nuevo: [
      "  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)",
      "  // Cuantos DIAS del periodo llevaban dosis. Para un tratamiento",
      "  // dia por medio de 7 dias, son 4 dias con dosis y no 7: dividir",
      "  // por todos los dias dejaba a la persona en 50% haciendolo bien.",
      "  const intervalo = Math.max(1, Number(med.intervalo_dias) || 1)",
      "  const diasConDosis = Math.floor((dias - 1) / intervalo) + 1",
      "  const esperadas = diasConDosis * porDia",
      "  if (esperadas <= 0) return null",
      "  return { esperadas, dadas: Number(med.tomas) || 0, pct: Math.round(((Number(med.tomas) || 0) / esperadas) * 100) }",
    ].join('\n'),
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'texto del intervalo en Analisis',
    viejo: "                            {md.dosis ? `${md.dosis} · ` : ''}{md.frecuencia || (Number(md.dosis_por_dia) > 1 ? `${md.dosis_por_dia} dosis al día` : '1 dosis al día')}",
    nuevo: [
      "                            {md.dosis ? `${md.dosis} · ` : ''}{md.frecuencia || (Number(md.dosis_por_dia) > 1 ? `${md.dosis_por_dia} dosis al día` : '1 dosis al día')}",
      "                            {Number(md.intervalo_dias) > 1 && (",
      "                              <span> · {Number(md.intervalo_dias) === 2 ? 'día por medio' : `cada ${md.intervalo_dias} días`}</span>",
      "                            )}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. VETERINARIO — adherencia
  // ---------------------------------------------------------
  {
    ruta: 'app/vet/page.tsx',
    nombre: 'adherencia en la vista del veterinario',
    viejo: [
      "  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)",
      "  const esperadas = dias * porDia",
      "  if (esperadas <= 0) return null",
      "  return { esperadas, dadas, pct: Math.round((dadas / esperadas) * 100) }",
    ].join('\n'),
    nuevo: [
      "  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)",
      "  // Solo cuentan los dias que llevaban dosis. Un tratamiento dia",
      "  // por medio de 7 dias son 4 dias con dosis, no 7: dividir por",
      "  // todos mostraria al veterinario un incumplimiento inexistente.",
      "  const intervalo = Math.max(1, Number(med.intervalo_dias) || 1)",
      "  const diasConDosis = Math.floor((dias - 1) / intervalo) + 1",
      "  const esperadas = diasConDosis * porDia",
      "  if (esperadas <= 0) return null",
      "  return { esperadas, dadas, pct: Math.round((dadas / esperadas) * 100) }",
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

// --- Verificar TODOS los cambios antes de escribir ninguno
const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    porArchivo.set(c.ruta, { destino, contenido: fs.readFileSync(destino, 'utf8') });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificar el resultado
for (const [ruta, a] of porArchivo) {
  if (!a.contenido.includes('intervalo_dias')) {
    abortar('el intervalo no quedo aplicado en ' + ruta + '.');
  }
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. La app ya respeta el intervalo de cada tratamiento.');
