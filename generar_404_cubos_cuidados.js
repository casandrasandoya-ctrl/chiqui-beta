const fs = require('fs');
const path = require('path');

// ============================================================
// generar_404_cubos_cuidados.js
// ============================================================
// PASO 2 de 2: los cuidados recientes pasan de una lista plana de
// tarjetas iguales a CUBOS agrupados por tema, como el diseño.
//
// Cada cubo lleva su emoji grande a la izquierda y, al lado, las tres
// ultimas cosas registradas de ese grupo: emoji chico y hace cuanto.
// El emoji dice que es; no hace falta escribirlo.
//
// LOS GRUPOS YA EXISTEN
// definicionCuidados ya trae un campo 'grupo' por cada cuidado, asi que
// no hay que inventar el reparto: se dibuja lo que ya estaba agrupado.
// Se incluye tambien Arenero, que solo aparece en gatos — asi ningun
// cuidado desaparece del dashboard.
//
// TRES POR CUBO, LAS MAS RECIENTES. Si un grupo tiene menos, se ve mas
// corto; si no tiene nada, el cubo no aparece. Un cubo con lineas
// vacias se lee peor que uno con dos lineas reales.
//
// EL PESO MUESTRA SUS KILOS. Antes decia solo el dia, porque esta
// seccion lee de los cuidados del registro diario y el numero vive en
// historial_peso. El script 403 lo trajo; aca se usa.
//
// LA RACHA DE PASEO conserva su cubo propio con la llama grande, como
// estaba.
//
// REQUISITO: script 403 desplegado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA_DASH = 'app/dashboard/page.tsx';
const RUTA_COMP = 'components/DashboardContenido.tsx';

// --- 1. Pasar los datos nuevos al componente
const PROP_VIEJA = 'cuidadosRecientes={cuidadosRecientes}';
const PROP_NUEVA = 'cuidadosRecientes={cuidadosRecientes} ultimoPeso={ultimoPeso} ultimaVisitaVet={ultimaVisitaVet}';

