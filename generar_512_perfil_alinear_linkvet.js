// ============================================================
// generar_512_perfil_alinear_linkvet.js
// ============================================================
// Link del vet y Co-tutor quedaban con otro ancho que el resto de las
// tarjetas del perfil. Se disuelve el envoltorio que las agrupaba.
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

const C_VIEJO = "  /* Link del vet y Co-tutor vienen en su propia grilla de dos columnas,\n     pensada para el ancho del telefono. Dentro de una columna de un\n     tercio quedarian apretadisimos, asi que se apilan: la grilla pasa a\n     una sola columna y las dos tarjetas quedan una sobre otra. */\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch {\n    grid-template-columns: 1fr;\n    gap: 16px;\n  }"
const C_NUEVO = "  /* Link del vet y Co-tutor vienen envueltos en una grilla de dos\n     columnas pensada para el ancho del telefono. Apilarlos dentro de\n     ese envoltorio no bastaba: el envoltorio seguia ocupando un lugar\n     en la columna, y las dos tarjetas quedaban con distinto ancho y\n     distinto margen que todas las demas.\n\n     display: contents lo DISUELVE: el div deja de dibujarse y sus dos\n     tarjetas pasan a flotar en las columnas como cualquier otra.\n\n     OJO CON EL SELECTOR: \">\" mira el DOM, no lo que se dibuja. Aunque\n     el envoltorio no se pinte, sigue siendo el hijo directo, asi que\n     las reglas de las tarjetas hay que escribirlas un nivel mas\n     adentro o no les llegan. */\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch {\n    display: contents;\n  }\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch > * {\n    break-inside: avoid;\n    margin-bottom: 16px;\n  }"

if (css.indexOf('OJO CON EL SELECTOR') !== -1) {
  abortar('app/globals.css ya tiene el arreglo del envoltorio. Parece que este script ya se corrio.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque de .items-stretch del perfil y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 511.\n\nPegame app/globals.css tal como esta.')
}

css = css.replace(C_VIEJO, C_NUEVO)
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vC.indexOf('.perfil-escritorio > .items-stretch > *') === -1) fallas.push('globals.css sin la regla de las tarjetas del envoltorio')
if (vC.indexOf('grid-template-columns: 1fr;\n    gap: 16px;') !== -1) fallas.push('globals.css todavia apila dentro del envoltorio')
if (contar(vC, '.perfil-escritorio > .items-stretch') !== 2) fallas.push('globals.css: se esperaban 2 reglas de .items-stretch y hay ' + contar(vC, '.perfil-escritorio > .items-stretch'))

const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', 'column-count: 3', '.grilla-secciones', '.menu-inferior', '.dash-hero', '.area-analisis', 'LA TABLA DE TAMANOS', '.bandana']) {
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
console.log('  - Link del vet y Co-tutor quedan del mismo ancho que el resto.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
