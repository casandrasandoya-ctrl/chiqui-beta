const fs = require('fs');
const path = require('path');

// ============================================================
// generar_399_tarjeta_invita_registrar.js
// ============================================================
// EL CAMBIO DE FONDO (idea de Casandra)
// La tarjeta mostraba edad, peso y esterilizacion: una FICHA. Pero esos
// datos ya viven en el perfil, y la pantalla de entrada deberia INVITAR
// A REGISTRAR, no informar.
//
// Ahora dice "Hola, Chiquito · ¿Cómo se siente hoy?" y toda la tarjeta
// lleva al registro diario. Los datos que estaban abajo se van al
// perfil, que es donde se consultan.
//
// LOS DOS BOTONES
// Ver Perfil y Link Vet quedan como botones propios debajo, en vez de
// competir con la tarjeta. El link del veterinario gana visibilidad: en
// los datos de la beta solo 14% lo habia usado, y estaba escondido.
//
// EL COLOR
// Verde #3fac9c, elegido por Casandra. NO es el verde del semaforo
// (#4CAF7D): usar ese habria hecho que el verde dejara de significar
// "todo bien" en el resto de la app.
//
// SI YA REGISTRO HOY, la tarjeta lo dice y ofrece editar en vez de
// preguntar de nuevo. Preguntar "¿como se siente hoy?" a quien ya
// respondio hace que la app parezca desatenta.
//
// REQUISITO: scripts 368 y 371 desplegados.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

const TARJETA_NUEVA = [
  "      {/* HERO — invita a registrar. Los datos de la mascota viven en",
  "          el perfil; la pantalla de entrada pregunta. */}",
  '      <Link href="/registro-diario" className="relative mx-4 mb-3 rounded-3xl p-5 overflow-hidden block" style={{ background: \'#3fac9c\' }}>',
  '        <div className="flex items-center gap-3.5">',
  "          {m.foto_url ? (",
  '            <div className="relative w-[70px] h-[70px] rounded-full overflow-hidden border-[3px] border-white/50 flex-shrink-0">',
  '              <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />',
  "            </div>",
  "          ) : (",
  '            <div className="relative w-[70px] h-[70px] rounded-full bg-white/25 border-[3px] border-white/50 flex items-center justify-center text-4xl flex-shrink-0">',
  "              {iconoPorEspecie(m.especie)}",
  "            </div>",
  "          )}",
  '          <div className="flex-1 min-w-0">',
  '            <p className="font-heading text-2xl font-extrabold leading-tight text-white truncate">Hola, {m.nombre}</p>',
  "            {/* Si ya registró hoy, no se vuelve a preguntar: hacerlo",
  "                haría parecer que la app no se enteró. */}",
  '            <p className="text-[15px] text-white/85 mt-0.5">',
  "              {tieneRegistroHoy ? '✓ Ya registraste hoy' : '¿Cómo se siente hoy?'}",
  "            </p>",
  "          </div>",
  "        </div>",
  "",
  '        <div className="mt-4 pt-4 border-t border-white/25 flex items-center gap-1.5 flex-wrap">',
  '          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/20 text-white">',
  '            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />',
  "            {estadoLabel}",
  "          </div>",
  "",
  "          {rachaRegistros > 0 && (",
  '            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-white/20 text-white">',
  "              🔥 {rachaRegistros} {rachaRegistros === 1 ? 'día' : 'días'}",
  "            </div>",
  "          )}",
  "",
  "          {(() => {",
  "            const juntos = (() => {",
  "              if (!m.fecha_union) return null",
  "              // Mediodía: a medianoche los cambios de horario de verano",
  "              // pueden correr el cálculo un día.",
  "              const desde = new Date(m.fecha_union + 'T12:00:00')",
  "              const ahora = new Date()",
  "              const meses = (ahora.getFullYear() - desde.getFullYear()) * 12 + (ahora.getMonth() - desde.getMonth())",
  "              if (meses < 0) return null",
  "              if (meses < 1) return 'Recién llegó'",
  "              if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'} juntos`",
  "              const anios = Math.floor(meses / 12)",
  "              return `${anios} ${anios === 1 ? 'año' : 'años'} juntos`",
  "            })()",
  "            return (",
  '              <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/20 text-white">',
  "                {juntos ? `💕 ${juntos}` : '💕 ¿Cuándo llegó?'}",
  "              </div>",
  "            )",
  "          })()}",
  "        </div>",
  "      </Link>",
  "",
  "      {/* Perfil y link del veterinario: botones propios en vez de",
  "          competir con la tarjeta. El link al vet gana visibilidad —",
  "          en la beta solo el 14% lo había usado, y estaba escondido. */}",
  '      <div className="flex gap-2 mx-4 mb-4">',
  '        <Link href="/perfil" className="flex-1 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl py-3 flex items-center justify-center gap-1.5">',
  '          <span className="text-sm font-bold text-[#8C572F]">Ver Perfil</span>',
  "        </Link>",
  "        <LineaVet mascotaId={m.id} />",
  "      </div>",
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

if (contenido.includes("Hola, {m.nombre}")) {
  abortar('la tarjeta ya invita a registrar. Parece que este script ya se corrio.');
}
if (!contenido.includes('Ver Perfil ▶')) {
  abortar('no encontro la tarjeta del script 368. Correlo primero.');
}
// tieneRegistroHoy tiene que existir: la tarjeta lo usa.
if (!contenido.includes('tieneRegistroHoy')) {
  abortar('no encontre tieneRegistroHoy en el dashboard. Avisale a Claude.');
}

// --- Delimitar la tarjeta actual
const MARCA = '      {/* HERO */}';
if (contar(contenido, MARCA) !== 1) {
  abortar('esperaba 1 marca de HERO y encontre ' + contar(contenido, MARCA) + '.');
}
const ini = contenido.indexOf(MARCA);
const fin = contenido.indexOf('</Link>', ini);
if (fin === -1) {
  abortar('no encontre el cierre de la tarjeta.');
}
const bloqueViejo = contenido.slice(ini, fin + '</Link>'.length);

// Guardas: lo que se quita TIENE que ser la tarjeta completa.
for (const s of ['{m.nombre}', 'Ver Perfil ▶', 'rachaRegistros']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a reemplazar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.includes('PRÓXIMOS') || bloqueViejo.includes('Novedades')) {
  abortar('el corte alcanzaria a otra seccion. No se escribio nada.');
}
console.log('  OK  tarjeta delimitada (' + bloqueViejo.split('\n').length + ' lineas)');

contenido = contenido.slice(0, ini) + TARJETA_NUEVA + contenido.slice(fin + '</Link>'.length);

// --- Verificaciones finales
const ESPERADOS = ['Hola, {m.nombre}', '¿Cómo se siente hoy?', "background: '#3fac9c'", '<LineaVet mascotaId={m.id} />'];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('Ver Perfil ▶')) {
  abortar('quedo la tarjeta vieja.');
}
// Las secciones siguientes tienen que seguir ahi.
for (const s of ['PRÓXIMOS', 'CUIDADOS RECIENTES']) {
  if (!contenido.includes(s)) {
    abortar('se perdio la seccion [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: si el dashboard ya tenia LineaVet mas abajo, ahora estaria');
console.log('dos veces. Revisa la pantalla y avisale a Claude si la ves repetida.');
console.log('');
console.log('Listo. La pantalla de entrada ya invita a registrar.');
