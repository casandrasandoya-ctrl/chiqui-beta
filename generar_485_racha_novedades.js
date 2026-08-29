const fs = require('fs');
const path = require('path');

// ============================================================
// generar_485_racha_novedades.js
// ============================================================
// EL DESCUADRE: Novedades decia 79 dias de racha y el modal 49.
//
// LA VERDAD, confirmada con SQL sobre la base real:
//   88 registros en total, 19 de ellos rellenados despues.
//   El 10 de julio se registro el 11 a las 09:15 de la mañana.
//   Del 11 de julio al 28 de agosto son exactamente 49 dias.
//
// El modal tenia razon. Novedades contaba CUALQUIER dia registrado, sin
// importar cuando se anoto, asi que un dia rellenado despues mantenia
// una racha que en realidad ya se habia cortado.
//
// EL ARREGLO
// El dashboard pasa a usar la misma regla: un dia cuenta para la racha
// solo si se registro ESE MISMO DIA en hora de Chile.
//
// El dato rellenado se guarda igual y aparece en el calendario, en el
// analisis y en el resumen del veterinario. Solo no cuenta para la
// constancia.
//
// AVISO IMPORTANTE
// Al desplegar esto, los usuarios que hayan rellenado dias veran su
// racha BAJAR. En el caso de prueba, de 79 a 49. Vale la pena avisarles
// antes de que lo noten solos.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/dashboard/page.tsx';

const VIEJO = "    const { data: ultimosRegistros } = await supabase\n      .from('registros_diarios')\n      .select('fecha')\n      .eq('mascota_id', m.id)\n      .order('fecha', { ascending: false })\n      .limit(2000)\n    const fechasRegistro = new Set((ultimosRegistros || []).map((r: any) => r.fecha as string))";
const NUEVO = "    // created_at ademas de fecha: un dia solo cuenta para la racha si se\n    // registro ESE MISMO DIA. Rellenar el lunes desde el martes deja el\n    // dato guardado \u2014sirve igual para el historial\u2014 pero no recupera la\n    // racha: la racha mide constancia, no completitud.\n    //\n    // Sin esto, Novedades mostraba 79 dias cuando la racha real era 49:\n    // contaba dias rellenados despues como si hubieran sido puntuales.\n    const { data: ultimosRegistros } = await supabase\n      .from('registros_diarios')\n      .select('fecha, created_at')\n      .eq('mascota_id', m.id)\n      .order('fecha', { ascending: false })\n      .limit(2000)\n    const enChileFecha = (d: Date) =>\n      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)\n    const fechasRegistro = new Set(\n      (ultimosRegistros || [])\n        .filter((r: any) => {\n          if (!r.created_at) return true\n          // created_at viene en UTC; se compara en hora de Chile.\n          return enChileFecha(new Date(r.created_at)) === String(r.fecha).slice(0, 10)\n        })\n        .map((r: any) => r.fecha as string)\n    )";

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

if (c.includes('enChileFecha')) {
  abortar('la racha de Novedades ya es estricta. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'calculo de rachaRegistros -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
if (!c.includes("select('fecha, created_at')")) {
  abortar('la consulta no quedo pidiendo created_at.');
}
if (!c.includes('enChileFecha(new Date(r.created_at))')) {
  abortar('la comparacion de fechas no quedo aplicada.');
}
// La racha de PASEOS no debe haberse tocado: es otra cosa.
if (contar(c, 'fechasConPaseo') < 1) {
  abortar('se perdio el calculo de la racha de paseos.');
}
console.log('  OK  la racha de paseos quedo intacta');

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: los usuarios que hayan rellenado dias veran su racha bajar.');
console.log('En tu caso, de 79 a 49. Conviene avisarles antes.');
console.log('');
console.log('Listo. Las dos pantallas cuentan igual.');
