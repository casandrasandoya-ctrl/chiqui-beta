const fs = require('fs');
const path = require('path');

// ============================================================
// generar_401_prop_lineavet.js
// ============================================================
// SOLO arregla la prop que rompe el build:
//
//   Type error: Property 'mascotaNombre' is missing
//
// El script 400 hacia esto Y quitaba el duplicado, pero abortaba en su
// verificacion final: buscaba el texto "Chiqui Tips" y en el archivo
// real esa seccion se llama de otra forma. Como aborto, no escribio
// nada — y el build siguio fallando.
//
// Este script hace UNA sola cosa. El duplicado se quita despues, con
// calma: tener el link del veterinario dos veces es feo, pero no
// impide desplegar.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

const VIEJO = '        <LineaVet mascotaId={m.id} />';
const NUEVO = '        <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />';

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
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'LineaVet sin el nombre -> ' + n + ' coincidencia(s)');
if (n === 0) {
  abortar('no hay ningun LineaVet al que le falte la prop. Quiza ya lo corregiste a mano.');
}
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

// Verificacion acotada a lo que este script toca, nada mas.
if (contenido.includes(VIEJO)) {
  abortar('la prop no quedo aplicada.');
}
if (contar(contenido, 'mascotaNombre={m.nombre}') < 1) {
  abortar('la prop no aparece despues de reemplazar.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El build deberia pasar. El duplicado del link del vet');
console.log('sigue ahi: se quita en el siguiente script.');
