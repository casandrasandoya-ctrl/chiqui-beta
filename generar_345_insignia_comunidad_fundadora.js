const fs = require('fs');
const path = require('path');

// ============================================================
// generar_345_insignia_comunidad_fundadora.js
// ============================================================
// Muestra la medalla "Comunidad fundadora" junto al nombre del tutor,
// en la seccion "Mi cuenta" del Perfil.
//
// REQUISITO: el .sql insignia_comunidad_fundadora.sql ya corrido. Sin
// la columna, la consulta falla y el componente simplemente no dibuja
// nada — no rompe la pagina, pero tampoco se ve la medalla.
//
// POR QUE VA EN LA PERSONA Y NO EN LA MASCOTA
// Canelita no es parte de la comunidad fundadora: Jenna si. Ponerla
// junto al nombre de la mascota confundiria de quien es el
// reconocimiento, y quien tenga tres mascotas la veria tres veces.
//
// POR QUE UN COMPONENTE APARTE
// InsigniaTutor carga su propio dato, asi que agregarla al perfil
// cuesta UNA sola linea. La alternativa era meterse en la carga de
// datos que ya existe en la pagina, con mucho mas riesgo de romper
// algo que ya funciona.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA_COMPONENTE = 'components/InsigniaTutor.tsx';
const RUTA_PERFIL = 'app/perfil/page.tsx';

const INSIGNIA_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC91dGlscy9zdXBhYmFzZS9jbGllbnQnCgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gSU5TSUdOSUEgREVMIFRVVE9SCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNZWRhbGxhIHF1ZSBhY29tcGHDsWEgYWwgbm9tYnJlIGVuICJNaSBjdWVudGEiLgovLwovLyBMYSBsbGV2YSBsYSBQRVJTT05BLCBubyBsYSBtYXNjb3RhOiBDYW5lbGl0YSBubyBlcyBwYXJ0ZSBkZSBsYQovLyBjb211bmlkYWQgZnVuZGFkb3JhLCBKZW5uYSBzw60uIFBvbmVybGEganVudG8gYWwgbm9tYnJlIGRlIGxhIG1hc2NvdGEKLy8gY29uZnVuZGlyw61hIGRlIHF1acOpbiBlcyBlbCByZWNvbm9jaW1pZW50bywgeSBxdWllbiB0ZW5nYSB0cmVzCi8vIG1hc2NvdGFzIGxhIHZlcsOtYSByZXBldGlkYSB0cmVzIHZlY2VzLgovLwovLyBTZSBndWFyZGEgdW4gQ8OTRElHTyBlbiBsYSBiYXNlICgnZnVuZGFkb3InKSwgbm8gZXN0ZSB0ZXh0by4gQXPDrSBlbAovLyBub21icmUgZGUgbGEgbWVkYWxsYSBzZSBwdWVkZSBjYW1iaWFyIGFjw6Egc2luIHRvY2FyIGxhIGJhc2UgZGUgZGF0b3MuCi8vCi8vIEVzIHVuIGNvbXBvbmVudGUgYXBhcnRlIHkgY2FyZ2Egc3UgcHJvcGlvIGRhdG8gYSBwcm9ww7NzaXRvOiBhc8OtCi8vIGFncmVnYXJsYSBhbCBwZXJmaWwgY3Vlc3RhIHVuYSBzb2xhIGzDrW5lYSwgc2luIG1ldGVyc2UgZW4gbGEgY2FyZ2EgZGUKLy8gZGF0b3MgcXVlIHlhIGV4aXN0w61hLiBTaSBubyBoYXkgaW5zaWduaWEsIG5vIGRpYnVqYSBuYWRhLgoKY29uc3QgSU5TSUdOSUFTOiBSZWNvcmQ8c3RyaW5nLCB7IGVtb2ppOiBzdHJpbmc7IGxhYmVsOiBzdHJpbmc7IGZvbmRvOiBzdHJpbmc7IHRleHRvOiBzdHJpbmcgfT4gPSB7CiAgZnVuZGFkb3I6IHsKICAgIGVtb2ppOiAn8J+PhScsCiAgICBsYWJlbDogJ0NvbXVuaWRhZCBmdW5kYWRvcmEnLAogICAgZm9uZG86ICcjRkZCRDU5JywKICAgIHRleHRvOiAnIzFBMTIwMCcsCiAgfSwKICBlcXVpcG86IHsKICAgIGVtb2ppOiAn4q2QJywKICAgIGxhYmVsOiAnRXF1aXBvJywKICAgIGZvbmRvOiAnIzhDNTcyRicsCiAgICB0ZXh0bzogJyNGRkZDRjgnLAogIH0sCn0KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEluc2lnbmlhVHV0b3IoKSB7CiAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoKQogIGNvbnN0IFtjb2RpZ28sIHNldENvZGlnb10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKQoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgbGV0IGNhbmNlbGFkbyA9IGZhbHNlCiAgICA7KGFzeW5jICgpID0+IHsKICAgICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCkKICAgICAgaWYgKCF1c2VyKSByZXR1cm4KICAgICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAgIC5mcm9tKCdwZXJmaWxfdXN1YXJpbycpCiAgICAgICAgLnNlbGVjdCgnaW5zaWduaWEnKQogICAgICAgIC5lcSgnaWQnLCB1c2VyLmlkKQogICAgICAgIC5tYXliZVNpbmdsZSgpCiAgICAgIGlmICghY2FuY2VsYWRvICYmIGRhdGE/Lmluc2lnbmlhKSBzZXRDb2RpZ28oZGF0YS5pbnNpZ25pYSBhcyBzdHJpbmcpCiAgICB9KSgpCiAgICByZXR1cm4gKCkgPT4geyBjYW5jZWxhZG8gPSB0cnVlIH0KICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHMKICB9LCBbXSkKCiAgaWYgKCFjb2RpZ28pIHJldHVybiBudWxsCiAgY29uc3QgaW5zID0gSU5TSUdOSUFTW2NvZGlnb10KICBpZiAoIWlucykgcmV0dXJuIG51bGwKCiAgcmV0dXJuICgKICAgIDxzcGFuCiAgICAgIGNsYXNzTmFtZT0idGV4dC1bMTBweF0gZm9udC1ib2xkIHJvdW5kZWQtZnVsbCBweC0yIHB5LTAuNSB3aGl0ZXNwYWNlLW5vd3JhcCIKICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogaW5zLmZvbmRvLCBjb2xvcjogaW5zLnRleHRvIH19CiAgICA+CiAgICAgIHtpbnMuZW1vaml9IHtpbnMubGFiZWx9CiAgICA8L3NwYW4+CiAgKQp9Cg==';

