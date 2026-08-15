const fs = require('fs');
const path = require('path');

// ============================================================
// generar_405_cubos_ilustrados.js
// ============================================================
// Los cubos de cuidados quedan como el diseño de Casandra:
//
//   - ILUSTRACIONES propias en vez de emoji: alimentacion, arenero,
//     Cuidados_Vet, higiene y racha.
//   - TRES POR FILA, no dos.
//   - Titulo arriba, ilustracion a la izquierda, lineas al lado.
//   - TODOS DEL MISMO ALTO, tenga uno tres lineas y otro una. Un cubo
//     que se encoge porque tiene menos datos hace que la fila se vea
//     rota, y ademas sugiere que ese cuidado importa menos.
//
// SALUD Y PREVENCION SE FUSIONAN en "Cuidados médicos": las tres cosas
// mas recientes entre ambos grupos. Para el tutor son lo mismo — que
// fue al vet, que le dio el medicamento, cuanto peso.
//
// TRES VISIBLES Y UNO AL DESPLEGAR
//   Perros: racha, medicos, alimentacion  →  higiene al abrir
//   Gatos:  medicos, alimentacion, higiene →  arenero al abrir
// Cada especie ve tres y guarda uno, asi la fila siempre queda pareja.
//
// La racha de JUEGO para gatos va en el script siguiente: el dashboard
// solo calcula la de paseo, y traerla es un cambio aparte.
//
// REQUISITOS: script 404 desplegado y las cinco imagenes en
// public/chiqui/.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';
const IMAGENES = ['alimentacion', 'arenero', 'Cuidados_Vet', 'higiene', 'racha'];

