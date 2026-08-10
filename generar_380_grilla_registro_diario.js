const fs = require('fs');
const path = require('path');

// ============================================================
// generar_380_grilla_registro_diario.js
// ============================================================
// PASO 1 del rediseño: las categorias pasan de lista vertical a GRILLA
// de tres columnas, con las opciones abriendose debajo de la fila
// completa.
//
// EL PROBLEMA QUE RESUELVE
// Tito, uno de los usuarios mas constantes (19 registros), dijo que
// marca "Todo normal" y NUNCA baja. Por eso nunca supo que existian
// Alimentacion, Veterinario ni Prevencion. En la grilla todo queda a la
// vista desde el primer segundo, sin agregarle ningun paso.
//
// COMO SE ABRE DEBAJO DE LA FILA, SIN MOVER EL PANEL
// Poner el panel a lo ancho justo despues del chip dejaria un hueco en
// la fila. La solucion es el ORDEN del CSS: cada chip lleva el numero
// de su fila x2, y el panel ese numero x2 + 1. La grilla los acomoda
// sola — primero todos los chips de la fila, despues el panel a lo
// ancho.
//
// Eso permite que el PANEL SE QUEDE DONDE ESTA en el codigo. No se
// reescribe ni una linea de su contenido: el input de minutos del
// paseo, las sub-preguntas de detalle y todo lo demas siguen intactos.
// Mover a ciegas un bloque que no se ve entero es justo lo que no hay
// que hacer en la pantalla mas usada de la app.
//
// El contenedor de cada categoria pasa a display:contents, asi el chip
// y el panel se vuelven hijos directos de la grilla sin tener que
// eliminar ese div (cuyo cierre queda lejos y no se alcanza a ver).
//
// TAMBIEN SE REORDENAN las categorias al orden tematico del diseño:
// Energia-Animo-Conducta, Apetito-Agua-Digestion, Heces-Orina-Movilidad,
// Paseo-Pelaje. Asi cada cuidado podra sentarse junto a la observacion
// con la que se relaciona cuando llegue el paso 2.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const CHIP_VIEJO = [
  "              <button onClick={() => setAbierto(open ? '' : cat.id)} className=\"w-full flex items-center gap-3 py-3 text-left\">",
  '                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{background:`${cat.color}20`}}>',
  "                  {cat.icon}",
  "                </div>",
  '                <div className="flex-1">',
  '                  <p className="text-sm font-semibold">{cat.nombre}</p>',
  "                  {selVal && (",
  '                    <p className="text-xs mt-0.5" style={{color:cat.color}}>',
  "                      {opSel?.emoji} {opSel?.label}{(det[cat.id]?.filter(Boolean).length) ? ` · ${det[cat.id].filter(Boolean).join(', ')}` : ''}",
  "                    </p>",
  "                  )}",
  "                </div>",
  '                <span className="text-[#8C572F] text-sm font-bold">{open ? \'▲\' : \'▼\'}</span>',
  "              </button>",
].join('\n');

const CHIP_NUEVO = [
  "              {/* Chip compacto. El detalle ya no se muestra aquí: no",
  "                  cabe en un tercio de ancho y se ve completo al abrir. */}",
  "              <button",
  "                onClick={() => setAbierto(open ? '' : cat.id)}",
  '                className="flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
  "                style={{",
  "                  order: Math.floor(i / 3) * 2,",
  "                  border: open ? '2px solid #FFBD59' : '2px solid transparent',",
  "                  background: open ? '#FFFCF8' : 'transparent',",
  "                }}",
  "              >",
  '                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{background:`${cat.color}20`}}>',
  "                  {cat.icon}",
  "                </div>",
  '                <div className="flex-1 min-w-0">',
  '                  <p className="text-[12px] font-semibold leading-tight truncate">{cat.nombre}</p>',
  "                  {selVal && (",
  '                    <p className="text-[10px] mt-0.5 truncate" style={{color:cat.color}}>',
  "                      {opSel?.emoji} {opSel?.label}",
  "                    </p>",
  "                  )}",
  "                </div>",
  '                <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{open ? \'▲\' : \'▼\'}</span>',
  "              </button>",
].join('\n');

