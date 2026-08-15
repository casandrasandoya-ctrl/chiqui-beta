const fs = require('fs');
const path = require('path');

// ============================================================
// generar_407_minutos_mes_racha.js
// ============================================================
// El cubo de racha pasa a mostrar dos datos, como el diseño:
//
//   🔥  63d
//       4h 20m este mes
//
// LOS MINUTOS DEL MES
// Se calculan con EL MISMO criterio de Analisis, no uno parecido: mes
// calendario (dia 1 a hoy), minutos exactos cuando el tutor los
// capturo, y el promedio del rango cuando no. Si los dos usaran
// criterios distintos, la app se contradiria a si misma — que es
// justo el bug que arreglamos en la vista del veterinario.
//
// MES CALENDARIO, NO 30 DIAS MOVILES. Hay un comentario en Analisis
// explicando por que: con una ventana movil el total BAJA al avanzar
// los dias, porque va soltando registros por atras. Con mes calendario
// se resetea el dia 1 y solo sube.
//
// LA RACHA EN FORMATO CORTO: "63d" en vez de "63 días", igual que el
// resto de los cubos.
//
// Los dias sin duracion registrada suman cero. Analisis lo advierte
// explicitamente; aca no cabe el aviso, pero el numero es el mismo.
//
// REQUISITOS: scripts 405 y 406 desplegados.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_DASH = 'app/dashboard/page.tsx';
const RUTA_COMP = 'components/DashboardContenido.tsx';

// --- 1. Calcular los minutos en el dashboard
const CALCULO = [
  "",
  "  // --- Minutos de paseo del MES CALENDARIO (dia 1 -> hoy) ---",
  "  // Mismo criterio que Analisis, para que los dos numeros coincidan:",
  "  // minutos exactos cuando el tutor los capturo, y el promedio del",
  "  // rango cuando no. Mes calendario y no 30 dias moviles porque con",
  "  // una ventana movil el total BAJA al avanzar los dias.",
  "  let minutosPaseoMes = 0",
  "  if (m.especie === 'Perro') {",
  "    const MIN_POR_RANGO: Record<string, number> = { '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180 }",
  "    const inicioMes = hoy.slice(0, 7) + '-01'",
  "    const { data: paseosMes } = await supabase",
  "      .from('registros_diarios')",
  "      .select('fecha, paseo, paseo_minutos_exactos')",
  "      .eq('mascota_id', m.id)",
  "      .gte('fecha', inicioMes)",
  "      .lte('fecha', hoy)",
  "    minutosPaseoMes = (paseosMes || []).reduce((acc: number, r: any) => {",
  "      if (typeof r.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0) {",
  "        return acc + r.paseo_minutos_exactos",
  "      }",
  "      return acc + (MIN_POR_RANGO[r.paseo] || 0)",
  "    }, 0)",
  "  }",
].join('\n');

const PROP_VIEJA = 'ultimoPeso={ultimoPeso}';
const PROP_NUEVA = 'ultimoPeso={ultimoPeso} minutosPaseoMes={minutosPaseoMes}';

// --- 2. Mostrarlo en el cubo
const CUBO_VIEJO = [
  "            lineas: rachaPaseo === 0",
  "              ? [{ k: 'r', texto: 'Sin racha activa' }]",
  "              : [",
  "                  { k: 'r', texto: `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'}`, grande: true },",
  "                  ...(rachaEnRiesgo ? [{ k: 'a', texto: '¡pasea hoy!', alerta: true }] : []),",
  "                ],",
].join('\n');

const CUBO_NUEVO = [
  "            // Formato corto igual que el resto de los cubos, y debajo",
  "            // los minutos del mes — que se resetean el día 1.",
  "            lineas: [",
  "              ...(rachaPaseo === 0",
  "                ? [{ k: 'r', texto: 'Sin racha' }]",
  "                : [{ k: 'r', texto: `${rachaPaseo}d`, grande: true }]),",
  "              ...(rachaEnRiesgo && rachaPaseo > 0 ? [{ k: 'a', texto: '¡pasea hoy!', alerta: true }] : []),",
  "              ...((minutosPaseoMes || 0) > 0",
  "                ? [{ k: 'm', texto: `${fmtDuracionMes(minutosPaseoMes || 0)} este mes` }]",
  "                : []),",
  "            ],",
].join('\n');

