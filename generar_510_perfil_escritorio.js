// ============================================================
// generar_510_perfil_escritorio.js
// ============================================================
// Pone las tarjetas del perfil en tres columnas en escritorio.
// El movil no cambia.
//
// 1. app/perfil/page.tsx  (1 reemplazo exacto)
// 2. app/globals.css      (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_PAGE = path.join(RAIZ, 'app', 'perfil', 'page.tsx')
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

const A_V = "<div className=\"min-h-screen pb-24 fade-in\">"
const A_N = "<div className=\"min-h-screen pb-24 fade-in perfil-escritorio\">"
const C_VIEJO = "  body:has(.panel-escritorio) .area-analisis > .ultimos-7 {\n    order: 1;\n    grid-column: 1 / -1;\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) .area-analisis > .ultimos-7 {\n    order: 1;\n    grid-column: 1 / -1;\n  }\n\n  /* ---- El perfil en escritorio ------------------------------------\n     Las tarjetas del perfil son hermanas sueltas bajo un mismo div, asi\n     que basta con convertir ese div en grilla: cada tarjeta cae en una\n     columna y crece hacia abajo.\n\n     align-items: start para que una tarjeta alta no estire a las de su\n     fila. Caen en el orden en que estan escritas. */\n  body:has(.panel-escritorio) .perfil-escritorio {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 16px;\n    align-items: start;\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n\n  /* Las tarjetas traen mx-4 y mb-4 del movil; dentro de la grilla esos\n     margenes se suman al gap y descuadran las columnas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .mx-4 {\n    margin-left: 0;\n    margin-right: 0;\n    margin-bottom: 0;\n  }\n\n  /* El hero (foto, nombre, edad) cruza el ancho completo: es la\n     cabecera de la pagina, no una tarjeta mas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .text-center {\n    grid-column: 1 / -1;\n  }\n\n  /* Link del vet y Co-tutor vienen envueltos en su propia grilla de dos\n     columnas, pensada para el ancho del telefono. Dentro de un tercio\n     de pantalla quedarian apretadisimos.\n\n     display: contents DISUELVE ese envoltorio: no dibuja nada, y sus\n     dos tarjetas pasan a ser hijas directas de la grilla del perfil,\n     cada una con su propia columna. El div sigue en el DOM, asi que las\n     clases que neutralizan sus margenes siguen aplicandose. */\n  body:has(.panel-escritorio) .perfil-escritorio > .items-stretch {\n    display: contents;\n  }"

if (page.indexOf('perfil-escritorio') !== -1 || css.indexOf('.perfil-escritorio') !== -1) {
  abortar('Ya existe perfil-escritorio en el proyecto. Parece que este script ya se corrio.')
}
if (contar(page, A_V) !== 1) {
  abortar('En app/perfil/page.tsx se esperaba 1 vez esta linea y hay ' + contar(page, A_V) + ':\n\n  ' + A_V + '\n\nEs el div que abre el return de la pagina.\nSi hay mas de uno, pegame las dos lineas para distinguirlos.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque de .ultimos-7 y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 509.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
page = page.replace(A_V, A_N)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_PAGE, page, 'utf8')
console.log('OK: app/perfil/page.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vP = fs.readFileSync(RUTA_PAGE, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vP.indexOf('fade-in perfil-escritorio') === -1) fallas.push('perfil/page.tsx sin la clase perfil-escritorio')
if (vC.indexOf('.perfil-escritorio {') === -1) fallas.push('globals.css sin la grilla del perfil')
if (vC.indexOf('.perfil-escritorio > .items-stretch') === -1) fallas.push('globals.css sin la regla que disuelve el par Link Vet / Co-tutor')
if (vC.indexOf('.perfil-escritorio > .text-center') === -1) fallas.push('globals.css sin la regla de ancho completo del hero')

// Las llaves tienen que seguir balanceadas o el CSS deja de aplicarse
// entero, sin ningun error visible.
const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

// Lo que no se puede haber perdido
for (const s of ['min-h-screen pb-24', 'items-stretch', 'ConfiguracionNotificaciones', 'BottomNav']) {
  if (vP.indexOf(s) === -1) fallas.push('perfil/page.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.menu-inferior', '.dash-hero', '.area-analisis', 'LA TABLA DE TAMANOS', '.bandana']) {
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
console.log('  - Perfil en 3 columnas desde 1024px.')
console.log('  - El hero cruza el ancho completo.')
console.log('  - Link del vet y Co-tutor entran cada uno en su columna.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
