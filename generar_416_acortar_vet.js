const fs = require('fs');
const path = require('path');

// ============================================================
// generar_416_acortar_vet_cotutor.js
// ============================================================
// Los dos bloques quedaron desparejos: el del veterinario ocupaba el
// triple que el de co-tutor, porque mostraba SIEMPRE la URL completa,
// el boton de copiar y dos parrafos de aviso.
//
// QUE CAMBIA EN EL LINK DEL VET
//   - "Comparte el historial con tu vet" -> "Link para tu vet"
//   - El parrafo largo -> "Envíaselo antes de la consulta."
//   - LA URL COMPLETA YA NO SE MUESTRA. Ocupaba media tarjeta y nadie
//     la lee: se copia con el boton. Si el navegador no dejara copiar,
//     el mensaje de error lo diria.
//   - Los dos avisos del final se unen en una linea.
//
// El co-tutor se acorta en el script siguiente, junto con mover el
// "Tengo un codigo" dentro de su tarjeta.
//
// REQUISITO: script 415 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/LinkVet.tsx';

const PARES = [
  { nombre: 'encabezado del link', viejo: "      <div className=\"px-4 py-3 border-b border-[#EEE2D4]\">\n        <div className=\"flex items-center gap-2 mb-1\">\n          <img src=\"/chiqui/chiqui_doctor.png\" alt=\"\" className=\"w-7 h-7 object-contain\" />\n          <h2 className=\"font-bold text-sm\">Comparte el historial con tu vet</h2>\n        </div>\n        <p className=\"text-xs text-[#8A7560] mt-0.5\">CHIQUI recomienda enviarlo antes o durante la consulta, para que tu vet llegue con contexto.</p>\n      </div>", nuevo: "      <div className=\"px-3 py-2.5 border-b border-[#EEE2D4]\">\n        <div className=\"flex items-center gap-1.5\">\n          <img src=\"/chiqui/chiqui_doctor.png\" alt=\"\" className=\"w-6 h-6 object-contain flex-shrink-0\" />\n          <h2 className=\"font-bold text-[13px] leading-tight\">Link para tu vet</h2>\n        </div>\n        <p className=\"text-[11px] text-[#8A7560] mt-1 leading-snug\">Env\u00edaselo antes de la consulta.</p>\n      </div>" },
  { nombre: 'cuerpo del link', viejo: "      <div className=\"p-4\">\n        {!link ? (\n          <button onClick={generarLink} disabled={loading}\n            className=\"w-full bg-[#4AABDB] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50\">\n            {loading ? 'Generando...' : '\ud83d\udd17 Generar link para el vet'}\n          </button>\n        ) : (\n          <div className=\"space-y-3\">\n            <div className=\"bg-[#FBEAD9] rounded-xl p-3 text-xs text-[#8A7560] break-all border border-[#EEE2D4]\">\n              {link}\n            </div>\n            <button onClick={copiar}\n              className=\"w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-3 rounded-xl text-sm\">\n              {copiado ? '\u2705 \u00a1Copiado!' : '\ud83d\udccb Copiar link'}\n            </button>\n            <p className=\"text-xs text-[#8A7560] text-center\">El veterinario puede ver el historial sin crear cuenta</p>\n          </div>\n        )}\n      </div>", nuevo: "      <div className=\"p-3\">\n        {!link ? (\n          <button onClick={generarLink} disabled={loading}\n            className=\"w-full bg-[#4AABDB] text-white font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-50\">\n            {loading ? 'Generando...' : '\ud83d\udd17 Generar link'}\n          </button>\n        ) : (\n          <div className=\"space-y-2\">\n            <button onClick={copiar}\n              className=\"w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-2.5 rounded-xl text-[13px]\">\n              {copiado ? '\u2705 \u00a1Copiado!' : '\ud83d\udccb Copiar link'}\n            </button>\n            {/* La URL completa no se muestra: ocupaba la mitad de la\n                tarjeta y nadie la lee \u2014 se copia con el bot\u00f3n. */}\n            <p className=\"text-[10px] text-[#8A7560] text-center leading-snug\">\n              Tu vet lo abre sin crear cuenta. Dura 7 d\u00edas.\n            </p>\n          </div>\n        )}\n      </div>" },
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

if (c.includes('Link para tu vet')) {
  abortar('los textos ya estan cortos. Parece que este script ya se corrio.');
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
const ESPERADOS = ['Link para tu vet', 'Envíaselo antes de la consulta.', 'Tu vet lo abre sin crear cuenta'];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La funcion de copiar tiene que seguir: es lo unico que entrega el link.
if (!c.includes('navigator.clipboard.writeText(link)')) {
  abortar('se perdio la funcion de copiar. Sin ella no hay como entregar el link.');
}
if (c.includes('CHIQUI recomienda enviarlo antes')) {
  abortar('quedo el texto largo.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El bloque del veterinario ya cabe en media pantalla.');
