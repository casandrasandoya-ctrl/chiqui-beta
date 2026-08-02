const fs = require('fs');
const path = require('path');

// ============================================================
// generar_352_acceso_panel.js
// ============================================================
// Un boton al panel en el Perfil (visible SOLO para la administradora)
// y un boton de vuelta a la app dentro del panel.
//
// COMO SE MANTIENE PRIVADO
// El Perfil es un componente de cliente, asi que no puede leer
// ADMIN_USER_ID: las variables sin prefijo NEXT_PUBLIC solo existen en
// el servidor. Y hacerla publica seria peor — cualquiera sabria que
// /admin existe y de quien es la cuenta.
//
// Por eso se agrega una ruta minima (/api/soy-admin) que hace la
// comprobacion en el servidor y responde solo un si o un no. Nunca
// devuelve el id ni nada que permita deducirlo.
//
// Esto NO es la proteccion del panel: /admin sigue verificando la
// sesion por su cuenta y devolviendo 404 a quien no corresponda. El
// boton solo evita escribir la direccion a mano.
//
// Crea dos archivos nuevos y modifica dos existentes.
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_API = 'app/api/soy-admin/route.ts';
const RUTA_COMP = 'components/AccesoPanel.tsx';
const RUTA_PERFIL = 'app/perfil/page.tsx';
const RUTA_PANEL = 'app/admin/page.tsx';

