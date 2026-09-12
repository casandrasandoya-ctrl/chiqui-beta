// ============================================================
// generar_506_dashboard_escritorio.js
// ============================================================
// Reparte el dashboard en escritorio: el hero con los dos botones a su
// derecha, y Proximos de a tres por fila. El movil no cambia.
//
// 1. components/DashboardContenido.tsx  (3 reemplazos exactos)
// 2. app/globals.css                    (1 reemplazo exacto)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_DASH = path.join(RAIZ, 'components', 'DashboardContenido.tsx')
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

for (const r of [RUTA_DASH, RUTA_CSS]) {
  if (!fs.existsSync(r)) abortar('No existe: ' + r + '\nCorre el script desde la raiz del proyecto.')
}

let dash = fs.readFileSync(RUTA_DASH, 'utf8')
let css = fs.readFileSync(RUTA_CSS, 'utf8')

const A_ROOT_V = "<div className=\"min-h-screen pb-24 fade-in bg-[#F5EDE3] text-[#3D2B1F]\">"
const A_ROOT_N = "<div className=\"min-h-screen pb-24 fade-in bg-[#F5EDE3] text-[#3D2B1F] dash-escritorio\">"
const A_HERO_V = "      <Link href=\"/registro-diario\" className=\"relative mx-4 mb-3 rounded-3xl p-5 overflow-hidden block\""
const A_HERO_N = "      <div className=\"dash-hero\">\n      <Link href=\"/registro-diario\" className=\"relative mx-4 mb-3 rounded-3xl p-5 overflow-hidden block\""
const A_FIN_V = "        <BotonLinkVet mascotaId={m.id} mascotaNombre={m.nombre} />\n      </div>"
const A_FIN_N = "        <BotonLinkVet mascotaId={m.id} mascotaNombre={m.nombre} />\n      </div>\n      </div>"
const C_VIEJO = "  body:has(.panel-escritorio) .grilla-secciones > .fila-completa,\n  body:has(.panel-escritorio) .grilla-secciones > div.justify-between,\n  body:has(.panel-escritorio) .grilla-secciones > div.items-center.gap-2 {\n    grid-column: 1 / -1;\n  }"
const C_NUEVO = "  body:has(.panel-escritorio) .grilla-secciones > .fila-completa,\n  body:has(.panel-escritorio) .grilla-secciones > div.justify-between,\n  body:has(.panel-escritorio) .grilla-secciones > div.items-center.gap-2 {\n    grid-column: 1 / -1;\n  }\n\n  /* ---- El dashboard en escritorio ---------------------------------\n     El dashboard NO usa grilla-secciones. Sus secciones ya son grillas\n     por dentro (Proximos, Cuidados recientes), asi que meterlas en una\n     columna de un tercio las dejaria peor que apiladas. Aca se ensancha\n     lo que ya existe en vez de reagrupar.\n\n     El hero y los dos botones: en el telefono van uno debajo del otro,\n     porque a lo ancho no caben. En escritorio el hero se queda con dos\n     tercios y los botones se apilan en el tercio restante. */\n  body:has(.panel-escritorio) .dash-hero {\n    display: grid;\n    grid-template-columns: 2fr 1fr;\n    gap: 16px;\n    align-items: start;\n    padding-left: 24px;\n    padding-right: 24px;\n  }\n  /* El hero y la fila de botones traen su propio mx-4 y mb del movil.\n     Dentro de la grilla esos margenes descuadran las dos columnas: el\n     espaciado ya lo pone el gap del contenedor. */\n  body:has(.panel-escritorio) .dash-hero > .mx-4 {\n    margin-left: 0;\n    margin-right: 0;\n    margin-bottom: 0;\n  }\n  /* Los botones dejan de ir lado a lado y se apilan: en un tercio de\n     ancho, dos botones juntos quedan ilegibles. */\n  body:has(.panel-escritorio) .dash-hero > .flex {\n    flex-direction: column;\n  }\n\n  /* Proximos pasa de dos a tres por fila. Se identifica por sus propias\n     clases (es la unica grilla del dashboard con gap-2.5) para no tener\n     que tocar el JSX. Cuidados recientes ya va de a tres y no se toca. */\n  body:has(.panel-escritorio) .dash-escritorio .grid-cols-2.gap-2\\.5 {\n    grid-template-columns: repeat(3, 1fr);\n  }"

