const fs = require('fs');
const path = require('path');

// ============================================================
// generar_442_datos_del_chat.js
// ============================================================
// Le pasa al chat los datos que le faltaban. Antes respondia "no hay
// registro" sobre el peso, las vacunas y los antiparasitarios cuando
// SI estaban — solo que en otra pantalla.
//
// QUE SE AGREGA
//   PESO: el ultimo control y el anterior, para poder decir cuanto
//   subio o bajo.
//   VACUNAS Y ANTIPARASITARIOS: solo la dosis mas reciente de cada
//   tipo (la regla del proyecto), con los dias que faltan o que
//   llevan vencidos.
//   EXAMENES: los ultimos cinco, solo para decir que existen.
//   CUIDADOS: cuando fue el ultimo baño, cuanto falta para comprar
//   alimento, cuando toca el dispensador. Sale de los registros
//   diarios que ya estan cargados, calculando cada cuanto suele
//   hacerse cada cosa.
//
// Y LOS PASEOS pasan al MES CALENDARIO. Antes decia "este mes" pero
// calculaba 30 dias moviles: en agosto contestaba con dias de julio.
// Se usa paseoHistorial, que ya trae meses completos justamente por
// esto.
//
// REQUISITOS: scripts 437, 439 y 440 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  { nombre: 'estados nuevos', viejo: "  const [visitasVet, setVisitasVet] = useState<string[]>([])", nuevo: "  const [visitasVet, setVisitasVet] = useState<string[]>([])\n  // Datos que el chat necesita y que esta pantalla no cargaba: sin\n  // ellos respondia \"no hay registro\" sobre cosas que s\u00ed estaban.\n  const [pesoChat, setPesoChat] = useState<{ actual: number; fecha: string; anterior?: number | null } | null>(null)\n  const [vacunasChat, setVacunasChat] = useState<any[]>([])\n  const [antisChat, setAntisChat] = useState<any[]>([])\n  const [examenesChat, setExamenesChat] = useState<any[]>([])" },
  { nombre: 'funcion que carga los datos', viejo: "  async function cargarVisitas(mascotaId: string) {", nuevo: "  // Peso, vacunas, antiparasitarios y ex\u00e1menes. Viven en Salud, pero el\n  // chat los necesita: antes respond\u00eda \"no hay registro\" sobre datos que\n  // s\u00ed exist\u00edan, que es peor que no responder.\n  //\n  // Solo la dosis M\u00c1S RECIENTE de cada vacuna o antiparasitario, que es\n  // la regla del proyecto: una reemplazada por otra m\u00e1s nueva no cuenta.\n  async function cargarDatosChat(mascotaId: string) {\n    const [{ data: pesos }, { data: vac }, { data: ant }, { data: exs }] = await Promise.all([\n      supabase.from('historial_peso').select('peso, fecha').eq('mascota_id', mascotaId).order('fecha', { ascending: false }).limit(2),\n      supabase.from('vacunas').select('nombre, fecha_aplicacion, proxima_fecha').eq('mascota_id', mascotaId).order('fecha_aplicacion', { ascending: false }),\n      supabase.from('antiparasitarios').select('nombre, fecha_aplicacion, proxima_fecha').eq('mascota_id', mascotaId).order('fecha_aplicacion', { ascending: false }),\n      supabase.from('examenes').select('nombre, categoria, fecha').eq('mascota_id', mascotaId).order('fecha', { ascending: false }).limit(5),\n    ])\n\n    if (pesos && pesos.length > 0) {\n      const d = new Date(String(pesos[0].fecha).slice(0, 10) + 'T12:00:00')\n      setPesoChat({\n        actual: pesos[0].peso,\n        fecha: `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`,\n        anterior: pesos.length > 1 ? pesos[1].peso : null,\n      })\n    }\n\n    // Una sola por nombre: la m\u00e1s reciente.\n    const masReciente = (lista: any[] | null) => {\n      const porNombre = new Map<string, any>()\n      for (const x of (lista || [])) {\n        const k = (x.nombre || '').toLowerCase().trim()\n        if (!porNombre.has(k)) porNombre.set(k, x)\n      }\n      return Array.from(porNombre.values())\n    }\n    setVacunasChat(masReciente(vac))\n    setAntisChat(masReciente(ant))\n    setExamenesChat(exs || [])\n  }\n\n  async function cargarVisitas(mascotaId: string) {" },
  { nombre: 'llamada a la carga', viejo: "    await cargarVisitas(m.id)", nuevo: "    await cargarVisitas(m.id)\n    await cargarDatosChat(m.id)" },
  // El JSX se reemplaza por la referencia; el CALCULO va aparte, antes
  // del return. Meterlo dentro del JSX rompe el archivo: ahi no puede
  // haber declaraciones.
  { nombre: 'uso del chat en el JSX', viejo: "      {mascota && total > 0 && (\n        <ChiquiChat datos={{\n          nombre: mascota.nombre || 'tu mascota',\n          especie: mascota.especie || '',\n          // Los episodios salen de los insights: son las mismas frases\n          // que ya se muestran en \"Lo observado este mes\", sin el \u00edcono.\n          episodios: insights.filter(i => i.icon === '\ud83d\udd0d').map(i => i.text),\n          totalRegistros: total,\n          pctBien,\n          textoPeriodo,\n          paseosMes: esPerro && actividadChiqui && actividadChiqui.promedioDia > 0\n            ? { cantidad: registros.filter(r => r.paseo && r.paseo !== 'no_paseo').length,\n                minutos: Math.round(actividadChiqui.promedioDia * periodo) }\n            : null,\n          // El peso y las vacunas viven en Salud: el chat lo dice en vez\n          // de afirmar que no est\u00e1n registrados.\n          peso: null,\n          medicamentos: (medsVigentes || []).map((m: any) => ({\n            nombre: m.nombre || 'Medicamento',\n            desde: m.fecha_inicio || '',\n          })),\n          proximaVacuna: null,\n          proximoAnti: null,\n          examenes: [],\n        }} />\n      )}", nuevo: "      {mascota && total > 0 && (\n        <ChiquiChat datos={datosChat} />\n      )}" },
];

