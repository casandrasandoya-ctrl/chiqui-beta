const fs = require('fs');
const path = require('path');

// ============================================================
// generar_368_hero_nuevo.js
// ============================================================
// Rediseña la tarjeta principal del Dashboard segun el diseño de
// Casandra, y cambia la ilustracion del modal "Agrandar familia".
//
// QUE CAMBIA EN LA TARJETA
//  - El nombre gana tamaño y "Ver Perfil >" se sienta a su lado, en
//    dorado, en vez de flotar arriba a la derecha.
//  - Los tres datos de abajo (edad, peso, esterilizado) SUBEN a la
//    linea de informacion, separados por circulos. La grilla de tres
//    columnas desaparece.
//  - Ese espacio lo ocupan los chips, ahora debajo de una linea
//    divisoria: estado del dia, racha, y uno nuevo de tiempo juntos.
//
// EL CHIP ROSADO
// Sale de fecha_union, que no todas las mascotas tienen. Cuando falta,
// dice "💕 ¿Cuando llego?" — es una invitacion, no un hueco. Como toda
// la tarjeta lleva al perfil, tocarlo deja a la persona justo donde
// puede completarlo.
//
// COMO SE REEMPLAZA
// El bloque se corta desde el comentario {/* HERO */} hasta su
// </Link> de cierre. No hay Links anidados dentro, asi que el corte es
// exacto. Antes de escribir se comprueba que lo que se va a quitar
// contenga las tres cosas que definen al hero viejo — si no, aborta.
//
// REQUISITO: chiqui_mascotas.png guardado en public/chiqui/.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';
const RUTA_SELECTOR = 'components/SelectorMascota.tsx';
const RUTA_IMG = 'public/chiqui/chiqui_mascotas.png';

const HERO_NUEVO = [
  "      {/* HERO */}",
  '      <Link href="/perfil" className="relative mx-4 mb-4 bg-[#8C572F] rounded-3xl p-5 overflow-hidden block">',
  '        <div className="flex items-start gap-3.5">',
  "          {m.foto_url ? (",
  '            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#FFFCF8]/40 flex-shrink-0">',
  '              <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />',
  "            </div>",
  "          ) : (",
  '            <div className="relative w-16 h-16 rounded-full bg-[#FFBD59] border-2 border-[#FFFCF8]/40 flex items-center justify-center text-4xl flex-shrink-0">',
  "              {iconoPorEspecie(m.especie)}",
  "            </div>",
  "          )}",
  '          <div className="flex-1 min-w-0">',
  '            <div className="flex items-start justify-between gap-2">',
  '              <div className="font-heading text-2xl font-extrabold leading-none text-[#FFFCF8] truncate">{m.nombre}</div>',
  '              <span className="text-[13px] font-bold text-[#FFBD59] flex-shrink-0 pt-0.5">Ver Perfil ▶</span>',
  "            </div>",
  "            {/* Dos líneas de datos con círculos de separación. Antes",
  "                edad, peso y esterilización vivían en una grilla al pie",
  "                de la tarjeta; acá caben en el mismo lugar y dejan ese",
  "                espacio para los chips. */}",
  '            <p className="text-[13px] text-[#F0DEC8] mt-2 truncate">',
  "              {[m.especie, m.raza, m.sexo].filter(Boolean).join('  ○  ')}",
  "            </p>",
  '            <p className="text-[13px] text-[#F0DEC8] mt-0.5 truncate">',
  "              {(() => {",
  "                const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)",
  "                const partes: string[] = []",
  "                if (etapa) partes.push(formatearEdad(etapa))",
  "                if (m.peso_actual) partes.push(`${m.peso_actual} kg`)",
  "                if (m.castrado) partes.push('Esterilizado/a')",
  "                return partes.join('  ○  ')",
  "              })()}",
  "            </p>",
  "          </div>",
  "        </div>",
  "",
  '        <div className="mt-4 pt-4 border-t border-[#FFFCF8]/20 flex items-center gap-2 flex-wrap">',
  '          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: `${color}26`, border: `1.5px solid ${color}`, color: \'#FFFCF8\' }}>',
  '            <div className="w-2 h-2 rounded-full" style={{ background: color }} />',
  "            {estadoLabel}",
  "          </div>",
  "",
  "          {/* Racha: indicador permanente, no una celebración. Solo",
  "              aparece si hay al menos un día. */}",
  "          {rachaRegistros > 0 && (",
  '            <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: \'#FFBD5926\', border: \'1.5px solid #FFBD59\', color: \'#FFFCF8\' }}>',
  "              🔥 {rachaRegistros} {rachaRegistros === 1 ? 'día' : 'días'}",
  "            </div>",
  "          )}",
  "",
  "          {/* Tiempo juntos. Si no hay fecha de unión, en vez de dejar",
  "              un hueco se invita a completarla: toda la tarjeta lleva al",
  "              perfil, que es justo donde se agrega. */}",
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
  '            return (',
  '              <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: \'#E88FB826\', border: \'1.5px solid #E88FB8\', color: \'#FFFCF8\' }}>',
  "                {juntos ? `💕 ${juntos}` : '💕 ¿Cuándo llegó?'}",
  "              </div>",
  "            )",
  "          })()}",
  "        </div>",
  "      </Link>",
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

// --- La ilustracion nueva tiene que existir
if (!fs.existsSync(path.join(process.cwd(), RUTA_IMG))) {
  abortar('no existe ' + RUTA_IMG + '. Guarda ahi la ilustracion de las mascotas antes de correr esto.');
}
console.log('  OK existe ' + RUTA_IMG);

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('Ver Perfil ▶')) {
  abortar('la tarjeta ya tiene el diseño nuevo. Parece que este script ya se corrio.');
}

