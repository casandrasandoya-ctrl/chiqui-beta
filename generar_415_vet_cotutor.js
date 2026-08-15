const fs = require('fs');
const path = require('path');

// ============================================================
// generar_415_vet_cotutor_lado_a_lado.js
// ============================================================
// El link del veterinario y el co-tutor pasan a estar LADO A LADO, en
// dos columnas, como el diseño.
//
// EL DETALLE QUE IMPORTA
// Los dos componentes traen su propio "mx-4 mb-4". Si se ponen dentro
// de una grilla sin mas, quedan con margenes dobles y las dos columnas
// se ven despegadas del borde y entre si.
//
// Se neutraliza con [&>div]:mx-0 en el contenedor, que anula el margen
// de los hijos directos SIN tocar los componentes. Asi LinkVet y
// GestionCotutor siguen funcionando igual si se usan en otra pantalla.
//
// items-start: si uno crece mas que el otro (por ejemplo al generar el
// link), el otro no se estira para igualarlo.
//
// LAS KEYS se diferencian con un prefijo. Antes las dos usaban
// mascota.id: hermanos con la misma key en React es un error que puede
// hacer que un componente no se reinicie al cambiar de mascota.
//
// REQUISITO: script 414 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/perfil/page.tsx';

const VIEJO = "      {mascota && <LinkVet key={mascota.id} mascotaId={mascota.id} />}\n\n      {/* Co-tutor */}\n      {mascota && (\n        <GestionCotutor\n          key={mascota.id}\n          mascotaId={mascota.id}\n          mascotaNombre={mascota.nombre}\n        />\n      )}";
const NUEVO = "      {/* Link del vet y co-tutor, lado a lado. Los dos componentes traen\n          su propio mx-4 mb-4, as\u00ed que se neutraliza con [&>div]:mx-0\n          para que no queden con m\u00e1rgenes dobles dentro de la grilla. */}\n      {mascota && (\n        <div className=\"mx-4 mb-4 grid grid-cols-2 gap-2 items-start [&>div]:mx-0 [&>div]:mb-0\">\n          <LinkVet key={`lv-${mascota.id}`} mascotaId={mascota.id} />\n          <GestionCotutor\n            key={`ct-${mascota.id}`}\n            mascotaId={mascota.id}\n            mascotaNombre={mascota.nombre}\n          />\n        </div>\n      )}";

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

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('[&>div]:mx-0')) {
  abortar('ya estan lado a lado. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'link del vet y co-tutor -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
const ESPERADOS = ['grid grid-cols-2 gap-2 items-start', '<LinkVet key={`lv-', '<GestionCotutor'];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Lo que sigue despues no debe haberse tocado.
for (const s of ['UnirseComoCotutor', 'ConfiguracionNotificaciones', 'LineaTiempoMomentos']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: los dos bloques tienen bastante texto. Si en el telefono');
console.log('quedan muy apretados, avisale a Claude para acortarlos.');
console.log('');
console.log('Listo. El link del vet y el co-tutor quedaron lado a lado.');
