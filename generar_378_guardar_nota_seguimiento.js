const fs = require('fs');
const path = require('path');

// ============================================================
// generar_378_guardar_nota_seguimiento.js
// ============================================================
// El script 377 dejo el check visible pero no lo guardaba. Este lo
// conecta a la base.
//
// TRES PIEZAS, Y LAS TRES SON NECESARIAS
//
// 1. GUARDAR: la marca viaja en el upsert del registro.
//
// 2. RECUPERAR al abrir un registro que ya existe. Sin esto pasaria
//    algo peor que no guardar: al editar un dia que ya tenia
//    seguimiento, el check apareceria vacio y el upsert lo BORRARIA sin
//    que nadie lo notara. Un guardado que destruye datos al editar es
//    mas dañino que uno que no guarda.
//
// 3. LIMPIAR al cambiar de mascota, junto al resto del formulario. Si
//    no, la marca de una mascota se arrastraria a la siguiente.
//
// Tambien se reinicia nota_seguimiento_cerrada al guardar: si la
// persona vuelve a marcar seguimiento sobre un dia que ya habia
// cerrado, la pregunta debe volver a hacerse.
//
// REQUISITOS: el .sql notas_seguimiento.sql corrido y el script 377
// desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Guardar la marca
  // ---------------------------------------------------------
  {
    nombre: 'la marca viaja en el guardado',
    viejo: "      estado_dia: calcEstado(sel, signos), nota: nota || null,",
    nuevo: [
      "      estado_dia: calcEstado(sel, signos), nota: nota || null,",
      "      // El seguimiento solo tiene sentido si hay algo escrito.",
      "      // Y al volver a marcarlo se reabre la pregunta: si la persona",
      "      // ya habia respondido \"todo bien\" y vuelve a preocuparse, hay",
      "      // que preguntarle de nuevo.",
      "      nota_seguimiento: notaSeguimiento && nota.trim().length > 0,",
      "      nota_seguimiento_cerrada: notaSeguimiento && nota.trim().length > 0 ? false : undefined,",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Recuperar al abrir un registro existente
  // ---------------------------------------------------------
  {
    nombre: 'recuperar la marca al editar',
    viejo: "  function cargarRegistroExistente(r: any) {",
    nuevo: [
      "  function cargarRegistroExistente(r: any) {",
      "    // Sin esta linea, editar un dia que ya tenia seguimiento",
      "    // mostraria el check vacio y el guardado lo BORRARIA en",
      "    // silencio. Perder un dato al editar es peor que no guardarlo.",
      "    setNotaSeguimiento(r.nota_seguimiento === true)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Limpiar al cambiar de mascota
  // ---------------------------------------------------------
  {
    nombre: 'limpiar al cambiar de mascota',
    viejo: [
      "    setSel({})",
      "    setDet({})",
      "    setNota('')",
    ].join('\n'),
    nuevo: [
      "    setSel({})",
      "    setDet({})",
      "    setNota('')",
      "    setNotaSeguimiento(false)",
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

if (!contenido.includes('const [notaSeguimiento, setNotaSeguimiento]')) {
  abortar('falta el check del script 377. Correlo primero.');
}
if (contenido.includes('nota_seguimiento:')) {
  abortar('el guardado ya incluye la marca. Parece que este script ya se corrio.');
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

const ESPERADOS = [
  'nota_seguimiento: notaSeguimiento && nota.trim().length > 0,',
  'setNotaSeguimiento(r.nota_seguimiento === true)',
  'setNotaSeguimiento(false)',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las tres piezas ya se comprobaron una por una arriba. Un conteo
// global del nombre de la variable no sirve: 'setNotaSeguimiento' lleva
// mayuscula y no coincide, asi que el numero enganña.
if (!contenido.includes('nota_seguimiento_cerrada:')) {
  abortar('falta el reinicio de la pregunta al volver a marcar.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. La marca de seguimiento ya se guarda y se recupera.');