const PARES = [
  {
    nombre: 'orden tematico de las categorias',
    viejo: [
      "  const categorias = [energia, animo, apetito, agua, digestion, heces, arenero, pelaje, conducta, movilidad]",
      "  if (especie === 'Perro') categorias.push(paseo)",
      "  return categorias",
    ].join('\n'),
    nuevo: [
      "  // Orden temático: cada fila de tres agrupa cosas relacionadas.",
      "  // Energía-Ánimo-Conducta (cómo estuvo), Apetito-Agua-Digestión",
      "  // (comida), Heces-Orina-Movilidad, Paseo-Pelaje. Cuando los",
      "  // cuidados entren a la grilla, cada uno se sienta junto a la",
      "  // observación con la que se relaciona.",
      "  const categorias = [energia, animo, conducta, apetito, agua, digestion, heces, arenero, movilidad]",
      "  if (especie === 'Perro') categorias.push(paseo)",
      "  categorias.push(pelaje)",
      "  return categorias",
    ].join('\n'),
  },
  {
    nombre: 'indice de cada categoria',
    viejo: "        {CATS.map(cat => {",
    nuevo: "        {CATS.map((cat, i) => {",
  },
  {
    nombre: 'contenedor en grilla',
    viejo: '      <div className="space-y-0 mt-2">',
    nuevo: [
      "      {/* Grilla de tres columnas. El panel de opciones se coloca",
      "          debajo de la FILA completa usando el orden del CSS: los",
      "          chips llevan fila*2 y el panel fila*2+1, así la grilla los",
      "          acomoda sola sin dejar huecos. */}",
      '      <div className="mx-4 mt-2 grid grid-cols-3 gap-x-1.5 gap-y-1">',
    ].join('\n'),
  },
  {
    nombre: 'contenedor de cada categoria',
    viejo: '            <div key={cat.id} className="mx-4">',
    nuevo: [
      "            /* display:contents hace que el chip y el panel sean hijos",
      "               directos de la grilla, sin tener que eliminar este div. */",
      "            <div key={cat.id} style={{ display: 'contents' }}>",
    ].join('\n'),
  },
  {
    nombre: 'panel debajo de la fila',
    viejo: [
      "              {open && (",
      '                <div className="pb-3">',
    ].join('\n'),
    nuevo: [
      "              {open && (",
      '                <div className="pb-3" style={{ order: Math.floor(i / 3) * 2 + 1, gridColumn: \'1 / -1\' }}>',
    ].join('\n'),
  },
  {
    nombre: 'chip compacto',
    viejo: CHIP_VIEJO,
    nuevo: CHIP_NUEVO,
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

if (contenido.includes("display: 'contents'")) {
  abortar('el registro ya esta en grilla. Parece que este script ya se corrio.');
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

const ESPERADOS = [
  'grid grid-cols-3 gap-x-1.5 gap-y-1',
  "display: 'contents'",
  'order: Math.floor(i / 3) * 2,',
  "order: Math.floor(i / 3) * 2 + 1, gridColumn: '1 / -1'",
  'categorias.push(pelaje)',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las once categorias tienen que seguir existiendo: si alguna se perdio
// al reordenar, el contador y el guardado quedarian mal.
for (const c of ['energia', 'animo', 'conducta', 'apetito', 'agua', 'digestion', 'heces', 'arenero', 'movilidad', 'paseo', 'pelaje']) {
  if (!contenido.includes('const categorias = ') || !contenido.match(new RegExp('categorias[\\s\\S]{0,200}' + c))) {
    if (!contenido.includes(c)) abortar('se perdio la categoria [' + c + '] al reordenar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Las categorias ya estan en grilla, con el panel bajo su fila.');
