const fs = require('fs');
const path = require('path');

// ============================================================
// generar_338_panel_registros_hoy.js
// ============================================================
// Tres cambios en el panel /admin:
//
//  1. "Usuarias" -> "Usuarios".
//
//  2. La lista de usuarios pasa a ser DESPLEGABLE. Con 24 filas ocupaba
//     media pantalla y empujaba todo lo demas hacia abajo. Se usa
//     <details>, el mismo elemento que ya usa la vista del veterinario:
//     no necesita JavaScript ni convertir la pagina en client component.
//
//  3. Seccion nueva REGISTROS DE HOY, arriba del embudo: quienes
//     registraron hoy, con sus mascotas. Replica la planilla que
//     Casandra lleva a mano, que ademas es la evidencia que Google
//     Play pide para pasar de closed testing a produccion (12+ testers
//     activos durante 14 dias seguidos).
//     Solo aparecen quienes SI registraron; los que no, no se listan.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Fecha en formato largo
  // ---------------------------------------------------------
  {
    nombre: 'formato de fecha larga',
    viejo: "const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']",
    nuevo: [
      "const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']",
      "const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']",
      "const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']",
      "",
      "// Se construye a MEDIODIA para que el cambio de horario de verano",
      "// no corra el dia de la semana.",
      "function fmtFechaLarga(iso: string): string {",
      "  const d = new Date(iso + 'T12:00:00')",
      "  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`",
      "}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Quiénes registraron hoy
  // ---------------------------------------------------------
  {
    nombre: 'calculo de registros de hoy',
    viejo: "  // ---------- Serie para el gráfico ----------",
    nuevo: [
      "  // ---------- Quiénes registraron hoy ----------",
      "  // Replica la planilla que se lleva a mano. Es tambien la",
      "  // evidencia que pide Google Play para salir de closed testing:",
      "  // testers activos de verdad, dia a dia.",
      "  const nombrePorUsuario = new Map<string, string>(TODOS.map((u: any) => [u.id, u.nombre || u.email || '(sin nombre)']))",
      "  const ayer = restarDias(1)",
      "",
      "  const juntarPorUsuario = (fecha: string) => {",
      "    const mapa = new Map<string, string[]>()",
      "    for (const r of regs) {",
      "      if (r.fecha !== fecha) continue",
      "      const arr = mapa.get(r.user_id) || []",
      "      const mm = mascPorId.get(r.mascota_id)",
      "      if (mm && !arr.includes(mm.nombre)) arr.push(mm.nombre)",
      "      mapa.set(r.user_id, arr)",
      "    }",
      "    return mapa",
      "  }",
      "",
      "  const hoyPorUsuario = juntarPorUsuario(hoy)",
      "  const ayerPorUsuario = juntarPorUsuario(ayer)",
      "  const listaHoy = Array.from(hoyPorUsuario.entries())",
      "    .map(([uid, mascotasDia]) => ({ nombre: nombrePorUsuario.get(uid) || '(sin nombre)', mascotasDia }))",
      "    .sort((a, b) => a.nombre.localeCompare(b.nombre))",
      "",
      "  // ---------- Serie para el gráfico ----------",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. La sección visible, antes del embudo
  // ---------------------------------------------------------
  {
    nombre: 'seccion de registros de hoy',
    viejo: '      <Seccion titulo="Embudo de activación (histórico)">',
    nuevo: [
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
      "",
      '      <Seccion titulo="Embudo de activación (histórico)">',
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Lista de usuarios: nombre y desplegable
  // ---------------------------------------------------------
  {
    nombre: 'apertura de la lista de usuarios',
    viejo: [
      '      <Seccion titulo={`Usuarias (${filas.length})`}>',
      '        <div className="space-y-2.5">',
    ].join('\n'),
    nuevo: [
      '      <Seccion titulo={`Usuarios (${filas.length})`}>',
      "        {/* Desplegable: con dos docenas de filas, la lista abierta",
      "            empujaba todo lo demas fuera de la pantalla. <details> no",
      "            necesita JavaScript, asi que la pagina sigue siendo un",
      "            componente de servidor. */}",
      "        <details>",
      '          <summary className="text-xs font-semibold text-[#8C572F] cursor-pointer list-none mb-2">',
      "            Ver los {filas.length} usuarios ▼",
      "          </summary>",
      '          <div className="space-y-2.5">',
    ].join('\n'),
  },
  {
    nombre: 'cierre de la lista de usuarios',
    viejo: [
      "            )",
      "          })}",
      "        </div>",
      "      </Seccion>",
    ].join('\n'),
    nuevo: [
      "            )",
      "          })}",
      "          </div>",
      "        </details>",
      "      </Seccion>",
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
  abortar('no se encontro ' + RUTA + '. Corre primero el script 337.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('Registros de hoy')) {
  abortar('el panel ya tiene la seccion de hoy. Parece que este script ya se corrio.');
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
  'function fmtFechaLarga',
  'const hoyPorUsuario',
  '"Registros de hoy"',
  'Usuarios (${filas.length})',
  '</details>',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('Usuarias')) {
  abortar('quedo el titulo viejo en femenino.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El panel ya muestra quien registro hoy.');
