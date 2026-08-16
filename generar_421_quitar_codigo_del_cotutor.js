const fs = require('fs');
const path = require('path');

// ============================================================
// generar_421_quitar_codigo_del_cotutor.js
// ============================================================
// REVIERTE una decision del script 417.
//
// Ahi movi "Tengo un codigo" DENTRO de la caja de co-tutor, pensando
// que las dos cosas eran del mismo tema. Casandra noto que ya vive en
// el boton + del selector de mascotas, junto a "Agregar otra mascota".
//
// Y tiene razon: esas dos SI son lo mismo —formas de sumar una mascota
// a tu cuenta—, mientras que la caja de co-tutor es para lo contrario:
// invitar a alguien a la TUYA. Tenerlo en los dos lugares lo duplica y
// confunde de que se trata cada caja.
//
// La caja queda solo con "+ Generar código".
//
// El componente UnirseComoCotutor NO se borra: sigue usandose en el
// selector de mascotas.
//
// REQUISITOS: scripts 417 y 419 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/GestionCotutor.tsx';

const PARES = [
  { nombre: 'quitar el codigo de la caja', viejo: "          <button\n            onClick={generarInvitacion}\n            disabled={procesando}\n            className=\"w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-40\"\n          >\n            {procesando ? 'Generando...' : '+ Generar c\u00f3digo'}\n          </button>\n          {/* \"Tengo un c\u00f3digo\" vive AQUI, no suelto abajo: las dos cosas\n              son parte del mismo tema \u2014 compartir el cuidado. */}\n          <UnirseComoCotutor />", nuevo: "          {/* Solo el generador. \"Tengo un c\u00f3digo\" vive en el bot\u00f3n + del\n              selector de mascotas, junto a \"Agregar otra mascota\": las\n              dos son formas de SUMAR una mascota. Esta caja es para lo\n              contrario \u2014 invitar a alguien a la tuya. */}\n          <button\n            onClick={generarInvitacion}\n            disabled={procesando}\n            className=\"w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-40\"\n          >\n            {procesando ? 'Generando...' : '+ Generar c\u00f3digo'}\n          </button>" },
  { nombre: 'quitar el import', viejo: "import { createClient } from '@/utils/supabase/client'\nimport UnirseComoCotutor from '@/components/UnirseComoCotutor'", nuevo: "import { createClient } from '@/utils/supabase/client'" },
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

if (!c.includes('UnirseComoCotutor')) {
  abortar('el co-tutor ya no tiene el codigo. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
if (c.includes('UnirseComoCotutor')) {
  abortar('quedo alguna referencia al componente: el build fallaria si el import se fue.');
}
if (!c.includes('+ Generar código')) {
  abortar('se perdio el boton de generar.');
}
// Los otros estados no deben haberse tocado.
for (const s of ['Copiar código', 'Revocar acceso', 'Cancelar']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('NOTA: components/UnirseComoCotutor.tsx NO se borra — sigue');
console.log('usandose en el boton + del selector de mascotas.');
console.log('');
console.log('Listo. La caja de co-tutor quedo solo con el generador.');
