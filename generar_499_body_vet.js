const fs = require('fs');
const path = require('path');

// ============================================================
// generar_499_body_vet.js
// ============================================================
// LA CAUSA, por fin: en globals.css el body tiene max-width: 420px.
//
// Eso limita TODA la app, y ninguna clase de Tailwind puede superarlo
// porque el body esta por encima de cualquier contenedor. Por eso
// max-w-5xl, max-w-7xl y max-w-[1280px] no hacian absolutamente nada.
//
// EL ARREGLO
// El limite se mantiene para toda la app —es una app de telefono y asi
// debe verse— y se levanta SOLO en la vista del veterinario, que es la
// unica que se abre desde un computador.
//
// Se hace con CSS puro, usando :has(): si el body contiene la vista del
// vet, el limite sube. No hay que tocar el layout ni leer rutas en el
// servidor, que es donde esto se suele complicar.
//
// En el telefono no cambia nada: la pantalla ya es mas angosta que el
// limite nuevo.
//
// Toca dos archivos: globals.css y app/vet/page.tsx.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_CSS = 'app/globals.css';
const RUTA_VET = 'app/vet/page.tsx';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const dCss = path.join(process.cwd(), RUTA_CSS);
const dVet = path.join(process.cwd(), RUTA_VET);
for (const [r, d] of [[RUTA_CSS, dCss], [RUTA_VET, dVet]]) {
  if (!fs.existsSync(d)) abortar('no se encontro ' + r + '.');
}

let css = fs.readFileSync(dCss, 'utf8');
let vet = fs.readFileSync(dVet, 'utf8');

if (css.includes('vista-vet')) {
  abortar('el CSS ya tiene la regla. Parece que este script ya se corrio.');
}

// --- 1. La regla en el CSS
const ANCLA = '  max-width: 420px;';
const n = contar(css, ANCLA);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'max-width del body -> ' + n + ' coincidencia(s)');
if (n !== 1) abortar('esperaba 1 coincidencia y encontre ' + n + '.');

const finBody = css.indexOf('}', css.indexOf(ANCLA));
if (finBody === -1) abortar('no encontre el cierre del bloque body.');

const REGLA = `

/* El body limita toda la app a 420px, que es lo correcto: CHIQUI es una
   app de telefono. Pero la vista del veterinario se abre desde un
   computador, y ahi ese limite desperdicia casi toda la pantalla.

   :has() mira si el body contiene la vista del vet. Asi no hay que leer
   la ruta en el servidor ni tocar el layout.

   En el telefono no cambia nada: la pantalla ya es mas angosta que
   estos limites. */
body:has(.vista-vet) {
  max-width: 100%;
  padding-bottom: 24px;
}
@media (min-width: 1024px) {
  body:has(.vista-vet) .vista-vet {
    max-width: 1024px;
    margin: 0 auto;
  }
}
@media (min-width: 1280px) {
  body:has(.vista-vet) .vista-vet {
    max-width: 1280px;
  }
}`;

css = css.slice(0, finBody + 1) + REGLA + css.slice(finBody + 1);
console.log('  OK  regla agregada al CSS');

// --- 2. La clase en el contenedor de la vista del vet
const CONTENEDORES = [
  'className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg lg:max-w-5xl xl:max-w-7xl mx-auto"',
  'className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg lg:max-w-[1280px] mx-auto"',
  'className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg lg:max-w-6xl mx-auto"',
  'className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg mx-auto"',
];
const cont = CONTENEDORES.find(x => contar(vet, x) === 1);
if (!cont) {
  abortar('no reconoci el contenedor de la vista del vet. Pasale a Claude esa linea.');
}
// Se quitan las clases de ancho de Tailwind: ahora manda el CSS.
vet = vet.split(cont).join('className="vista-vet min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12"');
console.log('  OK  clase aplicada en la vista del vet');

// --- Verificaciones
if (!css.includes('body:has(.vista-vet)')) abortar('la regla CSS no quedo.');
if (!vet.includes('vista-vet')) abortar('la clase no quedo en la vista.');
if (!vet.includes('lg:columns-2')) abortar('se perdieron las columnas.');
for (const s of ['Vista veterinaria', 'Ficha del paciente']) {
  if (!vet.includes(s)) abortar('se perdio [' + s + '] al reemplazar.');
}

fs.writeFileSync(dCss, css, 'utf8');
console.log('');
console.log('OK: ' + RUTA_CSS);
fs.writeFileSync(dVet, vet, 'utf8');
console.log('OK: ' + RUTA_VET);
console.log('');
console.log('Recarga con Ctrl+Shift+R. El resto de la app sigue igual: el');
console.log('limite solo se levanta en /vet.');
