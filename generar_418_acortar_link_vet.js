const fs = require('fs');
const path = require('path');

// ============================================================
// generar_418_acortar_link_vet.js
// ============================================================
// El bloque del veterinario ocupaba el triple que el de co-tutor y los
// dos quedaban desparejos lado a lado.
//
// QUE CAMBIA
//   - "Comparte el historial con tu vet" -> "Link para tu vet"
//   - El parrafo largo -> "Envíaselo antes de la consulta."
//   - "🔗 Generar link para el vet" -> "🔗 Generar link"
//   - LA URL COMPLETA YA NO SE MUESTRA. Ocupaba media tarjeta y nadie
//     la lee: se copia con el boton, que la deja en el portapapeles
//     igual.
//   - Los dos avisos del final se unen en una linea, conservando la
//     fecha de expiracion.
//
// Este script reemplaza al 416, que aborto porque yo use una version
// vieja del archivo como base — la tuya ya tenia el estado "buscando",
// la clase "copiable" y la fecha de expiracion.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/LinkVet.tsx';

const ENCABEZADO_VIEJO = "      <div className=\"px-4 py-3 border-b border-[#EEE2D4]\">\n        <div className=\"flex items-center gap-2 mb-1\">\n          <img src=\"/chiqui/chiqui_doctor.png\" alt=\"\" className=\"w-7 h-7 object-contain\" />\n          <h2 className=\"font-bold text-sm\">Comparte el historial con tu vet</h2>\n        </div>\n        <p className=\"text-xs text-[#8A7560] mt-0.5\">CHIQUI recomienda enviarlo antes o durante la consulta, para que tu vet llegue con contexto.</p>\n      </div>";
const ENCABEZADO_NUEVO = "      <div className=\"px-3 py-2.5 border-b border-[#EEE2D4]\">\n        <div className=\"flex items-center gap-1.5\">\n          <img src=\"/chiqui/chiqui_doctor.png\" alt=\"\" className=\"w-6 h-6 object-contain flex-shrink-0\" />\n          <h2 className=\"font-bold text-[13px] leading-tight\">Link para tu vet</h2>\n        </div>\n        <p className=\"text-[11px] text-[#8A7560] mt-1 leading-snug\">Env\u00edaselo antes de la consulta.</p>\n      </div>";
const CUERPO_VIEJO = "      <div className=\"p-4\">\n        {buscando ? (\n          <p className=\"text-xs text-[#8A7560] text-center py-2\">Cargando...</p>\n        ) : !link ? (\n          <button onClick={generarLink} disabled={loading}\n            className=\"w-full bg-[#4AABDB] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50\">\n            {loading ? 'Generando...' : '\ud83d\udd17 Generar link para el vet'}\n          </button>\n        ) : (\n          <div className=\"space-y-3\">\n            <div className=\"copiable bg-[#FBEAD9] rounded-xl p-3 text-xs text-[#8A7560] break-all border border-[#EEE2D4]\">\n              {link}\n            </div>\n            <button onClick={copiar}\n              className=\"w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-3 rounded-xl text-sm\">\n              {copiado ? '\u2705 \u00a1Copiado!' : '\ud83d\udccb Copiar link'}\n            </button>\n            <p className=\"text-xs text-[#8A7560] text-center\">El veterinario puede ver el historial sin crear cuenta</p>\n            {expira && (\n              <p className=\"text-[11px] text-[#CD7421] text-center font-semibold\">\n                Este link funciona hasta el {fmtExpira(expira)}. Despues puedes generar uno nuevo.\n              </p>\n            )}\n          </div>\n        )}";
const CUERPO_NUEVO = "      <div className=\"p-3\">\n        {buscando ? (\n          <p className=\"text-[11px] text-[#8A7560] text-center py-2\">Cargando...</p>\n        ) : !link ? (\n          <button onClick={generarLink} disabled={loading}\n            className=\"w-full bg-[#4AABDB] text-white font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-50\">\n            {loading ? 'Generando...' : '\ud83d\udd17 Generar link'}\n          </button>\n        ) : (\n          <div className=\"space-y-2\">\n            <button onClick={copiar}\n              className=\"w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-2.5 rounded-xl text-[13px]\">\n              {copiado ? '\u2705 \u00a1Copiado!' : '\ud83d\udccb Copiar link'}\n            </button>\n            {/* La URL completa ya no se muestra: ocupaba media tarjeta y\n                nadie la lee \u2014 se copia con el bot\u00f3n. Si alguien necesita\n                verla, el bot\u00f3n la deja en el portapapeles igual. */}\n            <p className=\"text-[10px] text-[#8A7560] text-center leading-snug\">\n              Tu vet lo abre sin crear cuenta.\n              {expira && <> Dura hasta el {fmtExpira(expira)}.</>}\n            </p>\n          </div>\n        )}";

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

const PARES = [
  { nombre: 'encabezado', viejo: ENCABEZADO_VIEJO, nuevo: ENCABEZADO_NUEVO },
  { nombre: 'cuerpo', viejo: CUERPO_VIEJO, nuevo: CUERPO_NUEVO },
];

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
// Lo que NO puede perderse.
if (!c.includes('onClick={copiar}')) {
  abortar('se perdio el boton de copiar: es lo unico que entrega el link.');
}
if (!c.includes('fmtExpira(expira)')) {
  abortar('se perdio la fecha de expiracion.');
}
if (!c.includes('{error &&')) {
  abortar('se perdio el mensaje de error.');
}
if (c.includes('break-all border border-[#EEE2D4]')) {
  abortar('quedo el recuadro con la URL.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: la clase "copiable" desaparecio con el recuadro. Si la usas');
console.log('en algun estilo global, avisale a Claude.');
console.log('');
console.log('Listo. El bloque del veterinario ya cabe en media pantalla.');
