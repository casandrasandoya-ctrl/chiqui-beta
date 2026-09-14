// ============================================================
// generar_513_perfil_fila_mascotas.js
// ============================================================
// La fila de mascotas pasa a ocupar el ancho completo del perfil, para
// que nada quede a su lado ni a su altura.
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

const C_VIEJO = "  /* El hero (foto, nombre, edad) cruza las tres columnas: es la\n     cabecera de la pagina, no una tarjeta mas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .text-center {\n    column-span: all;\n    margin-bottom: 16px;\n  }"
const C_NUEVO = "  /* El hero (foto, nombre, edad) cruza las tres columnas: es la\n     cabecera de la pagina, no una tarjeta mas. */\n  body:has(.panel-escritorio) .perfil-escritorio > .text-center {\n    column-span: all;\n    margin-bottom: 16px;\n  }\n\n  /* La fila de mascotas tambien cruza las tres columnas. No es por\n     estetica: es el control que decide QUE mascota se esta mirando, y\n     todo lo que viene despues depende de esa eleccion. Con una tarjeta\n     al lado a la misma altura, se lee como si fueran dos cosas del\n     mismo nivel.\n\n     column-span: all ademas CORTA la fila: lo que viene despues\n     empieza columnas nuevas debajo. Por eso nada puede quedar a su\n     altura, no solo a su lado.\n\n     El selector es components/SelectorMascota.tsx y su raiz es\n     px-4 pb-3. Si esas clases cambian, esta regla deja de encontrarlo\n     y el selector vuelve a compartir fila sin avisar. */\n  body:has(.panel-escritorio) .perfil-escritorio > .px-4.pb-3 {\n    column-span: all;\n    margin-bottom: 16px;\n  }"

if (css.indexOf('.perfil-escritorio > .px-4.pb-3') !== -1) {
  abortar('app/globals.css ya tiene la regla de la fila de mascotas. Parece que este script ya se corrio.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque del hero del perfil y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 511.\n\nPegame app/globals.css tal como esta.')
}

css = css.replace(C_VIEJO, C_NUEVO)
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vC.indexOf('.perfil-escritorio > .px-4.pb-3') === -1) fallas.push('globals.css sin la regla de la fila de mascotas')
// Se cuentan los SELECTORES, no la palabra: los comentarios tambien
// nombran la regla y contar la palabra suelta da de mas.
if (contar(vC, '.perfil-escritorio > .px-4.pb-3 {') !== 1) fallas.push('globals.css: la regla de la fila de mascotas no quedo una sola vez')
if (contar(vC, '.perfil-escritorio > .text-center {') !== 1) fallas.push('globals.css: se perdio la regla de ancho completo del hero')

const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas en globals.css: ' + abre + ' abiertas y ' + cierra + ' cerradas')

for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', 'column-count: 3', '.items-stretch', '.grilla-secciones', '.menu-inferior', '.dash-hero', '.area-analisis', 'LA TABLA DE TAMANOS', '.bandana']) {
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
console.log('  - La fila de mascotas cruza el ancho completo y corta la fila.')
console.log('  - Nada queda a su lado ni a su altura.')
console.log('  - Llaves balanceadas: ' + abre + '.')
console.log('  - El movil no cambia.')
