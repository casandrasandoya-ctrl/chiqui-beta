// ============================================================
// generar_509_analisis_dos_columnas.js
// ============================================================
// Analisis pasa de tres columnas a dos, y la barra de los ultimos 7
// dias sube a su propia fila dentro de Estado de salud.
//
// 1. app/analisis/page.tsx  (1 reemplazo exacto)
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

const A_V = "        {/* Últimos 7 días visual — parte de la sección Estado de salud */}\n        <div className=\"mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4\">"
const A_N = "        {/* Últimos 7 días visual — parte de la sección Estado de salud.\n            La clase ultimos-7 la usa globals.css para subirla a su\n            propia fila en escritorio. */}\n        <div className=\"ultimos-7 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4\">"
const C_VIEJO = "  body:has(.panel-escritorio) .area-analisis {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 12px;\n    align-items: start;\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) .area-analisis {\n    display: grid;\n    /* DOS columnas, no tres. Con tres, las tarjetas de Analisis quedan\n       demasiado angostas para lo que llevan dentro: barras, porcentajes\n       y graficos que necesitan ancho para leerse. */\n    grid-template-columns: repeat(2, 1fr);\n    gap: 12px;\n    align-items: start;\n  }\n\n  /* ---- El orden dentro de un area ---------------------------------\n     La barra de los ultimos 7 dias es un resumen de todo el mes, no una\n     tarjeta mas: va sola arriba, cruzando el area entera, y debajo\n     quedan las dos columnas de detalle.\n\n     Se hace con order y no moviendo el JSX porque en el telefono el\n     orden actual es el correcto: ahi todo va apilado y la barra tiene\n     sentido despues del detalle. Estas reglas viven dentro del media\n     query de escritorio, asi que el movil no las ve.\n\n       order 0 — el titulo del area\n       order 1 — la barra de los 7 dias\n       order 2 — todo lo demas, en el orden en que esta escrito */\n  body:has(.panel-escritorio) .area-analisis > * {\n    order: 2;\n  }\n  body:has(.panel-escritorio) .area-analisis > .px-2 {\n    order: 0;\n  }\n  body:has(.panel-escritorio) .area-analisis > .ultimos-7 {\n    order: 1;\n    grid-column: 1 / -1;\n  }"

if (page.indexOf('ultimos-7') !== -1 || css.indexOf('.ultimos-7') !== -1) {
  abortar('Ya existe ultimos-7 en el proyecto. Parece que este script ya se corrio.')
}
if (css.indexOf('.area-analisis') === -1) {
  abortar('app/globals.css no tiene las reglas de .area-analisis.\nFalta correr primero generar_508_grilla_analisis.js.')
}
if (contar(page, A_V) !== 1) {
  abortar('En app/analisis/page.tsx se esperaba 1 vez el bloque de los ultimos 7 dias y hay ' + contar(page, A_V) + '.\n\nSe buscaba exactamente esto (dos lineas, el comentario y el div):\n\n' + A_V + '\n\nPegame ese tramo tal como esta en tu archivo.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque .area-analisis con tres columnas y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 508.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
page = page.replace(A_V, A_N)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_PAGE, page, 'utf8')
console.log('OK: app/analisis/page.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vP = fs.readFileSync(RUTA_PAGE, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

// Se cuenta la CLASE, no la palabra: el comentario que se agrega
// tambien la nombra, y contar la palabra suelta da siempre 2.
if (contar(vP, 'className="ultimos-7 mb-2') !== 1) fallas.push('analisis/page.tsx: se esperaba 1 vez la clase ultimos-7 y hay ' + contar(vP, 'className="ultimos-7 mb-2'))
if (vC.indexOf('grid-template-columns: repeat(2, 1fr)') === -1) fallas.push('globals.css sin las dos columnas de Analisis')
if (vC.indexOf('.area-analisis > .ultimos-7') === -1) fallas.push('globals.css sin la regla de fila propia para los 7 dias')
if (vC.indexOf('.area-analisis > .px-2 {') === -1) fallas.push('globals.css sin la regla de orden del titulo de area')

// Las llaves tienen que seguir balanceadas o el CSS deja de aplicarse
// entero, sin ningun error visible.
const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

// Lo que no se puede haber perdido
for (const s of ['area-analisis', 'min-h-screen pb-24', 'Estado de salud']) {
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
console.log('  - Las areas de Analisis pasan a dos columnas.')
console.log('  - Los ultimos 7 dias suben a su propia fila, de ancho completo.')
console.log('  - Racha y Paseo del mes siguen de a dos, como estaban.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
