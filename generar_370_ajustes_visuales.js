const fs = require('fs');
const path = require('path');

// ============================================================
// generar_370_ajustes_visuales.js
// ============================================================
// Cinco ajustes pedidos despues de ver el diseño andando:
//
//  1. CHIPS mas chicos, para que los tres quepan en una sola linea.
//     Pasan de 12px a 11px, con menos aire adentro y menos separacion
//     entre ellos. Se conserva flex-wrap como red de seguridad: si
//     alguna vez un texto crece (por ejemplo "Sintoma notable" junto a
//     "¿Cuando llego?"), bajan en vez de desbordarse.
//
//  2. "Ver Perfil" en negrita de verdad (extrabold).
//
//  3. La ILUSTRACION del modal pasa de 48 a 80 pixeles: era el
//     elemento con mas personalidad de esa ventana y quedaba perdida.
//
//  4. El MODAL pasa de cafe a beige claro. El titulo pasa a cafe,
//     porque el dorado sobre beige casi no se lee — el contraste tiene
//     que moverse junto con el fondo, no despues.
//
//  5. El borde del boton de cerrar se adapta al fondo claro. El boton
//     en si se queda donde esta: ahi quedo bien.
//
// REQUISITO: scripts 367, 368 y 369 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  // ---------------------------------------------------------
  // 1. Chips en una sola linea
  // ---------------------------------------------------------
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'separacion entre chips',
    viejo: '        <div className="mt-4 pt-4 border-t border-[#FFFCF8]/20 flex items-center gap-2 flex-wrap">',
    nuevo: [
      "        {/* gap-1.5 y chips de 11px para que los tres entren en una",
      "            sola linea. flex-wrap queda como red de seguridad: si un",
      "            texto crece, bajan en vez de desbordarse. */}",
      '        <div className="mt-4 pt-4 border-t border-[#FFFCF8]/20 flex items-center gap-1.5 flex-wrap">',
    ].join('\n'),
  },
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'chip de estado',
    viejo: '          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: `${color}26`, border: `1.5px solid ${color}`, color: \'#FFFCF8\' }}>',
    nuevo: '          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}26`, border: `1.5px solid ${color}`, color: \'#FFFCF8\' }}>',
  },
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'punto del chip de estado',
    viejo: '            <div className="w-2 h-2 rounded-full" style={{ background: color }} />',
    nuevo: '            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />',
  },
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'chip de racha',
    viejo: '            <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: \'#FFBD5926\', border: \'1.5px solid #FFBD59\', color: \'#FFFCF8\' }}>',
    nuevo: '            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: \'#FFBD5926\', border: \'1.5px solid #FFBD59\', color: \'#FFFCF8\' }}>',
  },
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'chip de tiempo juntos',
    viejo: '              <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: \'#E88FB826\', border: \'1.5px solid #E88FB8\', color: \'#FFFCF8\' }}>',
    nuevo: '              <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: \'#E88FB826\', border: \'1.5px solid #E88FB8\', color: \'#FFFCF8\' }}>',
  },

  // ---------------------------------------------------------
  // 2. Ver Perfil en negrita
  // ---------------------------------------------------------
  {
    ruta: 'components/DashboardContenido.tsx',
    nombre: 'Ver Perfil en negrita',
    viejo: '              <span className="text-[13px] font-bold text-[#FFBD59] flex-shrink-0 pt-0.5">Ver Perfil ▶</span>',
    nuevo: '              <span className="text-[13px] font-extrabold text-[#FFBD59] flex-shrink-0 pt-0.5">Ver Perfil ▶</span>',
  },

  // ---------------------------------------------------------
  // 3, 4 y 5. El modal
  // ---------------------------------------------------------
  {
    ruta: 'components/SelectorMascota.tsx',
    nombre: 'fondo beige del modal',
    viejo: '            className="bg-[#8C572F] rounded-3xl w-full max-w-xs p-4 relative overflow-y-auto"',
    nuevo: '            className="bg-[#FBEAD9] rounded-3xl w-full max-w-xs p-4 relative overflow-y-auto"',
  },
  {
    ruta: 'components/SelectorMascota.tsx',
    nombre: 'ilustracion mas grande y titulo legible',
    viejo: [
      '              <img src="/chiqui/chiqui_mascotas.png" alt="" className="w-12 h-12 object-contain flex-shrink-0" />',
      '              <p className="font-heading text-lg font-extrabold text-[#FFBD59]">Agrandar familia</p>',
    ].join('\n'),
    nuevo: [
      "              {/* 80px en vez de 48: es el elemento con mas caracter",
      "                  de esta ventana y quedaba perdido. */}",
      '              <img src="/chiqui/chiqui_mascotas.png" alt="" className="w-20 h-20 object-contain flex-shrink-0" />',
      "              {/* Cafe sobre beige. El dorado se leia bien sobre el",
      "                  fondo oscuro anterior, pero sobre beige casi",
      "                  desaparece: el contraste se mueve con el fondo. */}",
      '              <p className="font-heading text-lg font-extrabold text-[#8C572F]">Agrandar familia</p>',
    ].join('\n'),
  },
  {
    ruta: 'components/SelectorMascota.tsx',
    nombre: 'borde del boton de cerrar sobre fondo claro',
    viejo: "              style={{ border: '1.5px solid rgba(255,252,248,0.35)' }}",
    nuevo: "              style={{ border: '1.5px solid rgba(61,43,31,0.15)' }}",
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    porArchivo.set(c.ruta, { destino, contenido: fs.readFileSync(destino, 'utf8') });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificaciones finales
const dash = porArchivo.get('components/DashboardContenido.tsx');
if (contar(dash.contenido, 'px-2.5 py-1 text-[11px]') !== 3) {
  abortar('los tres chips no quedaron del mismo tamaño.');
}
if (!dash.contenido.includes('font-extrabold text-[#FFBD59] flex-shrink-0')) {
  abortar('Ver Perfil no quedo en negrita.');
}
const sel = porArchivo.get('components/SelectorMascota.tsx');
if (!sel.contenido.includes('bg-[#FBEAD9] rounded-3xl') || !sel.contenido.includes('w-20 h-20 object-contain')) {
  abortar('el modal no quedo con el fondo y la ilustracion nuevos.');
}
if (sel.contenido.includes("text-[#FFBD59]\">Agrandar familia")) {
  abortar('el titulo quedo en dorado sobre beige: no se leeria.');
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. Chips en una linea y modal en beige.');
