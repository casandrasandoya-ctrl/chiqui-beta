const fs = require('fs');
const path = require('path');

// ============================================================
// generar_394_motivo_con_duracion.js
// ============================================================
// LO QUE FALTABA (idea de Casandra, tras una consulta real)
// El motivo de consulta decia "Vomito" — sin decir si fue un dia o
// siete, ni si fue seguido o intermitente. Y eso cambia el motivo de
// consulta por completo: un vomito diario apunta a algo distinto que
// uno dia por medio.
//
// LA CAUSA
// La funcion juntaba las señales en un Set:
//
//   senales.add(valoresLabel[val])
//
// Un Set descarta los repetidos. Tres dias de vomito se guardaban como
// una sola entrada, y la informacion de CUANTOS dias se perdia ahi
// mismo.
//
// LO QUE SE GANA
// Este es el dato que un tutor NO puede reconstruir de memoria. En la
// consulta uno dice "como tres dias" y fueron cinco, o dice "seguido"
// cuando fue dia por medio. La app tiene las fechas exactas.
//
// COMO QUEDA
//   Vomito 3 dias seguidos
//   Cojera 4 de los ultimos 7 dias, intermitente
//   Energia baja (ayer)
//
// SEGUIDO vs INTERMITENTE
// Se calcula la racha mas larga de dias consecutivos. Si esa racha
// cubre todas las veces que aparecio, es continuo. Si no, es
// intermitente — y eso el veterinario lo lee distinto.
//
// SE ORDENA POR RELEVANCIA: primero lo que lleva mas dias. Un sintoma
// de cinco dias pesa mas que uno de ayer, y antes el orden dependia de
// en que campo estuviera.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/vet/page.tsx';

const VIEJO = [
  "  for (const r of recientes) {",
  "    for (const [campo, valoresLabel] of Object.entries(CAMPOS_LABEL)) {",
  "      const val = r[campo]",
  "      if (val && valoresLabel[val]) senales.add(valoresLabel[val])",
  "    }",
  "    if (r.estado_dia === 'rojo' || r.estado_dia === 'naranjo') senales.add('Días con estado de alerta reciente')",
  "  }",
  "  return Array.from(senales).slice(0, 6)",
].join('\n');

const NUEVO = [
  "  // En qué FECHAS apareció cada señal. Antes se usaba un Set, que",
  "  // descarta los repetidos: tres días de vómito quedaban como una",
  "  // sola entrada y se perdía justo el dato que importa.",
  "  const fechasPorSenal = new Map<string, string[]>()",
  "  for (const r of recientes) {",
  "    for (const [campo, valoresLabel] of Object.entries(CAMPOS_LABEL)) {",
  "      const val = r[campo]",
  "      if (val && valoresLabel[val]) {",
  "        const etiqueta = valoresLabel[val]",
  "        const lista = fechasPorSenal.get(etiqueta) || []",
  "        if (!lista.includes(r.fecha)) lista.push(r.fecha)",
  "        fechasPorSenal.set(etiqueta, lista)",
  "      }",
  "    }",
  "    if (r.estado_dia === 'rojo' || r.estado_dia === 'naranjo') {",
  "      const lista = fechasPorSenal.get('Días con estado de alerta reciente') || []",
  "      if (!lista.includes(r.fecha)) lista.push(r.fecha)",
  "      fechasPorSenal.set('Días con estado de alerta reciente', lista)",
  "    }",
  "  }",
  "",
  "  // Racha más larga de días consecutivos. Se construye a MEDIODÍA para",
  "  // que los cambios de horario de verano no rompan el conteo.",
  "  const rachaMasLarga = (fechas: string[]): number => {",
  "    const orden = fechas.slice().sort()",
  "    let mejor = 1",
  "    let actual = 1",
  "    for (let i = 1; i < orden.length; i++) {",
  "      const previa = new Date(orden[i - 1] + 'T12:00:00')",
  "      const esta = new Date(orden[i] + 'T12:00:00')",
  "      const dif = Math.round((esta.getTime() - previa.getTime()) / 86400000)",
  "      if (dif === 1) { actual++; if (actual > mejor) mejor = actual }",
  "      else actual = 1",
  "    }",
  "    return orden.length > 0 ? mejor : 0",
  "  }",
  "",
  "  const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
  "",
  "  const conDuracion = Array.from(fechasPorSenal.entries()).map(([etiqueta, fechas]) => {",
  "    const n = fechas.length",
  "    const racha = rachaMasLarga(fechas)",
  "    let texto: string",
  "    if (n === 1) {",
  "      // Un solo día: decir CUÁNDO fue vale más que decir \"1 día\".",
  "      const d = diasDesde(fechas[0])",
  "      const cuando = fechas[0] === hoyStr ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`",
  "      texto = `${etiqueta} (${cuando})`",
  "    } else if (racha === n) {",
  "      // Todas las apariciones fueron consecutivas.",
  "      texto = `${etiqueta} ${n} días seguidos`",
  "    } else {",
  "      // Intermitente: el veterinario lo lee distinto que lo continuo.",
  "      texto = `${etiqueta} ${n} de los últimos 7 días, intermitente`",
  "    }",
  "    return { texto, n }",
  "  })",
  "",
  "  // Primero lo que lleva más días: un síntoma de cinco días pesa más",
  "  // que uno de ayer. Antes el orden dependía de en qué campo estuviera.",
  "  conDuracion.sort((a, b) => b.n - a.n)",
  "  return conDuracion.slice(0, 6).map(x => x.texto)",
].join('\n');

const AVISO_VIEJO = '          <p className="text-[11px] text-[#8A7560] mb-2">Basado en los últimos 7 días:</p>';
const AVISO_NUEVO = '          <p className="text-[11px] text-[#8A7560] mb-2">Según lo registrado por el tutor en los últimos 7 días:</p>';

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

if (contenido.includes('fechasPorSenal')) {
  abortar('el motivo de consulta ya incluye la duracion. Parece que este script ya se corrio.');
}
// diasDesde se usa en el texto de un solo dia.
if (!contenido.includes('function diasDesde') && !contenido.includes('diasDesde(')) {
  abortar('no encontre la funcion diasDesde. El archivo no es el esperado.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'deteccion del motivo -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}
contenido = contenido.split(VIEJO).join(NUEVO);

const nAviso = contar(contenido, AVISO_VIEJO);
console.log('  ' + (nAviso === 1 ? 'OK ' : '--  ') + 'aviso de la seccion -> ' + nAviso + ' coincidencia(s)');
if (nAviso === 1) {
  contenido = contenido.split(AVISO_VIEJO).join(AVISO_NUEVO);
}

const ESPERADOS = [
  'const fechasPorSenal',
  'const rachaMasLarga',
  'días seguidos`',
  'intermitente`',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// El Set viejo no puede seguir usandose: si quedara, la variable
// 'senales' estaria declarada y sin uso, y el orden se perderia.
if (contenido.includes('senales.add(')) {
  abortar('quedo el Set viejo que descartaba los repetidos.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: la variable "senales" quedo declarada y sin uso. No rompe');
console.log('el build (es un aviso, no un error), pero si Vercel te marca algo,');
console.log('avisale a Claude y te paso la linea para quitarla.');
console.log('');
console.log('Listo. El motivo de consulta ya dice cuantos dias y si fue seguido.');
