// ============================================================
// generar_507_tipografia_escritorio.js
// ============================================================
// Sube el tamano de letra en escritorio de verdad.
//
// El bloque anterior solo cubria las clases estandar de Tailwind
// (text-xs, text-sm...). La app escribe la mayor parte de su texto en
// pixeles a mano — text-[12.5px], text-[10.5px], text-[13px] — y esas
// se quedaban en tamano de telefono. Por eso la pantalla seguia
// viendose chica aunque el bloque de tipografia existiera.
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

const C_VIEJO = "  body:not(:has(.vista-vet)) {\n    font-size: 15px;\n  }\n\n  /* El texto de contenido. Los tamaños de Tailwind están en rem, pero\n     las clases los fijan en px, así que hay que subirlos uno a uno. */\n  body:not(:has(.vista-vet)) .text-xs { font-size: 13px; line-height: 1.5; }\n  body:not(:has(.vista-vet)) .text-sm { font-size: 15px; line-height: 1.55; }\n  body:not(:has(.vista-vet)) .text-base { font-size: 16px; }\n  body:not(:has(.vista-vet)) .text-lg { font-size: 19px; }\n  body:not(:has(.vista-vet)) .text-xl { font-size: 22px; }\n  body:not(:has(.vista-vet)) .text-2xl { font-size: 26px; }\n\n  /* Los textos diminutos de etiqueta suben menos: siguen siendo\n     secundarios, solo dejan de ser ilegibles. */\n  body:not(:has(.vista-vet)) .text-\\[10px\\] { font-size: 12px; }\n  body:not(:has(.vista-vet)) .text-\\[11px\\] { font-size: 13px; }\n\n  /* Más aire: en pantalla grande, el espaciado de móvil se ve\n     apretado. */\n  body:not(:has(.vista-vet)) .mx-4 { margin-left: 24px; margin-right: 24px; }\n  body:not(:has(.vista-vet)) .px-4 { padding-left: 24px; padding-right: 24px; }\n  body:not(:has(.vista-vet)) .px-5 { padding-left: 28px; padding-right: 28px; }\n\n  /* El panel tiene su propio espaciado: no debe heredar el de la app. */\n  .panel-escritorio .px-5 { padding-left: 20px; padding-right: 20px; }\n  .panel-escritorio .text-\\[11px\\] { font-size: 11px; }"
const C_NUEVO = "  body:not(:has(.vista-vet)) {\n    font-size: 16px;\n  }\n\n  /* ---- LA TABLA DE TAMANOS ----------------------------------------\n     ESTE ES EL UNICO LUGAR DONDE SE AJUSTA EL TAMANO DE LETRA EN\n     ESCRITORIO. Si algo se ve chico o grande, se cambia aca y en\n     ningun otro lado.\n\n     Por que hay que listarlas una por una: las clases de Tailwind\n     fijan el tamano en px, no en rem, asi que subir el font-size del\n     body no arrastra nada. Cada clase que la app use tiene que estar\n     en esta lista o se queda en su tamano de telefono.\n\n     Primero las clases estandar. */\n  body:not(:has(.vista-vet)) .text-xs { font-size: 14px; line-height: 1.5; }\n  body:not(:has(.vista-vet)) .text-sm { font-size: 16px; line-height: 1.55; }\n  body:not(:has(.vista-vet)) .text-base { font-size: 17px; }\n  body:not(:has(.vista-vet)) .text-lg { font-size: 20px; }\n  body:not(:has(.vista-vet)) .text-xl { font-size: 24px; }\n  body:not(:has(.vista-vet)) .text-2xl { font-size: 28px; }\n  body:not(:has(.vista-vet)) .text-3xl { font-size: 32px; }\n\n  /* Y ahora las que la app escribe en pixeles a mano. Son la mayoria\n     del texto de las tarjetas — Proximos, los cubos de Cuidados, las\n     pildoras de estado — y por eso, cubriendo solo las estandar, la\n     pantalla seguia viendose chica. */\n  body:not(:has(.vista-vet)) .text-\\[9px\\] { font-size: 12px; }\n  body:not(:has(.vista-vet)) .text-\\[10px\\] { font-size: 13px; }\n  body:not(:has(.vista-vet)) .text-\\[10\\.5px\\] { font-size: 13px; }\n  body:not(:has(.vista-vet)) .text-\\[11px\\] { font-size: 14px; }\n  body:not(:has(.vista-vet)) .text-\\[11\\.5px\\] { font-size: 14px; }\n  body:not(:has(.vista-vet)) .text-\\[12px\\] { font-size: 14px; }\n  body:not(:has(.vista-vet)) .text-\\[12\\.5px\\] { font-size: 15px; }\n  body:not(:has(.vista-vet)) .text-\\[13px\\] { font-size: 15px; }\n  body:not(:has(.vista-vet)) .text-\\[13\\.5px\\] { font-size: 16px; }\n  body:not(:has(.vista-vet)) .text-\\[14px\\] { font-size: 16px; }\n  body:not(:has(.vista-vet)) .text-\\[15px\\] { font-size: 17px; }\n  body:not(:has(.vista-vet)) .text-\\[16px\\] { font-size: 18px; }\n  body:not(:has(.vista-vet)) .text-\\[17px\\] { font-size: 19px; }\n  body:not(:has(.vista-vet)) .text-\\[18px\\] { font-size: 20px; }\n  body:not(:has(.vista-vet)) .text-\\[20px\\] { font-size: 22px; }\n  body:not(:has(.vista-vet)) .text-\\[22px\\] { font-size: 24px; }\n  body:not(:has(.vista-vet)) .text-\\[26px\\] { font-size: 28px; }\n\n  /* Mas aire: en pantalla grande, el espaciado de movil se ve\n     apretado. */\n  body:not(:has(.vista-vet)) .mx-4 { margin-left: 24px; margin-right: 24px; }\n  body:not(:has(.vista-vet)) .px-4 { padding-left: 24px; padding-right: 24px; }\n  body:not(:has(.vista-vet)) .px-5 { padding-left: 28px; padding-right: 28px; }\n\n  /* El panel tiene su propio espaciado y su propia escala: es\n     navegacion, no contenido, y no debe competir con lo que se lee. */\n  .panel-escritorio .px-5 { padding-left: 20px; padding-right: 20px; }\n  .panel-escritorio .text-sm { font-size: 15px; }\n  .panel-escritorio .text-\\[11px\\] { font-size: 12px; }"

