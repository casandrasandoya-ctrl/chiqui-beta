const fs = require('fs');
const path = require('path');

// ============================================================
// generar_420_menu_todas_pantallas.js
// ============================================================
// El menu de las tres lineas pasa a estar en TODAS las pantallas.
//
// COMO, SIN TOCAR SEIS ARCHIVOS
// Cada pantalla tiene su propio encabezado con distinta estructura —el
// calendario tiene flechas de mes, el perfil el logo, el dashboard la
// marca—, asi que insertarlo dentro de cada uno significaria acertar
// seis anclajes distintos y seis oportunidades de romper algo.
//
// En vez de eso, un componente flotante en posicion fija arriba a la
// derecha, dibujado UNA sola vez desde el layout.
//
// DONDE NO APARECE
//   - El dashboard, que ya lo tiene en su encabezado.
//   - Login, registro y bienvenida: no hay sesion que gestionar.
//   - La vista del veterinario: no es del tutor.
//   - Privacidad y links: son publicas.
//
// El z-40 lo deja BAJO los modales (z-60), para que no se superponga a
// una ventana abierta, y sobre el contenido normal.
//
// REQUISITO: script 398 desplegado (el MenuCuenta).
//
// Crea un archivo nuevo y modifica el layout. Si algo no calza, ABORTA
// sin escribir NADA.
// ============================================================

const RUTA_COMP = 'components/MenuFlotante.tsx';
const RUTA_LAYOUT = 'app/layout.tsx';

const COMP_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVBhdGhuYW1lIH0gZnJvbSAnbmV4dC9uYXZpZ2F0aW9uJwppbXBvcnQgTWVudUN1ZW50YSBmcm9tICdAL2NvbXBvbmVudHMvTWVudUN1ZW50YScKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNRU5VIEZMT1RBTlRFIOKAlCBwcmVzZW50ZSBlbiB0b2RhcyBsYXMgcGFudGFsbGFzCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBDYWRhIHBhbnRhbGxhIHRpZW5lIHN1IHByb3BpbyBlbmNhYmV6YWRvLCBjb24gZGlzdGludGEgZXN0cnVjdHVyYToKLy8gZWwgY2FsZW5kYXJpbyB0aWVuZSBmbGVjaGFzIGRlIG1lcywgZWwgcGVyZmlsIHRpZW5lIGVsIGxvZ28sIGVsCi8vIGRhc2hib2FyZCB0aWVuZSBsYSBtYXJjYS4gSW5zZXJ0YXIgZWwgbWVudSBkZW50cm8gZGUgY2FkYSB1bm8KLy8gc2lnbmlmaWNhcmlhIGFjZXJ0YXIgc2VpcyBhbmNsYWplcyBkaXN0aW50b3MuCi8vCi8vIFZhIGZsb3RhbnRlIGVuIHBvc2ljaW9uIGZpamEgYXJyaWJhIGEgbGEgZGVyZWNoYS4gU2UgZGlidWphIHVuYSBzb2xhCi8vIHZleiwgZGVzZGUgZWwgbGF5b3V0LCB5IGFwYXJlY2UgZW4gdG9kYXMuCi8vCi8vIE5PIHNlIG11ZXN0cmEgZW4gZWwgZGFzaGJvYXJkLCBxdWUgeWEgbG8gdGllbmUgZW4gc3UgZW5jYWJlemFkbywgbmkKLy8gZW4gbGFzIHBhbnRhbGxhcyBzaW4gc2VzaW9uIChsb2dpbiwgcmVnaXN0cm8sIGJpZW52ZW5pZGEpIG5pIGVuIGxhCi8vIHZpc3RhIGRlbCB2ZXRlcmluYXJpbywgcXVlIG5vIGVzIGRlbCB0dXRvci4KLy8KLy8gRWwgei00MCBsbyBkZWphIGJham8gbG9zIG1vZGFsZXMgKHotNjApIHBhcmEgcXVlIG5vIHNlIHN1cGVycG9uZ2EgYQovLyB1bmEgdmVudGFuYSBhYmllcnRhLCB5IHNvYnJlIGVsIGNvbnRlbmlkbyBub3JtYWwuCgpjb25zdCBTSU5fTUVOVSA9IFsnL2xvZ2luJywgJy9yZWdpc3RybycsICcvYmllbnZlbmlkYScsICcvdmV0JywgJy9kYXNoYm9hcmQnLCAnL3ByaXZhY2lkYWQnLCAnL2xpbmtzJ10KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1lbnVGbG90YW50ZSgpIHsKICBjb25zdCBwYXRobmFtZSA9IHVzZVBhdGhuYW1lKCkKCiAgaWYgKCFwYXRobmFtZSkgcmV0dXJuIG51bGwKICBpZiAoU0lOX01FTlUuc29tZShyID0+IHBhdGhuYW1lID09PSByIHx8IHBhdGhuYW1lLnN0YXJ0c1dpdGgociArICcvJykpKSByZXR1cm4gbnVsbAoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9ImZpeGVkIHRvcC0zIHJpZ2h0LTMgei00MCI+CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJiZy1bI0Y1RURFM10vODUgcm91bmRlZC1mdWxsIGJhY2tkcm9wLWJsdXItc20iPgogICAgICAgIDxNZW51Q3VlbnRhIC8+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgKQp9Cg==';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoComp = path.join(process.cwd(), RUTA_COMP);
const destinoLayout = path.join(process.cwd(), RUTA_LAYOUT);

