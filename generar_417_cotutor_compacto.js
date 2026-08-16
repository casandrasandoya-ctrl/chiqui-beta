const fs = require('fs');
const path = require('path');

// ============================================================
// generar_417_cotutor_compacto.js
// ============================================================
// Dos cambios en el co-tutor:
//
// 1. TEXTOS MAS CORTOS, para que quepa en media pantalla junto al link
//    del vet:
//      "Invita a alguien de tu familia o pareja para que también pueda
//       registrar a X."  ->  "Invita a alguien que también cuide a X."
//      "+ Generar código de invitación"  ->  "+ Generar código"
//
// 2. "TENGO UN CODIGO" SE MUEVE ADENTRO, debajo del boton de generar.
//    Hoy vive suelto mas abajo, separado de la tarjeta con la que se
//    relaciona. Las dos cosas son parte del mismo tema —compartir el
//    cuidado de la mascota— y juntas se entienden mejor.
//
// Solo aparece en el estado "sin co-tutor": si ya hay uno activo o una
// invitacion pendiente, ofrecer unirse a OTRA mascota ahi confundiria.
//
// REQUISITO: script 416 desplegado.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_GC = 'components/GestionCotutor.tsx';
const RUTA_PF = 'app/perfil/page.tsx';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoGC = path.join(process.cwd(), RUTA_GC);
const destinoPF = path.join(process.cwd(), RUTA_PF);

for (const [ruta, destino] of [[RUTA_GC, destinoGC], [RUTA_PF, destinoPF]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let gc = fs.readFileSync(destinoGC, 'utf8');
let pf = fs.readFileSync(destinoPF, 'utf8');

if (gc.includes('UnirseComoCotutor')) {
  abortar('el co-tutor ya incluye el codigo. Parece que este script ya se corrio.');
}

const PARES_GC = [
  { nombre: 'import de UnirseComoCotutor', viejo: "import { createClient } from '@/utils/supabase/client'", nuevo: "import { createClient } from '@/utils/supabase/client'\nimport UnirseComoCotutor from '@/components/UnirseComoCotutor'" },
  { nombre: 'tarjeta de co-tutor', viejo: "    <div className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4\">\n      <div className=\"flex items-center gap-2 mb-3\">\n        <img src=\"/chiqui/chiqui_amor.png\" alt=\"\" className=\"w-7 h-7 object-contain\" />\n        <h3 className=\"font-bold text-sm text-[#3D2B1F]\">Co-tutor</h3>\n      </div>\n\n      {estado === 'sin_cotutor' && (\n        <>\n          <p className=\"text-xs text-[#8A7560] mb-3 leading-relaxed\">\n            Invita a alguien de tu familia o pareja para que tambi\u00e9n pueda registrar a {mascotaNombre}.\n          </p>\n          <button\n            onClick={generarInvitacion}\n            disabled={procesando}\n            className=\"w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40\"\n          >\n            {procesando ? 'Generando...' : '+ Generar c\u00f3digo de invitaci\u00f3n'}\n          </button>\n        </>\n      )}", nuevo: "    <div className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3\">\n      <div className=\"flex items-center gap-1.5 mb-2\">\n        <img src=\"/chiqui/chiqui_amor.png\" alt=\"\" className=\"w-6 h-6 object-contain flex-shrink-0\" />\n        <h3 className=\"font-bold text-[13px] text-[#3D2B1F]\">Co-tutor</h3>\n      </div>\n\n      {estado === 'sin_cotutor' && (\n        <>\n          <p className=\"text-[11px] text-[#8A7560] mb-2 leading-snug\">\n            Invita a alguien que tambi\u00e9n cuide a {mascotaNombre}.\n          </p>\n          <button\n            onClick={generarInvitacion}\n            disabled={procesando}\n            className=\"w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-40\"\n          >\n            {procesando ? 'Generando...' : '+ Generar c\u00f3digo'}\n          </button>\n          {/* \"Tengo un c\u00f3digo\" vive AQUI, no suelto abajo: las dos cosas\n              son parte del mismo tema \u2014 compartir el cuidado. */}\n          <UnirseComoCotutor />\n        </>\n      )}" },
];

for (const p of PARES_GC) {
  const n = contar(gc, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  gc = gc.split(p.viejo).join(p.nuevo);
}

const nPF = contar(pf, "      {/* Unirse como co-tutor \u2014 para quien tiene un c\u00f3digo */}\n      <UnirseComoCotutor />\n\n");
console.log('  ' + (nPF === 1 ? 'OK ' : 'X  ') + 'UnirseComoCotutor suelto -> ' + nPF + ' coincidencia(s)');
if (nPF !== 1) {
  abortar('esperaba 1 coincidencia del bloque suelto y encontre ' + nPF + '.');
}
pf = pf.split("      {/* Unirse como co-tutor \u2014 para quien tiene un c\u00f3digo */}\n      <UnirseComoCotutor />\n\n").join("      {/* \"Tengo un c\u00f3digo\" ahora vive dentro de la tarjeta de co-tutor:\n          las dos cosas son parte del mismo tema. */}\n\n");

// --- Verificaciones
if (contar(gc, '<UnirseComoCotutor />') !== 1) {
  abortar('el codigo no quedo dentro del co-tutor.');
}
if (contar(pf, '<UnirseComoCotutor />') !== 0) {
  abortar('quedo el bloque suelto en el perfil: apareceria dos veces.');
}
if (!gc.includes('+ Generar código')) {
  abortar('el boton no quedo aplicado.');
}
// Los otros estados no deben haberse tocado.
for (const s of ['Copiar código', 'Revocar acceso', 'Cancelar invitación']) {
  if (!gc.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destinoGC, gc, 'utf8');
console.log('');
console.log('OK: ' + RUTA_GC);
fs.writeFileSync(destinoPF, pf, 'utf8');
console.log('OK: ' + RUTA_PF);
console.log('');
console.log('AVISO: si el import de UnirseComoCotutor queda sin uso en el');
console.log('perfil, no rompe el build. Avisale a Claude si Vercel lo marca.');
console.log('');
console.log('Listo. El codigo vive dentro del co-tutor.');
