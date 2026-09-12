// ============================================================
// generar_505_menu_inferior_escritorio.js
// ============================================================
// Esconde el menu de abajo en escritorio, donde el panel lateral ya
// cubre los mismos destinos. El movil no cambia.
//
// 1. components/BottomNav.tsx  (1 reemplazo exacto)
// 2. app/globals.css           (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_NAV = path.join(RAIZ, 'components', 'BottomNav.tsx')
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

for (const r of [RUTA_NAV, RUTA_CSS]) {
  if (!fs.existsSync(r)) abortar('No existe: ' + r + '\nCorre el script desde la raiz del proyecto.')
}

let nav = fs.readFileSync(RUTA_NAV, 'utf8')
let css = fs.readFileSync(RUTA_CSS, 'utf8')

const NAV_VIEJO = "<nav className=\"fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px]\">"
const NAV_NUEVO = "<nav className=\"menu-inferior fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px]\">"
const C_VIEJO = "  body:has(.panel-escritorio) {\n    max-width: 100%;\n    padding-left: 264px;\n    padding-right: 24px;\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) {\n    max-width: 100%;\n    padding-left: 264px;\n    padding-right: 24px;\n    /* En el telefono el body reserva 80px abajo para que el menu\n       inferior no tape la ultima tarjeta. Sin ese menu, ese hueco es\n       solo espacio muerto al final de la pagina. */\n    padding-bottom: 24px;\n  }\n\n  /* ---- El menu de abajo en escritorio -----------------------------\n     El panel lateral tiene los mismos destinos, asi que el menu\n     inferior queda duplicando la navegacion.\n\n     Se esconde cuando HAY PANEL, no simplemente cuando la pantalla es\n     ancha. Es la diferencia entre quedarse sin un menu repetido y\n     quedarse sin navegacion: si algun dia el panel deja de dibujarse en\n     alguna pantalla, el menu inferior reaparece solo. */\n  body:has(.panel-escritorio) .menu-inferior {\n    display: none;\n  }"

if (nav.indexOf('menu-inferior') !== -1) {
  abortar('components/BottomNav.tsx ya tiene la clase menu-inferior. Parece que este script ya se corrio.')
}
if (contar(nav, NAV_VIEJO) !== 1) {
  abortar('En components/BottomNav.tsx se esperaba 1 vez esta linea y hay ' + contar(nav, NAV_VIEJO) + ':\n\n  ' + NAV_VIEJO + '\n\nPegame esa linea tal como esta en tu archivo.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque body:has(.panel-escritorio) y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 502.\n\nPegame app/globals.css tal como esta.')
}

// --- Todo calza: recien ahora se escribe -------------------------------
nav = nav.replace(NAV_VIEJO, NAV_NUEVO)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_NAV, nav, 'utf8')
console.log('OK: components/BottomNav.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vN = fs.readFileSync(RUTA_NAV, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vN.indexOf('className="menu-inferior fixed bottom-0') === -1) fallas.push('BottomNav.tsx sin la clase menu-inferior')
if (contar(vN, '<nav ') !== 1) fallas.push('BottomNav.tsx: el <nav> quedo duplicado o se perdio')
if (vC.indexOf('.menu-inferior') === -1) fallas.push('globals.css sin la regla que esconde el menu inferior')
if (vC.indexOf('padding-bottom: 24px') === -1) fallas.push('globals.css sin el padding-bottom de escritorio')

// Lo que no se puede haber perdido
for (const s of ['navItems', '/registro-diario', 'usePathname', 'bg-[#FFFCF8]']) {
  if (vN.indexOf(s) === -1) fallas.push('BottomNav.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'padding-bottom: 80px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.contenido-app', '.bandana']) {
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
console.log('  - El menu de abajo se esconde solo donde aparece el panel.')
console.log('  - Se recupera el espacio muerto del final de la pagina.')
console.log('  - El movil no cambia.')