const API_B64 = 'aW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInCmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0AvdXRpbHMvc3VwYWJhc2Uvc2VydmVyJwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIMK/UVVJRU4gRVNUw4EgQ09ORUNUQURPIEVTIExBIEFETUlOSVNUUkFET1JBPwovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gRWwgUGVyZmlsIGVzIHVuIGNvbXBvbmVudGUgZGUgY2xpZW50ZSwgYXPDrSBxdWUgbm8gcHVlZGUgbGVlcgovLyBBRE1JTl9VU0VSX0lEOiBsYXMgdmFyaWFibGVzIGRlIGVudG9ybm8gc2luIGVsIHByZWZpam8gTkVYVF9QVUJMSUMKLy8gc29sbyBleGlzdGVuIGVuIGVsIHNlcnZpZG9yLiBZIGhhY2VybGEgcMO6YmxpY2Egc2Vyw61hIHBlb3Ig4oCUIGN1YWxxdWllcmEKLy8gc2FicsOtYSBxdWUgL2FkbWluIGV4aXN0ZSB5IGRlIHF1acOpbiBlcyBsYSBjdWVudGEuCi8vCi8vIFBvciBlc28gbGEgY29tcHJvYmFjacOzbiBzZSBoYWNlIGFjw6EsIGVuIGVsIHNlcnZpZG9yLCB5IGhhY2lhIGFmdWVyYQovLyBzb2xvIHNhbGUgdW4gc8OtIG8gdW4gbm8uIE51bmNhIHNlIGRldnVlbHZlIGVsIGlkIG5pIG5hZGEgcXVlIHBlcm1pdGEKLy8gZGVkdWNpcmxvLgovLwovLyBFc3RvIE5PIGVzIGxhIHByb3RlY2Npw7NuIGRlbCBwYW5lbDogL2FkbWluIGhhY2Ugc3UgcHJvcGlhCi8vIHZlcmlmaWNhY2nDs24geSBkZXZ1ZWx2ZSA0MDQgYSBxdWllbiBubyBjb3JyZXNwb25kYS4gRXN0YSBydXRhIHNvbG8KLy8gZGVjaWRlIHNpIHNlIGRpYnVqYSB1biBib3TDs24uCgpleHBvcnQgY29uc3QgZHluYW1pYyA9ICdmb3JjZS1keW5hbWljJwoKZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVCgpIHsKICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpCiAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCkKICBjb25zdCBhZG1pbklkID0gcHJvY2Vzcy5lbnYuQURNSU5fVVNFUl9JRAogIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGFkbWluOiAhIXVzZXIgJiYgISFhZG1pbklkICYmIHVzZXIuaWQgPT09IGFkbWluSWQgfSkKfQo=';
const COMP_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKaW1wb3J0IExpbmsgZnJvbSAnbmV4dC9saW5rJwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIEFDQ0VTTyBBTCBQQU5FTCDigJQgc29sbyBwYXJhIGxhIGFkbWluaXN0cmFkb3JhCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBQcmVndW50YSBhbCBzZXJ2aWRvciBzaSBxdWllbiBlc3TDoSBjb25lY3RhZG8gZXMgbGEgYWRtaW5pc3RyYWRvcmEuCi8vIFNpIG5vIGxvIGVzLCBubyBkaWJ1amEgbmFkYTogbmkgZWwgYm90w7NuIG5pIHVuYSBwaXN0YSBkZSBxdWUgZXhpc3RhLgovLwovLyBMYSBzZWd1cmlkYWQgcmVhbCBlc3TDoSBlbiAvYWRtaW4sIHF1ZSB2ZXJpZmljYSBsYSBzZXNpw7NuIHBvciBzdQovLyBjdWVudGEgeSBkZXZ1ZWx2ZSA0MDQgYSBjdWFscXVpZXIgb3RyYSBwZXJzb25hLiBFc3RlIGNvbXBvbmVudGUgc29sbwovLyBldml0YSB0ZW5lciBxdWUgZXNjcmliaXIgbGEgZGlyZWNjacOzbiBhIG1hbm8gY2FkYSB2ZXouCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBY2Nlc29QYW5lbCgpIHsKICBjb25zdCBbZXNBZG1pbiwgc2V0RXNBZG1pbl0gPSB1c2VTdGF0ZShmYWxzZSkKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGxldCBjYW5jZWxhZG8gPSBmYWxzZQogICAgZmV0Y2goJy9hcGkvc295LWFkbWluJykKICAgICAgLnRoZW4ociA9PiByLmpzb24oKSkKICAgICAgLnRoZW4oZCA9PiB7IGlmICghY2FuY2VsYWRvICYmIGQ/LmFkbWluKSBzZXRFc0FkbWluKHRydWUpIH0pCiAgICAgIC5jYXRjaCgoKSA9PiB7IC8qIHNpIGZhbGxhLCBzaW1wbGVtZW50ZSBubyBzZSBtdWVzdHJhIGVsIGJvdMOzbiAqLyB9KQogICAgcmV0dXJuICgpID0+IHsgY2FuY2VsYWRvID0gdHJ1ZSB9CiAgfSwgW10pCgogIGlmICghZXNBZG1pbikgcmV0dXJuIG51bGwKCiAgcmV0dXJuICgKICAgIDxMaW5rCiAgICAgIGhyZWY9Ii9hZG1pbiIKICAgICAgY2xhc3NOYW1lPSJteC00IG1iLTQgYmctWyM4QzU3MkZdIHJvdW5kZWQtMnhsIHB4LTQgcHktMyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyB0ZXh0LWxlZnQiCiAgICA+CiAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1sZyBmbGV4LXNocmluay0wIj7wn5OKPC9zcGFuPgogICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleC0xIG1pbi13LTAiPgogICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1zbSBmb250LWJvbGQgdGV4dC13aGl0ZSI+UGFuZWwgaW50ZXJubzwvcD4KICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzExcHhdIHRleHQtd2hpdGUvNzAiPk3DqXRyaWNhcyBkZSB1c28gZGUgbGEgYXBwPC9wPgogICAgICA8L2Rpdj4KICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXdoaXRlLzcwIHRleHQtc20gZmxleC1zaHJpbmstMCI+4oaSPC9zcGFuPgogICAgPC9MaW5rPgogICkKfQo=';

const PARES_PERFIL = [
  {
    nombre: 'import de AccesoPanel',
    viejo: "'use client'",
    nuevo: [
      "'use client'",
      "import AccesoPanel from '@/components/AccesoPanel'",
    ].join('\n'),
  },
  {
    nombre: 'boton del panel en el Perfil',
    viejo: [
      '      <div className="mx-4 mb-4 bg-[#FBEAD9] border border-[#EEE2D4] rounded-2xl p-4">',
      '        <p className="text-xs text-[#8A7560] leading-relaxed text-center">',
    ].join('\n'),
    nuevo: [
      "      {/* Solo se dibuja si el servidor confirma que la sesion es la",
      "          de la administradora. Para el resto no existe. */}",
      "      <AccesoPanel />",
      "",
      '      <div className="mx-4 mb-4 bg-[#FBEAD9] border border-[#EEE2D4] rounded-2xl p-4">',
      '        <p className="text-xs text-[#8A7560] leading-relaxed text-center">',
    ].join('\n'),
  },
];

