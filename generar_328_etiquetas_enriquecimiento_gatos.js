const fs = require('fs');
const path = require('path');

// ============================================================
// generar_328_etiquetas_enriquecimiento_gatos.js
// ============================================================
// PASO 2 de 3 del enriquecimiento felino.
//
// El script 327 hizo que las actividades de gato SE GUARDEN. Pero
// Analisis y Calendario traducen el codigo guardado ('caza',
// 'puzzle_comida'...) a un nombre y un emoji usando un mapa que solo
// conoce las siete actividades de perro. Una fila felina no encuentra
// su entrada y se muestra vacia.
//
// Este script agrega las seis actividades felinas a los dos mapas:
//   - app/analisis/page.tsx      (ACT_ENR)
//   - app/calendario/page.tsx    (ACTIVIDADES_ENR)
//
// No cambia ninguna logica ni ningun calculo: solo nombres y emojis.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const CAMBIOS = [
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'mapa ACT_ENR en Analisis',
    viejo: [
      "                lugar_nuevo: { emoji: '🌳', label: 'Lugar nuevo' },",
      "              }",
    ].join('\n'),
    nuevo: [
      "                lugar_nuevo: { emoji: '🌳', label: 'Lugar nuevo' },",
      "                // Actividades felinas (script 327). Sin estas",
      "                // entradas, una fila de gato se renderiza sin",
      "                // nombre ni emoji.",
      "                caza: { emoji: '🎣', label: 'Sesión de caza' },",
      "                puzzle_comida: { emoji: '🧩', label: 'Comida en puzzle' },",
      "                vertical: { emoji: '🪜', label: 'Alturas y rascador' },",
      "                entrenamiento_felino: { emoji: '🎓', label: 'Entrenamiento' },",
      "                olfato_felino: { emoji: '👃', label: 'Juegos de olfato' },",
      "                ventana: { emoji: '🪟', label: 'Ventana o mirador' },",
      "              }",
    ].join('\n'),
  },
  {
    ruta: 'app/calendario/page.tsx',
    nombre: 'mapa ACTIVIDADES_ENR en Calendario',
    viejo: [
      "  lugar_nuevo: { emoji: '🌳', label: 'Exploró un lugar nuevo' },",
      "}",
    ].join('\n'),
    nuevo: [
      "  lugar_nuevo: { emoji: '🌳', label: 'Exploró un lugar nuevo' },",
      "  // Actividades felinas (script 327).",
      "  caza: { emoji: '🎣', label: 'Sesión de caza' },",
      "  puzzle_comida: { emoji: '🧩', label: 'Comida en puzzle o dispersa' },",
      "  vertical: { emoji: '🪜', label: 'Alturas y rascador' },",
      "  entrenamiento_felino: { emoji: '🎓', label: 'Entrenamiento' },",
      "  olfato_felino: { emoji: '👃', label: 'Juegos de olfato' },",
      "  ventana: { emoji: '🪟', label: 'Ventana o mirador' },",
      "}",
    ].join('\n'),
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// --- Verificar los dos archivos ANTES de escribir ninguno
const preparados = [];

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  const contenido = fs.readFileSync(destino, 'utf8');

  if (contenido.includes('puzzle_comida')) {
    abortar(c.ruta + ' ya tiene las actividades felinas. Parece que este script ya se corrio.');
  }

  const n = contar(contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  preparados.push({ destino: destino, ruta: c.ruta, contenido: contenido.split(c.viejo).join(c.nuevo) });
}

// --- Verificar el resultado antes de escribir
const FELINAS = ['caza:', 'puzzle_comida:', 'vertical:', 'entrenamiento_felino:', 'olfato_felino:', 'ventana:'];
for (const p of preparados) {
  for (const f of FELINAS) {
    if (contar(p.contenido, f) !== 1) {
      abortar('la entrada [' + f + '] no quedo bien en ' + p.ruta + '.');
    }
  }
}

// --- Escribir
console.log('');
for (const p of preparados) {
  fs.writeFileSync(p.destino, p.contenido, 'utf8');
  console.log('OK: ' + p.ruta);
}

console.log('');
console.log('Listo. Las actividades de gato ya tienen nombre y emoji en Analisis y Calendario.');