if (fs.existsSync(destinoComp)) {
  abortar('ya existe ' + RUTA_COMP + '. No lo sobrescribo por si tiene cambios tuyos.');
}
if (!fs.existsSync(destinoLayout)) {
  abortar('no se encontro ' + RUTA_LAYOUT + '. Corre el script desde la raiz del proyecto.');
}
if (!fs.existsSync(path.join(process.cwd(), 'components/MenuCuenta.tsx'))) {
  abortar('falta components/MenuCuenta.tsx. Corre primero el script 398.');
}
console.log('  OK  MenuCuenta existe');

let layout = fs.readFileSync(destinoLayout, 'utf8');

if (layout.includes('MenuFlotante')) {
  abortar('el layout ya tiene el menu flotante. Parece que este script ya se corrio.');
}

// --- Insertarlo justo despues de la apertura del body
const ANCLA = layout.match(/<body[^>]*>/);
if (!ANCLA) {
  abortar('no encontre la etiqueta body en el layout.');
}
const posBody = layout.indexOf(ANCLA[0]) + ANCLA[0].length;
console.log('  OK  punto de insercion en el layout');

layout = layout.slice(0, posBody)
  + '\n        {/* Menu de cuenta, presente en todas las pantallas salvo las\n            que no tienen sesion. Ver components/MenuFlotante.tsx. */}\n        <MenuFlotante />'
  + layout.slice(posBody);

// --- Import
const lineas = layout.split('\n');
let ultimoImport = -1;
for (let i = 0; i < lineas.length; i++) {
  if (lineas[i].startsWith('import ')) ultimoImport = i;
}
if (ultimoImport === -1) {
  abortar('no encontre ningun import en el layout.');
}
lineas.splice(ultimoImport + 1, 0, "import MenuFlotante from '@/components/MenuFlotante'");
layout = lineas.join('\n');
console.log('  OK  import agregado');

// --- Verificaciones
if (contar(layout, '<MenuFlotante />') !== 1) {
  abortar('el menu no quedo exactamente una vez.');
}
if (!layout.includes("import MenuFlotante from '@/components/MenuFlotante'")) {
  abortar('el import no quedo aplicado.');
}
if (layout.indexOf("import MenuFlotante") > layout.indexOf('<MenuFlotante />')) {
  abortar('el import quedaria despues del uso.');
}

const comp = Buffer.from(COMP_B64, 'base64').toString('utf8');
for (const r of ["'use client'", 'export default function MenuFlotante', 'SIN_MENU']) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMP);
fs.writeFileSync(destinoLayout, layout, 'utf8');
console.log('OK: ' + RUTA_LAYOUT);

console.log('');
console.log('Listo. El menu ya esta en todas las pantallas.');
