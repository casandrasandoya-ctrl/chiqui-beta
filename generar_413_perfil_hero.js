const fs = require('fs');
const path = require('path');

// ============================================================
// generar_413_perfil_hero.js
// ============================================================
// PASO 1 de 2 del rediseño del perfil.
//
// EL HERO pasa del degradado cafe a FONDO CREMA CON HUELLITAS, con el
// nombre y los datos en cafe oscuro. La foto crece a 112px y se centra.
//
// EL PATRON VA INCRUSTADO EN EL CSS como SVG en base64. Asi no depende
// de que Casandra suba otro archivo, y no agrega una peticion de red
// mas al cargar la pantalla.
//
// EL SELECTOR DE MASCOTAS SUBE al principio, antes del hero. Hoy queda
// debajo, y en el diseño nuevo tiene mas sentido arriba: se elige a
// quien mirar antes de ver su ficha.
//
// SE CONSERVAN el boton de cambiar foto y el chip de alergia, que ya
// existian. Los separadores de los datos pasan a circulos, igual que en
// el dashboard.
//
// El siguiente script junta el link del vet y el co-tutor lado a lado.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/perfil/page.tsx';

const HERO_NUEVO = "      {/* HERO \u2014 fondo crema con huellitas. El patr\u00f3n va incrustado en\n        el CSS: no depende de subir otro archivo ni agrega una\n        petici\u00f3n de red. */}\n      <div\n      className=\"relative px-5 pt-4 pb-6 text-center\"\n      style={{\n        backgroundColor: '#FBEAD9',\n        backgroundImage: `url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPGcgZmlsbD0iI0U4RDVCRSIgb3BhY2l0eT0iMC41NSI+CiAgICA8IS0tIEh1ZWxsYSAxIC0tPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAsMjIpIHJvdGF0ZSgtMTgpIj4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSI4IiByeD0iNy41IiByeT0iNi41Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSItNyIgY3k9Ii0zIiByeD0iMy4yIiByeT0iNC4yIi8+CiAgICAgIDxlbGxpcHNlIGN4PSItMi40IiBjeT0iLTYuNiIgcng9IjMuMiIgcnk9IjQuNCIvPgogICAgICA8ZWxsaXBzZSBjeD0iMi42IiBjeT0iLTYuNCIgcng9IjMuMiIgcnk9IjQuNCIvPgogICAgICA8ZWxsaXBzZSBjeD0iNyIgY3k9Ii0yLjYiIHJ4PSIzLjEiIHJ5PSI0Ii8+CiAgICA8L2c+CiAgICA8IS0tIEh1ZWxsYSAyIC0tPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzgsNTIpIHJvdGF0ZSgyMikiPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9IjgiIHJ4PSI3LjUiIHJ5PSI2LjUiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii03IiBjeT0iLTMiIHJ4PSIzLjIiIHJ5PSI0LjIiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii0yLjQiIGN5PSItNi42IiByeD0iMy4yIiByeT0iNC40Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSIyLjYiIGN5PSItNi40IiByeD0iMy4yIiByeT0iNC40Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSI3IiBjeT0iLTIuNiIgcng9IjMuMSIgcnk9IjQiLz4KICAgIDwvZz4KICAgIDwhLS0gSHVlbGxhIDMgLS0+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NSw4OCkgcm90YXRlKC04KSI+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iOCIgcng9IjcuNSIgcnk9IjYuNSIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTciIGN5PSItMyIgcng9IjMuMiIgcnk9IjQuMiIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTIuNCIgY3k9Ii02LjYiIHJ4PSIzLjIiIHJ5PSI0LjQiLz4KICAgICAgPGVsbGlwc2UgY3g9IjIuNiIgY3k9Ii02LjQiIHJ4PSIzLjIiIHJ5PSI0LjQiLz4KICAgICAgPGVsbGlwc2UgY3g9IjciIGN5PSItMi42IiByeD0iMy4xIiByeT0iNCIvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+\")`,\n        backgroundSize: '120px 120px',\n      }}\n      >\n      <div className=\"relative inline-block\">\n        <div className=\"w-28 h-28 rounded-full overflow-hidden bg-[#FFFCF8] border-4 border-[#FFFCF8] mx-auto\">\n          {mascota?.foto_url ? (\n            <img src={mascota.foto_url} alt={mascota.nombre} className=\"w-full h-full object-cover\" />\n          ) : (\n            <div className=\"w-full h-full flex items-center justify-center text-5xl\">\n              {iconoPorEspecie(mascota?.especie || '')}\n            </div>\n          )}\n        </div>\n        {mascota && (\n          <SubirFotoMascota\n            mascotaId={mascota.id}\n            fotoActual={mascota.foto_url}\n            onSubida={(nuevaUrl) => {\n              setMascota(prev => prev ? { ...prev, foto_url: nuevaUrl } : prev)\n              setMascotas(prev => prev.map(m => m.id === mascota.id ? { ...m, foto_url: nuevaUrl } : m))\n            }}\n          />\n        )}\n      </div>\n\n      <h1 className=\"font-heading text-2xl font-extrabold text-[#3D2B1F] mt-3\">{mascota?.nombre}</h1>\n      <p className=\"text-sm text-[#8A7560] mt-1\">\n        {[mascota?.especie, mascota?.raza, edad].filter(Boolean).join('  \\u25E6  ')}\n      </p>\n      {mascota?.alergias && (\n        <div className=\"inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E05252]/15 text-[#E05252]\">\n          \\u26A0\\uFE0F Alergia: {mascota.alergias}\n        </div>\n      )}\n      </div>";

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

