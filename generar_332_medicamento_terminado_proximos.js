const fs = require('fs');
const path = require('path');

// ============================================================
// generar_332_medicamento_terminado_proximos.js
// ============================================================
// EL PROBLEMA
// En el grid "Proximos" del dashboard aparecia un medicamento cuyo
// tratamiento YA TERMINO (ej: amoxicilina con fecha_fin 27 de julio),
// solo porque tenia un proximo_control agendado a futuro.
//
// LA CAUSA
// Toda la app usa la misma regla DERIVADA para saber si un tratamiento
// sigue vigente:
//
//     estado === 'activo'  Y  (sin fecha_fin  O  fecha_fin >= hoy)
//
// Existe porque el campo `estado` no se actualiza solo cuando llega la
// fecha de termino — es un bug historico ya documentado en el codigo.
// Esa regla esta aplicada en Prevencion, en la vista del veterinario,
// en el registro diario y en las novedades del dashboard.
//
// Pero la consulta que alimenta el grid "Proximos" se quedo fuera:
// pedia los medicamentos solo por proximo_control >= hoy, sin mirar ni
// el estado ni la fecha de termino. Era la unica de todas.
//
// LA SOLUCION
//  1. La consulta ahora filtra por estado='activo' y tambien trae
//     fecha_fin para poder aplicar la regla completa.
//  2. El limite sube de 2 a 5: como despues se descartan los
//     terminados, con solo 2 candidatos podia quedarse sin ninguno
//     valido y no mostrar un medicamento que si estaba vigente.
//  3. Se elige el primero que pase la regla, en vez del primero a secas.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/dashboard/page.tsx';

const PARES = [
  {
    nombre: 'consulta de medicamentos con control',
    viejo: "    supabase.from('medicamentos').select('nombre,proximo_control').eq('mascota_id', m.id).gte('proximo_control', hoy).order('proximo_control').limit(2),",
    nuevo: "    supabase.from('medicamentos').select('nombre,proximo_control,fecha_fin').eq('mascota_id', m.id).eq('estado', 'activo').gte('proximo_control', hoy).order('proximo_control').limit(5),",
  },
  {
    nombre: 'eleccion del proximo medicamento',
    viejo: "  const proximoMed = medsConControl?.[0]",
    nuevo: [
      "  // Mismo criterio DERIVADO que usa el resto de la app: no basta",
      "  // con estado='activo' en la base, porque ese campo no se",
      "  // actualiza solo. Si fecha_fin ya paso, el tratamiento termino.",
      "  // Sin este filtro, un medicamento terminado seguia apareciendo en",
      "  // \"Proximos\" solo porque tenia un control agendado a futuro.",
      "  const proximoMed = (medsConControl || []).find((md: any) => !md.fecha_fin || md.fecha_fin >= hoy)",
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

if (contenido.includes("select('nombre,proximo_control,fecha_fin')")) {
  abortar('el archivo ya tiene el filtro. Parece que este script ya se corrio.');
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

// Verificaciones finales
const ESPERADOS = [
  "select('nombre,proximo_control,fecha_fin')",
  "const proximoMed = (medsConControl || []).find(",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('const proximoMed = medsConControl?.[0]')) {
  abortar('la linea vieja de proximoMed sigue presente.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los tratamientos terminados ya no aparecen en Proximos.');
