const fs = require('fs');
const path = require('path');

// ============================================================
// generar_342_panel_mes_anio_calendario.js
// ============================================================
// EL CAMBIO DE FONDO
// Hasta ahora "Mes" significaba "los ultimos 30 dias" y "Año" "los
// ultimos 365": ventanas moviles que se corren solas con el tiempo.
// Ahora son periodos de CALENDARIO: julio 2026 empieza el 1 y termina
// el 31, y se puede navegar mes a mes o año a año.
//
// La SEMANA se deja como ventana movil (ultimos 7 dias), porque ahi lo
// util es "como venimos", no "que paso en la semana 31 del año".
//
// QUE AFECTA
// Todas las metricas del periodo: personas activas, registros, cuentas
// y mascotas nuevas, y el grafico. El embudo y las funciones usadas no
// cambian, porque son historicos (ya lo dicen en su titulo).
//
// EL GRAFICO se adapta:
//   - semana: 7 barras, una por dia
//   - mes: una barra por cada dia del mes elegido (28 a 31)
//   - año: 12 barras, una por mes
//
// A DIFERENCIA DEL SELECTOR DE DIA, este si recarga la pagina. Es una
// decision consciente: cambiar de mes es algo ocasional, y precargar
// todos los meses posibles para evitar la recarga costaria mucho mas
// de lo que ahorra.
//
// La fecha de la URL se valida (formato y que no sea futura); cualquier
// otra cosa cae de vuelta en el mes o año actual.
//
// REQUISITO: scripts 337 a 341 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Aceptar los parametros de mes y año
  // ---------------------------------------------------------
  {
    nombre: 'parametros de mes y año',
    viejo: [
      "interface Props {",
      "  searchParams: { p?: string; d?: string }",
      "}",
    ].join('\n'),
    nuevo: [
      "interface Props {",
      "  searchParams: { p?: string; m?: string; y?: string }",
      "}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Periodos de calendario en vez de ventanas moviles
  // ---------------------------------------------------------
  {
    nombre: 'calculo del periodo',
    viejo: [
      "  const periodo: Periodo =",
      "    searchParams?.p === 'mes' ? 'mes' : searchParams?.p === 'anio' ? 'anio' : 'semana'",
      "  const diasPeriodo = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 365",
      "  const desde = restarDias(diasPeriodo - 1)",
      "  const hoy = fechaChile()",
    ].join('\n'),
    nuevo: [
      "  const hoy = fechaChile()",
      "  const periodo: Periodo =",
      "    searchParams?.p === 'mes' ? 'mes' : searchParams?.p === 'anio' ? 'anio' : 'semana'",
      "",
      "  // Mes y año son de CALENDARIO: julio 2026 empieza el 1 y termina",
      "  // el 31. La semana se deja como ventana movil (ultimos 7 dias),",
      "  // porque ahi lo util es \"como venimos\", no \"la semana 31 del año\".",
      "  //",
      "  // Los parametros se validan por formato y se limitan a no ser",
      "  // futuros; cualquier otra cosa cae de vuelta en el actual.",
      "  const mParam = searchParams?.m || ''",
      "  const yParam = searchParams?.y || ''",
      "  const mesSel = /^\\d{4}-\\d{2}$/.test(mParam) && mParam <= hoy.slice(0, 7) ? mParam : hoy.slice(0, 7)",
      "  const anioSel = /^\\d{4}$/.test(yParam) && yParam <= hoy.slice(0, 4) ? yParam : hoy.slice(0, 4)",
      "",
      "  let desde: string",
      "  let hasta: string",
      "  if (periodo === 'mes') {",
      "    const [ay, am] = mesSel.split('-').map(Number)",
      "    // Ultimo dia del mes: nunca hardcodear 31. new Date(año, mes, 0)",
      "    // devuelve el ultimo dia del mes anterior al indice dado.",
      "    const ultimoDia = new Date(ay, am, 0).getDate()",
      "    desde = `${mesSel}-01`",
      "    hasta = `${mesSel}-${String(ultimoDia).padStart(2, '0')}`",
      "  } else if (periodo === 'anio') {",
      "    desde = `${anioSel}-01-01`",
      "    hasta = `${anioSel}-12-31`",
      "  } else {",
      "    desde = restarDias(6)",
      "    hasta = hoy",
      "  }",
      "",
      "  // Navegacion entre periodos",
      "  const desplazarMes = (ym: string, n: number) => {",
      "    const [a, m] = ym.split('-').map(Number)",
      "    const d = new Date(a, m - 1 + n, 1)",
      "    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`",
      "  }",
      "  const linkPeriodo = (n: number) =>",
      "    periodo === 'mes'",
      "      ? `/admin?p=mes&m=${desplazarMes(mesSel, n)}`",
      "      : `/admin?p=anio&y=${Number(anioSel) + n}`",
      "  const puedeAvanzar = periodo === 'mes'",
      "    ? desplazarMes(mesSel, 1) <= hoy.slice(0, 7)",
      "    : Number(anioSel) < Number(hoy.slice(0, 4))",
      "  const etiquetaPeriodo = periodo === 'mes'",
      "    ? `${MESES_LARGO[Number(mesSel.slice(5, 7)) - 1]} ${mesSel.slice(0, 4)}`",
      "    : anioSel",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Los filtros respetan el fin del periodo
  // ---------------------------------------------------------
  {
    nombre: 'filtros del periodo',
    viejo: [
      "  const regsPeriodo = regs.filter((r: any) => r.fecha >= desde && r.fecha <= hoy)",
      "  const activosPeriodo = new Set(regsPeriodo.map((r: any) => r.user_id))",
      "  const nuevasCuentas = TODOS.filter((u: any) => (u.created_at || '').slice(0, 10) >= desde)",
      "  const nuevasMascotas = masc.filter((m: any) => (m.created_at || '').slice(0, 10) >= desde)",
    ].join('\n'),
    nuevo: [
      "  // Ahora los tres filtros usan desde Y hasta. Antes solo miraban",
      "  // \"desde\", lo que estaba bien con ventanas moviles que siempre",
      "  // terminaban hoy, pero contaria de mas al mirar un mes pasado.",
      "  const regsPeriodo = regs.filter((r: any) => r.fecha >= desde && r.fecha <= hasta)",
      "  const activosPeriodo = new Set(regsPeriodo.map((r: any) => r.user_id))",
      "  const enRango = (iso: string) => {",
      "    const f = (iso || '').slice(0, 10)",
      "    return f >= desde && f <= hasta",
      "  }",
      "  const nuevasCuentas = TODOS.filter((u: any) => enRango(u.created_at))",
      "  const nuevasMascotas = masc.filter((m: any) => enRango(m.created_at))",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. El grafico se adapta al periodo elegido
  // ---------------------------------------------------------
  {
    nombre: 'serie del grafico',
    viejo: [
      "    for (let i = 11; i >= 0; i--) {",
      "      const d = new Date()",
      "      d.setMonth(d.getMonth() - i)",
      "      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`",
      "      serie.push({ etiqueta: MESES[d.getMonth()], valor: porMes.get(k)?.size || 0 })",
      "    }",
    ].join('\n'),
    nuevo: [
      "    // Los 12 meses del año elegido, de enero a diciembre.",
      "    for (let m = 1; m <= 12; m++) {",
      "      const k = `${anioSel}-${String(m).padStart(2, '0')}`",
      "      serie.push({ etiqueta: MESES[m - 1], valor: porMes.get(k)?.size || 0 })",
      "    }",
    ].join('\n'),
  },
  {
    nombre: 'barras por dia del periodo',
    viejo: [
      "    const paso = periodo === 'semana' ? 1 : 3",
      "    for (let i = diasPeriodo - 1; i >= 0; i -= paso) {",
      "      const f = restarDias(i)",
      "      serie.push({ etiqueta: fmtFecha(f), valor: porDia.get(f)?.size || 0 })",
      "    }",
    ].join('\n'),
    nuevo: [
      "    // Una barra por cada dia del periodo, recorriendo de desde a",
      "    // hasta. En la semana se rotula con dia/mes; en el mes basta el",
      "    // numero del dia, o no cabe.",
      "    let f = desde",
      "    while (f <= hasta) {",
      "      serie.push({",
      "        etiqueta: periodo === 'semana' ? fmtFecha(f) : String(Number(f.slice(8, 10))),",
      "        valor: porDia.get(f)?.size || 0,",
      "      })",
      "      f = sumarDias(f, 1)",
      "    }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. Los tabs conservan el mes y el año elegidos
  // ---------------------------------------------------------
  {
    nombre: 'tabs conservan mes y año',
    viejo: "      href={`/admin?p=${v}`}",
    nuevo: "      href={`/admin?p=${v}&m=${mesSel}&y=${anioSel}`}",
  },

  // ---------------------------------------------------------
  // 6. La barra de navegacion
  // ---------------------------------------------------------
  {
    nombre: 'barra de navegacion del periodo',
    viejo: [
      '      <div className="grid grid-cols-2 gap-2.5 mx-4 mb-4">',
    ].join('\n'),
    nuevo: [
      "      {/* Navegacion de periodo. La semana no la lleva: es una",
      "          ventana movil, no un periodo de calendario. */}",
      "      {periodo !== 'semana' && (",
      '        <div className="flex items-center justify-between mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] px-2 py-2">',
      '          <a href={linkPeriodo(-1)} className="text-lg text-[#8C572F] px-3">◀</a>',
      '          <p className="text-sm font-bold text-[#3D2B1F] capitalize">{etiquetaPeriodo}</p>',
      "          {puedeAvanzar ? (",
      '            <a href={linkPeriodo(1)} className="text-lg text-[#8C572F] px-3">▶</a>',
      "          ) : (",
      '            <span className="text-lg text-[#EEE2D4] px-3">▶</span>',
      "          )}",
      "        </div>",
      "      )}",
      "",
      '      <div className="grid grid-cols-2 gap-2.5 mx-4 mb-4">',
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
  abortar('no se encontro ' + RUTA + '. Corre primero los scripts 337 a 341.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('mesSel')) {
  abortar('el panel ya tiene los periodos de calendario. Parece que este script ya se corrio.');
}
if (!contenido.includes('otrosPorFecha')) {
  abortar('falta la otra actividad. Corre primero el script 341.');
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
  'const mesSel =',
  'const anioSel =',
  'let hasta: string',
  'const linkPeriodo =',
  '{etiquetaPeriodo}',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// diasPeriodo ya no existe: si quedara una referencia, el build falla
if (contenido.includes('diasPeriodo')) {
  abortar('quedo una referencia a diasPeriodo, que ya no existe.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Mes y año ahora son de calendario y se pueden navegar.');
