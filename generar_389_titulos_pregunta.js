const fs = require('fs');
const path = require('path');

// ============================================================
// generar_389_titulos_pregunta.js
// ============================================================
// DOS CAMBIOS.
//
// 1. LOS NOMBRES DE AREA PASAN A SER PREGUNTAS
//    De "COMIDA Y AGUA" a "¿Cómo estuvo su alimentación hoy?". Una
//    etiqueta clasifica; una pregunta invita a responder. Y en una
//    pantalla cuyo trabajo es que la persona observe a su mascota, esa
//    diferencia importa.
//    Se quitan las mayusculas: una pregunta en mayusculas se lee como
//    un grito, no como una invitacion.
//
// 2. EN GATOS, "ARENERO" PASA A LLAMARSE "ORINA"
//    Habia DOS cosas llamadas Arenero: la observacion (que registra
//    como orino) y el grupo de cuidados (limpiar, cambiar la arena).
//    Antes vivian lejos una de otra; ahora quedan en la misma pantalla
//    y el nombre repetido confunde.
//    "Orina" es lo que ya usan los perros y describe mejor lo que se
//    esta observando. El grupo de cuidados conserva su nombre.
//    Solo cambia lo que se MUESTRA: el id sigue siendo 'arenero', asi
//    que ningun registro guardado se ve afectado.
//
// REQUISITO: script 387 desplegado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  {
    nombre: 'titulos como preguntas',
    viejo: [
      "    { titulo: 'Cómo estuvo', items: [buscarCat('energia'), buscarCat('animo'), buscarCat('conducta')] },",
      "    { titulo: 'Comida y agua', items: [buscarCat('apetito'), buscarCat('agua'), buscarGrupo('Alimentación')] },",
      "    { titulo: 'Digestión', items: [buscarCat('digestion'), buscarCat('heces'), buscarCat('arenero')] },",
      "    { titulo: 'Movimiento', items: [buscarCat('movilidad'), buscarCat('paseo'), buscarGrupo('Enriquecimiento y entrenamiento') || buscarGrupo('Enriquecimiento y juego')] },",
      "    { titulo: 'Salud', items: [buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención')] },",
      "    { titulo: 'Piel y cuidado', items: [buscarCat('pelaje'), buscarGrupo('Higiene y bienestar')] },",
    ].join('\n'),
    nuevo: [
      "    { titulo: '¿Cómo se sintió hoy?', items: [buscarCat('energia'), buscarCat('animo'), buscarCat('conducta')] },",
      "    { titulo: '¿Cómo estuvo su alimentación hoy?', items: [buscarCat('apetito'), buscarCat('agua'), buscarGrupo('Alimentación')] },",
      "    { titulo: '¿Cómo estuvo su digestión hoy?', items: [buscarCat('digestion'), buscarCat('heces'), buscarCat('arenero')] },",
      "    { titulo: '¿Cómo se movió hoy?', items: [buscarCat('movilidad'), buscarCat('paseo'), buscarGrupo('Enriquecimiento y entrenamiento') || buscarGrupo('Enriquecimiento y juego')] },",
      "    { titulo: '¿Hubo algo de salud hoy?', items: [buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención')] },",
      "    { titulo: '¿Cómo estuvo su piel y su aseo?', items: [buscarCat('pelaje'), buscarGrupo('Higiene y bienestar')] },",
    ].join('\n'),
  },
  {
    nombre: 'titulo de los sobrantes',
    viejo: "    CASILLAS.push({ tipo: 'titulo', texto: 'Otros cuidados' })",
    nuevo: "    CASILLAS.push({ tipo: 'titulo', texto: '¿Algo más que registrar?' })",
  },
  {
    nombre: 'estilo de la pregunta',
    viejo: '              <p key={`t-${item.texto}`} className="w-full text-[10px] font-semibold text-[#8A7560] uppercase tracking-wider mt-2 mb-0.5">',
    nuevo: [
      "              /* Sin mayúsculas: una pregunta en mayúsculas se lee",
      "                 como un grito, no como una invitación. */",
      '              <p key={`t-${item.texto}`} className="w-full text-[11px] font-semibold text-[#8A7560] mt-3 mb-1">',
    ].join('\n'),
  },
  {
    nombre: 'orina tambien en gatos',
    viejo: "nombre: esGato ? 'Arenero' : 'Orina',",
    nuevo: [
      "// 'Orina' en las dos especies. Antes en gatos se llamaba 'Arenero',",
      "  // igual que el grupo de cuidados — y ahora que ambos aparecen en la",
      "  // misma pantalla, el nombre repetido confunde. El id sigue siendo",
      "  // 'arenero', así que ningún registro guardado se ve afectado.",
      "  nombre: 'Orina',",
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

if (contenido.includes('¿Cómo se sintió hoy?')) {
  abortar('los titulos ya son preguntas. Parece que este script ya se corrio.');
}
if (!contenido.includes('const FILAS:')) {
  abortar('falta la grilla por filas. Corre primero el script 387.');
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

// --- Verificaciones finales
const PREGUNTAS = [
  '¿Cómo se sintió hoy?',
  '¿Cómo estuvo su alimentación hoy?',
  '¿Cómo estuvo su digestión hoy?',
  '¿Cómo se movió hoy?',
  '¿Hubo algo de salud hoy?',
  '¿Cómo estuvo su piel y su aseo?',
];
for (const p of PREGUNTAS) {
  if (contar(contenido, p) !== 1) {
    abortar('falta la pregunta [' + p + '].');
  }
}
if (contenido.includes("esGato ? 'Arenero' : 'Orina'")) {
  abortar('quedo el nombre viejo del arenero.');
}
// El id NO puede cambiar: los registros guardados lo usan.
if (!contenido.includes("id:'arenero'")) {
  abortar('se altero el id de la categoria. Los registros guardados dependen de el.');
}
// Y el grupo de cuidados conserva su nombre
if (!contenido.includes("titulo: 'Arenero'")) {
  abortar('se perdio el grupo de cuidados Arenero.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Preguntas en vez de etiquetas, y Orina en las dos especies.');
