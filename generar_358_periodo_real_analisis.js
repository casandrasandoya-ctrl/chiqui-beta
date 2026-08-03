const fs = require('fs');
const path = require('path');

// ============================================================
// generar_358_periodo_real_analisis.js
// ============================================================
// EL BUG (reportado por un usuario)
// Analisis dice "durante los ultimos 30 dias" SIEMPRE, incluso a
// alguien que empezo a usar la app ayer. La causa:
//
//     const [periodo, setPeriodo] = useState(30)
//
// Fijo en 30, y setPeriodo no se llama en ninguna parte.
//
// LO QUE SI SE ARREGLA Y LO QUE NO
// Los calculos SI miran una ventana de 30 dias, y eso esta bien: es el
// periodo que se consulta. Lo que esta mal es AFIRMAR que se observo a
// la mascota durante 30 dias cuando lleva dos. Por eso no se toca
// ningun calculo — solo lo que se dice.
//
// COMO SE CALCULA
// Se mide desde el PRIMER registro que hay en la ventana hasta hoy. Si
// alguien empezo ayer, son 2 dias. Si lleva meses, se topa en 30, que
// es lo que abarca la consulta.
//
// Se escribe distinto segun el caso:
//   30 o mas  -> "los ultimos 30 dias"
//   entre 2 y 29 -> "los ultimos N dias"
//   1         -> "el unico dia registrado"
//   0         -> "el periodo" (no hay registros; igual no se muestra
//                el resumen)
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Calcular los dias realmente cubiertos
  // ---------------------------------------------------------
  {
    nombre: 'calculo del periodo real',
    viejo: "  const pctBien = total > 0 ? Math.round((verdes / total) * 100) : 0",
    nuevo: [
      "  const pctBien = total > 0 ? Math.round((verdes / total) * 100) : 0",
      "",
      "  // --- Días realmente cubiertos por los registros ---",
      "  // La consulta trae una ventana de 30 días y eso está bien, pero",
      "  // el texto decía \"durante los últimos 30 días\" incluso a quien",
      "  // empezó ayer. Se mide desde el primer registro que hay hasta hoy.",
      "  // Las fechas se construyen a mediodía para que los cambios de",
      "  // horario de verano no corran el conteo.",
      "  const diasCubiertos = (() => {",
      "    if (registros.length === 0) return 0",
      "    const fechas = registros.map(r => r.fecha).filter(Boolean).sort()",
      "    const primera = new Date(fechas[0] + 'T12:00:00')",
      "    const hoyD = new Date(fechaChile(new Date()) + 'T12:00:00')",
      "    const d = Math.round((hoyD.getTime() - primera.getTime()) / 86400000) + 1",
      "    return Math.max(1, Math.min(30, d))",
      "  })()",
      "",
      "  // Con \"los\" delante, para frases tipo \"Durante ___\".",
      "  const textoPeriodo =",
      "    diasCubiertos === 0 ? 'el período'",
      "    : diasCubiertos === 1 ? 'el único día registrado'",
      "    : diasCubiertos >= 30 ? 'los últimos 30 días'",
      "    : `los últimos ${diasCubiertos} días`",
      "",
      "  // Sin \"los\", para el encabezado junto al nombre de la mascota.",
      "  const textoPeriodoCorto =",
      "    diasCubiertos === 0 ? 'sin registros aún'",
      "    : diasCubiertos === 1 ? '1 día registrado'",
      "    : diasCubiertos >= 30 ? 'últimos 30 días'",
      "    : `últimos ${diasCubiertos} días`",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Encabezado de la pantalla
  // ---------------------------------------------------------
  {
    nombre: 'encabezado de Analisis',
    viejo: '          <p className="text-xs text-[#8A7560]">{mascota?.nombre} · últimos 30 días</p>',
    nuevo: '          <p className="text-xs text-[#8A7560]">{mascota?.nombre} · {textoPeriodoCorto}</p>',
  },

  // ---------------------------------------------------------
  // 3. Subtitulo de la tarjeta de Chiqui
  // ---------------------------------------------------------
  {
    nombre: 'subtitulo del resumen de Chiqui',
    viejo: '              <p className="text-xs text-[#8A7560]">Sobre los últimos {periodo} días</p>',
    nuevo: '              <p className="text-xs text-[#8A7560]">Sobre {textoPeriodo}</p>',
  },

  // ---------------------------------------------------------
  // 4. Las cuatro frases del resumen
  // ---------------------------------------------------------
  {
    nombre: 'frases del resumen',
    viejo: [
      "    if (signosUltimos30 > 0 || naranjos + rojos >= 3) {",
      "      partes.push(`Durante los últimos ${periodo} días se registraron varios episodios relevantes en ${nombreM}.`)",
      "    } else if (pctBien >= 80) {",
      "      partes.push(`Durante los últimos ${periodo} días, ${nombreM} se mantuvo estable: energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`)",
      "    } else if (pctBien >= 50) {",
      "      partes.push(`Durante los últimos ${periodo} días, ${nombreM} tuvo altibajos: alrededor del ${pctBien}% de los días se registraron con normalidad.`)",
      "    } else {",
      "      partes.push(`Durante los últimos ${periodo} días, la mayoría de los registros de ${nombreM} incluyeron señales que vale la pena revisar.`)",
      "    }",
    ].join('\n'),
    nuevo: [
      "    if (signosUltimos30 > 0 || naranjos + rojos >= 3) {",
      "      partes.push(`Durante ${textoPeriodo} se registraron varios episodios relevantes en ${nombreM}.`)",
      "    } else if (pctBien >= 80) {",
      "      partes.push(`Durante ${textoPeriodo}, ${nombreM} se mantuvo estable: energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`)",
      "    } else if (pctBien >= 50) {",
      "      partes.push(`Durante ${textoPeriodo}, ${nombreM} tuvo altibajos: alrededor del ${pctBien}% de los días se registraron con normalidad.`)",
      "    } else {",
      "      partes.push(`Durante ${textoPeriodo}, la mayoría de los registros de ${nombreM} incluyeron señales que vale la pena revisar.`)",
      "    }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. Los dos insights que tambien lo dicen
  // ---------------------------------------------------------
  {
    nombre: 'insight de signos de alerta',
    viejo: "    if (signosUltimos30 > 0) insights.push({ icon: '🚨', text: `${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta en los últimos 30 días. Revisa el detalle más abajo y coméntalo con tu veterinario.`, tipo: 'warn' })",
    nuevo: "    if (signosUltimos30 > 0) insights.push({ icon: '🚨', text: `${signosUltimos30} día${signosUltimos30 === 1 ? '' : 's'} con signos de alerta en ${textoPeriodo}. Revisa el detalle más abajo y coméntalo con tu veterinario.`, tipo: 'warn' })",
  },
  {
    nombre: 'insight de sintomas notables',
    viejo: "    if (naranjos > 0 || rojos > 0) insights.push({ icon: '👁', text: `Se detectaron ${naranjos + rojos} días con síntomas notables en los últimos ${periodo} días. Vale la pena observar.`, tipo: 'warn' })",
    nuevo: "    if (naranjos > 0 || rojos > 0) insights.push({ icon: '👁', text: `Se detectaron ${naranjos + rojos} días con síntomas notables en ${textoPeriodo}. Vale la pena observar.`, tipo: 'warn' })",
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

if (contenido.includes('diasCubiertos')) {
  abortar('el archivo ya calcula el periodo real. Parece que este script ya se corrio.');
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

const ESPERADOS = ['const diasCubiertos', 'const textoPeriodo =', 'const textoPeriodoCorto ='];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Ya no puede quedar ningun texto que afirme 30 dias de forma fija
if (contenido.includes('· últimos 30 días')) {
  abortar('quedo el encabezado con los 30 dias fijos.');
}
if (contenido.includes('en los últimos 30 días. Revisa el detalle')) {
  abortar('quedo el insight con los 30 dias fijos.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Analisis ya dice los dias que de verdad hay registrados.');
