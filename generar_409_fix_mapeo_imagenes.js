const fs = require('fs');
const path = require('path');

// ============================================================
// generar_409_fix_mapeo_imagenes.js
// ============================================================
// DOS CORRECCIONES.
//
// 1. EL MAPEO ESTABA MAL
//    Yo asumi que existia apetito.png y no esta en la carpeta. Las
//    imagenes correctas son:
//      Apetito (observacion: como comio hoy) -> alimentacion.png, el plato
//      Alimentacion (cuidado: cambio, compro) -> saco_comida.png, el saco
//    Y el script 408 aborto por eso, que es lo que debia hacer.
//
// 2. "AGUA" PASA A LLAMARSE "SED"
//    El archivo se llama agua.png, pero la categoria se muestra como
//    Sed. Igual que hicimos con Arenero -> Orina: solo cambia lo que se
//    MUESTRA, el id sigue siendo 'agua' y ningun registro guardado se
//    ve afectado.
//
// REQUISITO: script 408 desplegado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  {
    nombre: 'imagen de apetito',
    viejo: "    apetito: 'apetito', agua: 'agua',",
    nuevo: [
      "    // Apetito usa el PLATO (el mismo de los cubos); el saco es para",
      "    // el cuidado de Alimentacion, que es otra cosa.",
      "    apetito: 'alimentacion', agua: 'agua',",
    ].join('\n'),
  },
  {
    nombre: 'nombre corto de Sed',
    viejo: "  const NOMBRE_CORTO: Record<string, string> = {",
    nuevo: [
      "  const NOMBRE_CORTO: Record<string, string> = {",
      "    // El archivo se llama agua.png, pero la categoria se muestra",
      "    // como Sed. Solo cambia lo que se MUESTRA: el id sigue siendo",
      "    // 'agua' y ningun registro guardado se ve afectado.",
      "    'Agua': 'Sed',",
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

// --- Las dos imagenes que importan tienen que existir
for (const n of ['alimentacion', 'saco_comida', 'agua']) {
  if (!fs.existsSync(path.join(process.cwd(), 'public/chiqui/' + n + '.png'))) {
    abortar('no existe public/chiqui/' + n + '.png. Confirmame el nombre exacto.');
  }
}
console.log('  OK  las tres imagenes estan en public/chiqui/');

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes("apetito: 'alimentacion'")) {
  abortar('el mapeo ya esta corregido. Parece que este script ya se corrio.');
}
if (!c.includes('const IMG_CAT:')) {
  abortar('faltan las ilustraciones del script 408. Correlo primero.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones finales
const ESPERADOS = ["apetito: 'alimentacion'", "'Agua': 'Sed',", "'Alimentación': 'saco_comida'"];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// El id no puede cambiar: los registros guardados lo usan.
if (!c.includes("id:'agua'")) {
  abortar('se altero el id de la categoria. Los registros guardados dependen de el.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Apetito usa el plato, Alimentacion el saco, y Agua se llama Sed.');
