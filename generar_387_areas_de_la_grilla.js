const fs = require('fs');
const path = require('path');

// ============================================================
// generar_387_areas_de_la_grilla.js
// ============================================================
// Dos cambios en la grilla del registro diario:
//
// 1. NOMBRE DE AREA sobre cada fila. Seis areas, cada una con su
//    etiqueta chica. Sin eso, dieciseis casillas seguidas se leen como
//    una lista larga; con eso se leen como seis grupos cortos.
//
// 2. PELAJE E HIGIENE AL FINAL. Como son solo dos, dejaban media fila
//    vacia en medio de la grilla. Al final, esa media fila se ve
//    intencional en vez de un hueco.
//
// COMO SE ARMA AHORA
// En vez de una lista plana, la grilla se define por FILAS con nombre.
// Eso hace evidente al leer el codigo que cada cuidado esta puesto
// junto a la observacion con la que se relaciona — Alimentacion con
// Apetito y Agua, Juego con Movilidad y Paseo — que era la idea
// completa del diseño.
//
// Una fila sin elementos no dibuja su titulo: en gatos no hay Paseo, y
// si alguna fila quedara vacia no debe aparecer un encabezado suelto.
//
// Los grupos que no esten en ninguna fila (Arenero en gatos, o uno
// nuevo) siguen agregandose al final bajo "Otros cuidados".
//
// FALTA: los signos de alerta, que son una seccion aparte con su
// propio dibujo. Van en el siguiente script.
//
// REQUISITO: scripts 385 y 386 desplegados.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = [
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
].join('\n');

const NUEVO = [
  "  // La grilla se define por FILAS con nombre. Así queda a la vista, al",
  "  // leer el código, que cada cuidado está junto a la observación con la",
  "  // que se relaciona: Alimentación con Apetito y Agua, Juego con",
  "  // Movilidad y Paseo. Esa era la idea completa del diseño.",
  "  //",
  "  // Pelaje e Higiene van al final: como son solo dos, en medio dejaban",
  "  // media fila vacía; al final esa media fila se ve intencional.",
  "  const FILAS: { titulo: string; items: any[] }[] = [",
  "    { titulo: 'Cómo estuvo', items: [buscarCat('energia'), buscarCat('animo'), buscarCat('conducta')] },",
  "    { titulo: 'Comida y agua', items: [buscarCat('apetito'), buscarCat('agua'), buscarGrupo('Alimentación')] },",
  "    { titulo: 'Digestión', items: [buscarCat('digestion'), buscarCat('heces'), buscarCat('arenero')] },",
  "    { titulo: 'Movimiento', items: [buscarCat('movilidad'), buscarCat('paseo'), buscarGrupo('Enriquecimiento y entrenamiento') || buscarGrupo('Enriquecimiento y juego')] },",
  "    { titulo: 'Salud', items: [buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención')] },",
  "    { titulo: 'Piel y cuidado', items: [buscarCat('pelaje'), buscarGrupo('Higiene y bienestar')] },",
  "  ]",
  "",
  "  const CASILLAS: any[] = []",
  "  const yaEnGrilla = new Set<string>()",
  "  for (const fila of FILAS) {",
  "    const items = fila.items.filter(Boolean)",
  "    // Una fila sin elementos no dibuja su título: en gatos no hay",
  "    // Paseo, y un encabezado suelto sobre nada se ve roto.",
  "    if (items.length === 0) continue",
  "    CASILLAS.push({ tipo: 'titulo', texto: fila.titulo })",
  "    for (const it of items) {",
  "      // Un cuidado se distingue de una observación por tener 'items'.",
  "      if (it.items) { CASILLAS.push({ tipo: 'grupo', grupo: it }); yaEnGrilla.add(it.titulo) }",
  "      else CASILLAS.push({ tipo: 'cat', cat: it })",
  "    }",
  "  }",
  "",
  "  // Red de seguridad: cualquier grupo que no esté en ninguna fila",
  "  // (Arenero en gatos, o uno nuevo que se agregue mañana) aparece al",
  "  // final. Así nunca desaparece una sección por olvido.",
  "  const sobrantes = gruposCuidados.filter(g => !yaEnGrilla.has(g.titulo))",
  "  if (sobrantes.length > 0) {",
  "    CASILLAS.push({ tipo: 'titulo', texto: 'Otros cuidados' })",
  "    for (const g of sobrantes) CASILLAS.push({ tipo: 'grupo', grupo: g })",
  "  }",
].join('\n');

const RENDER_VIEJO = [
  "          // --- Casilla de CUIDADO ---",
  "          if (item.tipo === 'grupo') {",
].join('\n');

const RENDER_NUEVO = [
  "          // --- Nombre de ÁREA: ocupa la fila entera, así los que",
  "          //     vienen después empiezan una línea nueva ---",
  "          if (item.tipo === 'titulo') {",
  "            return (",
  '              <p key={`t-${item.texto}`} className="w-full text-[10px] font-semibold text-[#8A7560] uppercase tracking-wider mt-2 mb-0.5">',
  "                {item.texto}",
  "              </p>",
  "            )",
  "          }",
  "",
  "          // --- Casilla de CUIDADO ---",
  "          if (item.tipo === 'grupo') {",
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

if (contenido.includes('const FILAS:')) {
  abortar('la grilla ya esta por filas. Parece que este script ya se corrio.');
}
if (!contenido.includes('const CASILLAS = ordenGrilla.map')) {
  abortar('no encontro la grilla del script 385. Correlo primero.');
}

for (const [nombre, viejo] of [['orden por filas', VIEJO], ['dibujo del nombre de area', RENDER_VIEJO]]) {
  const n = contar(contenido, viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + nombre + '] y encontre ' + n + '.');
  }
}

contenido = contenido.split(VIEJO).join(NUEVO);
contenido = contenido.split(RENDER_VIEJO).join(RENDER_NUEVO);

// --- Verificaciones finales
const ESPERADOS = [
  'const FILAS:',
  "if (item.tipo === 'titulo') {",
  "CASILLAS.push({ tipo: 'titulo', texto: fila.titulo })",
  "texto: 'Otros cuidados'",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las seis areas tienen que estar
for (const a of ['Cómo estuvo', 'Comida y agua', 'Digestión', 'Movimiento', 'Salud', 'Piel y cuidado']) {
  if (!contenido.includes("titulo: '" + a + "'")) {
    abortar('falta el area [' + a + '].');
  }
}
// Y ninguna casilla puede haberse perdido
for (const c of ['energia', 'animo', 'conducta', 'apetito', 'agua', 'digestion', 'heces', 'arenero', 'movilidad', 'paseo', 'pelaje']) {
  if (!contenido.includes("buscarCat('" + c + "')")) {
    abortar('se perdio la observacion [' + c + '] al reordenar.');
  }
}
for (const g of ['Alimentación', 'Higiene y bienestar', 'Veterinario y salud', 'Prevención']) {
  if (!contenido.includes("buscarGrupo('" + g + "')")) {
    abortar('se perdio el cuidado [' + g + '] al reordenar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Seis areas con nombre, y Pelaje e Higiene al final.');
