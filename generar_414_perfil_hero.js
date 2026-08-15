const fs = require('fs');
const path = require('path');

// ============================================================
// generar_414_perfil_hero.js
// ============================================================
// El hero del perfil pasa del DEGRADADO CAFE a FONDO CREMA CON
// HUELLITAS, como el diseño.
//
// TRES CAMBIOS
//   - El fondo. El patron va incrustado en el CSS como SVG en base64:
//     no depende de subir otro archivo ni agrega una peticion de red.
//   - La foto crece de 80 a 112 pixeles.
//   - El nombre pasa a cafe oscuro (sobre el degradado iba en claro) y
//     los datos se separan con circulos, igual que en el dashboard.
//
// SE CONSERVAN el logo de la esquina, el boton de cambiar foto y el
// chip rojo de alergia. Este script solo cambia como se ve.
//
// El selector de mascotas y los botones del vet van en el siguiente:
// prefiero cambios chicos y verificables despues de dos intentos que
// abortaron por delimitar mal.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/perfil/page.tsx';

const PARES = [
  { nombre: 'fondo del hero', viejo: "      <div className=\"relative bg-gradient-to-b from-[#8C572F] to-[#F5EDE3] pt-8 pb-6 text-center\">\n        <img src=\"/logo-chiqui-compacto.png\" alt=\"CHIQUI\" className=\"w-9 h-9 object-contain absolute top-3 right-4 opacity-90\" />\n        <div className=\"mx-auto mb-3\" style={{ width: 80 }}>", nuevo: "      {/* HERO \u2014 fondo crema con huellitas en vez del degradado caf\u00e9. El\n          patr\u00f3n va incrustado en el CSS como SVG: no depende de subir\n          otro archivo ni agrega una petici\u00f3n de red. */}\n      <div\n        className=\"relative pt-8 pb-6 text-center\"\n        style={{\n          backgroundColor: '#FBEAD9',\n          backgroundImage: `url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPGcgZmlsbD0iI0U4RDVCRSIgb3BhY2l0eT0iMC41NSI+CiAgICA8IS0tIEh1ZWxsYSAxIC0tPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAsMjIpIHJvdGF0ZSgtMTgpIj4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSI4IiByeD0iNy41IiByeT0iNi41Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSItNyIgY3k9Ii0zIiByeD0iMy4yIiByeT0iNC4yIi8+CiAgICAgIDxlbGxpcHNlIGN4PSItMi40IiBjeT0iLTYuNiIgcng9IjMuMiIgcnk9IjQuNCIvPgogICAgICA8ZWxsaXBzZSBjeD0iMi42IiBjeT0iLTYuNCIgcng9IjMuMiIgcnk9IjQuNCIvPgogICAgICA8ZWxsaXBzZSBjeD0iNyIgY3k9Ii0yLjYiIHJ4PSIzLjEiIHJ5PSI0Ii8+CiAgICA8L2c+CiAgICA8IS0tIEh1ZWxsYSAyIC0tPgogICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzgsNTIpIHJvdGF0ZSgyMikiPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9IjgiIHJ4PSI3LjUiIHJ5PSI2LjUiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii03IiBjeT0iLTMiIHJ4PSIzLjIiIHJ5PSI0LjIiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii0yLjQiIGN5PSItNi42IiByeD0iMy4yIiByeT0iNC40Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSIyLjYiIGN5PSItNi40IiByeD0iMy4yIiByeT0iNC40Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSI3IiBjeT0iLTIuNiIgcng9IjMuMSIgcnk9IjQiLz4KICAgIDwvZz4KICAgIDwhLS0gSHVlbGxhIDMgLS0+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NSw4OCkgcm90YXRlKC04KSI+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iOCIgcng9IjcuNSIgcnk9IjYuNSIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTciIGN5PSItMyIgcng9IjMuMiIgcnk9IjQuMiIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTIuNCIgY3k9Ii02LjYiIHJ4PSIzLjIiIHJ5PSI0LjQiLz4KICAgICAgPGVsbGlwc2UgY3g9IjIuNiIgY3k9Ii02LjQiIHJ4PSIzLjIiIHJ5PSI0LjQiLz4KICAgICAgPGVsbGlwc2UgY3g9IjciIGN5PSItMi42IiByeD0iMy4xIiByeT0iNCIvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+\")`,\n          backgroundSize: '120px 120px',\n        }}\n      >\n        <img src=\"/logo-chiqui-compacto.png\" alt=\"CHIQUI\" className=\"w-9 h-9 object-contain absolute top-3 right-4 opacity-90\" />\n        <div className=\"mx-auto mb-3\" style={{ width: 112 }}>" },
  { nombre: 'tamaño de la foto', viejo: "              size={80}", nuevo: "              size={112}" },
  { nombre: 'nombre y datos', viejo: "        <h1 className=\"font-heading text-xl font-extrabold\">{mascota?.nombre}</h1>\n        <p className=\"text-sm text-[#8A7560] mt-1\">\n          {mascota?.especie}\n          {mascota?.raza ? ` \u00b7 ${mascota.raza}` : ''}\n          {edad ? ` \u00b7 ${edad}` : ''}\n        </p>", nuevo: "        <h1 className=\"font-heading text-2xl font-extrabold text-[#3D2B1F]\">{mascota?.nombre}</h1>\n        <p className=\"text-sm text-[#8A7560] mt-1\">\n          {[mascota?.especie, mascota?.raza, edad].filter(Boolean).join('  \\u25E6  ')}\n        </p>" },
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

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('data:image/svg+xml;base64')) {
  abortar('el hero ya tiene el fondo nuevo. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones finales
const ESPERADOS = ["backgroundColor: '#FBEAD9'", 'size={112}', 'text-[#3D2B1F]">{mascota?.nombre}'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (c.includes('bg-gradient-to-b from-[#8C572F]')) {
  abortar('quedo el degradado viejo.');
}
// Lo que NO debe perderse.
for (const s of ['FotoMascota', 'Alergia:', 'logo-chiqui-compacto']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El hero ya tiene el fondo de huellitas.');
