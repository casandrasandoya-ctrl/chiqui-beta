// ============================================================
// generar_503_ancho_de_lectura.js
// ============================================================
// Acota el contenido en escritorio. El panel y el fondo siguen usando
// la pantalla completa; lo que se topa es la columna de contenido, que
// es lo que dejo los graficos estirados.
//
// 1. components/ClientWrapper.tsx  (1 reemplazo exacto)
// 2. app/globals.css               (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_WRAPPER = path.join(RAIZ, 'components', 'ClientWrapper.tsx')
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

for (const r of [RUTA_WRAPPER, RUTA_CSS]) {
  if (!fs.existsSync(r)) abortar('No existe: ' + r + '\nCorre el script desde la raiz del proyecto.')
}

let wrapper = fs.readFileSync(RUTA_WRAPPER, 'utf8')
let css = fs.readFileSync(RUTA_CSS, 'utf8')

// --- ClientWrapper -----------------------------------------------------
const W_VIEJO = 'return <div className="fade-in">{children}</div>'
const W_NUEVO = 'return <div className="fade-in contenido-app">{children}</div>'

if (wrapper.indexOf('contenido-app') !== -1) {
  abortar('components/ClientWrapper.tsx ya tiene la clase contenido-app. Parece que este script ya se corrio.')
}
if (contar(wrapper, W_VIEJO) !== 1) {
  abortar('En components/ClientWrapper.tsx se esperaba 1 vez esta linea y hay ' + contar(wrapper, W_VIEJO) + ':\n  ' + W_VIEJO + '\n\nPegame components/ClientWrapper.tsx tal como esta.')
}

// --- globals.css -------------------------------------------------------
const C_VIEJO = "  body:has(.panel-escritorio) {\n    max-width: 100%;\n    padding-left: 264px;\n    padding-right: 24px;\n  }\n}"
const C_NUEVO = "  body:has(.panel-escritorio) {\n    max-width: 100%;\n    padding-left: 264px;\n    padding-right: 24px;\n  }\n\n  /* ---- El ancho de lectura ----------------------------------------\n     Quitar el tope del body fue lo correcto para el fondo y el panel,\n     pero dejo el CONTENIDO sin limite, y eso rompio los graficos: las\n     barras de Analisis quedaron de 1600px de ancho por 12 de alto, y\n     el grafico de peso estiro hasta las etiquetas.\n\n     .contenido-app es el div que ya envolvia todo en ClientWrapper.\n     Topandolo aca, el fondo y el panel siguen usando la pantalla\n     completa y solo el contenido se mantiene legible.\n\n     SI ALGUN DIA SE QUIERE MAS ANCHO O MAS ANGOSTO, ES ESTE NUMERO Y\n     NINGUN OTRO. */\n  body:has(.panel-escritorio) .contenido-app {\n    max-width: 1240px;\n    margin: 0 auto;\n  }\n\n  /* Los graficos son SVG que se estiran al ancho que les den. Aunque el\n     contenido ya este topado, varios siguen quedando demasiado anchos\n     para su alto y se ven aplastados. Este tope solo afecta a los SVG\n     grandes: los iconos miden 16 o 24px y no los toca. */\n  body:has(.panel-escritorio) .contenido-app svg {\n    max-width: 720px;\n  }\n}"

if (css.indexOf('.contenido-app') !== -1) {
  abortar('app/globals.css ya menciona .contenido-app. Parece que este script ya se corrio.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque de :has(.panel-escritorio) y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 502.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
wrapper = wrapper.replace(W_VIEJO, W_NUEVO)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_WRAPPER, wrapper, 'utf8')
console.log('OK: components/ClientWrapper.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vW = fs.readFileSync(RUTA_WRAPPER, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vW.indexOf('"fade-in contenido-app"') === -1) fallas.push('ClientWrapper.tsx sin la clase contenido-app')
if (vC.indexOf('max-width: 1240px') === -1) fallas.push('globals.css sin el tope de 1240px')
if (vC.indexOf('.contenido-app svg') === -1) fallas.push('globals.css sin el tope de los SVG')

// Lo que no se puede haber perdido
for (const s of ['SplashScreen', 'alMenuContextual', 'contextmenu', 'setCargando']) {
  if (vW.indexOf(s) === -1) fallas.push('ClientWrapper.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.panel-escritorio', '.bandana', '.font-heading']) {
  if (vC.indexOf(s) === -1) fallas.push('globals.css PERDIO: ' + s)
}
// La clase fade-in tiene que seguir estando: es la animacion de entrada.
if (vW.indexOf('fade-in') === -1) fallas.push('ClientWrapper.tsx PERDIO la clase fade-in')

if (fallas.length) {
  console.error('')
  console.error('ATENCION — los archivos se escribieron pero la verificacion fallo:')
  for (const f of fallas) console.error('  - ' + f)
  process.exit(1)
}

console.log('')
console.log('Verificacion OK.')
console.log('  - Contenido topado en 1240px y centrado, solo en escritorio.')
console.log('  - Los SVG grandes no pasan de 720px.')
console.log('  - El panel y el fondo siguen usando la pantalla completa.')
console.log('  - El movil no cambia.')
