const fs = require('fs');
const path = require('path');

// ============================================================
// generar_369_boton_cerrar_modal.js
// ============================================================
// EL PROBLEMA
// El boton ✕ del modal "Agrandar familia" se ve cortado.
//
// LA CAUSA
// La tarjeta del modal lleva overflow-y-auto para poder desplazarse si
// el contenido crece (por ejemplo, cuando se abre el formulario del
// codigo). Pero overflow RECORTA todo lo que sobresalga del borde, y el
// boton estaba posicionado con -top-2 -right-2, es decir FUERA de la
// tarjeta. La mitad quedaba del otro lado del corte.
//
// EL ARREGLO
// El boton se mueve DENTRO del borde (top-3 right-3). De paso se le
// suma un borde claro para que se despegue del fondo cafe, y mas
// espacio a la derecha del titulo para que no se toquen.
//
// Se mantiene el overflow: quitarlo dejaria el formulario del codigo
// sin forma de desplazarse en pantallas chicas.
//
// REQUISITO: script 367 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/SelectorMascota.tsx';

const PARES = [
  {
    nombre: 'boton de cerrar dentro del borde',
    viejo: [
      '              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#3D2B1F] text-white flex items-center justify-center text-base font-bold"',
    ].join('\n'),
    nuevo: [
      "              /* DENTRO del borde: la tarjeta tiene overflow-y-auto y",
      "                 eso recorta lo que sobresalga. Con -top-2 -right-2 el",
      "                 botón quedaba cortado por la mitad. */",
      '              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3D2B1F] text-white flex items-center justify-center text-base font-bold z-10"',
      "              style={{ border: '1.5px solid rgba(255,252,248,0.35)' }}",
    ].join('\n'),
  },
  {
    nombre: 'espacio para el titulo',
    viejo: '            <div className="flex items-center gap-2.5 mb-3 pr-6">',
    nuevo: '            <div className="flex items-center gap-2.5 mb-3 pr-10">',
  },
];

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

if (!contenido.includes('Agrandar familia')) {
  abortar('el selector no tiene el modal. Corre primero el script 367.');
}
if (contenido.includes('absolute top-3 right-3 w-8 h-8')) {
  abortar('el boton ya esta dentro del borde. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
// La comprobacion apunta al ATRIBUTO, no a la cadena suelta: el
// comentario nuevo menciona la posicion vieja para explicar el arreglo,
// y una busqueda ingenua la confundiria con codigo.
if (contenido.includes('className="absolute -top-2 -right-2')) {
  abortar('quedo la posicion vieja del boton.');
}
if (contar(contenido, 'absolute top-3 right-3') !== 1) {
  abortar('la posicion nueva no quedo aplicada.');
}
// El overflow se mantiene: quitarlo dejaria el formulario del codigo
// sin forma de desplazarse en pantallas chicas.
if (!contenido.includes('overflow-y-auto')) {
  abortar('se perdio el overflow del modal.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El boton de cerrar ya se ve completo.');
