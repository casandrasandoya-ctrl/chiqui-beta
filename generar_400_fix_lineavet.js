const fs = require('fs');
const path = require('path');

// ============================================================
// generar_400_fix_lineavet.js
// ============================================================
// EL ERROR DEL BUILD
//
//   Type error: Property 'mascotaNombre' is missing in type
//   '{ mascotaId: any; }' but required in type
//   '{ mascotaId: string; mascotaNombre: string; }'
//
// LineaVet necesita DOS props y yo le pase una. Babel valida sintaxis y
// esto es un tipo, asi que solo aparecio en el build de Vercel. Debi
// correr tsc antes de mandar el 399.
//
// Y ADEMAS quedo duplicado
// El 399 puso LineaVet junto al boton de perfil, pero ya existia mas
// abajo, entre Cuidados recientes y Chiqui Tips. Este script quita esa
// segunda aparicion: el lugar nuevo es mejor —arriba, junto a Ver
// Perfil— y tener el mismo boton dos veces en una pantalla confunde.
//
// El corte del bloque de abajo esta acotado: antes de quitar nada, se
// comprueba que lo que se va a borrar sea corto y no alcance a Chiqui
// Tips ni a Cuidados recientes.
//
// REQUISITO: script 399 desplegado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

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

// Se mira el bloque COMPLETO del botón de perfil, que es único: el
// LineaVet de abajo tiene la misma indentacion y buscar solo la
// etiqueta daba un falso "ya se corrio".
if (contenido.includes('Ver Perfil</span>\n        </Link>\n        <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />')) {
  abortar('la prop ya esta corregida. Parece que este script ya se corrio.');
}

// --- 1. La prop que falta
const VIEJO_PROP = '        <LineaVet mascotaId={m.id} />';
const NUEVO_PROP = '        <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />';

const nProp = contar(contenido, VIEJO_PROP);
console.log('  ' + (nProp === 1 ? 'OK ' : 'X  ') + 'prop faltante -> ' + nProp + ' coincidencia(s)');
if (nProp !== 1) {
  abortar('esperaba 1 coincidencia del LineaVet nuevo y encontre ' + nProp + '.');
}
contenido = contenido.split(VIEJO_PROP).join(NUEVO_PROP);

// --- 2. El LineaVet duplicado de abajo
const total = contar(contenido, '<LineaVet');
console.log('  --  apariciones de LineaVet: ' + total);

if (total > 1) {
  // Se busca la SEGUNDA aparicion: la de arriba es la nueva, junto al
  // boton de perfil.
  const primera = contenido.indexOf('<LineaVet');
  const segunda = contenido.indexOf('<LineaVet', primera + 1);
  if (segunda === -1) {
    abortar('no pude ubicar la segunda aparicion.');
  }

  // Se corta desde el inicio de su linea hasta el fin de la etiqueta,
  // incluyendo el contenedor si LineaVet es su unico hijo.
  const inicioLinea = contenido.lastIndexOf('\n', segunda) + 1;
  const finEtiqueta = contenido.indexOf('/>', segunda);
  if (finEtiqueta === -1) {
    abortar('no encontre el cierre de la segunda aparicion.');
  }
  let corteIni = inicioLinea;
  let corteFin = finEtiqueta + 2;

  // Si la linea anterior abre un div que solo contiene a LineaVet, se
  // lleva tambien ese div y su cierre.
  const lineaAnterior = contenido.slice(contenido.lastIndexOf('\n', inicioLinea - 2) + 1, inicioLinea);
  const siguiente = contenido.slice(corteFin, corteFin + 40);
  if (lineaAnterior.trim().startsWith('<div') && siguiente.trim().startsWith('</div>')) {
    corteIni = contenido.lastIndexOf('\n', inicioLinea - 2) + 1;
    corteFin = contenido.indexOf('</div>', corteFin) + '</div>'.length;
  }

  const bloque = contenido.slice(corteIni, corteFin);

  // Guardas: lo que se quita tiene que ser corto y no alcanzar a otras
  // secciones.
  if (bloque.length > 400) {
    abortar('el bloque a quitar es demasiado largo (' + bloque.length + '). No se escribio nada.');
  }
  for (const s of ['Chiqui Tips', 'CUIDADOS RECIENTES', 'PRÓXIMOS', 'Novedades']) {
    if (bloque.includes(s)) {
      abortar('el corte alcanzaria a [' + s + ']. No se escribio nada.');
    }
  }
  if (!bloque.includes('<LineaVet')) {
    abortar('el bloque delimitado no contiene LineaVet. No se escribio nada.');
  }
  console.log('  OK  duplicado delimitado (' + bloque.split('\n').length + ' lineas, ' + bloque.length + ' caracteres)');

  contenido = contenido.slice(0, corteIni)
    + '      {/* El link del veterinario ahora vive arriba, junto al botón\n          de perfil. */}\n'
    + contenido.slice(corteFin);
} else {
  console.log('  --  no habia duplicado que quitar');
}

// --- Verificaciones finales
if (contar(contenido, '<LineaVet') !== 1) {
  abortar('LineaVet no quedo exactamente una vez.');
}
if (!contenido.includes('mascotaNombre={m.nombre}')) {
  abortar('la prop no quedo aplicada.');
}
for (const s of ['Chiqui Tips', 'CUIDADOS RECIENTES']) {
  if (!contenido.includes(s)) {
    abortar('se perdio la seccion [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El build deberia pasar y el link del vet queda una sola vez.');
