const fs = require('fs');
const path = require('path');

// ============================================================
// generar_474_un_solo_chat.js
// ============================================================
// El chat deja de estar en Analisis. Queda SOLO la burbuja flotante,
// que ya esta en todas las pantallas — incluida Analisis.
//
// POR QUE
// Eran dos chats con datos DISTINTOS. El de Analisis calculaba sus
// episodios y su periodo de una forma; el flotante de otra. La misma
// pregunta respondia diferente segun donde se hiciera, y eso es peor
// que no tener chat: hace dudar de las dos respuestas.
//
// Una sola fuente, un solo comportamiento.
//
// El componente ChiquiChat NO se borra: lo sigue usando el flotante.
// Y datosChat queda sin uso en Analisis, pero no rompe el build.
//
// REQUISITO: script 473 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = "      {mascota && total > 0 && (\n        <ChiquiChat datos={datosChat} />\n      )}";
const NUEVO = "      {/* El chat vive solo en la burbuja flotante. Tenerlo tambi\u00e9n ac\u00e1\n          significaba dos chats con datos distintos: el de An\u00e1lisis\n          calculaba unas cosas y el flotante otras, y respond\u00edan\n          diferente a la misma pregunta. Uno solo, con una sola fuente. */}";

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
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '.');
}

let c = fs.readFileSync(destino, 'utf8');

if (!c.includes('<ChiquiChat datos={datosChat} />')) {
  abortar('el chat ya no esta en Analisis. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'chat en Analisis -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

if (c.includes('<ChiquiChat')) {
  abortar('quedo alguna referencia al chat en Analisis.');
}
// El resto de la pantalla no debe haberse tocado.
for (const s of ['SelectorMascota', 'BottomNav', 'const datosChat']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: el import de ChiquiChat y el objeto datosChat quedan sin');
console.log('uso en Analisis. No rompen el build. Si Vercel los marca, avisale');
console.log('a Claude y los limpio.');
console.log('');
console.log('Listo. Un solo chat, una sola fuente de datos.');
