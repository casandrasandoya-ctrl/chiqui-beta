const fs = require('fs');
const path = require('path');

// ============================================================
// generar_356_filas_alternadas_panel.js
// ============================================================
// Las listas del panel pasan a tener FILAS ALTERNADAS, y el nombre de
// la mascota va junto al de la persona, separado por una linea:
//
//     Casandra | 🐶 Chiquito
//     Gupis    | 🐱 Polo
//     JennB    | 🐶 Pepe · 🐶 Ema
//
// POR QUE
// Antes el nombre iba a la izquierda y las mascotas pegadas al borde
// derecho. Con pocos nombres se leia bien, pero con veinte el ojo tiene
// que cruzar todo el ancho para emparejar cada linea, y se pierde. Con
// las dos cosas juntas y el fondo alterno, cada fila se lee sola.
//
// El -mx-4 hace que la banda de color llegue hasta el borde de la
// tarjeta en vez de cortarse antes: sin eso, las franjas quedan
// flotando y se ven como un error.
//
// Se aplica a las DOS listas (quienes registraron y el detalle de la
// otra actividad) para que se vean parejas.
//
// REQUISITO: script 341 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/PanelDia.tsx';

const PARES = [
  {
    nombre: 'lista de quienes registraron',
    viejo: [
      '          <div className="space-y-1.5">',
      "            {dia.usuarios.map((u, i) => (",
      '              <div key={i} className="flex items-baseline justify-between gap-2">',
      '                <p className="text-xs text-[#3D2B1F] truncate">{u.nombre}</p>',
      '                <p className="text-[10px] text-[#8A7560] flex-shrink-0 truncate">',
      "                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}",
      "                </p>",
      "              </div>",
      "            ))}",
      "          </div>",
    ].join('\n'),
    nuevo: [
      "          {/* Filas alternadas y el nombre de la mascota junto al de",
      "              la persona: con veinte nombres seguidos, cruzar el ancho",
      "              para emparejar cada línea cansa y se pierde el hilo.",
      "              El -mx-4 lleva la banda hasta el borde de la tarjeta. */}",
      '          <div className="-mx-4">',
      "            {dia.usuarios.map((u, i) => (",
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 flex items-baseline gap-2"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      '                <p className="text-xs text-[#3D2B1F] flex-shrink-0">{u.nombre}</p>',
      '                <span className="text-[#D6C3AC] text-xs flex-shrink-0">|</span>',
      '                <p className="text-[11px] text-[#8A7560] truncate">',
      "                  {u.mascotas.map(m => `${emojiEspecie(m.especie)} ${m.nombre}`).join(' · ')}",
      "                </p>",
      "              </div>",
      "            ))}",
      "          </div>",
    ].join('\n'),
  },
  {
    nombre: 'lista del detalle de actividad',
    viejo: [
      '          <div className="space-y-1.5">',
      "            {dia.otros.map((o, i) => (",
      '              <div key={i} className="flex items-baseline justify-between gap-2">',
      '                <p className="text-xs text-[#3D2B1F] truncate">',
      "                  {o.emoji} {o.detalle}",
      "                </p>",
      '                <p className="text-[10px] text-[#8A7560] flex-shrink-0 truncate">{o.quien}</p>',
      "              </div>",
      "            ))}",
      "          </div>",
    ].join('\n'),
    nuevo: [
      "          {/* Mismo tratamiento que la lista de arriba, para que las",
      "              dos se lean igual. */}",
      '          <div className="-mx-4">',
      "            {dia.otros.map((o, i) => (",
      "              <div",
      "                key={i}",
      '                className="px-4 py-1.5 flex items-baseline gap-2"',
      "                style={{ background: i % 2 === 0 ? '#FBEAD9' : 'transparent' }}",
      "              >",
      '                <p className="text-xs text-[#3D2B1F] flex-shrink-0">{o.emoji} {o.detalle}</p>',
      '                <span className="text-[#D6C3AC] text-xs flex-shrink-0">|</span>',
      '                <p className="text-[11px] text-[#8A7560] truncate">{o.quien}</p>',
      "              </div>",
      "            ))}",
      "          </div>",
    ].join('\n'),
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
  abortar('no se encontro ' + RUTA + '. Corre primero el script 340.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes("i % 2 === 0 ? '#FBEAD9'")) {
  abortar('el panel ya tiene las filas alternadas. Parece que este script ya se corrio.');
}
if (!contenido.includes('dia.otros.map')) {
  abortar('falta la lista de otra actividad. Corre primero el script 341.');
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

// Las DOS listas deben quedar alternadas
if (contar(contenido, "i % 2 === 0 ? '#FBEAD9' : 'transparent'") !== 2) {
  abortar('las dos listas no quedaron alternadas.');
}
if (contar(contenido, '<div className="-mx-4">') !== 2) {
  abortar('las bandas no quedaron a lo ancho de la tarjeta.');
}
// Y no puede quedar el layout viejo
if (contenido.includes('flex items-baseline justify-between gap-2')) {
  abortar('quedo una lista con el diseño viejo.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Las listas del panel ya se leen fila por fila.');
