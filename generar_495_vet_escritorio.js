const fs = require('fs');
const path = require('path');

// ============================================================
// generar_495_vet_escritorio.js
// ============================================================
// La vista del veterinario se adapta al ancho de la pantalla.
//
// EN EL TELEFONO NO CAMBIA NADA: una columna, igual que ahora.
// EN COMPUTADOR (1024px o mas) pasa a DOS COLUMNAS, aprovechando el
// ancho que hoy queda vacio a los lados.
//
// NO SON DOS VISTAS. Es la misma pagina con reglas de ancho: no hay
// codigo duplicado ni riesgo de que una quede desactualizada.
//
// COMO SE REPARTEN LAS SECCIONES
// Con columnas CSS, que fluyen solas en el orden que ya tienen. No se
// reordena nada: la pagina agrupa las secciones por area (Prevencion,
// Signos vitales) con encabezados, y moverlas a mano se llevaria por
// delante esa organizacion.
//
// Cada seccion lleva break-inside: avoid para que no se parta entre una
// columna y la otra — sin eso, una tarjeta de vacunas podia quedar con
// el titulo abajo de una columna y el contenido arriba de la siguiente.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/vet/page.tsx';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  console.log('');
  console.log('Pasale a Claude la linea donde dice max-w-lg en ' + RUTA + '.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) abortar('no se encontro ' + RUTA + '.');

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('lg:columns-2')) {
  abortar('la vista ya se adapta al escritorio. Parece que este script ya se corrio.');
}

// --- 1. El contenedor deja de estar limitado a 512px
const ANCHOS = ['max-w-lg mx-auto', 'max-w-lg  mx-auto', 'mx-auto max-w-lg'];
const ancho = ANCHOS.find(a => contar(c, a) >= 1);
if (!ancho) {
  abortar('no encontre el contenedor con max-w-lg.');
}
const nAncho = contar(c, ancho);
console.log('  OK  contenedor encontrado -> ' + nAncho + ' vez/veces');
// En pantallas chicas sigue siendo 512px; desde lg crece a 1152px.
c = c.split(ancho).join('max-w-lg lg:max-w-6xl mx-auto');

// --- 2. El cuerpo pasa a dos columnas en pantalla ancha
// Se busca el contenedor de las secciones, que va despues del header.
const CUERPOS = [
  { viejo: '<div className="px-5 py-4 space-y-3">', nuevo: '<div className="px-5 py-4 space-y-3 lg:columns-2 lg:gap-4 lg:space-y-0">' },
  { viejo: '<div className="px-5 py-4 space-y-4">', nuevo: '<div className="px-5 py-4 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0">' },
  { viejo: '<div className="px-5 py-5 space-y-3">', nuevo: '<div className="px-5 py-5 space-y-3 lg:columns-2 lg:gap-4 lg:space-y-0">' },
  { viejo: '<div className="px-5 space-y-3">', nuevo: '<div className="px-5 space-y-3 lg:columns-2 lg:gap-4 lg:space-y-0">' },
];
const cuerpo = CUERPOS.find(x => contar(c, x.viejo) === 1);
if (!cuerpo) {
  abortar('no encontre el contenedor de las secciones. Pasale a Claude el div que viene despues del header.');
}
c = c.split(cuerpo.viejo).join(cuerpo.nuevo);
console.log('  OK  el cuerpo pasa a dos columnas en pantalla ancha');

// --- 3. Que ninguna seccion se parta entre columnas
// SeccionVet es el componente que envuelve cada bloque.
const SECCIONES = [
  { viejo: 'function SeccionVet({ titulo, children }: { titulo: string; children: React.ReactNode }) {', tipo: 'con-tipos' },
  { viejo: 'function SeccionVet({ titulo, children }: any) {', tipo: 'any' },
];
const sec = SECCIONES.find(s => contar(c, s.viejo) === 1);
if (sec) {
  const NUEVO = sec.viejo + `
  // break-inside: avoid — en dos columnas, sin esto una seccion podia
  // quedar con el titulo al final de una columna y el contenido al
  // principio de la siguiente.`;
  c = c.split(sec.viejo).join(NUEVO);
  // Y la clase en el div de la seccion.
  const DIVS = [
    'className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4"',
    'className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4 mb-3"',
  ];
  const div = DIVS.find(d => contar(c, d) >= 1);
  if (div) {
    c = c.split(div).join(div.replace('"', '"break-inside-avoid lg:mb-4 '));
    console.log('  OK  las secciones no se parten entre columnas');
  } else {
    console.log('  --  no pude anclar el estilo de seccion: puede partirse alguna');
  }
} else {
  console.log('  --  no encontre SeccionVet: puede partirse alguna seccion');
}

// --- Verificaciones
if (!c.includes('lg:max-w-6xl')) abortar('el ancho no quedo aplicado.');
if (!c.includes('lg:columns-2')) abortar('las columnas no quedaron aplicadas.');
// La estructura no debe haberse tocado.
for (const s of ['SeccionVet', 'detectarMotivosConsulta', 'Vista veterinaria']) {
  if (!c.includes(s)) abortar('se perdio [' + s + '] al reemplazar.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Abre tu link de vet en el computador con la ventana completa:');
console.log('deberia verse en dos columnas. En el telefono, igual que antes.');