if (dash.indexOf('dash-escritorio') !== -1 || dash.indexOf('dash-hero') !== -1) {
  abortar('components/DashboardContenido.tsx ya menciona dash-escritorio o dash-hero. Parece que este script ya se corrio.')
}

const chequeos = [
  [A_ROOT_V, 'el div que abre el return del dashboard'],
  [A_HERO_V, 'la linea del <Link> del HERO (con su indentacion de 6 espacios)'],
  [A_FIN_V, 'la linea de <BotonLinkVet> seguida del </div> que la cierra'],
]
for (const [aguja, que] of chequeos) {
  const n = contar(dash, aguja)
  if (n !== 1) {
    abortar('En components/DashboardContenido.tsx se esperaba 1 vez ' + que + ' y hay ' + n + '.\n\nSe buscaba exactamente esto:\n\n' + aguja + '\n\nPegame ese tramo tal como esta en tu archivo.')
  }
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque de fila-completa y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 504.\n\nPegame app/globals.css tal como esta.')
}

// Conteo ANTES de tocar nada: este script agrega exactamente un <div>
// de apertura y un </div> de cierre. Si el balance no sube en 1 y 1, el
// JSX quedaria roto y el build fallaria.
const abreAntes = contar(dash, '<div')
const cierraAntes = contar(dash, '</div>')

// --- Todo calza: recien ahora se escribe -------------------------------
dash = dash.replace(A_ROOT_V, A_ROOT_N)
dash = dash.replace(A_HERO_V, A_HERO_N)
dash = dash.replace(A_FIN_V, A_FIN_N)
css = css.replace(C_VIEJO, C_NUEVO)

fs.writeFileSync(RUTA_DASH, dash, 'utf8')
console.log('OK: components/DashboardContenido.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vD = fs.readFileSync(RUTA_DASH, 'utf8')
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vD.indexOf('text-[#3D2B1F] dash-escritorio') === -1) fallas.push('DashboardContenido.tsx sin la clase dash-escritorio')
if (contar(vD, 'dash-hero') !== 1) fallas.push('DashboardContenido.tsx: se esperaba 1 apertura de dash-hero, hay ' + contar(vD, 'dash-hero'))
if (contar(vD, '<BotonLinkVet') !== 1) fallas.push('DashboardContenido.tsx: BotonLinkVet quedo duplicado o se perdio')
if (contar(vD, '<Link href="/registro-diario"') !== 1) fallas.push('DashboardContenido.tsx: el hero quedo duplicado o se perdio')

const abre = contar(vD, '<div'), cierra = contar(vD, '</div>')
if (abre !== abreAntes + 1) fallas.push('se esperaba 1 <div> nuevo y hay ' + (abre - abreAntes))
if (cierra !== cierraAntes + 1) fallas.push('se esperaba 1 </div> nuevo y hay ' + (cierra - cierraAntes))

if (vC.indexOf('.dash-hero') === -1) fallas.push('globals.css sin las reglas de .dash-hero')
if (vC.indexOf('grid-template-columns: 2fr 1fr') === -1) fallas.push('globals.css sin el reparto 2/3 y 1/3 del hero')
if (vC.indexOf('.grid-cols-2.gap-2\\.5') === -1) fallas.push('globals.css sin la regla de Proximos a tres columnas')

// Lo que no se puede haber perdido
for (const s of ['min-h-screen pb-24', 'SelectorMascota', 'Novedades', '/registro-diario', '/perfil']) {
  if (vD.indexOf(s) === -1) fallas.push('DashboardContenido.tsx PERDIO: ' + s)
}
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.menu-inferior', '.contenido-app', '.bandana']) {
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
console.log('  - Hero a dos tercios, con Ver Perfil y Link Vet apilados al lado.')
console.log('  - Proximos de a tres por fila.')
console.log('  - Cuidados recientes y Chiqui Tips se quedan como estaban.')
console.log('  - El movil no cambia.')
console.log('')
console.log('Etiquetas div: ' + abre + ' abiertas, ' + cierra + ' cerradas (antes ' + abreAntes + ' / ' + cierraAntes + ').')