if (css.indexOf('LA TABLA DE TAMANOS') !== -1) {
  abortar('app/globals.css ya tiene la tabla de tamanos. Parece que este script ya se corrio.')
}
if (contar(css, C_VIEJO) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el bloque de tipografia de escritorio y hay ' + contar(css, C_VIEJO) + '.\nEse bloque lo dejo el script 502.\n\nPegame app/globals.css tal como esta.')
}

css = css.replace(C_VIEJO, C_NUEVO)
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vC = fs.readFileSync(RUTA_CSS, 'utf8')
const fallas = []

if (vC.indexOf('font-size: 16px') === -1) fallas.push('globals.css sin el nuevo tamano base')
if (vC.indexOf('LA TABLA DE TAMANOS') === -1) fallas.push('globals.css sin la tabla de tamanos')
// Las arbitrarias son el punto del script: si no quedaron, no sirvio.
for (const c of ['text-\\[12\\.5px\\]', 'text-\\[10\\.5px\\]', 'text-\\[13px\\]', 'text-\\[9px\\]']) {
  if (vC.indexOf(c) === -1) fallas.push('globals.css sin la regla de ' + c)
}
if (vC.indexOf('font-size: 15px;\n  }') !== -1) fallas.push('globals.css todavia tiene el tamano base viejo de 15px')

// Las llaves tienen que seguir balanceadas o el CSS entero deja de
// aplicarse, sin ningun error visible.
const abre = contar(vC, '{'), cierra = contar(vC, '}')
if (abre !== cierra) fallas.push('llaves desbalanceadas: ' + abre + ' abiertas y ' + cierra + ' cerradas')

// Lo que no se puede haber perdido
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', 'padding-left: 264px', '.grilla-secciones', '.menu-inferior', '.dash-hero', '.contenido-app', '.bandana', '.panel-escritorio']) {
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
console.log('  - Base de 15 a 16px.')
console.log('  - Las 17 clases en pixeles a mano ahora tambien suben.')
console.log('  - Todo el ajuste vive en UNA tabla, marcada en el archivo.')
console.log('  - El movil no cambia.')
console.log('  - Llaves balanceadas: ' + abre + '.')