// --- 3. El formateador
const FMT_ANCLA = "        const textoDias = (d: number) => {";
const FMT_NUEVO = [
  "        // 95 minutos -> \"1h 35m\". Mismo formato que Analisis.",
  "        const fmtDuracionMes = (min: number): string => {",
  "          if (min < 60) return `${min} min`",
  "          const h = Math.floor(min / 60)",
  "          const r = min % 60",
  "          return r > 0 ? `${h}h ${r}m` : `${h}h`",
  "        }",
  "",
  "        const textoDias = (d: number) => {",
].join('\n');

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoDash = path.join(process.cwd(), RUTA_DASH);
const destinoComp = path.join(process.cwd(), RUTA_COMP);

for (const [ruta, destino] of [[RUTA_DASH, destinoDash], [RUTA_COMP, destinoComp]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let dash = fs.readFileSync(destinoDash, 'utf8');
let comp = fs.readFileSync(destinoComp, 'utf8');

if (dash.includes('minutosPaseoMes')) {
  abortar('los minutos del mes ya estan. Parece que este script ya se corrio.');
}
if (!comp.includes("'/chiqui/racha.png'")) {
  abortar('no encontro los cubos del script 405. Correlo primero.');
}

// --- Calculo, justo despues de la racha de paseo
const ANCLA_CALCULO = "  // Racha de REGISTROS DIARIOS consecutivos";
if (contar(dash, ANCLA_CALCULO) !== 1) {
  abortar('no encontre donde insertar el calculo de minutos.');
}
console.log('  OK  punto del calculo');
dash = dash.replace(ANCLA_CALCULO, CALCULO + '\n' + ANCLA_CALCULO);

// --- Prop
const nProp = contar(dash, PROP_VIEJA);
console.log('  ' + (nProp === 1 ? 'OK ' : 'X  ') + 'prop al componente -> ' + nProp + ' coincidencia(s)');
if (nProp !== 1) {
  abortar('esperaba 1 coincidencia de la prop y encontre ' + nProp + '.');
}
dash = dash.split(PROP_VIEJA).join(PROP_NUEVA);

// --- Tipo y recepcion en el componente
const ANCLA_TIPO = '  ultimoPeso?: { fecha: string; peso: number } | null';
if (contar(comp, ANCLA_TIPO) !== 1) {
  abortar('no encontre el tipo de ultimoPeso en el componente.');
}
comp = comp.replace(ANCLA_TIPO, ANCLA_TIPO + '\n  minutosPaseoMes?: number');
console.log('  OK  tipo de la prop nueva');

const ANCLA_RECIBE = 'ultimoPeso, ultimaVisitaVet,';
if (contar(comp, ANCLA_RECIBE) !== 1) {
  abortar('no encontre donde recibir la prop nueva.');
}
comp = comp.replace(ANCLA_RECIBE, 'ultimoPeso, ultimaVisitaVet, minutosPaseoMes,');
console.log('  OK  recepcion de la prop');

// --- Formateador
if (contar(comp, FMT_ANCLA) !== 1) {
  abortar('no encontre donde poner el formateador.');
}
comp = comp.replace(FMT_ANCLA, FMT_NUEVO);
console.log('  OK  formateador de duracion');

// --- El cubo
const nCubo = contar(comp, CUBO_VIEJO);
console.log('  ' + (nCubo === 1 ? 'OK ' : 'X  ') + 'lineas del cubo de racha -> ' + nCubo + ' coincidencia(s)');
if (nCubo !== 1) {
  abortar('esperaba 1 coincidencia del cubo y encontre ' + nCubo + '.');
}
comp = comp.split(CUBO_VIEJO).join(CUBO_NUEVO);

// --- Verificaciones finales
const ESPERADOS_DASH = ['let minutosPaseoMes = 0', "MIN_POR_RANGO[r.paseo]"];
for (const e of ESPERADOS_DASH) {
  if (contar(dash, e) !== 1) {
    abortar('la verificacion del dashboard fallo para [' + e + '].');
  }
}
const ESPERADOS_COMP = ['const fmtDuracionMes', 'este mes`'];
for (const e of ESPERADOS_COMP) {
  if (contar(comp, e) !== 1) {
    abortar('la verificacion del componente fallo para [' + e + '].');
  }
}
// El formateador tiene que quedar ANTES de su uso.
if (comp.indexOf('const fmtDuracionMes') > comp.indexOf('fmtDuracionMes(minutosPaseoMes')) {
  abortar('el formateador quedaria despues de usarse.');
}

fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('');
console.log('OK: ' + RUTA_DASH);
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('OK: ' + RUTA_COMP);
console.log('');
console.log('Listo. La racha muestra los dias y los minutos del mes.');
