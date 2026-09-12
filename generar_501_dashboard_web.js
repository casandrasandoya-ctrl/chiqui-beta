const fs = require('fs');
const path = require('path');

// ============================================================
// generar_501_dashboard_web.js
// ============================================================
// La app deja de verse como un telefono estirado en el computador.
//
// POR QUE NO SE DUPLICA EL DASHBOARD
// Tiene Novedades con su cola de prioridades, el selector de mascota,
// los cubos, las rachas, los proximos. Dos versiones significa que cada
// arreglo futuro hay que hacerlo dos veces, y una se queda atras.
// El mismo componente se reorganiza con CSS, como se hizo en la vista
// del veterinario.
//
// QUE CAMBIA, SOLO DESDE 1024px
//
// 1. LA TIPOGRAFIA CRECE
//    12px en un monitor a 60cm es incomodo. El texto de contenido pasa
//    a 15px, los titulos a 20. Es el cambio que mas se nota: sin el,
//    ampliar el ancho solo produce un telefono ancho.
//
// 2. DOS COLUMNAS
//    El contenido del dashboard se reparte en dos columnas que fluyen
//    solas, sin tocar el orden ni el JSX.
//
// 3. MAS AIRE
//    Los margenes de 16px pasan a 24: en pantalla grande, el
//    espaciado de movil se ve apretado.
//
// EN EL TELEFONO NO CAMBIA NADA.
//
// EL MENU ARRIBA va aparte: es un componente nuevo y merece su propio
// paso, con el dashboard ya funcionando.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/globals.css';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) abortar('no se encontro ' + RUTA + '.');

let css = fs.readFileSync(destino, 'utf8');

if (css.includes('TIPOGRAFIA DE ESCRITORIO')) {
  abortar('el CSS ya tiene la vista web. Parece que este script ya se corrio.');
}
if (!css.includes('CHIQUI EN ESCRITORIO')) {
  abortar('falta el script 500. Correlo primero.');
}

const BLOQUE = `

/* ============================================================
   TIPOGRAFIA DE ESCRITORIO
   ============================================================
   Sin esto, ampliar el ancho solo produce un telefono ancho: la letra
   de 12px pensada para leer a 30cm queda incomoda en un monitor a 60.

   Solo se toca el tamaño, no las familias ni los colores: la app se
   sigue viendo igual, pero legible.

   La vista del veterinario queda fuera: ya tiene su propio tamaño. */
@media (min-width: 1024px) {
  body:not(:has(.vista-vet)) {
    font-size: 15px;
  }

  /* El texto de contenido. Los tamaños de Tailwind estan en rem, pero
     las clases los fijan en px, asi que hay que subirlos uno a uno. */
  body:not(:has(.vista-vet)) .text-xs { font-size: 13px; line-height: 1.5; }
  body:not(:has(.vista-vet)) .text-sm { font-size: 15px; line-height: 1.55; }
  body:not(:has(.vista-vet)) .text-base { font-size: 16px; }
  body:not(:has(.vista-vet)) .text-lg { font-size: 19px; }
  body:not(:has(.vista-vet)) .text-xl { font-size: 22px; }
  body:not(:has(.vista-vet)) .text-2xl { font-size: 26px; }

  /* Los textos diminutos de etiqueta suben menos: siguen siendo
     secundarios, solo dejan de ser ilegibles. */
  body:not(:has(.vista-vet)) .text-\\[10px\\] { font-size: 12px; }
  body:not(:has(.vista-vet)) .text-\\[11px\\] { font-size: 13px; }

  /* Mas aire: en pantalla grande, el espaciado de movil se ve
     apretado. */
  body:not(:has(.vista-vet)) .mx-4 { margin-left: 24px; margin-right: 24px; }
  body:not(:has(.vista-vet)) .px-4 { padding-left: 24px; padding-right: 24px; }
  body:not(:has(.vista-vet)) .px-5 { padding-left: 28px; padding-right: 28px; }
}

/* ============================================================
   DASHBOARD EN DOS COLUMNAS
   ============================================================
   El contenido se reparte solo, sin tocar el orden ni el JSX. Cada
   bloque lleva break-inside: avoid para no partirse entre columnas. */
@media (min-width: 1024px) {
  body:not(:has(.vista-vet)) main.dashboard-web,
  body:not(:has(.vista-vet)) .dashboard-web {
    columns: 2;
    column-gap: 24px;
  }
  body:not(:has(.vista-vet)) .dashboard-web > * {
    break-inside: avoid;
    margin-bottom: 16px;
  }
}`;

css = css.trimEnd() + '\n' + BLOQUE + '\n';

if (!css.includes('TIPOGRAFIA DE ESCRITORIO')) abortar('el bloque no quedo.');
if (!css.includes('max-width: 420px')) abortar('se perdio el limite de movil.');
if (!css.includes('vista-vet')) abortar('se perdio la regla del vet.');

fs.writeFileSync(destino, css, 'utf8');
console.log('  OK  tipografia de escritorio agregada');
console.log('  OK  reglas de dos columnas listas');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('PRIMER PASO: recarga con Ctrl+Shift+R y mira si la letra ya se');
console.log('lee comoda en el computador. El telefono no cambia.');
console.log('');
console.log('Las DOS COLUMNAS todavia no se activan: falta poner la clase');
console.log('dashboard-web en el contenedor. Eso va en el siguiente script,');
console.log('cuando confirmes que la tipografia se ve bien.');
