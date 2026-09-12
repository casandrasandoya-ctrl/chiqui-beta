// ============================================================
// generar_504_grilla_prevencion.js
// ============================================================
// Pone las tarjetas de Prevencion en tres columnas en escritorio.
// El movil no cambia.
//
// 1. app/prevencion/page.tsx  (2 reemplazos exactos)
// 2. app/globals.css          (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_PAGE = path.join(RAIZ, 'app', 'prevencion', 'page.tsx')
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

const A_ROOT_V = "<div className=\"min-h-screen pb-24 fade-in\">"
const A_ROOT_N = "<div className=\"min-h-screen pb-24 fade-in grilla-secciones\">"
const A_SEL_V = "{mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}"
const A_SEL_N = "{mascota && <div className=\"fila-completa\"><SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} /></div>}"
const C_VIEJO = "  body:has(.panel-escritorio) .contenido-app {\n    max-width: 1240px;\n    margin: 0 auto;\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) .contenido-app {\n    max-width: 1600px;\n    margin: 0 auto;\n  }\n\n  /* ---- Secciones en tres columnas ---------------------------------\n     El ancho no sobraba: lo que sobraba era que cada tarjeta ocupara\n     una fila entera. Con tres columnas las tarjetas dejan de estirarse\n     y crecen hacia abajo, cada una en su columna.\n\n     align-items: start es lo que hace que abrir un acordeon NO estire a\n     las tarjetas vecinas. Sin eso, las tres de la fila crecerian al\n     alto de la mas alta.\n\n     Una pagina entra en este modo poniendole la clase grilla-secciones\n     a su contenedor, siempre que sus tarjetas sean hijas directas.\n\n     Todo esto vive dentro del media query de escritorio: en el telefono\n     las tarjetas siguen apiladas exactamente igual que antes. */\n  body:has(.panel-escritorio) .grilla-secciones {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 16px;\n    align-items: start;\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n\n  /* Las tarjetas traen mx-4 y mb-2 del movil. Dentro de la grilla esos\n     margenes se suman al gap y descuadran las columnas. */\n  body:has(.panel-escritorio) .grilla-secciones > .mx-4 {\n    margin-left: 0;\n    margin-right: 0;\n    margin-bottom: 0;\n  }\n\n  /* Lo que no es una tarjeta ocupa la fila entera:\n     - .fila-completa: lo marcado a mano (el selector de mascota).\n     - div.justify-between: el encabezado de la pagina.\n     - div.items-center.gap-2: los titulos de area (Signos vitales,\n       Prevencion, Historial medico). Las tarjetas no llevan\n       items-center, asi que no las toca.\n     Se hace por clases y no marcando cada titulo para no tener que\n     editar seis puntos del JSX. Si algun dia un titulo de area cambia\n     sus clases de Tailwind, es ACA donde hay que mirar. */\n  body:has(.panel-escritorio) .grilla-secciones > .fila-completa,\n  body:has(.panel-escritorio) .grilla-secciones > div.justify-between,\n  body:has(.panel-escritorio) .grilla-secciones > div.items-center.gap-2 {\n    grid-column: 1 / -1;\n  }"

if (page.indexOf('grilla-secciones') !== -1) {
  abortar('app/prevencion/page.tsx ya menciona grilla-secciones. Parece que este script ya se corrio.')
}
if (contar(page, A_ROOT_V) !== 1) {
  abortar('En app/prevencion/page.tsx se esperaba 1 vez esta linea y hay ' + contar(page, A_ROOT_V) + ':\n\n  ' + A_ROOT_V + '\n\nEs el div que abre el return de la pagina.\nPegame esa linea tal como esta en tu archivo.')
}
if (contar(page, A_SEL_V) !== 1) {
  abortar('En app/prevencion/page.tsx se esperaba 1 vez esta linea y hay ' + contar(page, A_SEL_V) + ':\n\n  ' + A_SEL_V + '\n\nEs la linea del SelectorMascota.\nPegame esa linea tal como esta en tu archivo.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque .contenido-app con max-width 1240px y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 503.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
page = page.replace(A_ROOT_V, A_ROOT_N)
page = page.replace(A_SEL_V, A_SEL_N)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_PAGE, page, 'utf8')
console.log('OK: app/prevencion/page.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vP = fs.readFileSync(RUTA_PAGE, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vP.indexOf('fade-in grilla-secciones') === -1) fallas.push('page.tsx sin la clase grilla-secciones en el contenedor')
if (vP.indexOf('<div className="fila-completa"><SelectorMascota') === -1) fallas.push('page.tsx sin el envoltorio del SelectorMascota')
if (contar(vP, '<SelectorMascota') !== 1) fallas.push('page.tsx: el SelectorMascota quedo duplicado o se perdio')
if (vC.indexOf('grid-template-columns: repeat(3, 1fr)') === -1) fallas.push('globals.css sin la grilla de 3 columnas')
if (vC.indexOf('align-items: start') === -1) fallas.push('globals.css sin align-items: start (las tarjetas se estirarian)')
if (vC.indexOf('max-width: 1600px') === -1) fallas.push('globals.css sin el nuevo tope de 1600px')
if (vC.indexOf('max-width: 1240px') !== -1) fallas.push('globals.css todavia tiene el tope viejo de 1240px')

// Lo que no se puede haber perdido
for (const s of ['min-h-screen pb-24', 'chiqui_temperatura.png', 'Salud preventiva']) {
  if (vP.indexOf(s) === -1) fallas.push('page.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.panel-escritorio', '.contenido-app', '.bandana']) {
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
console.log('  - Prevencion en 3 columnas desde 1024px.')
console.log('  - Titulos de area y selector de mascota a fila completa.')
console.log('  - Una tarjeta abierta crece hacia abajo, sin estirar a las vecinas.')
console.log('  - Contenido hasta 1600px.')
console.log('  - El movil no cambia.')
