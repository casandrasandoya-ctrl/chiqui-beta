const fs = require('fs');
const path = require('path');

// ============================================================
// generar_423_menu_sin_choques.js
// ============================================================
// El menu de las tres lineas chocaba en dos pantallas.
//
// 1. REGISTRO DIARIO -> se oculta
//    Esa esquina la ocupa "Guardar cambios", que es lo mas importante
//    de la pantalla. Un menu al lado compite con el, y ahi no hay nada
//    que ganar: quien esta registrando no esta buscando su perfil.
//
// 2. CALENDARIO -> las flechas se acercan al centro
//    Estaban en los extremos con justify-between, y la de "mes
//    siguiente" quedaba justo bajo el menu. Ahora van pegadas a la
//    fecha con justify-center.
//    De paso queda mejor: una flecha junto al mes que cambia se
//    entiende mejor que una en la esquina opuesta.
//
// El swipe de la grilla de dias sigue funcionando igual — no se toca.
//
// REQUISITO: script 420 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_MENU = 'components/MenuFlotante.tsx';
const RUTA_CAL = 'app/calendario/page.tsx';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoMenu = path.join(process.cwd(), RUTA_MENU);
const destinoCal = path.join(process.cwd(), RUTA_CAL);

for (const [ruta, destino] of [[RUTA_MENU, destinoMenu], [RUTA_CAL, destinoCal]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let menu = fs.readFileSync(destinoMenu, 'utf8');
let cal = fs.readFileSync(destinoCal, 'utf8');

if (menu.includes("'/registro-diario'")) {
  abortar('el menu ya esta oculto en registro diario. Parece que este script ya se corrio.');
}

const PARES = [
  { archivo: 'menu', nombre: 'ocultar en registro diario', viejo: "const SIN_MENU = ['/login', '/registro', '/bienvenida', '/vet', '/dashboard', '/privacidad', '/links']", nuevo: "// El registro diario se suma: ahi la esquina la ocupa \"Guardar\n// cambios\", que es lo mas importante de esa pantalla y no debe competir\n// con nada.\nconst SIN_MENU = ['/login', '/registro', '/bienvenida', '/vet', '/dashboard', '/privacidad', '/links', '/registro-diario']" },
  { archivo: 'cal', nombre: 'flechas al centro', viejo: "      <div className=\"px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-[#F5EDE3] z-10 border-b border-[#EEE2D4]\">\n        <button onClick={() => cambiarMes(-1)} className=\"w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg\">\u2039</button>\n        <div className=\"text-center flex items-center gap-2\">", nuevo: "      {/* Flechas junto a la fecha, no en los extremos: asi dejan libre\n          la esquina superior derecha, donde va el menu. Y acercarlas al\n          mes que cambian hace mas evidente que le pertenecen. */}\n      <div className=\"px-5 pt-6 pb-3 flex items-center justify-center gap-2 sticky top-0 bg-[#F5EDE3] z-10 border-b border-[#EEE2D4]\">\n        <button onClick={() => cambiarMes(-1)} className=\"w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg flex-shrink-0\">\u2039</button>\n        <div className=\"text-center flex items-center gap-2\">" },
];

for (const p of PARES) {
  const texto = p.archivo === 'menu' ? menu : cal;
  const n = contar(texto, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  if (p.archivo === 'menu') menu = menu.split(p.viejo).join(p.nuevo);
  else cal = cal.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
if (!menu.includes("'/registro-diario'")) {
  abortar('la ruta no quedo en la lista.');
}
if (!cal.includes('justify-center gap-2 sticky')) {
  abortar('las flechas no quedaron al centro.');
}
// Los dos botones de mes tienen que seguir.
if (contar(cal, 'cambiarMes(-1)') !== 1 || contar(cal, 'cambiarMes(1)') !== 1) {
  abortar('se perdio alguno de los botones de mes.');
}
// El swipe no debe haberse tocado.
for (const s of ['onTouchStartGrid', 'onTouchEndGrid']) {
  if (!cal.includes(s)) {
    abortar('se perdio [' + s + ']: el swipe dejaria de funcionar.');
  }
}

fs.writeFileSync(destinoMenu, menu, 'utf8');
console.log('');
console.log('OK: ' + RUTA_MENU);
fs.writeFileSync(destinoCal, cal, 'utf8');
console.log('OK: ' + RUTA_CAL);
console.log('');
console.log('Listo. El menu ya no choca con nada.');
