const fs = require('fs');
const path = require('path');

// ============================================================
// generar_385_cuidados_en_la_grilla.js
// ============================================================
// PASO 2: los cuidados entran a la grilla, cada uno junto a la
// observacion con la que se relaciona.
//
//   Energia · Animo · Conducta
//   Apetito · Agua · ALIMENTACION
//   Digestion · Heces · Orina
//   Movilidad · Paseo · JUEGO
//   Pelaje · HIGIENE
//   VETERINARIO · PREVENCION
//
// POR QUE ASI Y NO ABAJO
// Tito, uno de los usuarios mas constantes, marca "Todo normal" y nunca
// baja. Por eso jamas supo que existian Alimentacion ni Veterinario. Al
// entrelazarlos, Alimentacion queda justo al lado de Apetito: en el
// camino natural de la mirada, sin agregarle ningun paso.
//
// NOMBRES CORTOS
// En un tercio de ancho caben unos 14 caracteres. Se traducen SOLO para
// mostrar, sin tocar los titulos originales: el estado de que grupo
// esta abierto y los guardados siguen usando los nombres de siempre.
//   Veterinario y salud -> Veterinario
//   Higiene y bienestar -> Higiene
//   Enriquecimiento y entrenamiento / y juego -> Juego
//   Pelaje y piel -> Pelaje
//
// NINGUN GRUPO SE PIERDE: los que no estan en el orden explicito (por
// ejemplo Arenero en gatos) se agregan al final. Si mañana se suma un
// grupo nuevo, aparece igual aunque nadie actualice esta lista.
//
// El conteo se muestra solo si hay algo marcado ese dia, con el mismo
// color de las observaciones.
//
// REQUISITO: script 384 desplegado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const CASILLAS = [
  "",
  "  // --- Orden de la grilla: cada cuidado junto a su observación ---",
  "  // Los cuidados quedan en el camino de la mirada en vez de al final,",
  "  // que es donde nadie llegaba.",
  "  const gruposCuidados = getGruposCuidados(especie)",
  "  const buscarCat = (id: string) => CATS.find(c => c.id === id)",
  "  const buscarGrupo = (t: string) => gruposCuidados.find(g => g.titulo === t)",
  "",
  "  const ordenGrilla: any[] = [",
  "    buscarCat('energia'), buscarCat('animo'), buscarCat('conducta'),",
  "    buscarCat('apetito'), buscarCat('agua'), buscarGrupo('Alimentación'),",
  "    buscarCat('digestion'), buscarCat('heces'), buscarCat('arenero'),",
  "    buscarCat('movilidad'), buscarCat('paseo'),",
  "    buscarGrupo('Enriquecimiento y entrenamiento') || buscarGrupo('Enriquecimiento y juego'),",
  "    buscarCat('pelaje'), buscarGrupo('Higiene y bienestar'),",
  "    buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención'),",
  "  ].filter(Boolean)",
  "",
  "  // Red de seguridad: cualquier grupo que no esté en la lista de",
  "  // arriba (Arenero en gatos, o uno nuevo que se agregue mañana) se",
  "  // suma al final. Así nunca desaparece una sección por olvido.",
  "  const yaEnGrilla = new Set(ordenGrilla.map(x => x.titulo).filter(Boolean))",
  "  for (const g of gruposCuidados) {",
  "    if (!yaEnGrilla.has(g.titulo)) ordenGrilla.push(g)",
  "  }",
  "",
  "  // Un cuidado se distingue de una observación por tener 'items'.",
  "  const CASILLAS = ordenGrilla.map(x => (x.items ? { tipo: 'grupo', grupo: x } : { tipo: 'cat', cat: x }))",
  "",
  "  // Nombres cortos: en un tercio de ancho caben unos 14 caracteres.",
  "  // Solo cambia lo que se MUESTRA; los títulos reales no se tocan.",
  "  const NOMBRE_CORTO: Record<string, string> = {",
  "    'Veterinario y salud': 'Veterinario',",
  "    'Higiene y bienestar': 'Higiene',",
  "    'Enriquecimiento y entrenamiento': 'Juego',",
  "    'Enriquecimiento y juego': 'Juego',",
  "    'Pelaje y piel': 'Pelaje',",
  "  }",
].join('\n');

