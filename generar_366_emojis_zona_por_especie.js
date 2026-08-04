const fs = require('fs');
const path = require('path');

// ============================================================
// generar_366_emojis_zona_por_especie.js
// ============================================================
// REPORTADO POR UNA USUARIA
// Al marcar "Se rasca" en un gato, la lista de zonas mostraba un perro
// en "Cara" y otro en "Lomo":
//
//   {value:'lomo', emoji:'🐕', label:'Lomo'}
//   {value:'cara', emoji:'🐶', label:'Cara'}
//
// Esa lista (tiposZonaCuerpo) la comparten TRES opciones de Pelaje y
// piel: "Caída excesiva", "Se rasca" y "Se lame en exceso". Por eso se
// escapó: el resto del formulario sí distingue especie —el paseo y el
// enriquecimiento canino solo salen en perros, las causas de ansiedad
// cambian, la bola de pelo solo existe en gatos— pero esta lista era
// una sola para ambos.
//
// EL CAMBIO
// 'lomo' y 'cara' pasan a mostrar 🐈 y 🐱 en gatos. El resto de la
// lista (orejas, patas, barriga, general) ya era neutral y no se toca.
//
// Es un detalle chico, pero quien tiene gato lo nota: son las tres
// opciones que más se marcan cuando algo anda mal con la piel.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = "  const tiposZonaCuerpo = [{value:'orejas',emoji:'👂',label:'Orejas'},{value:'patas',emoji:'🐾',label:'Patas'},{value:'barriga',emoji:'🫃',label:'Barriga'},{value:'lomo',emoji:'🐕',label:'Lomo'},{value:'cara',emoji:'🐶',label:'Cara'},{value:'general',emoji:'🔄',label:'General'}]";

const NUEVO = [
  "  // Zonas del cuerpo. La comparten tres opciones de Pelaje y piel",
  "  // (caída excesiva, se rasca, se lame en exceso), y por eso se había",
  "  // escapado del ajuste por especie: 'Lomo' y 'Cara' mostraban un",
  "  // perro incluso a quien tiene gato. Las demás ya eran neutrales.",
  "  const tiposZonaCuerpo = [",
  "    {value:'orejas',emoji:'👂',label:'Orejas'},",
  "    {value:'patas',emoji:'🐾',label:'Patas'},",
  "    {value:'barriga',emoji:'🫃',label:'Barriga'},",
  "    {value:'lomo',emoji: esGato ? '🐈' : '🐕',label:'Lomo'},",
  "    {value:'cara',emoji: esGato ? '🐱' : '🐶',label:'Cara'},",
  "    {value:'general',emoji:'🔄',label:'General'},",
  "  ]",
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

if (contenido.includes("esGato ? '🐱' : '🐶'")) {
  abortar('el archivo ya distingue la especie en las zonas. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'lista de zonas del cuerpo -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia de la lista de zonas y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

// --- Verificaciones
const ESPERADOS = ["esGato ? '🐈' : '🐕'", "esGato ? '🐱' : '🐶'"];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las zonas neutrales tienen que seguir ahi
for (const z of ['Orejas', 'Patas', 'Barriga', 'General']) {
  if (!contenido.includes("label:'" + z + "'")) {
    abortar('se perdio la zona [' + z + '] al reemplazar.');
  }
}
// La lista vive dentro de getCategorias, donde esGato existe. Si esta
// declarada antes, el codigo no compila.
const posEsGato = contenido.indexOf("const esGato = especie === 'Gato'");
const posZonas = contenido.indexOf('const tiposZonaCuerpo = [');
if (posEsGato === -1 || posZonas < posEsGato) {
  abortar('tiposZonaCuerpo quedaria antes de esGato. No se escribio nada.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Quien tiene gato ya no ve perros en las zonas del cuerpo.');