const MARCA = '      {/* HERO */}';
if (contar(contenido, MARCA) !== 1) {
  abortar('esperaba 1 marca de HERO y encontre ' + contar(contenido, MARCA) + '.');
}

const posIni = contenido.indexOf(MARCA);
const posFin = contenido.indexOf('</Link>', posIni);
if (posFin === -1) {
  abortar('no encontre el cierre del bloque HERO.');
}
const bloqueViejo = contenido.slice(posIni, posFin + '</Link>'.length);

// --- Lo que se va a quitar TIENE que ser el hero completo
const SENALES = ['{m.nombre}', 'Mi perfil', 'grid-cols-3'];
for (const s of SENALES) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a reemplazar no contiene [' + s + ']. El corte quedo incompleto, no se escribio nada.');
  }
}
console.log('  OK el bloque a reemplazar es el hero completo (' + bloqueViejo.split('\n').length + ' lineas)');

contenido = contenido.slice(0, posIni) + HERO_NUEVO + contenido.slice(posFin + '</Link>'.length);

// --- Verificaciones finales
const ESPERADOS = ['Ver Perfil ▶', '¿Cuándo llegó?', 'const juntos = (() => {'];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('Mi perfil →')) {
  abortar('quedo el indicador viejo de perfil.');
}

// --- La ilustracion del modal
const destinoSel = path.join(process.cwd(), RUTA_SELECTOR);
let selector = null;
if (fs.existsSync(destinoSel)) {
  const s = fs.readFileSync(destinoSel, 'utf8');
  if (s.includes('/chiqui/chiqui_familia.png') && s.includes('Agrandar familia')) {
    selector = s.replace('/chiqui/chiqui_familia.png', '/chiqui/chiqui_mascotas.png');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);

if (selector) {
  fs.writeFileSync(destinoSel, selector, 'utf8');
  console.log('OK: ' + RUTA_SELECTOR + '  (ilustracion del modal actualizada)');
} else {
  console.log('NOTA: no se cambio la ilustracion del modal. Corre primero el 367.');
}

console.log('');
console.log('Listo. La tarjeta quedo como el diseño.');