if (c.includes('backgroundSize: \'120px 120px\'')) {
  abortar('el hero ya tiene el fondo nuevo. Parece que este script ya se corrio.');
}

// --- Delimitar el hero: desde su contenedor EXACTO hasta el
// comentario del selector. Buscar el div "hacia atras" con un
// desplazamiento aproximado caia en medio del bloque y rompia el JSX —
// Babel lo detecto.
const ANCLA_INI = '      <div className="px-5 pt-6 pb-4 text-center">';
const ANCLA_FIN = '      {/* Selector de mascota */}';

if (contar(c, ANCLA_INI) !== 1) {
  abortar('no encontre el inicio del hero. Pasale a Claude la linea donde empieza.');
}
if (contar(c, ANCLA_FIN) !== 1) {
  abortar('no encontre el selector de mascota. El archivo no es el esperado.');
}

const posIni = c.indexOf(ANCLA_INI);
const posFin = c.indexOf(ANCLA_FIN);
if (posFin < posIni) {
  abortar('el selector quedaria antes del hero. El archivo no es el esperado.');
}

const bloqueViejo = c.slice(posIni, posFin);

for (const s of ['{mascota?.nombre}', 'SubirFotoMascota', 'Alergia:']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a reemplazar no contiene [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.length > 3000) {
  abortar('el bloque a reemplazar es demasiado largo (' + bloqueViejo.length + '). No se escribio nada.');
}
console.log('  OK  hero delimitado (' + bloqueViejo.split('\n').length + ' lineas)');

// --- El selector sube antes del hero
const SELECTOR = '      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}';
const nSel = contar(c, SELECTOR);
console.log('  ' + (nSel === 1 ? 'OK ' : 'X  ') + 'selector de mascota -> ' + nSel + ' coincidencia(s)');
if (nSel !== 1) {
  abortar('esperaba 1 coincidencia del selector y encontre ' + nSel + '.');
}

c = c.slice(0, posIni) + HERO_NUEVO + '\n\n' + c.slice(posFin);
// Quitarlo de su lugar actual y ponerlo antes del hero.
c = c.replace(ANCLA_FIN + '\n' + SELECTOR + '\n', '');
c = c.replace(HERO_NUEVO, '      {/* Selector de mascota — arriba: se elige a quien mirar antes\n          de ver su ficha. */}\n' + SELECTOR + '\n\n' + HERO_NUEVO);

// --- Verificaciones
const ESPERADOS = ['backgroundColor: \'#FBEAD9\'', 'SubirFotoMascota', 'Alergia:'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contar(c, 'SelectorMascota mascotas={mascotas}') !== 1) {
  abortar('el selector no quedo exactamente una vez.');
}
if (c.indexOf('SelectorMascota mascotas=') > c.indexOf('backgroundColor: \'#FBEAD9\'')) {
  abortar('el selector no quedo antes del hero.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Hero con huellitas y selector arriba.');