// El calculo de datosChat, que va antes del return.
const CALCULO = "\n  // --- Datos para el chat ---\n  // Se arma ac\u00e1 y no en el JSX para que se lea: son bastantes fuentes.\n  const MESES_CHAT = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']\n  const hoyChat = fechaChile()\n  const inicioMesChat = hoyChat.slice(0, 7) + '-01'\n\n  const diasHastaChat = (f: string | null): number | null => {\n    if (!f) return null\n    // Mediod\u00eda: restar d\u00edas sobre medianoche se cae en los cambios de\n    // horario de verano.\n    const a = new Date(hoyChat + 'T12:00:00').getTime()\n    const b = new Date(String(f).slice(0, 10) + 'T12:00:00').getTime()\n    return Math.round((b - a) / 86400000)\n  }\n  const fmtChat = (f: string | null): string => {\n    if (!f) return ''\n    const d = new Date(String(f).slice(0, 10) + 'T12:00:00')\n    return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`\n  }\n\n  // Paseos del MES CALENDARIO, no de 30 d\u00edas m\u00f3viles: \"este mes\" tiene\n  // que significar agosto. Se usa paseoHistorial, que ya trae meses\n  // completos justamente por esto.\n  const paseosDelMes = (paseoHistorial || []).filter((r: any) =>\n    r.fecha >= inicioMesChat && r.fecha <= hoyChat && r.paseo && r.paseo !== 'no_paseo'\n  )\n  const MIN_RANGO_CHAT: Record<string, number> = { '10_30min': 20, '30min_1h': 45, '1_2h': 90, '2_4h': 180 }\n  const minutosDelMes = paseosDelMes.reduce((acc: number, r: any) =>\n    acc + (typeof r.paseo_minutos_exactos === 'number' && r.paseo_minutos_exactos > 0\n      ? r.paseo_minutos_exactos\n      : (MIN_RANGO_CHAT[r.paseo] || 0)), 0)\n\n  // Cuidados: cu\u00e1ndo fue la \u00faltima vez y cada cu\u00e1nto suele hacerse. Las\n  // palabras van SIN tildes ni \u00f1, porque se comparan contra texto\n  // normalizado \u2014 'ban' cubre ba\u00f1\u00e9, ba\u00f1ar y ba\u00f1o.\n  const CUIDADOS_CHAT: { campo: string; label: string; palabras: string[] }[] = [\n    { campo: 'se_bano', label: 'Ba\u00f1o', palabras: ['ban', 'ducha'] },\n    { campo: 'corte_unas', label: 'Corte de u\u00f1as', palabras: ['una', 'unas', 'garra'] },\n    { campo: 'limpieza_dental', label: 'Limpieza dental', palabras: ['diente', 'dental', 'cepill'] },\n    { campo: 'limpieza_oidos', label: 'Limpieza de o\u00eddos', palabras: ['oido', 'oreja'] },\n    { campo: 'compro_alimento', label: 'Compra de alimento', palabras: ['comida', 'alimento', 'comprar', 'saco', 'croqueta'] },\n    { campo: 'cambio_alimento', label: 'Cambio de alimento', palabras: ['cambio de alimento', 'cambiar alimento'] },\n    { campo: 'cargo_dispensador', label: 'Dispensador', palabras: ['dispensador'] },\n    { campo: 'peino', label: 'Cepillado', palabras: ['peina', 'peino', 'cepillar el pelo'] },\n  ]\n  const cuidadosChat = CUIDADOS_CHAT.map(c => {\n    const fechas = (registros || [])\n      .filter((r: any) => r[c.campo])\n      .map((r: any) => String(r.fecha).slice(0, 10))\n      .sort()\n      .reverse()\n    if (fechas.length === 0) return null\n    const dias = Math.abs(diasHastaChat(fechas[0]) || 0)\n    // Cada cu\u00e1nto: el promedio entre las \u00faltimas veces. Con una sola\n    // vez registrada no hay intervalo que calcular.\n    let cada: number | null = null\n    if (fechas.length >= 2) {\n      const difs: number[] = []\n      for (let i = 0; i < Math.min(fechas.length - 1, 5); i++) {\n        const d1 = new Date(fechas[i] + 'T12:00:00').getTime()\n        const d2 = new Date(fechas[i + 1] + 'T12:00:00').getTime()\n        difs.push(Math.round((d1 - d2) / 86400000))\n      }\n      const prom = Math.round(difs.reduce((a, b) => a + b, 0) / difs.length)\n      if (prom > 0) cada = prom\n    }\n    return { label: c.label, palabras: c.palabras, diasDesde: dias, cadaCuantos: cada }\n  }).filter(Boolean) as { label: string; palabras: string[]; diasDesde: number; cadaCuantos: number | null }[]\n\n  const datosChat = {\n    nombre: mascota?.nombre || 'tu mascota',\n    especie: mascota?.especie || '',\n    // Los episodios salen de los insights: las mismas frases que ya se\n    // muestran, sin el \u00edcono.\n    episodios: insights.filter(i => i.icon === '\ud83d\udd0d').map(i => i.text),\n    totalRegistros: total,\n    pctBien,\n    textoPeriodo,\n    paseosMes: esPerro\n      ? { cantidad: paseosDelMes.length, minutos: minutosDelMes, nombreMes: MESES_CHAT[Number(hoyChat.slice(5, 7)) - 1] }\n      : null,\n    peso: pesoChat,\n    medicamentos: (medsVigentes || []).map((m: any) => ({\n      nombre: m.nombre || 'Medicamento',\n      desde: fmtChat(m.fecha_inicio),\n    })),\n    vacunas: (vacunasChat || []).map((v: any) => ({\n      nombre: v.nombre || 'Vacuna',\n      proxima: v.proxima_fecha ? fmtChat(v.proxima_fecha) : null,\n      dias: diasHastaChat(v.proxima_fecha),\n    })),\n    antiparasitarios: (antisChat || []).map((a: any) => ({\n      nombre: a.nombre || 'Antiparasitario',\n      proxima: a.proxima_fecha ? fmtChat(a.proxima_fecha) : null,\n      dias: diasHastaChat(a.proxima_fecha),\n    })),\n    cuidados: cuidadosChat,\n    examenes: (examenesChat || []).map((e: any) => ({\n      nombre: e.nombre || e.tipo || e.categoria || 'Examen',\n      fecha: fmtChat(e.fecha),\n    })),\n  }";

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

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('cargarDatosChat')) {
  abortar('los datos ya estan. Parece que este script ya se corrio.');
}
if (!c.includes('visitasVet')) {
  abortar('falta el script 439. Correlo primero.');
}
// paseoHistorial es lo que permite contar el mes calendario.
if (!c.includes('paseoHistorial')) {
  abortar('no encontre paseoHistorial. Avisale a Claude.');
}
console.log('  OK  paseoHistorial existe');

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- El calculo va ANTES del return, no dentro del JSX
const ANCLA_RETURN = '  return (';
const posReturn = c.indexOf(ANCLA_RETURN);
if (posReturn === -1) {
  abortar('no encontre el return del componente.');
}
c = c.slice(0, posReturn) + CALCULO + '\n\n' + c.slice(posReturn);
console.log('  OK  calculo insertado antes del return');

// --- Verificaciones
const ESPERADOS = ['async function cargarDatosChat', 'const cuidadosChat', 'const paseosDelMes', 'nombreMes:'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (!c.includes('await cargarDatosChat(m.id)')) {
  abortar('la carga no se llama: los datos quedarian vacios.');
}
if (contar(c, '<ChiquiChat datos={datosChat} />') !== 1) {
  abortar('el chat no quedo conectado al objeto de datos.');
}
// El calculo tiene que quedar ANTES del JSX que lo usa.
if (c.indexOf('const datosChat = {') > c.indexOf('<ChiquiChat datos={datosChat}')) {
  abortar('el objeto quedaria declarado despues de usarse.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El chat ya tiene el peso, las vacunas y los cuidados.');
