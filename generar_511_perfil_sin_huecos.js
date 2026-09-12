// ============================================================
// generar_511_perfil_sin_huecos.js
// ============================================================
// El perfil pasa de grilla a columnas empaquetadas. La grilla dejaba
// huecos porque cada fila tomaba la altura de su tarjeta mas alta.
//
// 1. app/globals.css  (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_CSS = path.join(RAIZ, 'app', 'globals.css')

function abortar(msg) {
  console.error('')
  console.error('ABORTADO — no se escribio ningun archivo.')
  console.error(msg)
  console.error('')
  process.exit(1)
}

function contar(txt, aguja) {
  let n = 0, i = 0
  while ((i = txt.indexOf(aguja, i)) !== -1) { n++; i += aguja.length }
  return n
}

if (!fs.existsSync(RUTA_CSS)) abortar('No existe: ' + RUTA_CSS + '\nCorre el script desde la raiz del proyecto.')

let css = fs.readFileSync(RUTA_CSS, 'utf8')

const C_VIEJO = "  body:has(.panel-escritorio) .perfil-escritorio {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 16px;\n    align-items: start;\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n\n  /* Las tarjetas traen mx-4 y mb-4 del movil; dentro de la grilla esos\n     margenes se suman al gap y descuadran las columnas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .mx-4 {\n    margin-left: 0;\n    margin-right: 0;\n    margin-bottom: 0;\n  }\n\n  /* El hero (foto, nombre, edad) cruza el ancho completo: es la\n     cabecera de la pagina, no una tarjeta mas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .text-center {\n    grid-column: 1 / -1;\n  }\n\n  /* Link del vet y Co-tutor vienen envueltos en su propia grilla de dos\n     columnas, pensada para el ancho del telefono. Dentro de un tercio\n     de pantalla quedarian apretadisimos.\n\n     display: contents DISUELVE ese envoltorio: no dibuja nada, y sus\n     dos tarjetas pasan a ser hijas directas de la grilla del perfil,\n     cada una con su propia columna. El div sigue en el DOM, asi que las\n     clases que neutralizan sus margenes siguen aplicandose. */\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch {\n    display: contents;\n  }"
const C_NUEVO = "  /* ---- El perfil en escritorio ------------------------------------\n     PRIMERO SE INTENTO CON GRILLA Y NO SIRVIO. En una grilla cada fila\n     toma la altura de su tarjeta mas alta, asi que una tarjeta corta al\n     lado de una larga deja un hueco visible. El perfil tiene tarjetas\n     de alturas muy distintas — el selector de mascotas mide 60px y la\n     de etapa de vida 200 — y el resultado quedaba lleno de espacios.\n\n     Con columnas (column-count) cada tarjeta cae donde hay lugar y las\n     columnas se empaquetan solas, sin huecos.\n\n     EL PRECIO: el orden pasa a ser POR COLUMNA. Se llena la primera de\n     arriba a abajo, despues la segunda. No es el orden por filas del\n     diseno original; se eligio asi porque sin huecos se ve ordenado, y\n     conseguir las dos cosas obligaria a reagrupar el JSX en tres\n     bloques, lo que cambiaria tambien el telefono. */\n  body:has(.panel-escritorio) .perfil-escritorio {\n    column-count: 3;\n    column-gap: 16px;\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n\n  /* break-inside evita que una tarjeta se corte por la mitad entre el\n     final de una columna y el comienzo de la siguiente. Sin esto, una\n     tarjeta larga aparece partida en dos. */\n  body:has(.panel-escritorio) .perfil-escritorio > * {\n    break-inside: avoid;\n    margin-left: 0;\n    margin-right: 0;\n    margin-bottom: 16px;\n  }\n\n  /* El hero (foto, nombre, edad) cruza las tres columnas: es la\n     cabecera de la pagina, no una tarjeta mas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .text-center {\n    column-span: all;\n    margin-bottom: 16px;\n  }\n\n  /* Link del vet y Co-tutor vienen en su propia grilla de dos columnas,\n     pensada para el ancho del telefono. Dentro de una columna de un\n     tercio quedarian apretadisimos, asi que se apilan: la grilla pasa a\n     una sola columna y las dos tarjetas quedan una sobre otra. */\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch {\n    grid-template-columns: 1fr;\n    gap: 16px;\n  }"

if (css.indexOf('column-count: 3') !== -1) {
  abortar('app/globals.css ya usa columnas en el perfil. Parece que este script ya se corrio.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque del perfil con grilla y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 510.\n\nPegame app/globals.css tal como esta.')
}

css = css.replace(C_VIEJO, C_NUEVO)
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vC.indexOf('column-count: 3') === -1) fallas.push('globals.css sin las columnas del perfil')
if (vC.indexOf('break-inside: avoid') === -1) fallas.push('globals.css sin break-inside (las tarjetas se partirian)')
if (vC.indexOf('column-span: all') === -1) fallas.push('globals.css sin el hero a ancho completo')
// La grilla vieja no puede quedar: las dos reglas juntas se pelean.
if (vC.indexOf('.perfil-escritorio {\n    display: grid;') !== -1) fallas.push('globals.css todavia tiene la grilla vieja del perfil')
if (vC.indexOf('.perfil-escritorio > .items-stretch {\n    display: contents;') !== -1) fallas.push('globals.css todavia disuelve el par Link Vet / Co-tutor')

const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

// Lo que no se puede haber perdido
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.menu-inferior', '.dash-hero', '.area-analisis', '.ultimos-7', 'LA TABLA DE TAMANOS', '.bandana']) {
  if (vC.indexOf(s) === -1) fallas.push('globals.css PERDIO: ' + s)
}

if (fallas.length) {
  console.error('')
  console.error('ATENCION — el archivo se escribio pero la verificacion fallo:')
  for (const f of fallas) console.error('  - ' + f)
  process.exit(1)
}

console.log('')
console.log('Verificacion OK.')
console.log('  - Perfil en 3 columnas empaquetadas, sin huecos.')
console.log('  - El hero sigue cruzando el ancho completo.')
console.log('  - Link del vet y Co-tutor se apilan en vez de apretarse.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
