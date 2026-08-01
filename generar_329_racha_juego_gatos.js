const fs = require('fs');
const path = require('path');

// ============================================================
// generar_329_racha_juego_gatos.js
// ============================================================
// PASO 3 del enriquecimiento felino: que se VEA en Analisis.
//
// EL PROBLEMA
// El bloque de enriquecimiento vive dentro de {esPerro && (...)}, la
// seccion "Actividad fisica". Para un gato no se renderiza nada,
// aunque las filas ya se esten guardando desde el script 327.
//
// LA SOLUCION
// Una seccion propia para gatos, en vez de sacar el bloque de perros
// de su contenedor (eso obligaria a desarmar un JSX grande, con riesgo
// de desbalancear etiquetas). Ademas el marco conceptual es distinto:
// en el perro es ACTIVIDAD FISICA; en el gato es JUEGO Y VINCULO. Un
// gato no necesita salir a caminar, necesita cazar y que su tutor
// juegue con el.
//
// LA RACHA
// Cuenta solo las actividades donde el TUTOR participa: caza,
// entrenamiento, olfato y puzzle. Ventana y rascador quedan fuera
// porque el gato las hace solo — no son vinculo.
//
// Se agrega una consulta de historial COMPLETO de enriquecimiento:
// enriqRegistros solo trae 30 dias, asi que una racha calculada sobre
// el tendria un techo falso de 30.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Estado para el historial completo de enriquecimiento
  // ---------------------------------------------------------
  {
    nombre: 'estado enriqHistorial',
    viejo: "  const [enriqRegistros, setEnriqRegistros] = useState<any[]>([])",
    nuevo: [
      "  const [enriqRegistros, setEnriqRegistros] = useState<any[]>([])",
      "  // Historial COMPLETO de enriquecimiento (no los 30 dias de",
      "  // enriqRegistros): la racha de juego de los gatos se cuenta",
      "  // sobre el, para que no tenga un techo artificial de 30 dias.",
      "  const [enriqHistorial, setEnriqHistorial] = useState<any[]>([])",
      "  const [abiertoJuegoGato, setAbiertoJuegoGato] = useState(false)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Consulta del historial completo
  // ---------------------------------------------------------
  {
    nombre: 'consulta del historial de enriquecimiento',
    viejo: "    const [{ data: r }, { data: enr }, { data: hist }] = await Promise.all([",
    nuevo: "    const [{ data: r }, { data: enr }, { data: hist }, { data: enrHist }] = await Promise.all([",
  },
  {
    nombre: 'guardar el historial de enriquecimiento',
    viejo: "    setPaseoHistorial(hist || [])",
    nuevo: [
      "    setPaseoHistorial(hist || [])",
      "    setEnriqHistorial(enrHist || [])",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Calculo de la racha de juego
  // ---------------------------------------------------------
  {
    nombre: 'calculo de la racha de juego',
    viejo: "  const { racha: rachaPaseo, enRiesgo: rachaEnRiesgo } = calcularRachaPaseo()",
    nuevo: [
      "  const { racha: rachaPaseo, enRiesgo: rachaEnRiesgo } = calcularRachaPaseo()",
      "",
      "  // --- Racha de juego (gatos) ---",
      "  // Solo cuentan las actividades donde el TUTOR participa. Ventana",
      "  // y rascador las hace el gato solo: son enriquecimiento, pero no",
      "  // vinculo, y la racha mide justamente eso.",
      "  const ACTIVIDADES_VINCULO = ['caza', 'entrenamiento_felino', 'olfato_felino', 'puzzle_comida']",
      "  function calcularRachaJuego(): { racha: number; enRiesgo: boolean } {",
      "    const hoyStr = fechaChile(new Date())",
      "    const fechasConJuego = new Set(",
      "      (enriqHistorial || [])",
      "        .filter((e: any) => ACTIVIDADES_VINCULO.includes(e.actividad))",
      "        .map((e: any) => e.fecha as string)",
      "    )",
      "    // Igual criterio que la racha de paseo: si hoy todavia no hay",
      "    // juego registrado, la racha no se rompe — se cuenta desde ayer",
      "    // y se marca en riesgo hasta que termine el dia.",
      "    const tieneHoy = fechasConJuego.has(hoyStr)",
      "    let cursor = tieneHoy ? hoyStr : diaAnteriorStr(hoyStr)",
      "    let racha = 0",
      "    while (fechasConJuego.has(cursor)) {",
      "      racha++",
      "      cursor = diaAnteriorStr(cursor)",
      "    }",
      "    return { racha, enRiesgo: !tieneHoy && racha > 0 }",
      "  }",
      "  const { racha: rachaJuego, enRiesgo: juegoEnRiesgo } = calcularRachaJuego()",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. La seccion visible, justo antes de la de perros
  // ---------------------------------------------------------
  {
    nombre: 'seccion Juego y vinculo',
    viejo: "      {/* ACTIVIDAD FÍSICA (solo perros) — contenedor con fondo */}",
    nuevo: [
      "      {/* JUEGO Y VÍNCULO (solo gatos) — contenedor con fondo.",
      "          Equivalente felino de \"Actividad física\", pero con otro",
      "          marco: el gato de interior no necesita caminar, necesita",
      "          cazar y que su tutor juegue con él. */}",
      "      {mascota?.especie === 'Gato' && enriqRegistros.length > 0 && (() => {",
      "        const ACT_GATO: Record<string, { emoji: string; label: string }> = {",
      "          caza: { emoji: '🎣', label: 'Sesión de caza' },",
      "          puzzle_comida: { emoji: '🧩', label: 'Comida en puzzle' },",
      "          vertical: { emoji: '🪜', label: 'Alturas y rascador' },",
      "          entrenamiento_felino: { emoji: '🎓', label: 'Entrenamiento' },",
      "          olfato_felino: { emoji: '👃', label: 'Juegos de olfato' },",
      "          ventana: { emoji: '🪟', label: 'Ventana o mirador' },",
      "        }",
      "        const diasConJuego = new Set(enriqRegistros.map(e => e.fecha)).size",
      "        const porAct: Record<string, { sesiones: number; minutos: number }> = {}",
      "        for (const e of enriqRegistros) {",
      "          const a = (porAct[e.actividad] = porAct[e.actividad] || { sesiones: 0, minutos: 0 })",
      "          a.sesiones++",
      "          a.minutos += e.duracion_min || 0",
      "        }",
      "        const ordenadas = Object.entries(porAct).sort((x, y) => y[1].sesiones - x[1].sesiones)",
      "        // Lo que mas disfruta: el detalle mas repetido entre caza y",
      "        // olfato, que son los que hablan de preferencia real.",
      "        const gustos: Record<string, number> = {}",
      "        for (const e of enriqRegistros) {",
      "          if (e.actividad !== 'caza' && e.actividad !== 'olfato_felino') continue",
      "          for (const d of String(e.detalle || '').split(', ').filter(Boolean)) {",
      "            if (d === 'Otro') continue",
      "            gustos[d] = (gustos[d] || 0) + 1",
      "          }",
      "        }",
      "        const favorito = Object.entries(gustos).sort((x, y) => y[1] - x[1])[0]",
      "        // ¿Hubo caza en los últimos 7 días? De eso depende el consejo",
      "        // de la madrugada, que es el beneficio inmediato y concreto.",
      "        const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)",
      "        const desde7 = fechaChile(hace7)",
      "        const cazoEstaSemana = enriqRegistros.some(e => e.actividad === 'caza' && e.fecha >= desde7)",
      "        const fmtMinG = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? (m % 60) + 'm' : ''}`.trim() : `${m} min`",
      "        return (",
      "          <div className=\"mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3\" style={{ background: '#FBEEDD' }}>",
      "            <div className=\"px-2 mb-2 pt-1\">",
      "              <div className=\"flex items-center gap-2\">",
      "                <img src=\"/chiqui/chiqui_juguetes.png\" alt=\"\" className=\"w-7 h-7 object-contain\" />",
      "                <h2 className=\"text-sm font-bold text-[#8C572F] uppercase tracking-wider\">Juego y vínculo</h2>",
      "              </div>",
      "            </div>",
      "            <div className=\"grid grid-cols-2 gap-2.5 mb-2\">",
      "              <div className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3\">",
      "                <div className=\"flex items-center gap-1.5 mb-1\">",
      "                  <span className=\"text-sm\">🔥</span>",
      "                  <span className=\"text-[10px] text-[#8A7560]\">Racha de juego</span>",
      "                </div>",
      "                <div className=\"font-bold text-lg text-[#3D2B1F]\">{rachaJuego} {rachaJuego === 1 ? 'día' : 'días'}</div>",
      "                {juegoEnRiesgo && rachaJuego > 0 && (",
      "                  <p className=\"text-[10px] text-[#F07A30] mt-0.5 font-semibold\">⚠️ Juega hoy para mantenerla</p>",
      "                )}",
      "              </div>",
      "              <div className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3\">",
      "                <div className=\"flex items-center gap-1.5 mb-1\">",
      "                  <span className=\"text-sm\">📅</span>",
      "                  <span className=\"text-[10px] text-[#8A7560]\">Días con juego</span>",
      "                </div>",
      "                <div className=\"font-bold text-lg text-[#3D2B1F]\">{diasConJuego} <span className=\"text-xs font-normal text-[#8A7560]\">de 30</span></div>",
      "              </div>",
      "            </div>",
      "            {/* Consejo de la madrugada: el único beneficio inmediato",
      "                y para el tutor que tiene la app. Un gato es cazador",
      "                crepuscular; si no descarga esa energía en la tarde,",
      "                despierta a su tutor de madrugada. */}",
      "            {!cazoEstaSemana && (",
      "              <div className=\"rounded-2xl bg-[#FFFCF8] border border-[#EEE2D4] px-3 py-2.5 mb-2\">",
      "                <p className=\"text-[11px] text-[#3D2B1F] leading-relaxed\">",
      "                  🌙 ¿{mascota?.nombre} te despierta de madrugada? Los gatos cazan al amanecer. Una sesión de caza antes de dormir suele ayudar a que la noche sea más tranquila para los dos.",
      "                </p>",
      "              </div>",
      "            )}",
      "            <div className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden\">",
      "              <button type=\"button\" onClick={() => setAbiertoJuegoGato(v => !v)} className=\"w-full flex items-center gap-2 px-4 py-3 text-left\">",
      "                <span className=\"text-sm\">🐾</span>",
      "                <p className=\"flex-1 text-[11px] font-bold text-[#8C572F]\">Actividades de los últimos 30 días</p>",
      "                <span className=\"text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5\">{ordenadas.length}</span>",
      "                <span className=\"text-[#8C572F] text-sm font-bold\">{abiertoJuegoGato ? '▲' : '▼'}</span>",
      "              </button>",
      "              {abiertoJuegoGato && (",
      "                <div className=\"px-4 pb-3 border-t border-[#EEE2D4] pt-2.5\">",
      "                  <div className=\"space-y-1\">",
      "                    {ordenadas.map(([act, datos]) => {",
      "                      const info = ACT_GATO[act] || { emoji: '🐾', label: act }",
      "                      return (",
      "                        <div key={act} className=\"flex items-center justify-between text-[11px]\">",
      "                          <span className=\"text-[#3D2B1F]\">{info.emoji} {info.label}</span>",
      "                          <span className=\"text-[#8A7560]\">",
      "                            {datos.sesiones} {datos.sesiones === 1 ? 'vez' : 'veces'}{datos.minutos > 0 ? ` · ${fmtMinG(datos.minutos)}` : ''}",
      "                          </span>",
      "                        </div>",
      "                      )",
      "                    })}",
      "                  </div>",
      "                  {favorito && favorito[1] >= 2 && (",
      "                    <div className=\"mt-2 pt-2 border-t border-[#EEE2D4]\">",
      "                      <p className=\"text-[11px] text-[#3D2B1F]\">",
      "                        🥇 <span className=\"font-semibold\">Lo que más disfruta:</span> {favorito[0]} ({favorito[1]} {favorito[1] === 1 ? 'vez' : 'veces'})",
      "                      </p>",
      "                    </div>",
      "                  )}",
      "                </div>",
      "              )}",
      "            </div>",
      "          </div>",
      "        )",
      "      })()}",
      "      {/* ACTIVIDAD FÍSICA (solo perros) — contenedor con fondo */}",
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

if (contenido.includes('rachaJuego')) {
  abortar('el archivo ya tiene la racha de juego. Parece que este script ya se corrio.');
}
if (!contenido.includes('caza:')) {
  abortar('faltan las etiquetas felinas. Corre primero el script 328.');
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

// La consulta nueva se agrega DESPUES, porque necesita ir dentro del
// Promise.all cuyo cierre ya quedo ajustado arriba.
const CIERRE_PROMISE = [
  "      supabase",
  "        .from('registros_diarios')",
  "        .select('fecha, paseo, paseo_minutos_exactos')",
  "        .eq('mascota_id', mascotaId)",
  "        .order('fecha', { ascending: true })",
  "        .limit(2000),",
].join('\n');

if (contar(contenido, CIERRE_PROMISE) !== 1) {
  abortar('no encontre la consulta de paseoHistorial para agregar la de enriquecimiento despues.');
}

contenido = contenido.split(CIERRE_PROMISE).join([
  CIERRE_PROMISE,
  "      // Historial COMPLETO de enriquecimiento (solo dos columnas):",
  "      // la racha de juego se cuenta sobre esto para no tener techo.",
  "      supabase",
  "        .from('enriquecimientos')",
  "        .select('fecha, actividad')",
  "        .eq('mascota_id', mascotaId)",
  "        .order('fecha', { ascending: true })",
  "        .limit(2000),",
].join('\n'));

// Verificaciones finales
const ESPERADOS = [
  'const [enriqHistorial, setEnriqHistorial]',
  '{ data: enrHist }',
  'setEnriqHistorial(enrHist || [])',
  'function calcularRachaJuego',
  'Juego y vínculo',
  'Juega hoy para mantenerla',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los gatos ya tienen su seccion Juego y vinculo en Analisis.');
