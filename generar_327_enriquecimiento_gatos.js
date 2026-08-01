const fs = require('fs');
const path = require('path');

// ============================================================
// generar_327_enriquecimiento_gatos.js
// ============================================================
// PASO 1 de 3 del enriquecimiento felino.
// Este script solo toca app/registro-diario/page.tsx: hace que el dato
// EMPIECE A CAPTURARSE. Los pasos 2 (calendario + analisis) y 3 (racha
// de caza + novedad) vienen despues, cuando ya haya datos que mostrar.
//
// Que hace:
//  1. Agrega el catalogo de 6 actividades felinas.
//  2. Agrega el detalle de cada una (que hicieron, no solo si lo
//     hicieron), igual que en perros.
//  3. Lo pone como PRIMER grupo de cuidados (grupos.unshift), asi
//     aparece justo despues de la observacion diaria y antes del resto
//     de los cuidados.
//  4. Abre el guardado en la tabla enriquecimientos a los gatos: hasta
//     ahora estaba limitado a "Perro", asi que aunque se marcaran las
//     actividades NO se guardaba ninguna fila.
//
// El punto 4 es el critico: sin el, la seccion se ve pero no registra
// nada.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Catalogo de actividades felinas, como PRIMER grupo
  // ---------------------------------------------------------
  {
    nombre: 'catalogo de actividades felinas',
    viejo: [
      "  if (esGato) {",
      "    grupos.push({ titulo: 'Arenero', img: '/chiqui/chiqui_caca.png', items: [",
    ].join('\n'),
    nuevo: [
      "  if (esGato) {",
      "    // Enriquecimiento felino. Va con unshift (primer grupo) a",
      "    // proposito: el gato de interior necesita estimulacion tanto",
      "    // como el perro necesita paseo, y si queda al final del",
      "    // formulario nadie baja hasta ahi.",
      "    //",
      "    // La sesion de caza es la mas importante de las seis: el gato",
      "    // es un cazador crepuscular, y descargar esa energia en la",
      "    // tarde es lo que evita que despierte a su tutor de",
      "    // madrugada. Es el unico beneficio inmediato y egoista que",
      "    // tiene la app, y por eso encabeza la lista.",
      "    grupos.unshift({ titulo: 'Enriquecimiento y juego', img: '/chiqui/chiqui_juguetes.png', items: [",
      "      { value: 'enr_caza', emoji: '🎣', label: 'Sesión de caza' },",
      "      { value: 'enr_puzzle_comida', emoji: '🧩', label: 'Comida en puzzle o dispersa' },",
      "      { value: 'enr_vertical', emoji: '🪜', label: 'Alturas y rascador' },",
      "      { value: 'enr_entrenamiento_felino', emoji: '🎓', label: 'Entrenamiento' },",
      "      { value: 'enr_olfato_felino', emoji: '👃', label: 'Juegos de olfato' },",
      "      { value: 'enr_ventana', emoji: '🪟', label: 'Ventana o mirador' },",
      "    ]})",
      "    grupos.push({ titulo: 'Arenero', img: '/chiqui/chiqui_caca.png', items: [",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Detalle de cada actividad felina
  // ---------------------------------------------------------
  {
    nombre: 'detalle de las actividades felinas',
    viejo: "const TRUCOS_ENTRENAMIENTO = [",
    nuevo: [
      "// --- Detalle de las actividades felinas ---",
      "// Mismo criterio que en perros: preguntar QUE hicieron convierte",
      "// \"jugo 10 veces\" en \"la cana con plumas es lo que mas le gusta\".",
      "DETALLE_ENR.enr_caza = {",
      "  pregunta: '¿Con qué jugaron?', multi: true,",
      "  opciones: ['Caña con plumas', 'Ratón de juguete', 'Puntero láser', 'Pelota', 'Bolsa o papel', 'Otro'],",
      "}",
      "DETALLE_ENR.enr_puzzle_comida = {",
      "  pregunta: '¿Cómo se la diste?', multi: true,",
      "  opciones: ['Comedero puzzle', 'Comida dispersa', 'Pelota dispensadora', 'Escondida por la casa', 'Otro'],",
      "}",
      "DETALLE_ENR.enr_vertical = {",
      "  pregunta: '¿Dónde estuvo?', multi: true,",
      "  opciones: ['Rascador', 'Repisas', 'Mueble alto', 'Casa o cueva', 'Otro'],",
      "}",
      "DETALLE_ENR.enr_olfato_felino = {",
      "  pregunta: '¿Con qué?', multi: true,",
      "  opciones: ['Matatabi', 'Catnip', 'Caja nueva', 'Hierba gatera', 'Olor nuevo', 'Otro'],",
      "}",
      "",
      "// Los gatos SI se entrenan. Estas son ordenes realistas de",
      "// entrenamiento felino con refuerzo positivo — entrar solo al",
      "// transportin le ahorra el peor momento a cualquier tutor.",
      "const TRUCOS_FELINOS = [",
      "  'Venir al llamado', 'Chocar la mano', 'Sentarse',",
      "  'Entrar al transportín', 'Subir a un lugar', 'Dar la vuelta',",
      "  'Usar el rascador',",
      "]",
      "DETALLE_ENR.enr_entrenamiento_felino = {",
      "  pregunta: '¿Qué practicaron?', opciones: TRUCOS_FELINOS, multi: true,",
      "}",
      "",
      "const TRUCOS_ENTRENAMIENTO = [",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Guardado: abrir enriquecimientos a los gatos
  // ---------------------------------------------------------
  {
    nombre: 'guardado de enriquecimiento para gatos',
    viejo: [
      "    if (especie === 'Perro') {",
      "      await supabase.from('enriquecimientos').delete().eq('mascota_id', mascotaId).eq('fecha', fechaRegistro)",
    ].join('\n'),
    nuevo: [
      "    // Antes esto estaba limitado a 'Perro'. Los gatos ahora tienen",
      "    // sus propias actividades, asi que tambien guardan filas.",
      "    if (especie === 'Perro' || especie === 'Gato') {",
      "      await supabase.from('enriquecimientos').delete().eq('mascota_id', mascotaId).eq('fecha', fechaRegistro)",
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

if (contenido.includes('enr_caza')) {
  abortar('el archivo ya tiene las actividades felinas. Parece que este script ya se corrio.');
}

// DETALLE_ENR tiene que existir antes de que le agreguemos claves.
if (!contenido.includes('const DETALLE_ENR')) {
  abortar('no encontre DETALLE_ENR en el archivo. No es el registro-diario que esperaba.');
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

// Verificaciones finales
const ESPERADOS = [
  "grupos.unshift({ titulo: 'Enriquecimiento y juego'",
  "DETALLE_ENR.enr_caza",
  "DETALLE_ENR.enr_entrenamiento_felino",
  "if (especie === 'Perro' || especie === 'Gato') {",
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
console.log('Listo. Los gatos ya tienen enriquecimiento en el registro diario.');
