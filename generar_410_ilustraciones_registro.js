const fs = require('fs');
const path = require('path');

// ============================================================
// generar_410_ilustraciones_registro.js
// ============================================================
// Las casillas del registro diario pasan de emoji + color + estado a
// ILUSTRACIONES limpias, como el diseño de Casandra.
//
// QUE SE QUITA Y POR QUE
//  - El emoji y el cuadrado de color de cada categoria. Cada una tenia
//    su propio color, y diecisiete colores distintos en una pantalla
//    son ruido, no informacion.
//  - El estado registrado ("Alta", "Normal", "Feliz") debajo del
//    nombre. Se puede consultar en el calendario, y aqui competia con
//    lo unico que importa mientras se registra: que falta por tocar.
//
// QUE QUEDA
//  Ilustracion arriba, nombre abajo en cafe, caja blanca. Todas del
//  mismo tamaño, tenga la categoria dato o no. La abierta se marca con
//  borde dorado, como hasta ahora.
//
// LAS IMAGENES se mapean por ID de categoria y por titulo de grupo. Si
// alguna faltara, la casilla cae de vuelta al emoji que ya tenia — asi
// una imagen mal nombrada no deja un hueco en blanco.
//
// REQUISITOS: scripts 385 a 389 desplegados, y las 17 imagenes en
// public/chiqui/.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

// apetito.png NO existe: Apetito usa el PLATO (alimentacion.png), el
// mismo de los cubos. El saco es para el cuidado de Alimentacion, que
// es otra cosa.
const IMAGENES = [
  'energia', 'animo', 'conducta', 'alimentacion', 'agua', 'saco_comida',
  'digestion', 'heces', 'orina', 'movilidad', 'paseo', 'juguetes',
  'alarma', 'Cuidados_Vet', 'vacunas', 'peine', 'higiene', 'arenero',
];

const MAPA = [
  "",
  "  // --- Ilustraciones de cada casilla ---",
  "  // Reemplazan al emoji y al cuadrado de color: diecisiete colores",
  "  // distintos en una pantalla son ruido, no informacion.",
  "  //",
  "  // Si una imagen faltara, la casilla cae de vuelta a su emoji. Asi",
  "  // un archivo mal nombrado no deja un hueco en blanco.",
  "  const IMG_CAT: Record<string, string> = {",
  "    energia: 'energia', animo: 'animo', conducta: 'conducta',",
  "    // Apetito usa el PLATO; el saco es para el cuidado de",
  "    // Alimentacion, que es otra cosa.",
  "    apetito: 'alimentacion', agua: 'agua',",
  "    digestion: 'digestion', heces: 'heces', arenero: 'orina',",
  "    movilidad: 'movilidad', paseo: 'paseo', pelaje: 'peine',",
  "  }",
  "  const IMG_GRUPO: Record<string, string> = {",
  "    'Alimentación': 'saco_comida',",
  "    'Enriquecimiento y entrenamiento': 'juguetes',",
  "    'Enriquecimiento y juego': 'juguetes',",
  "    'Veterinario y salud': 'Cuidados_Vet',",
  "    'Prevención': 'vacunas',",
  "    'Higiene y bienestar': 'higiene',",
  "    'Arenero': 'arenero',",
  "  }",
].join('\n');

const CHIP_CAT_VIEJO = [
  '                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{background:`${cat.color}20`}}>',
  "                  {cat.icon}",
  "                </div>",
  '                <div className="flex-1 min-w-0">',
  '                  <p className="text-[12px] font-semibold leading-tight truncate">{NOMBRE_CORTO[cat.nombre] || cat.nombre}</p>',
  "                  {selVal && (",
  '                    <p className="text-[10px] mt-0.5 truncate" style={{color:cat.color}}>',
  "                      {opSel?.emoji} {opSel?.label}",
  "                    </p>",
  "                  )}",
  "                </div>",
  '                <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{open ? \'▲\' : \'▼\'}</span>',
].join('\n');

const CHIP_CAT_NUEVO = [
  "                {/* Ilustración arriba, nombre abajo. El estado",
  "                    registrado se consulta en el calendario: aquí",
  "                    competía con lo único que importa mientras se",
  "                    registra, que es qué falta por tocar. */}",
  "                {IMG_CAT[cat.id] ? (",
  '                  <img src={`/chiqui/${IMG_CAT[cat.id]}.png`} alt="" className="w-11 h-11 object-contain" />',
  "                ) : (",
  '                  <span className="text-2xl">{cat.icon}</span>',
  "                )}",
  '                <p className="text-[11px] font-bold text-[#8C572F] text-center leading-tight w-full truncate">',
  "                  {NOMBRE_CORTO[cat.nombre] || cat.nombre}",
  "                </p>",
].join('\n');

const CHIP_GRUPO_VIEJO = [
  '                  <img src={grupo.img} alt="" className="w-7 h-7 object-contain flex-shrink-0" />',
  '                  <div className="flex-1 min-w-0">',
  '                    <p className="text-[12px] font-semibold leading-tight truncate text-[#CD7421]">',
  "                      {NOMBRE_CORTO[grupo.titulo] || grupo.titulo}",
  "                    </p>",
  "                    {marcadosEnGrupo > 0 && (",
  '                      <p className="text-[10px] mt-0.5 text-[#CD7421]">✓ {marcadosEnGrupo}</p>',
  "                    )}",
  "                  </div>",
  '                  <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{abiertoGrupo ? \'▲\' : \'▼\'}</span>',
].join('\n');