const PARES = [
  {
    nombre: 'import de InsigniaTutor',
    viejo: "'use client'",
    nuevo: [
      "'use client'",
      "import InsigniaTutor from '@/components/InsigniaTutor'",
    ].join('\n'),
  },
  {
    nombre: 'medalla junto al nombre',
    viejo: '                <p className="text-sm">{userNombre}</p>',
    nuevo: [
      '                <div className="flex items-center gap-2 flex-wrap min-w-0">',
      '                  <p className="text-sm">{userNombre}</p>',
      "                  <InsigniaTutor />",
      "                </div>",
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

const destinoPerfil = path.join(process.cwd(), RUTA_PERFIL);
if (!fs.existsSync(destinoPerfil)) {
  abortar('no se encontro ' + RUTA_PERFIL + '. Corre el script desde la raiz del proyecto.');
}

let perfil = fs.readFileSync(destinoPerfil, 'utf8');

if (perfil.includes('InsigniaTutor')) {
  abortar('el perfil ya muestra la insignia. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(perfil, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  perfil = perfil.split(p.viejo).join(p.nuevo);
}

const ESPERADOS = [
  "import InsigniaTutor from '@/components/InsigniaTutor'",
  '<InsigniaTutor />',
];
for (const e of ESPERADOS) {
  if (contar(perfil, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

const comp = Buffer.from(INSIGNIA_B64, 'base64').toString('utf8');
for (const r of ['export default function InsigniaTutor', 'Comunidad fundadora', "'use client'"]) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

const destinoComp = path.join(process.cwd(), RUTA_COMPONENTE);
const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMPONENTE);

fs.writeFileSync(destinoPerfil, perfil, 'utf8');
console.log('OK: ' + RUTA_PERFIL);
console.log('');
console.log('Listo. La medalla ya acompaña al nombre en Mi cuenta.');