const PARES_PANEL = [
  {
    nombre: 'boton de vuelta a la app',
    viejo: [
      '        <p className="text-xs text-white/70 mt-1">',
      "          Actualizado al {fmtFecha(hoy)} · Incluye tu cuenta",
      "        </p>",
    ].join('\n'),
    nuevo: [
      '        <p className="text-xs text-white/70 mt-1">',
      "          Actualizado al {fmtFecha(hoy)} · Incluye tu cuenta",
      "        </p>",
      '        <a href="/dashboard" className="inline-block mt-3 text-xs font-bold text-[#FFBD59]">',
      "          ← Volver a la app",
      "        </a>",
    ].join('\n'),
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

// ============================================================
// VERIFICAR TODO antes de escribir nada
// ============================================================

for (const r of [RUTA_PERFIL, RUTA_PANEL]) {
  if (!fs.existsSync(path.join(process.cwd(), r))) {
    abortar('no se encontro ' + r + '. Corre el script desde la raiz del proyecto.');
  }
}
for (const r of [RUTA_API, RUTA_COMP]) {
  if (fs.existsSync(path.join(process.cwd(), r))) {
    abortar('ya existe ' + r + '. No lo sobrescribo por si tiene cambios tuyos.');
  }
}

const destinoPerfil = path.join(process.cwd(), RUTA_PERFIL);
const destinoPanel = path.join(process.cwd(), RUTA_PANEL);

let perfil = fs.readFileSync(destinoPerfil, 'utf8');
let panel = fs.readFileSync(destinoPanel, 'utf8');

if (perfil.includes('AccesoPanel')) {
  abortar('el Perfil ya tiene el boton. Parece que este script ya se corrio.');
}
if (panel.includes('Volver a la app')) {
  abortar('el panel ya tiene el boton de vuelta. Parece que este script ya se corrio.');
}

for (const p of PARES_PERFIL) {
  const n = contar(perfil, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
}
for (const p of PARES_PANEL) {
  const n = contar(panel, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
}

for (const p of PARES_PERFIL) perfil = perfil.split(p.viejo).join(p.nuevo);
for (const p of PARES_PANEL) panel = panel.split(p.viejo).join(p.nuevo);

const api = Buffer.from(API_B64, 'base64').toString('utf8');
const comp = Buffer.from(COMP_B64, 'base64').toString('utf8');

// La ruta NUNCA debe devolver el id, solo un booleano. Se comprueba
// que 'adminId' no aparezca como CLAVE de la respuesta ('adminId:'):
// buscar solo 'adminId' daria falso positivo con la comparacion
// legitima user.id === adminId.
if (!api.includes('NextResponse.json({ admin:') || api.includes('adminId:')) {
  abortar('la ruta no responde solo un booleano. No se escribio nada.');
}
if (!comp.includes("fetch('/api/soy-admin')") || !comp.includes('if (!esAdmin) return null')) {
  abortar('el componente no trae la comprobacion esperada. No se escribio nada.');
}

// ============================================================
// ESCRIBIR
// ============================================================
console.log('');
for (const [ruta, contenido] of [[RUTA_API, api], [RUTA_COMP, comp]]) {
  const destino = path.join(process.cwd(), ruta);
  const carpeta = path.dirname(destino);
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(destino, contenido, 'utf8');
  console.log('OK: ' + ruta);
}
fs.writeFileSync(destinoPerfil, perfil, 'utf8');
console.log('OK: ' + RUTA_PERFIL);
fs.writeFileSync(destinoPanel, panel, 'utf8');
console.log('OK: ' + RUTA_PANEL);

console.log('');
console.log('Listo. Tienes acceso directo al panel, y solo tu lo ves.');