const CHIP_GRUPO_NUEVO = [
  "                  {IMG_GRUPO[grupo.titulo] ? (",
  '                    <img src={`/chiqui/${IMG_GRUPO[grupo.titulo]}.png`} alt="" className="w-11 h-11 object-contain" />',
  "                  ) : (",
  '                    <img src={grupo.img} alt="" className="w-11 h-11 object-contain" />',
  "                  )}",
  '                  <p className="text-[11px] font-bold text-[#8C572F] text-center leading-tight w-full truncate">',
  "                    {NOMBRE_CORTO[grupo.titulo] || grupo.titulo}",
  "                  </p>",
].join('\n');

const CHIP_ALERTA_VIEJO = [
  '                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{background:\'#E0525220\'}}>🚨</div>',
  '                  <div className="flex-1 min-w-0">',
  '                    <p className="text-[12px] font-semibold leading-tight truncate text-[#E05252]">Alerta</p>',
  "                    {hayAlerta && (",
  '                      <p className="text-[10px] mt-0.5 text-[#E05252]">✓ {signos.size}</p>',
  "                    )}",
  "                  </div>",
  '                  <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{signosAbierto ? \'▲\' : \'▼\'}</span>',
].join('\n');

const CHIP_ALERTA_NUEVO = [
  '                  <img src="/chiqui/alarma.png" alt="" className="w-11 h-11 object-contain" />',
  '                  <p className="text-[11px] font-bold text-[#8C572F] text-center leading-tight w-full truncate">Alerta</p>',
].join('\n');

// Las tres casillas comparten exactamente la misma clase, asi que se
// cambian TODAS de una vez. Reemplazar "una" habria sido ambiguo — el
// script aborto al detectarlo, que es lo correcto.
const CLASE_VIEJA = 'flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left';
const CLASE_NUEVA = 'flex flex-col items-center justify-center gap-1 px-1 py-3 rounded-xl';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// --- Las imagenes tienen que existir
const faltantes = IMAGENES.filter(n => !fs.existsSync(path.join(process.cwd(), 'public/chiqui/' + n + '.png')));
if (faltantes.length > 0) {
  abortar('faltan estas imagenes en public/chiqui/: ' + faltantes.join(', ') + '.png');
}
console.log('  OK  las ' + IMAGENES.length + ' imagenes estan en public/chiqui/');

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('IMG_CAT')) {
  abortar('las casillas ya tienen ilustraciones. Parece que este script ya se corrio.');
}
if (!c.includes('const NOMBRE_CORTO')) {
  abortar('faltan los cambios del script 385. Correlo primero.');
}

// --- 1. El mapa de imagenes
const ANCLA_MAPA = '  const NOMBRE_CORTO: Record<string, string> = {';
if (contar(c, ANCLA_MAPA) !== 1) {
  abortar('no encontre donde declarar el mapa de imagenes.');
}
c = c.replace(ANCLA_MAPA, MAPA + '\n' + ANCLA_MAPA);
console.log('  OK  mapa de imagenes');

// --- 1b. "Agua" se muestra como "Sed". Solo cambia lo que se VE: el id
// sigue siendo 'agua' y ningun registro guardado se ve afectado, igual
// que hicimos con Arenero -> Orina.
if (!c.includes("'Agua': 'Sed',")) {
  c = c.replace(ANCLA_MAPA, ANCLA_MAPA + "\n    'Agua': 'Sed',");
  console.log('  OK  Agua se muestra como Sed');
}

// --- 2. Los tres chips
const CHIPS = [
  ['casilla de observacion', CHIP_CAT_VIEJO, CHIP_CAT_NUEVO],
  ['casilla de cuidado', CHIP_GRUPO_VIEJO, CHIP_GRUPO_NUEVO],
  ['casilla de alerta', CHIP_ALERTA_VIEJO, CHIP_ALERTA_NUEVO],
];
for (const [nombre, viejo, nuevo] of CHIPS) {
  const n = contar(c, viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + nombre + '] y encontre ' + n + '.');
  }
  c = c.split(viejo).join(nuevo);
}

// --- 3. Layout en columna, las tres a la vez
const nClase = contar(c, CLASE_VIEJA);
console.log('  ' + (nClase === 3 ? 'OK ' : 'X  ') + 'cajas en columna -> ' + nClase + ' coincidencia(s)');
if (nClase !== 3) {
  abortar('esperaba 3 casillas con la misma clase y encontre ' + nClase + '.');
}
c = c.split(CLASE_VIEJA).join(CLASE_NUEVA);

// --- Verificaciones finales
const ESPERADOS = ['const IMG_CAT:', 'const IMG_GRUPO:', '/chiqui/alarma.png'];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las tres casillas tienen que quedar en columna.
if (contar(c, 'flex flex-col items-center justify-center gap-1') !== 3) {
  abortar('las tres casillas no quedaron en columna.');
}
// El estado registrado no puede seguir mostrandose en la casilla.
if (c.includes('{opSel?.emoji} {opSel?.label}')) {
  abortar('quedo el estado registrado en la casilla.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: opSel puede quedar declarado sin uso en la casilla. No');
console.log('rompe el build; se sigue usando dentro del panel abierto.');
console.log('');
console.log('Listo. Las casillas ya tienen tus ilustraciones.');
