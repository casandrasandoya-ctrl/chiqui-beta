const fs = require('fs');
const path = require('path');

// ============================================================
// generar_376_dosis_mas_reciente_dashboard.js
// ============================================================
// EL BUG (reportado por Casandra)
// Registro un antiparasitario hoy. Prevencion lo tomo bien, pero el
// dashboard sigue mostrandolo en "Proximos" como si tocara hoy.
//
// LA CAUSA
// El dashboard usa una regla DISTINTA a la del resto de la app. En
// Prevencion hay un comentario que lo dice explicitamente:
//
//   "Vacunas / antiparasitarios: SOLO la dosis mas reciente manda
//    (regla del proyecto). Una dosis antigua cuya 'proxima' ya vencio
//    NO debe marcar la seccion como vencida si despues se aplico otra
//    dosis con su proxima fecha aun vigente."
//
// La vista del veterinario tambien la aplica. El dashboard no: pedia
// todas las dosis con proxima_fecha de hoy en adelante y tomaba LA MAS
// CERCANA, sin mirar cual se aplico ultimo.
//
// Resultado: la dosis vieja (proxima fecha hoy) le ganaba a la recien
// aplicada (proxima fecha en un mes), y el aviso no se iba nunca.
//
// EL ARREGLO
// Se ordena por fecha_aplicacion descendente y se toma la primera. Si
// su proxima fecha ya paso, no se muestra nada — que es lo correcto:
// una dosis vencida no es un "proximo".
//
// Aplica a VACUNAS y a ANTIPARASITARIOS: las dos consultas tenian el
// mismo problema.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/dashboard/page.tsx';

const PARES = [
  {
    nombre: 'consulta de vacunas',
    viejo: "    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),",
    nuevo: [
      "    // Se ordena por FECHA DE APLICACION, no por proxima_fecha: manda",
      "    // la dosis mas reciente, como en Prevencion y en la vista del",
      "    // veterinario. Antes ganaba la de fecha mas cercana, asi que una",
      "    // dosis vieja seguia avisando aunque ya se hubiera aplicado otra.",
      "    supabase.from('vacunas').select('nombre,fecha_aplicacion,proxima_fecha').eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false }).limit(20),",
    ].join('\n'),
  },
  {
    nombre: 'consulta de antiparasitarios',
    viejo: "    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),",
    nuevo: "    supabase.from('antiparasitarios').select('nombre,fecha_aplicacion,proxima_fecha').eq('mascota_id', m.id).order('fecha_aplicacion', { ascending: false }).limit(20),",
  },
  {
    nombre: 'eleccion de la dosis vigente',
    viejo: [
      "  const proximaVacuna = vacunas?.[0]",
      "  const proximoAnti = antis?.[0]",
    ].join('\n'),
    nuevo: [
      "  // Solo la dosis MAS RECIENTE manda. Si su proxima fecha ya paso,",
      "  // no se muestra nada: una dosis vencida no es un \"proximo\", y",
      "  // Prevencion ya la marca como vencida en su propia seccion.",
      "  const dosisVigente = (lista: any[] | null) => {",
      "    const masReciente = (lista || [])[0]",
      "    if (!masReciente?.proxima_fecha) return null",
      "    return masReciente.proxima_fecha >= hoy ? masReciente : null",
      "  }",
      "  const proximaVacuna = dosisVigente(vacunas)",
      "  const proximoAnti = dosisVigente(antis)",
    ].join('\n'),
  },
];

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

if (contenido.includes('const dosisVigente')) {
  abortar('el dashboard ya aplica la regla de la dosis mas reciente. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

const ESPERADOS = [
  'const dosisVigente =',
  'const proximaVacuna = dosisVigente(vacunas)',
  'const proximoAnti = dosisVigente(antis)',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las dos consultas tienen que traer fecha_aplicacion, o no se puede
// saber cual es la mas reciente.
if (contar(contenido, "select('nombre,fecha_aplicacion,proxima_fecha')") !== 2) {
  abortar('alguna consulta quedo sin traer la fecha de aplicacion.');
}
if (contenido.includes("gte('proxima_fecha', hoy).order('proxima_fecha')")) {
  abortar('quedo una consulta con el orden viejo.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El dashboard ya sigue la misma regla que Prevencion.');