// --- 2. El bloque de cubos
const CUBOS = [
  "      {/* CUIDADOS RECIENTES — cubos por tema. Cada uno muestra sus",
  "          tres registros más recientes: emoji y hace cuánto. El emoji",
  "          dice qué es, así que no se repite el nombre. */}",
  "      {(cuidadosRecientes.length > 0 || rachaPaseo !== null) && (",
  "        <>",
  '          <div className="flex items-center justify-between px-5 pb-2.5">',
  '            <div className="flex items-center gap-2">',
  '              <img src="/chiqui/chiqui_doctor.png" alt="" className="w-8 h-8 object-contain" />',
  '              <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Cuidados recientes</span>',
  "            </div>",
  '            <Link href="/calendario" className="text-xs text-[#CD7421] font-semibold">Ver todo</Link>',
  "          </div>",
  "",
  '          <div className="mx-4 mb-4 grid grid-cols-2 gap-2.5">',
  "            {rachaPaseo !== null && (",
  '              <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">',
  '                <span className="text-3xl flex-shrink-0">🔥</span>',
  '                <div className="min-w-0">',
  '                  <p className="text-[12px] font-bold text-[#3D2B1F] leading-tight">Racha de paseo</p>',
  '                  <p className="text-[15px] font-extrabold text-[#CD7421] leading-tight mt-0.5">',
  "                    {rachaPaseo === 0 ? '—' : `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'}`}",
  "                  </p>",
  "                  {rachaEnRiesgo && rachaPaseo > 0 && (",
  '                    <p className="text-[10px] text-[#F07A30] leading-tight">¡pasea hoy!</p>',
  "                  )}",
  "                </div>",
  "              </div>",
  "            )}",
  "",
  "            {(() => {",
  "              // El orden decide qué cubo va primero. Los grupos sin",
  "              // ningún cuidado registrado no se dibujan.",
  "              const CUBOS_DEF: { grupo: string; emoji: string; titulo: string }[] = [",
  "                { grupo: 'Veterinario y salud', emoji: '🩺', titulo: 'Salud' },",
  "                { grupo: 'Prevención', emoji: '💊', titulo: 'Prevención' },",
  "                { grupo: 'Alimentación', emoji: '🍽️', titulo: 'Alimentación' },",
  "                { grupo: 'Higiene y bienestar', emoji: '🚿', titulo: 'Higiene' },",
  "                { grupo: 'Arenero', emoji: '🧹', titulo: 'Arenero' },",
  "              ]",
  "",
  "              const textoDias = (d: number) => d === 0 ? 'hoy' : d === 1 ? 'ayer' : `${d}d`",
  "",
  "              return CUBOS_DEF.map(cubo => {",
  "                // Las tres más recientes de ese grupo.",
  "                const items = cuidadosRecientes",
  "                  .filter(c => c.grupo === cubo.grupo)",
  "                  .sort((a, b) => a.dias - b.dias)",
  "                  .slice(0, 3)",
  "                if (items.length === 0) return null",
  "",
  "                return (",
  '                  <div key={cubo.grupo} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">',
  '                    <span className="text-3xl flex-shrink-0">{cubo.emoji}</span>',
  '                    <div className="min-w-0 flex-1">',
  '                      <p className="text-[12px] font-bold text-[#3D2B1F] leading-tight mb-0.5">{cubo.titulo}</p>',
  "                      {items.map(it => (",
  '                        <p key={it.label} className="text-[11px] text-[#8A7560] leading-snug truncate">',
  "                          {it.emoji}{' '}",
  "                          {/* El peso muestra sus kilos: antes decía solo",
  "                              el día, porque el número vive en otra tabla. */}",
  "                          {it.label === 'Control de peso' && ultimoPeso",
  "                            ? `${ultimoPeso.peso} kg`",
  "                            : textoDias(it.dias)}",
  "                        </p>",
  "                      ))}",
  "                    </div>",
  "                  </div>",
  "                )",
  "              })",
  "            })()}",
  "          </div>",
  "        </>",
  "      )}",
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

if (comp.includes('CUBOS_DEF')) {
  abortar('los cubos ya estan. Parece que este script ya se corrio.');
}
if (!dash.includes('const ultimaVisitaVet')) {
  abortar('faltan los datos del script 403. Correlo primero.');
}

// --- Props
const nProp = contar(dash, PROP_VIEJA);
console.log('  ' + (nProp === 1 ? 'OK ' : 'X  ') + 'props al componente -> ' + nProp + ' coincidencia(s)');
if (nProp !== 1) {
  abortar('esperaba 1 coincidencia de la prop y encontre ' + nProp + '.');
}
dash = dash.split(PROP_VIEJA).join(PROP_NUEVA);

// --- Firma del componente
const ANCLA_FIRMA = 'cuidadosRecientes:';
if (contar(comp, ANCLA_FIRMA) !== 1) {
  abortar('no encontre la firma de cuidadosRecientes en el componente.');
}
const posFirma = comp.indexOf(ANCLA_FIRMA);
const finLineaFirma = comp.indexOf('\n', posFirma);
const lineaFirma = comp.slice(posFirma, finLineaFirma);
comp = comp.slice(0, finLineaFirma) + "\n  ultimoPeso?: { fecha: string; peso: number } | null\n  ultimaVisitaVet?: string | null" + comp.slice(finLineaFirma);
console.log('  OK  tipo de las props nuevas');

// --- Desestructuracion
const ANCLA_DESTR = 'cuidadosRecientes,';
if (contar(comp, ANCLA_DESTR) < 1) {
  abortar('no encontre donde recibir las props nuevas.');
}
comp = comp.replace(ANCLA_DESTR, 'cuidadosRecientes, ultimoPeso, ultimaVisitaVet,');
console.log('  OK  recepcion de las props');

// --- El bloque de cuidados
const MARCA = '      {/* CUIDADOS RECIENTES */}';
if (contar(comp, MARCA) !== 1) {
  abortar('esperaba 1 marca de CUIDADOS RECIENTES y encontre ' + contar(comp, MARCA) + '.');
}
const ini = comp.indexOf(MARCA);
// El bloque termina donde empieza el siguiente comentario de seccion.
const fin = comp.indexOf('{/*', ini + MARCA.length);
if (fin === -1) {
  abortar('no encontre donde termina la seccion de cuidados.');
}
const bloqueViejo = comp.slice(ini, fin);

for (const s of ['cuidadosRecientes', 'rachaPaseo', 'Cuidados recientes']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a reemplazar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.length > 6000) {
  abortar('el bloque a reemplazar es demasiado largo (' + bloqueViejo.length + '). No se escribio nada.');
}
console.log('  OK  bloque delimitado (' + bloqueViejo.split('\n').length + ' lineas)');

comp = comp.slice(0, ini) + CUBOS + '\n\n      ' + comp.slice(fin);

// --- Verificaciones finales
// Cada comprobacion apunta a algo que aparece UNA sola vez. Buscar
// 'CUBOS_DEF' suelto contaba tambien su uso mas abajo, no solo la
// declaracion — es el mismo error que ya nos costo varias rondas.
const ESPERADOS = ['const CUBOS_DEF:', 'Racha de paseo', "titulo: 'Arenero'"];
for (const e of ESPERADOS) {
  if (contar(comp, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (!comp.includes('ultimoPeso.peso')) {
  abortar('el peso no quedo aplicado.');
}

fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('');
console.log('OK: ' + RUTA_DASH);
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('OK: ' + RUTA_COMP);

console.log('');
console.log('AVISO: cuidadosExpandido puede quedar sin uso — el "Ver todo"');
console.log('ahora lleva al calendario. No rompe el build.');
console.log('');
console.log('Listo. Los cuidados ya estan en cubos por tema.');