const CHIP_GRUPO = [
  "        {CASILLAS.map(item => {",
  "          // --- Casilla de CUIDADO ---",
  "          if (item.tipo === 'grupo') {",
  "            const grupo = item.grupo",
  "            const abiertoGrupo = gruposAbiertos.has(grupo.titulo)",
  "            const marcadosEnGrupo = grupo.items.filter((c: any) => cuidados.has(c.value)).length",
  "            return (",
  "              <div key={grupo.titulo} className={abiertoGrupo ? 'w-full' : 'w-[calc(33.333%-0.25rem)]'}>",
  "                <button",
  '                  type="button"',
  "                  onClick={() => toggleGrupoCuidados(grupo.titulo)}",
  '                  className="w-full flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
  "                  style={{",
  "                    border: abiertoGrupo ? '2px solid #FFBD59' : '2px solid transparent',",
  "                    background: abiertoGrupo ? '#FFFCF8' : 'transparent',",
  "                  }}",
  "                >",
  '                  <img src={grupo.img} alt="" className="w-7 h-7 object-contain flex-shrink-0" />',
  '                  <div className="flex-1 min-w-0">',
  '                    <p className="text-[12px] font-semibold leading-tight truncate text-[#CD7421]">',
  "                      {NOMBRE_CORTO[grupo.titulo] || grupo.titulo}",
  "                    </p>",
  "                    {marcadosEnGrupo > 0 && (",
  '                      <p className="text-[10px] mt-0.5 text-[#CD7421]">✓ {marcadosEnGrupo}</p>',
  "                    )}",
  "                  </div>",
  '                  <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{abiertoGrupo ? \'▲\' : \'▼\'}</span>',
  "                </button>",
  "                {abiertoGrupo && (",
  '                  <div className="pb-3 pt-1 grid grid-cols-2 gap-2">',
  "                    {grupo.items.map((c: any) => {",
  "                      const activo = cuidados.has(c.value)",
  "                      return (",
  "                        <button",
  "                          key={c.value}",
  "                          onClick={() => toggleCuidado(c.value)}",
  '                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 border text-left"',
  "                          style={activo",
  "                            ? { background: '#FFBD5920', borderColor: '#FFBD59', borderWidth: '1.5px' }",
  "                            : { background: '#FFFCF8', borderColor: '#EEE2D4', borderWidth: '1.5px' }}",
  "                        >",
  '                          <span className="text-base flex-shrink-0">{c.emoji}</span>',
  '                          <span className="text-xs font-medium text-[#3D2B1F]">{c.label}</span>',
  "                        </button>",
  "                      )",
  "                    })}",
  "                  </div>",
  "                )}",
  "              </div>",
  "            )",
  "          }",
  "",
  "          // --- Casilla de OBSERVACIÓN ---",
  "          const cat = item.cat",
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

if (contenido.includes('CASILLAS')) {
  abortar('la grilla ya tiene los cuidados. Parece que este script ya se corrio.');
}
if (!contenido.includes("w-[calc(33.333%-0.25rem)]")) {
  abortar('falta la grilla por anchos. Corre primero el script 384.');
}

// --- 1. La lista ordenada, antes del return
const ANCLA_LISTA = [
  "  const completadas = Object.keys(sel).length",
  "  const puedeGuardar = completadas > 0 || signos.size > 0",
].join('\n');
if (contar(contenido, ANCLA_LISTA) !== 1) {
  abortar('no encontre donde declarar el orden de la grilla.');
}
console.log('  OK  punto de declaracion');
contenido = contenido.split(ANCLA_LISTA).join(ANCLA_LISTA + '\n' + CASILLAS);

// --- 2. El bucle fusionado
const ANCLA_BUCLE = "        {CATS.map(cat => {";
if (contar(contenido, ANCLA_BUCLE) !== 1) {
  abortar('no encontre el bucle de las categorias.');
}
console.log('  OK  bucle de categorias');
contenido = contenido.split(ANCLA_BUCLE).join(CHIP_GRUPO);

// --- 3. Nombre corto tambien en las observaciones
const ANCLA_NOMBRE = '                  <p className="text-[12px] font-semibold leading-tight truncate">{cat.nombre}</p>';
if (contar(contenido, ANCLA_NOMBRE) !== 1) {
  abortar('no encontre el nombre de la categoria en el chip.');
}
console.log('  OK  nombre de la observacion');
contenido = contenido.split(ANCLA_NOMBRE).join(
  '                  <p className="text-[12px] font-semibold leading-tight truncate">{NOMBRE_CORTO[cat.nombre] || cat.nombre}</p>'
);

// --- 4. Quitar el bloque viejo de cuidados
const INI_VIEJO = contenido.indexOf('{getGruposCuidados(especie).map(grupo => {');
if (INI_VIEJO === -1) {
  abortar('no encontre el bloque viejo de cuidados.');
}
const FIN_VIEJO = contenido.indexOf('\n        })}\n', INI_VIEJO);
if (FIN_VIEJO === -1) {
  abortar('no encontre el cierre del bloque viejo de cuidados.');
}
const bloqueViejo = contenido.slice(INI_VIEJO, FIN_VIEJO);
// Guardas: lo que se quita tiene que ser el bloque de cuidados, y nada mas.
for (const s of ['toggleGrupoCuidados', 'marcadosEnGrupo', 'toggleCuidado']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a quitar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.length > 3000) {
  abortar('el bloque a quitar es demasiado largo (' + bloqueViejo.length + '). No se escribio nada.');
}
if (bloqueViejo.includes('MOMENTOS_CATALOGO') || bloqueViejo.includes('hitosLogrados')) {
  abortar('el corte alcanzaria a Momentos o Hitos. No se escribio nada.');
}
console.log('  OK  bloque viejo delimitado (' + bloqueViejo.split('\n').length + ' lineas)');
contenido = contenido.slice(0, INI_VIEJO)
  + '{/* Los cuidados ahora viven en la grilla de arriba, junto a la\n            observación con la que se relacionan. */}'
  + contenido.slice(FIN_VIEJO + '\n        })}'.length);

// --- Verificaciones finales
const ESPERADOS = ['const CASILLAS = ordenGrilla.map', "if (item.tipo === 'grupo') {", 'const NOMBRE_CORTO'];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contar(contenido, 'toggleGrupoCuidados(grupo.titulo)') !== 1) {
  abortar('el bloque de cuidados quedo duplicado o desaparecio.');
}
for (const s of ['MOMENTOS_CATALOGO', 'hitosLogrados', 'toggleCuidado']) {
  if (!contenido.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los cuidados ya estan junto a su observacion.');
