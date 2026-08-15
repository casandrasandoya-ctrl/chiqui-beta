const fs = require('fs');
const path = require('path');

// ============================================================
// generar_403_datos_cubos.js
// ============================================================
// PASO 1 de 2 de los cubos de cuidados. Este script NO cambia nada
// visible: solo trae los datos que faltan.
//
// LO QUE DESCUBRIMOS
// "Control de peso" mostraba el dia pero no los kilos, porque la
// seccion lee de los CUIDADOS del registro diario —donde solo se marca
// que se peso— y no de historial_peso, que es donde esta el numero.
//
// QUE SE AGREGA
//   - ultimoPeso: fecha y kilos del ultimo control registrado.
//   - ultimaVisitaVet: fecha de la ultima visita PASADA. Las futuras ya
//     estan en Novedades y en Proximos; aqui interesa cuando fue la
//     ultima, no cuando es la proxima.
//
// Las dos consultas van dentro del Promise.all que ya existe, asi que
// no agregan tiempo de carga: viajan junto a las demas.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/dashboard/page.tsx';

const VIEJO = [
  "  const [{ data: regCampos }, { data: ultimoPesoReg }] = await Promise.all([",
  "    supabase.from('registros_diarios').select('fecha,apetito,agua,heces').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(60),",
  "    supabase.from('historial_peso').select('fecha').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(1),",
  "  ])",
].join('\n');

const NUEVO = [
  "  const [{ data: regCampos }, { data: ultimoPesoReg }, { data: visitasPasadas }] = await Promise.all([",
  "    supabase.from('registros_diarios').select('fecha,apetito,agua,heces').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(60),",
  "    // Se trae tambien el PESO, no solo la fecha: la seccion de cuidados",
  "    // mostraba el dia del control pero no los kilos, porque leia de los",
  "    // cuidados del registro diario y el numero vive aqui.",
  "    supabase.from('historial_peso').select('fecha, peso').eq('mascota_id', m.id).order('fecha', { ascending: false }).limit(1),",
  "    // Ultima visita PASADA al veterinario. Las futuras ya estan en",
  "    // Novedades y en Proximos; aqui interesa cuando fue la ultima.",
  "    supabase.from('visitas_veterinarias').select('fecha').eq('mascota_id', m.id).lte('fecha', hoy).order('fecha', { ascending: false }).limit(1),",
  "  ])",
  "",
  "  // Datos para los cubos de cuidados recientes.",
  "  const ultimoPeso = ultimoPesoReg && ultimoPesoReg[0]",
  "    ? { fecha: ultimoPesoReg[0].fecha as string, peso: ultimoPesoReg[0].peso as number }",
  "    : null",
  "  const ultimaVisitaVet = visitasPasadas && visitasPasadas[0]",
  "    ? (visitasPasadas[0].fecha as string)",
  "    : null",
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

if (contenido.includes('const ultimaVisitaVet')) {
  abortar('los datos ya estan. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'consulta de campos y peso -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

// --- Verificaciones
const ESPERADOS = [
  'const ultimoPeso =',
  'const ultimaVisitaVet =',
  "select('fecha, peso')",
  "from('visitas_veterinarias')",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// diasSinCampo usa ultimoPesoReg: si se hubiera roto esa parte, el
// recordatorio de peso dejaria de funcionar.
if (!contenido.includes('ultimoPesoReg && ultimoPesoReg[0]?.fecha')) {
  abortar('se altero el calculo de diasSinCampo. No deberia haber cambiado.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: ultimoPeso y ultimaVisitaVet quedan declarados y todavia');
console.log('sin uso — los usa el script siguiente. Eso genera un aviso de');
console.log('variable sin usar, pero NO rompe el build.');
console.log('');
console.log('Listo. Los datos ya estan disponibles para los cubos.');
