const fs = require('fs');
const path = require('path');

// ============================================================
// generar_500_app_escritorio.js
// ============================================================
// La app deja de verse como un telefono estirado cuando se abre desde
// un computador.
//
// COMO
// Un solo cambio en globals.css: el body crece de 420px a 900px desde
// 1024px de ancho. Todas las pantallas se amplian a la vez, sin tocar
// ninguna.
//
// EN EL TELEFONO NO CAMBIA NADA: la pantalla ya es mas angosta que 420.
//
// 900px y no mas: es el ancho donde una columna de texto sigue siendo
// comoda de leer. Mas alla, las lineas se hacen largas y cuesta seguir
// el renglon.
//
// LAS BARRAS FIJAS tambien se centran: el menu de abajo y el boton
// flotante usan position fixed, que se ancla a la ventana y no al
// contenido. Sin esto quedarian pegados a los bordes de la pantalla,
// lejos del contenido.
//
// ES UN PASO INTERMEDIO: se ve como una web de verdad sin rediseñar
// nada. Si despues quieres columnas en pantallas concretas, se hace
// encima de esto.
//
// Y SE REVIERTE FACIL: es un bloque de CSS, se borra y vuelve todo como
// estaba.
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

if (css.includes('CHIQUI EN ESCRITORIO')) {
  abortar('el CSS ya tiene la vista de escritorio. Parece que este script ya se corrio.');
}
// La regla del vet tiene que estar: esta va despues.
if (!css.includes('vista-vet')) {
  abortar('falta el script 499. Correlo primero.');
}

const ANCLA = '  max-width: 420px;';
const n = contar(css, ANCLA);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'max-width del body -> ' + n + ' coincidencia(s)');
if (n !== 1) abortar('esperaba 1 coincidencia y encontre ' + n + '.');

const BLOQUE = `

/* ============================================================
   CHIQUI EN ESCRITORIO
   ============================================================
   En el telefono la app se ve igual que siempre: 420px, que es el ancho
   comodo para el pulgar.

   Desde 1024px el body crece a 900px. No mas: por encima de eso las
   lineas de texto se hacen largas y cuesta seguir el renglon.

   Todas las pantallas se amplian con esto, sin tocar ninguna.
   Para volver atras, basta con borrar este bloque. */
@media (min-width: 1024px) {
  body:not(:has(.vista-vet)) {
    max-width: 900px;
  }

  /* El menu de abajo y el boton flotante usan position fixed, que se
     ancla a la VENTANA y no al contenido. Sin esto quedarian pegados a
     los bordes de la pantalla, lejos de donde esta mirando la persona. */
  body:not(:has(.vista-vet)) nav[class*="fixed"],
  body:not(:has(.vista-vet)) div[class*="fixed bottom"],
  body:not(:has(.vista-vet)) [class*="fixed"][class*="bottom-0"] {
    max-width: 900px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
}`;

const finBody = css.indexOf('}', css.indexOf(ANCLA));
if (finBody === -1) abortar('no encontre el cierre del bloque body.');

// El bloque va al FINAL del archivo, para que gane por orden a
// cualquier regla anterior.
css = css.trimEnd() + '\n' + BLOQUE + '\n';

if (!css.includes('CHIQUI EN ESCRITORIO')) abortar('el bloque no quedo.');
if (!css.includes('max-width: 420px')) abortar('se perdio el limite de movil.');
if (!css.includes('vista-vet')) abortar('se perdio la regla del vet.');

fs.writeFileSync(destino, css, 'utf8');
console.log('  OK  bloque de escritorio agregado');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Recarga con Ctrl+Shift+R y mira el dashboard, analisis y');
console.log('calendario en la ventana completa.');
console.log('');
console.log('Si algo se ve estirado o raro, avisale a Claude CUAL pantalla:');
console.log('se ajusta esa sola.');
