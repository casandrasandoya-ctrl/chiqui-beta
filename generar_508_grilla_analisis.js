// ============================================================
// generar_508_grilla_analisis.js
// ============================================================
// Pone las tarjetas de Analisis en tres columnas dentro de cada area.
// El movil no cambia.
//
// 1. app/analisis/page.tsx  (2 reemplazos exactos)
// 2. app/globals.css        (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_PAGE = path.join(RAIZ, 'app', 'analisis', 'page.tsx')
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

for (const r of [RUTA_PAGE, RUTA_CSS]) {
  if (!fs.existsSync(r)) abortar('No existe: ' + r + '\nCorre el script desde la raiz del proyecto.')
}

let page = fs.readFileSync(RUTA_PAGE, 'utf8')
let css = fs.readFileSync(RUTA_CSS, 'utf8')

const A1_V = "<div className=\"mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3\" style={{ background: '#F0E2CE' }}>"
const A1_N = "<div className=\"area-analisis mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3\" style={{ background: '#F0E2CE' }}>"
const A2_V = "<div className=\"mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3\" style={{ background: '#FBEEDD' }}>"
const A2_N = "<div className=\"area-analisis mx-4 mb-5 rounded-3xl px-3 pt-2 pb-3\" style={{ background: '#FBEEDD' }}>"
const C_VIEJO = "  body:has(.panel-escritorio) .dash-escritorio .grid-cols-2.gap-2\\.5 {\n    grid-template-columns: repeat(3, 1fr);\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) .dash-escritorio .grid-cols-2.gap-2\\.5 {\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  /* ---- Analisis en escritorio -------------------------------------\n     Analisis no se parece ni a Prevencion ni al dashboard: sus tarjetas\n     viven DENTRO de contenedores de area con fondo propio (Estado de\n     salud, Actividad fisica). La grilla va en cada area, no en la raiz:\n     poner las areas mismas en columnas las partiria por la mitad.\n\n     align-items: start para que abrir un desplegable no estire a las\n     tarjetas vecinas de la misma fila. */\n  body:has(.panel-escritorio) .area-analisis {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 12px;\n    align-items: start;\n  }\n\n  /* Dentro de un area hay dos cosas que NO son tarjetas y tienen que\n     cruzar la fila entera:\n     - .px-2  es el envoltorio del titulo del area.\n     - .grid  son las minigrillas internas (los cubos de racha y paseo\n       del mes). Meter una grilla de dos columnas dentro de una columna\n       de un tercio deja los numeros ilegibles. */\n  body:has(.panel-escritorio) .area-analisis > .px-2,\n  body:has(.panel-escritorio) .area-analisis > .grid {\n    grid-column: 1 / -1;\n  }\n\n  /* Las tarjetas traen mb-2 del movil; dentro de la grilla ese margen\n     se suma al gap y descuadra las filas. */\n  body:has(.panel-escritorio) .area-analisis > .mb-2 {\n    margin-bottom: 0;\n  }"

if (page.indexOf('area-analisis') !== -1) {
  abortar('app/analisis/page.tsx ya menciona area-analisis. Parece que este script ya se corrio.')
}

const chequeos = [
  [A1_V, 'el contenedor del area Estado de salud (fondo F0E2CE)'],
  [A2_V, 'el contenedor del area Actividad fisica (fondo FBEEDD)'],
]
for (const [aguja, que] of chequeos) {
  const n = contar(page, aguja)
  if (n !== 1) {
    abortar('En app/analisis/page.tsx se esperaba 1 vez ' + que + ' y hay ' + n + '.\n\nSe buscaba exactamente esto:\n\n' + aguja + '\n\nPegame esa linea tal como esta en tu archivo.')
  }
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez la regla de Proximos del dashboard y hay ' + contar(css, C_VIEJO) + '.\nEsa regla la dejo el script 506.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
page = page.replace(A1_V, A1_N)
page = page.replace(A2_V, A2_N)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_PAGE, page, 'utf8')
console.log('OK: app/analisis/page.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vP = fs.readFileSync(RUTA_PAGE, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (contar(vP, 'area-analisis') !== 2) fallas.push('analisis/page.tsx: se esperaban 2 areas marcadas y hay ' + contar(vP, 'area-analisis'))
if (vP.indexOf("background: '#F0E2CE'") === -1) fallas.push('analisis/page.tsx PERDIO el fondo del area Estado de salud')
if (vP.indexOf("background: '#FBEEDD'") === -1) fallas.push('analisis/page.tsx PERDIO el fondo del area Actividad fisica')
if (vC.indexOf('.area-analisis') === -1) fallas.push('globals.css sin las reglas de .area-analisis')
if (vC.indexOf('grid-column: 1 / -1') === -1) fallas.push('globals.css sin la regla de fila completa')

// Las llaves tienen que seguir balanceadas o el CSS deja de aplicarse
// entero, sin ningun error visible.
const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

// Lo que no se puede haber perdido
for (const s of ['min-h-screen pb-24', 'SelectorMascota', 'Estado de salud']) {
  if (vP.indexOf(s) === -1) fallas.push('analisis/page.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.menu-inferior', '.dash-hero', 'LA TABLA DE TAMANOS', '.bandana']) {
  if (vC.indexOf(s) === -1) fallas.push('globals.css PERDIO: ' + s)
}

if (fallas.length) {
  console.error('')
  console.error('ATENCION — los archivos se escribieron pero la verificacion fallo:')
  for (const f of fallas) console.error('  - ' + f)
  process.exit(1)
}

console.log('')
console.log('Verificacion OK.')
console.log('  - Estado de salud y Actividad fisica en 3 columnas.')
console.log('  - Titulos de area y minigrillas internas a fila completa.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