const CUBOS = [
  "      {/* CUIDADOS RECIENTES — cubos por tema, tres por fila. Todos del",
  "          mismo alto: uno que se encoge porque tiene menos datos rompe",
  "          la fila y sugiere que ese cuidado importa menos. */}",
  "      {(cuidadosRecientes.length > 0 || rachaPaseo !== null) && (() => {",
  "        const textoDias = (d: number) => d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : `hace ${d} días`",
  "",
  "        // Salud y Prevención se fusionan: para el tutor son lo mismo —",
  "        // que fue al vet, que le dio el medicamento, cuánto pesó.",
  "        const items = (grupos: string[]) =>",
  "          cuidadosRecientes",
  "            .filter(c => grupos.includes(c.grupo))",
  "            .sort((a, b) => a.dias - b.dias)",
  "            .slice(0, 3)",
  "",
  "        const medicos = items(['Veterinario y salud', 'Prevención'])",
  "        const alimentacion = items(['Alimentación'])",
  "        const higiene = items(['Higiene y bienestar'])",
  "        const arenero = items(['Arenero'])",
  "",
  "        const esPerro = m.especie === 'Perro'",
  "",
  "        // Cada especie ve TRES y guarda uno, así la fila queda pareja.",
  "        const visibles: any[] = []",
  "        const ocultos: any[] = []",
  "",
  "        if (esPerro && rachaPaseo !== null) {",
  "          visibles.push({",
  "            clave: 'racha', img: '/chiqui/racha.png', titulo: 'Racha de paseo',",
  "            lineas: rachaPaseo === 0",
  "              ? [{ k: 'r', texto: 'Sin racha activa' }]",
  "              : [",
  "                  { k: 'r', texto: `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'}`, grande: true },",
  "                  ...(rachaEnRiesgo ? [{ k: 'a', texto: '¡pasea hoy!', alerta: true }] : []),",
  "                ],",
  "          })",
  "        }",
  "",
  "        if (medicos.length > 0) visibles.push({ clave: 'med', img: '/chiqui/Cuidados_Vet.png', titulo: 'Cuidados médicos', items: medicos })",
  "        if (alimentacion.length > 0) visibles.push({ clave: 'ali', img: '/chiqui/alimentacion.png', titulo: 'Alimentación', items: alimentacion })",
  "",
  "        // En gatos higiene sube a la primera fila (no hay racha); en",
  "        // perros queda detrás de Ver más.",
  "        if (higiene.length > 0) {",
  "          const cubo = { clave: 'hig', img: '/chiqui/higiene.png', titulo: 'Higiene', items: higiene }",
  "          if (!esPerro && visibles.length < 3) visibles.push(cubo)",
  "          else ocultos.push(cubo)",
  "        }",
  "        if (arenero.length > 0) ocultos.push({ clave: 'are', img: '/chiqui/arenero.png', titulo: 'Arenero', items: arenero })",
  "",
  "        if (visibles.length === 0 && ocultos.length === 0) return null",
  "",
  "        const dibujarCubo = (c: any) => (",
  '          <div key={c.clave} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-2.5 flex flex-col" style={{ minHeight: \'118px\' }}>',
  '            <p className="text-[11px] font-bold text-[#8C572F] text-center leading-tight mb-1.5">{c.titulo}</p>',
  '            <div className="flex-1 flex items-center gap-1.5">',
  '              <img src={c.img} alt="" className="w-9 h-9 object-contain flex-shrink-0" />',
  '              <div className="min-w-0 flex-1">',
  "                {(c.lineas || []).map((l: any) => (",
  "                  <p key={l.k}",
  '                    className={l.grande ? "text-[15px] font-extrabold text-[#3D2B1F] leading-tight" : "text-[10px] leading-tight"}',
  "                    style={l.alerta ? { color: '#F07A30' } : undefined}>",
  "                    {l.texto}",
  "                  </p>",
  "                ))}",
  "                {(c.items || []).map((it: any) => (",
  '                  <p key={it.label} className="text-[10px] text-[#8A7560] leading-snug truncate">',
  "                    {/* El peso muestra sus kilos: el número vive en",
  "                        historial_peso, no en el registro diario. */}",
  "                    {it.emoji} {it.label === 'Control de peso' && ultimoPeso ? `${ultimoPeso.peso} kg` : textoDias(it.dias)}",
  "                  </p>",
  "                ))}",
  "              </div>",
  "            </div>",
  "          </div>",
  "        )",
  "",
  "        return (",
  "          <>",
  '            <div className="flex items-center justify-between px-5 pb-2.5">',
  '              <div className="flex items-center gap-2">',
  '                <img src="/chiqui/chiqui_doctor.png" alt="" className="w-8 h-8 object-contain" />',
  '                <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Cuidados recientes</span>',
  "              </div>",
  "              {ocultos.length > 0 && (",
  '                <button onClick={() => setCuidadosExpandido(e => !e)} className="text-xs text-[#CD7421] font-semibold">',
  "                  {cuidadosExpandido ? 'Ver menos' : 'Ver todo'}",
  "                </button>",
  "              )}",
  "            </div>",
  "",
  '            <div className="mx-4 mb-4 grid grid-cols-3 gap-2">',
  "              {visibles.map(dibujarCubo)}",
  "              {cuidadosExpandido && ocultos.map(dibujarCubo)}",
  "            </div>",
  "          </>",
  "        )",
  "      })()}",
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

// --- Las imagenes tienen que existir
for (const nombre of IMAGENES) {
  const ruta = path.join(process.cwd(), 'public/chiqui/' + nombre + '.png');
  if (!fs.existsSync(ruta)) {
    abortar('no existe public/chiqui/' + nombre + '.png. Confirmame el nombre exacto del archivo.');
  }
}
console.log('  OK  las cinco imagenes estan en public/chiqui/');

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let comp = fs.readFileSync(destino, 'utf8');

if (comp.includes("'/chiqui/Cuidados_Vet.png'")) {
  abortar('los cubos ya tienen las ilustraciones. Parece que este script ya se corrio.');
}
if (!comp.includes('CUBOS_DEF')) {
  abortar('no encontro los cubos del script 404. Correlo primero.');
}
// cuidadosExpandido se reusa para el Ver mas.
if (!comp.includes('cuidadosExpandido')) {
  abortar('no encontre el estado cuidadosExpandido. Avisale a Claude.');
}

// --- Delimitar el bloque actual
const MARCA = '      {/* CUIDADOS RECIENTES';
if (contar(comp, MARCA) !== 1) {
  abortar('esperaba 1 marca de CUIDADOS RECIENTES y encontre ' + contar(comp, MARCA) + '.');
}
const ini = comp.indexOf(MARCA);
// El bloque termina en el cierre de su propia expresion. Buscar el
// siguiente '{/*' no sirve: el bloque tiene comentarios ADENTRO y el
// corte quedaba por la mitad, rompiendo el JSX.
const CIERRE = '\n      )}';
const posCierre = comp.indexOf(CIERRE, ini);
if (posCierre === -1) {
  abortar('no encontre el cierre de la seccion de cuidados.');
}
const fin = posCierre + CIERRE.length;
const bloqueViejo = comp.slice(ini, fin);

for (const s of ['CUBOS_DEF', 'cuidadosRecientes', 'rachaPaseo']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a reemplazar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.length > 6000) {
  abortar('el bloque a reemplazar es demasiado largo (' + bloqueViejo.length + '). No se escribio nada.');
}
console.log('  OK  bloque delimitado (' + bloqueViejo.split('\n').length + ' lineas)');

comp = comp.slice(0, ini) + CUBOS + comp.slice(fin);

// --- Verificaciones finales
const ESPERADOS = [
  "const medicos = items(['Veterinario y salud', 'Prevención'])",
  'grid grid-cols-3 gap-2',
  "minHeight: '118px'",
];
for (const e of ESPERADOS) {
  if (contar(comp, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (comp.includes('CUBOS_DEF')) {
  abortar('quedo la version anterior de los cubos.');
}
// Las cinco imagenes tienen que quedar referenciadas.
for (const nombre of IMAGENES) {
  if (!comp.includes('/chiqui/' + nombre + '.png')) {
    abortar('la imagen [' + nombre + '] no quedo usada.');
  }
}

fs.writeFileSync(destino, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Tres cubos por fila, con tus ilustraciones.');
