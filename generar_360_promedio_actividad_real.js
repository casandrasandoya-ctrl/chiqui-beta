const fs = require('fs');
const path = require('path');

// ============================================================
// generar_360_promedio_actividad_real.js
// ============================================================
// EL BUG (reportado por un usuario)
// El promedio diario de actividad se calcula SIEMPRE dividiendo por 30:
//
//     const promedioDia = Math.round((totalP + totalE) / 30)
//
// Alguien que lleva 2 dias usando la app y paseo 120 minutos obtiene
// 4 min/dia, y Chiqui le dice que su perro necesita mas ejercicio. Es
// un juicio falso sobre alguien que lo esta haciendo bien.
//
// En /vet es peor: un veterinario leeria "Bajo" en un perro que camina
// una hora diaria, y podria tomar una decision clinica con eso.
//
// DOS ARREGLOS
//
// 1. DIVIDIR POR LOS DIAS REALES. Se usa la cantidad de dias que
//    efectivamente cubren los registros, no 30 fijos.
//
// 2. NO JUZGAR CON POCOS DATOS. Aunque el promedio quede bien
//    calculado, con 2 o 3 dias sigue siendo ruido: un fin de semana sin
//    salir baja el promedio a la mitad. Bajo 7 dias de registro se
//    muestra el numero pero NO se compara con lo recomendado, ni en
//    Analisis ni en la vista del veterinario.
//
//    Siete dias es lo minimo para que entre una semana completa, con
//    sus dias laborales y su fin de semana.
//
// REQUISITO: script 358 desplegado (de ahi sale diasCubiertos).
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  // ---------------------------------------------------------
  // 1. ANALISIS — promedio y bandera de datos suficientes
  // ---------------------------------------------------------
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'tipo de actividadChiqui',
    viejo: "  const actividadChiqui: { promedioDia: number; min: number; ideal: string; suficiente: boolean } | null = (() => {",
    nuevo: "  const actividadChiqui: { promedioDia: number; min: number; ideal: string; suficiente: boolean; datosSuficientes: boolean } | null = (() => {",
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'promedio diario en Analisis',
    viejo: "    const promedioDia = Math.round((totalP + totalE) / 30)",
    nuevo: [
      "    // Dividir por los días que REALMENTE cubren los registros, no",
      "    // por 30 fijos. Con 2 días de uso, dividir por 30 daba un",
      "    // promedio 15 veces más bajo que el real.",
      "    const diasParaPromedio = Math.max(1, diasCubiertos)",
      "    const promedioDia = Math.round((totalP + totalE) / diasParaPromedio)",
    ].join('\n'),
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'bandera de datos suficientes',
    viejo: "    return { promedioDia, min, ideal, suficiente: promedioDia >= min }",
    nuevo: [
      "    // Aunque el promedio ya quede bien calculado, con 2 o 3 días",
      "    // sigue siendo ruido: un fin de semana sin salir lo parte a la",
      "    // mitad. Bajo 7 días se muestra el número pero no se compara",
      "    // con lo recomendado. Siete es lo mínimo para que entre una",
      "    // semana completa, con días laborales y fin de semana.",
      "    return { promedioDia, min, ideal, suficiente: promedioDia >= min, datosSuficientes: diasCubiertos >= 7 }",
    ].join('\n'),
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'mensaje cuando hay pocos dias',
    viejo: [
      "            {actividadChiqui && actividadChiqui.promedioDia > 0 && (",
      "              actividadChiqui.suficiente ? (",
    ].join('\n'),
    nuevo: [
      "            {actividadChiqui && actividadChiqui.promedioDia > 0 && (",
      "              !actividadChiqui.datosSuficientes ? (",
      '                <p className="text-xs text-[#3D2B1F] leading-relaxed mb-2">',
      '                  🐾 Según lo que registraste, {nombreM} se movió un promedio de <span className="font-semibold">{actividadChiqui.promedioDia} min al día</span>. Llevas {diasCubiertos} {diasCubiertos === 1 ? \'día\' : \'días\'} de registro: todavía es pronto para compararlo con lo recomendado. En unos días te cuento mejor.',
      "                </p>",
      "              ) : actividadChiqui.suficiente ? (",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. VETERINARIO — mismo promedio y misma prudencia
  // ---------------------------------------------------------
  {
    ruta: 'app/vet/page.tsx',
    nombre: 'promedio diario en la vista del veterinario',
    viejo: [
      "    const totalEnr = (enriqVet || []).reduce((acc: number, e: any) => acc + (e.duracion_min || 0), 0)",
      "    actividadPromedioDia = Math.round((totalPaseo + totalEnr) / 30)",
      "    // Rangos orientativos de actividad diaria para un perro adulto.",
      "    // No son un estándar clínico rígido; ayudan a leer el número.",
      "    if (actividadPromedioDia >= 60) nivelActividad = { label: 'Activo', color: '#4CAF7D' }",
      "    else if (actividadPromedioDia >= 30) nivelActividad = { label: 'Moderado', color: '#F5C842' }",
      "    else nivelActividad = { label: 'Bajo', color: '#F07A30' }",
    ].join('\n'),
    nuevo: [
      "    const totalEnr = (enriqVet || []).reduce((acc: number, e: any) => acc + (e.duracion_min || 0), 0)",
      "",
      "    // Días REALMENTE cubiertos por los registros, no 30 fijos. Antes,",
      "    // un tutor con pocos días de uso aparecía como \"Bajo\" aunque",
      "    // paseara su perro una hora diaria — un dato falso sobre el que",
      "    // un veterinario podría decidir.",
      "    const fechasVet = registros",
      "      .filter((r: any) => r.fecha >= inicio)",
      "      .map((r: any) => r.fecha as string)",
      "      .sort()",
      "    const hoyVetStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
      "    let diasVet = 30",
      "    if (fechasVet.length > 0) {",
      "      const primeraVet = new Date(fechasVet[0] + 'T12:00:00')",
      "      const hoyVet = new Date(hoyVetStr + 'T12:00:00')",
      "      const d = Math.round((hoyVet.getTime() - primeraVet.getTime()) / 86400000) + 1",
      "      diasVet = Math.max(1, Math.min(30, d))",
      "    }",
      "",
      "    actividadPromedioDia = Math.round((totalPaseo + totalEnr) / diasVet)",
      "    // Rangos orientativos de actividad diaria para un perro adulto.",
      "    // No son un estándar clínico rígido; ayudan a leer el número.",
      "    //",
      "    // Con menos de una semana de registros NO se etiqueta: el",
      "    // promedio existe pero es ruido, y una etiqueta clínica sobre",
      "    // ruido es peor que ninguna etiqueta.",
      "    if (diasVet < 7) {",
      "      nivelActividad = { label: `Pocos datos (${diasVet} ${diasVet === 1 ? 'día' : 'días'})`, color: '#8A7560' }",
      "    } else if (actividadPromedioDia >= 60) nivelActividad = { label: 'Activo', color: '#4CAF7D' }",
      "    else if (actividadPromedioDia >= 30) nivelActividad = { label: 'Moderado', color: '#F5C842' }",
      "    else nivelActividad = { label: 'Bajo', color: '#F07A30' }",
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

const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    const contenido = fs.readFileSync(destino, 'utf8');
    if (c.ruta === 'app/analisis/page.tsx' && !contenido.includes('diasCubiertos')) {
      abortar('falta diasCubiertos en Analisis. Corre primero el script 358.');
    }
    if (contenido.includes('diasParaPromedio') || contenido.includes('diasVet')) {
      abortar(c.ruta + ' ya tiene el promedio corregido. Parece que este script ya se corrio.');
    }
    porArchivo.set(c.ruta, { destino, contenido });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificaciones finales
const an = porArchivo.get('app/analisis/page.tsx');
if (an.contenido.includes('(totalP + totalE) / 30')) {
  abortar('quedo la division por 30 en Analisis.');
}
if (!an.contenido.includes('datosSuficientes: diasCubiertos >= 7')) {
  abortar('la bandera de datos suficientes no quedo aplicada.');
}
const vt = porArchivo.get('app/vet/page.tsx');
if (vt.contenido.includes('(totalPaseo + totalEnr) / 30')) {
  abortar('quedo la division por 30 en la vista del veterinario.');
}
if (!vt.contenido.includes('Pocos datos (')) {
  abortar('la etiqueta de pocos datos no quedo aplicada.');
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. El promedio ya se calcula sobre los dias que de verdad hay.');
