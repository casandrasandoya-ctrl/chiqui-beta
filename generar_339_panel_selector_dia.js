const fs = require('fs');
const path = require('path');

// ============================================================
// generar_339_panel_selector_dia.js
// ============================================================
// La seccion "Registros de hoy" pasa a ser "Registros por dia": se
// puede elegir que dia mirar.
//
// COMO, SIN JAVASCRIPT
// El dia elegido viaja en la URL (?d=2026-08-02), asi que la pagina
// sigue siendo un componente de servidor: no hace falta convertirla en
// client component ni usar un input de fecha. Flechas para moverse dia
// a dia, y un enlace para volver a hoy.
//
// LA TIRA DE 14 DIAS
// Ademas del dia elegido, se muestra una tira con los 14 dias que
// terminan en el: cada uno con su numero de usuarios activos y un
// color. Es la misma ventana que Google Play exige demostrar para
// pasar de closed testing a produccion (12+ testers activos durante 14
// dias seguidos), asi que sirve de evidencia y de navegacion a la vez.
//
// Verde desde 12 usuarios, amarillo desde 6, naranjo desde 1, gris si
// nadie registro ese dia.
//
// SEGURIDAD DEL PARAMETRO
// La fecha de la URL se valida: tiene que tener formato YYYY-MM-DD y no
// puede ser futura. Cualquier otra cosa cae de vuelta en hoy. Nunca se
// interpola directo en una consulta.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Helper para moverse entre dias
  // ---------------------------------------------------------
  {
    nombre: 'helper para sumar dias',
    viejo: [
      "function fmtFechaLarga(iso: string): string {",
      "  const d = new Date(iso + 'T12:00:00')",
      "  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`",
      "}",
    ].join('\n'),
    nuevo: [
      "function fmtFechaLarga(iso: string): string {",
      "  const d = new Date(iso + 'T12:00:00')",
      "  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`",
      "}",
      "",
      "// Mediodia otra vez: sumar o restar 24 horas sobre medianoche se",
      "// cae en los cambios de horario de verano.",
      "function sumarDias(iso: string, n: number): string {",
      "  const d = new Date(iso + 'T12:00:00')",
      "  d.setDate(d.getDate() + n)",
      "  return fechaChile(d)",
      "}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Leer el dia de la URL
  // ---------------------------------------------------------
  {
    nombre: 'parametro del dia',
    viejo: [
      "interface Props {",
      "  searchParams: { p?: string }",
      "}",
    ].join('\n'),
    nuevo: [
      "interface Props {",
      "  searchParams: { p?: string; d?: string }",
      "}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Calcular el dia elegido y la tira
  // ---------------------------------------------------------
  {
    nombre: 'calculo del dia elegido',
    viejo: [
      "  const hoyPorUsuario = juntarPorUsuario(hoy)",
      "  const ayerPorUsuario = juntarPorUsuario(ayer)",
      "  const listaHoy = Array.from(hoyPorUsuario.entries())",
      "    .map(([uid, mascotasDia]) => ({ nombre: nombrePorUsuario.get(uid) || '(sin nombre)', mascotasDia }))",
      "    .sort((a, b) => a.nombre.localeCompare(b.nombre))",
    ].join('\n'),
    nuevo: [
      "  // Dia elegido desde la URL. Se valida el formato y que no sea",
      "  // futuro; cualquier otra cosa cae de vuelta en hoy.",
      "  const dParam = searchParams?.d || ''",
      "  const dValido = /^\\d{4}-\\d{2}-\\d{2}$/.test(dParam) && dParam <= hoy",
      "  const diaSel = dValido ? dParam : hoy",
      "  const esHoy = diaSel === hoy",
      "",
      "  const diaPorUsuario = juntarPorUsuario(diaSel)",
      "  const ayerPorUsuario = juntarPorUsuario(sumarDias(diaSel, -1))",
      "  const listaDia = Array.from(diaPorUsuario.entries())",
      "    .map(([uid, mascotasDia]) => ({ nombre: nombrePorUsuario.get(uid) || '(sin nombre)', mascotasDia }))",
      "    .sort((a, b) => a.nombre.localeCompare(b.nombre))",
      "",
      "  // Tira de 14 dias terminando en el elegido: es la ventana que",
      "  // Google Play pide demostrar para salir de closed testing.",
      "  const activosPorFecha = new Map<string, Set<string>>()",
      "  for (const r of regs) {",
      "    if (!activosPorFecha.has(r.fecha)) activosPorFecha.set(r.fecha, new Set())",
      "    activosPorFecha.get(r.fecha)!.add(r.user_id)",
      "  }",
      "  const tira = Array.from({ length: 14 }, (_, i) => {",
      "    const f = sumarDias(diaSel, -(13 - i))",
      "    return { fecha: f, dia: Number(f.slice(8, 10)), n: activosPorFecha.get(f)?.size || 0 }",
      "  })",
      "  const colorDia = (n: number) => n >= 12 ? '#4CAF7D' : n >= 6 ? '#F5C842' : n >= 1 ? '#F07A30' : '#EEE2D4'",
      "  const linkDia = (f: string) => `/admin?p=${periodo}&d=${f}`",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. La seccion, ahora navegable
  // ---------------------------------------------------------
  {
    nombre: 'seccion de registros por dia',
    viejo: [
      '      <Seccion titulo="Registros de hoy">',
      '        <p className="text-xs text-[#8A7560] capitalize">{fmtFechaLarga(hoy)}</p>',
      '        <p className="font-bold text-2xl mt-0.5" style={{ color: listaHoy.length > 0 ? \'#4CAF7D\' : \'#B5A38F\' }}>',
      '          {listaHoy.length} <span className="text-sm font-normal text-[#8A7560]">de {TODOS.length} usuarios</span>',
      "        </p>",
      "        {listaHoy.length === 0 ? (",
      '          <p className="text-xs text-[#8A7560] mt-2">Todavía nadie ha registrado hoy.</p>',
      "        ) : (",
      '          <div className="mt-3 space-y-1.5">',
      "            {listaHoy.map((f, i) => (",
      '              <div key={i} className="flex items-baseline justify-between gap-2">',
      '                <p className="text-xs text-[#3D2B1F] truncate">{f.nombre}</p>',
      '                <p className="text-[10px] text-[#8A7560] flex-shrink-0 truncate">🐾 {f.mascotasDia.join(\', \')}</p>',
      "              </div>",
      "            ))}",
      "          </div>",
      "        )}",
      '        <p className="text-[10px] text-[#8A7560] mt-3 pt-2 border-t border-[#EEE2D4]">',
      "          Ayer registraron {ayerPorUsuario.size} {ayerPorUsuario.size === 1 ? 'usuario' : 'usuarios'}",
      "        </p>",
      "      </Seccion>",
    ].join('\n'),
    nuevo: [
      '      <Seccion titulo="Registros por día">',
      "        {/* Tira de 14 días: navegación y, a la vez, la evidencia",
      "            que Google Play pide (12+ testers activos por 14 días",
      "            seguidos). Verde desde 12, amarillo desde 6. */}",
      '        <div className="flex gap-0.5 mb-3">',
      "          {tira.map(t => (",
      '            <a key={t.fecha} href={linkDia(t.fecha)} className="flex-1 text-center rounded-lg py-1"',
      "              style={t.fecha === diaSel",
      "                ? { background: colorDia(t.n), border: '2px solid #3D2B1F' }",
      "                : { background: colorDia(t.n) }}>",
      '              <span className="block text-[8px] text-[#3D2B1F]/70">{t.dia}</span>',
      '              <span className="block text-[11px] font-bold text-[#3D2B1F]">{t.n}</span>',
      "            </a>",
      "          ))}",
      "        </div>",
      "",
      '        <div className="flex items-center justify-between gap-2">',
      '          <a href={linkDia(sumarDias(diaSel, -1))} className="text-lg text-[#8C572F] px-2">◀</a>',
      '          <div className="text-center flex-1">',
      '            <p className="text-xs text-[#8A7560] capitalize">{fmtFechaLarga(diaSel)}{esHoy ? \' · hoy\' : \'\'}</p>',
      '            <p className="font-bold text-2xl mt-0.5" style={{ color: listaDia.length > 0 ? \'#4CAF7D\' : \'#B5A38F\' }}>',
      '              {listaDia.length} <span className="text-sm font-normal text-[#8A7560]">de {TODOS.length}</span>',
      "            </p>",
      "          </div>",
      "          {esHoy ? (",
      '            <span className="text-lg text-[#EEE2D4] px-2">▶</span>',
      "          ) : (",
      '            <a href={linkDia(sumarDias(diaSel, 1))} className="text-lg text-[#8C572F] px-2">▶</a>',
      "          )}",
      "        </div>",
      "",
      "        {listaDia.length === 0 ? (",
      '          <p className="text-xs text-[#8A7560] mt-2 text-center">',
      "            {esHoy ? 'Todavía nadie ha registrado hoy.' : 'Nadie registró ese día.'}",
      "          </p>",
      "        ) : (",
      '          <div className="mt-3 space-y-1.5">',
      "            {listaDia.map((f, i) => (",
      '              <div key={i} className="flex items-baseline justify-between gap-2">',
      '                <p className="text-xs text-[#3D2B1F] truncate">{f.nombre}</p>',
      '                <p className="text-[10px] text-[#8A7560] flex-shrink-0 truncate">🐾 {f.mascotasDia.join(\', \')}</p>',
      "              </div>",
      "            ))}",
      "          </div>",
      "        )}",
      "",
      '        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EEE2D4]">',
      '          <p className="text-[10px] text-[#8A7560]">',
      "            El día anterior: {ayerPorUsuario.size} {ayerPorUsuario.size === 1 ? 'usuario' : 'usuarios'}",
      "          </p>",
      "          {!esHoy && (",
      '            <a href={linkDia(hoy)} className="text-[10px] font-bold text-[#CD7421]">Volver a hoy</a>',
      "          )}",
      "        </div>",
      "      </Seccion>",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. Los tabs de periodo deben conservar el dia elegido
  // ---------------------------------------------------------
  {
    nombre: 'tabs conservan el dia elegido',
    viejo: "      href={`/admin?p=${v}`}",
    nuevo: "      href={`/admin?p=${v}&d=${diaSel}`}",
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
  abortar('no se encontro ' + RUTA + '. Corre primero los scripts 337 y 338.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('Registros por día')) {
  abortar('el panel ya tiene el selector de dia. Parece que este script ya se corrio.');
}
if (!contenido.includes('juntarPorUsuario')) {
  abortar('falta la seccion de registros de hoy. Corre primero el script 338.');
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
  'function sumarDias',
  'const diaSel =',
  'const tira =',
  '"Registros por día"',
  'Volver a hoy',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// No puede quedar ninguna referencia a las variables viejas
for (const v of ['listaHoy', 'hoyPorUsuario']) {
  if (contenido.includes(v)) {
    abortar('quedo una referencia a ' + v + ', que ya no existe.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya puedes elegir el dia y ver los ultimos 14.');
