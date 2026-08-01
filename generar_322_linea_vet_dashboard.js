const fs = require('fs');
const path = require('path');

// ============================================================
// generar_322_linea_vet_dashboard.js
// ============================================================
// 1) CREA components/LineaVet.tsx — una linea en el Dashboard para
//    copiar el link del historial para el veterinario, redactada por
//    el "para que" (se acerca una consulta) y no por el "que".
//    A diferencia de LinkVet, REUSA el link vigente en vez de crear
//    una fila nueva en links_veterinario en cada toque.
//
// 2) LA INSERTA en components/DashboardContenido.tsx, justo antes de
//    "Chiqui te cuenta" (despues de Proximos).
//
// El paso 2 NO reescribe el archivo completo: hace reemplazos exactos.
// Si no encuentra el texto tal cual lo espera, ABORTA sin escribir.
// ============================================================

const RUTA_COMPONENTE = 'components/LineaVet.tsx';
const RUTA_DASHBOARD = 'components/DashboardContenido.tsx';

const LINEAVET_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0AvdXRpbHMvc3VwYWJhc2UvY2xpZW50JwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIExJTkVBIFZFVCDigJQgYWNjZXNvIGRlIHVuYSBzb2xhIGzDrW5lYSBlbiBlbCBEYXNoYm9hcmQKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIENvbXBhcnRpciBlbCBoaXN0b3JpYWwgY29uIGVsIHZldGVyaW5hcmlvIGVzIExBIGZ1bmNpw7NuIHF1ZQovLyBkaXN0aW5ndWUgYSBDSElRVUksIHBlcm8gdml2w61hIGVzY29uZGlkYSBlbiBQZXJmaWwuIEVzdGEgbMOtbmVhIGxhCi8vIHBvbmUgZG9uZGUgc2UgdmUsIHJlZGFjdGFkYSBwb3IgZWwgInBhcmEgcXXDqSIgKHNlIGFjZXJjYSB1bmEKLy8gY29uc3VsdGEpIHkgbm8gcG9yIGVsICJxdcOpIiAoZ2VuZXJhciB1biBsaW5rKS4KLy8KLy8gSU1QT1JUQU5URSDigJQgcG9yIHF1w6kgbm8gcmV1c2EgTGlua1ZldDoKLy8gTGlua1ZldCBoYWNlIHVuIElOU0VSVCBlbiBjYWRhIHRvcXVlLCBhc8OtIHF1ZSBjYWRhIGNsaWMgY3JlYSB1bmEKLy8gZmlsYSBudWV2YSBlbiBsaW5rc192ZXRlcmluYXJpby4gRGVzZGUgZWwgZGFzaGJvYXJkIGVzbyBsbGVuYXLDrWEgbGEKLy8gdGFibGEgZGUgdG9rZW5zIHJlcGV0aWRvcy4gQWPDoSwgZW4gY2FtYmlvLCBwcmltZXJvIHNlIGJ1c2NhIHVuIGxpbmsKLy8gVklHRU5URSAoYWN0aXZvIHkgc2luIGV4cGlyYXIpIGRlIGVzdGEgbWFzY290YSB5IHNvbG8gc2UgY3JlYSB1bm8KLy8gbnVldm8gc2kgbm8gaGF5IG5pbmd1bm8uCi8vCi8vIE5vdGEgc29icmUgdG9JU09TdHJpbmcoKTogbGEgcmVnbGEgZGVsIHByb3llY3RvIHByb2jDrWJlIHVzYXJsbyBwYXJhCi8vIG9idGVuZXIgZWwgRMONQSAoYWjDrSB2YSBJbnRsIGNvbiBBbWVyaWNhL1NhbnRpYWdvKS4gQWPDoSBzZSBjb21wYXJhIHVuCi8vIHRpbWVzdGFtcHR6IGNvbnRyYSAiYWhvcmEiLCBxdWUgZXMgdW4gaW5zdGFudGUsIG5vIHVuIGTDrWEg4oCUIHBhcmEgZXNvCi8vIGVsIGZvcm1hdG8gVVRDIGRlIHRvSVNPU3RyaW5nIGVzIGp1c3RhbWVudGUgZWwgY29ycmVjdG8uCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBMaW5lYVZldCh7IG1hc2NvdGFJZCwgbWFzY290YU5vbWJyZSB9OiB7IG1hc2NvdGFJZDogc3RyaW5nOyBtYXNjb3RhTm9tYnJlOiBzdHJpbmcgfSkgewogIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KCkKICBjb25zdCBbZXN0YWRvLCBzZXRFc3RhZG9dID0gdXNlU3RhdGU8J2lkbGUnIHwgJ2NhcmdhbmRvJyB8ICdjb3BpYWRvJyB8ICdlcnJvcic+KCdpZGxlJykKICAvLyBTaSBlbCBuYXZlZ2Fkb3IgYmxvcXVlYSBlbCBwb3J0YXBhcGVsZXMgKHBhc2EgZW4gYWxndW5vcyBXZWJWaWV3KSwKICAvLyBtb3N0cmFtb3MgZWwgbGluayBlbiBwYW50YWxsYSBwYXJhIHF1ZSBzZSBwdWVkYSBjb3BpYXIgYSBtYW5vIGVuCiAgLy8gdmV6IGRlIGRlamFyIGEgbGEgcGVyc29uYSBzaW4gc2FsaWRhLgogIGNvbnN0IFtsaW5rVmlzaWJsZSwgc2V0TGlua1Zpc2libGVdID0gdXNlU3RhdGUoJycpCgogIGFzeW5jIGZ1bmN0aW9uIG9idGVuZXJMaW5rKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4gewogICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCkKICAgIGlmICghdXNlcikgcmV0dXJuIG51bGwKCiAgICBjb25zdCBhaG9yYSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKQoKICAgIC8vIDEpIMK/WWEgaGF5IHVuIGxpbmsgdmlnZW50ZSBwYXJhIGVzdGEgbWFzY290YT8gU2UgcmV1c2EuCiAgICBjb25zdCB7IGRhdGE6IHZpZ2VudGVzIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAuZnJvbSgnbGlua3NfdmV0ZXJpbmFyaW8nKQogICAgICAuc2VsZWN0KCd0b2tlbicpCiAgICAgIC5lcSgnbWFzY290YV9pZCcsIG1hc2NvdGFJZCkKICAgICAgLmVxKCdhY3Rpdm8nLCB0cnVlKQogICAgICAuZ3QoJ2V4cGlyYV9lbicsIGFob3JhKQogICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkKICAgICAgLmxpbWl0KDEpCgogICAgaWYgKHZpZ2VudGVzICYmIHZpZ2VudGVzLmxlbmd0aCA+IDAgJiYgdmlnZW50ZXNbMF0udG9rZW4pIHsKICAgICAgcmV0dXJuIGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59L3ZldD90b2tlbj0ke3ZpZ2VudGVzWzBdLnRva2VufWAKICAgIH0KCiAgICAvLyAyKSBObyBoYXkgbmluZ3VubyB2aWdlbnRlOiByZWNpw6luIGFow60gc2UgY3JlYSB1bm8uCiAgICBjb25zdCB7IGRhdGE6IG51ZXZvIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAuZnJvbSgnbGlua3NfdmV0ZXJpbmFyaW8nKQogICAgICAuaW5zZXJ0KHsgbWFzY290YV9pZDogbWFzY290YUlkLCB1c2VyX2lkOiB1c2VyLmlkIH0pCiAgICAgIC5zZWxlY3QoJ3Rva2VuJykKICAgICAgLnNpbmdsZSgpCgogICAgaWYgKCFudWV2byB8fCAhbnVldm8udG9rZW4pIHJldHVybiBudWxsCiAgICByZXR1cm4gYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0vdmV0P3Rva2VuPSR7bnVldm8udG9rZW59YAogIH0KCiAgYXN5bmMgZnVuY3Rpb24gY29waWFyKCkgewogICAgaWYgKGVzdGFkbyA9PT0gJ2NhcmdhbmRvJykgcmV0dXJuCiAgICBzZXRFc3RhZG8oJ2NhcmdhbmRvJykKICAgIHNldExpbmtWaXNpYmxlKCcnKQoKICAgIGNvbnN0IHVybCA9IGF3YWl0IG9idGVuZXJMaW5rKCkKICAgIGlmICghdXJsKSB7CiAgICAgIHNldEVzdGFkbygnZXJyb3InKQogICAgICBzZXRUaW1lb3V0KCgpID0+IHNldEVzdGFkbygnaWRsZScpLCA0MDAwKQogICAgICByZXR1cm4KICAgIH0KCiAgICB0cnkgewogICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh1cmwpCiAgICAgIHNldEVzdGFkbygnY29waWFkbycpCiAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0RXN0YWRvKCdpZGxlJyksIDM1MDApCiAgICB9IGNhdGNoIHsKICAgICAgLy8gU2luIHBlcm1pc28gZGUgcG9ydGFwYXBlbGVzOiBzZSBtdWVzdHJhIGVsIGxpbmsgcGFyYSBjb3BpYXJsbwogICAgICAvLyBhIG1hbm8uIExhIGNsYXNlIC5jb3BpYWJsZSBwZXJtaXRlIHNlbGVjY2lvbmFyIGVsIHRleHRvIChlbAogICAgICAvLyByZXN0byBkZSBsYSBhcHAgbG8gdGllbmUgYmxvcXVlYWRvIHBhcmEgc2VudGlyc2UgbmF0aXZhKS4KICAgICAgc2V0TGlua1Zpc2libGUodXJsKQogICAgICBzZXRFc3RhZG8oJ2lkbGUnKQogICAgfQogIH0KCiAgY29uc3QgZXRpcXVldGEgPQogICAgZXN0YWRvID09PSAnY29waWFkbycgPyAn4pyTIENvcGlhZG8nIDoKICAgIGVzdGFkbyA9PT0gJ2NhcmdhbmRvJyA/ICcuLi4nIDoKICAgIGVzdGFkbyA9PT0gJ2Vycm9yJyA/ICdSZWludGVudGFyJyA6CiAgICAnQ29waWFyJwoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9Im14LTQgbWItNCI+CiAgICAgIDxidXR0b24KICAgICAgICBvbkNsaWNrPXtjb3BpYXJ9CiAgICAgICAgY2xhc3NOYW1lPSJ3LWZ1bGwgYmctWyNGRkZDRjhdIGJvcmRlciBib3JkZXItWyNFRUUyRDRdIHJvdW5kZWQtMnhsIHB4LTMuNSBweS0zIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHRleHQtbGVmdCBhY3RpdmU6b3BhY2l0eS04MCIKICAgICAgPgogICAgICAgIDxpbWcgc3JjPSIvY2hpcXVpL2NoaXF1aV9kb2N0b3IucG5nIiBhbHQ9IiIgY2xhc3NOYW1lPSJ3LTkgaC05IG9iamVjdC1jb250YWluIGZsZXgtc2hyaW5rLTAiIC8+CiAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXgtMSBtaW4tdy0wIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTIuNXB4XSBmb250LWJvbGQgdGV4dC1bIzNEMkIxRl0gbGVhZGluZy1zbnVnIj4KICAgICAgICAgICAgwr9TZSBhY2VyY2EgdW5hIGNvbnN1bHRhIHZldGVyaW5hcmlhPwogICAgICAgICAgPC9wPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMXB4XSB0ZXh0LVsjOEE3NTYwXSBsZWFkaW5nLXNudWcgbXQtMC41Ij4KICAgICAgICAgICAgQ29waWEgZWwgbGluayB5IGVudHLDqWdhbGUgZWwgaGlzdG9yaWFsIGRlIHttYXNjb3RhTm9tYnJlfSBhIHR1IHZldC4KICAgICAgICAgIDwvcD4KICAgICAgICA8L2Rpdj4KICAgICAgICA8c3BhbgogICAgICAgICAgY2xhc3NOYW1lPSJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgZmxleC1zaHJpbmstMCIKICAgICAgICAgIHN0eWxlPXt7IGNvbG9yOiBlc3RhZG8gPT09ICdjb3BpYWRvJyA/ICcjNENBRjdEJyA6ICcjQ0Q3NDIxJyB9fQogICAgICAgID4KICAgICAgICAgIHtldGlxdWV0YX0KICAgICAgICA8L3NwYW4+CiAgICAgIDwvYnV0dG9uPgoKICAgICAge2VzdGFkbyA9PT0gJ2NvcGlhZG8nICYmICgKICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEwcHhdIHRleHQtWyM4QTc1NjBdIHRleHQtY2VudGVyIG10LTEuNSI+CiAgICAgICAgICBQw6lnYWxvIGVuIFdoYXRzQXBwIG8gY29ycmVvLiBUdSB2ZXQgbG8gYWJyZSBzaW4gY3JlYXIgY3VlbnRhLgogICAgICAgIDwvcD4KICAgICAgKX0KCiAgICAgIHtlc3RhZG8gPT09ICdlcnJvcicgJiYgKAogICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTBweF0gdGV4dC1bI0UwNTI1Ml0gdGV4dC1jZW50ZXIgbXQtMS41Ij4KICAgICAgICAgIE5vIHNlIHB1ZG8gZ2VuZXJhciBlbCBsaW5rLiBSZXZpc2EgdHUgY29uZXhpw7NuIGUgaW50ZW50YSBkZSBudWV2by4KICAgICAgICA8L3A+CiAgICAgICl9CgogICAgICB7bGlua1Zpc2libGUgJiYgKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJtdC0yIGJnLVsjRkJFQUQ5XSBib3JkZXIgYm9yZGVyLVsjRUVFMkQ0XSByb3VuZGVkLXhsIHAtMi41Ij4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTBweF0gdGV4dC1bIzhBNzU2MF0gbWItMSI+Q29waWEgZXN0ZSBsaW5rIGEgbWFubzo8L3A+CiAgICAgICAgICA8cCBjbGFzc05hbWU9ImNvcGlhYmxlIHRleHQtWzExcHhdIHRleHQtWyMzRDJCMUZdIGJyZWFrLWFsbCI+e2xpbmtWaXNpYmxlfTwvcD4KICAgICAgICA8L2Rpdj4KICAgICAgKX0KICAgIDwvZGl2PgogICkKfQo=';

const PARES = [
  {
    nombre: 'import de LineaVet',
    viejo: "import ChiquiTeCuenta from '@/components/ChiquiTeCuenta'",
    nuevo: [
      "import ChiquiTeCuenta from '@/components/ChiquiTeCuenta'",
      "import LineaVet from '@/components/LineaVet'",
    ].join('\n'),
  },
  {
    nombre: 'render de LineaVet en el dashboard',
    viejo: "      {/* CHIQUI TE CUENTA — carrusel de datos curiosos, cambia cada dia */}",
    nuevo: [
      "      {/* LINEA VET — compartir el historial con el veterinario.",
      "          Vive tambien en Perfil, pero ahi casi nadie la encontraba:",
      "          es la funcion que distingue a CHIQUI y merece estar visible. */}",
      "      <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />",
      "",
      "      {/* CHIQUI TE CUENTA — carrusel de datos curiosos, cambia cada dia */}",
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

// --- Paso 0: verificar el dashboard ANTES de crear nada, para no
// dejar un componente huerfano si el reemplazo no va a funcionar.
const destinoDash = path.join(process.cwd(), RUTA_DASHBOARD);
if (!fs.existsSync(destinoDash)) {
  abortar('no se encontro ' + RUTA_DASHBOARD + '. Corre el script desde la raiz del proyecto.');
}

let dash = fs.readFileSync(destinoDash, 'utf8');

for (const p of PARES) {
  const n = contar(dash, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

if (dash.includes('LineaVet')) {
  abortar('el dashboard ya menciona LineaVet. Parece que este script ya se corrio.');
}

// --- Paso 1: escribir el componente nuevo
const destinoComp = path.join(process.cwd(), RUTA_COMPONENTE);
const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) {
  fs.mkdirSync(carpeta, { recursive: true });
}
fs.writeFileSync(destinoComp, Buffer.from(LINEAVET_B64, 'base64').toString('utf8'), 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMPONENTE);

// --- Paso 2: insertar en el dashboard
for (const p of PARES) {
  dash = dash.split(p.viejo).join(p.nuevo);
}

if (contar(dash, '<LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />') !== 1) {
  abortar('la linea no quedo insertada en el dashboard.');
}
if (contar(dash, "import LineaVet from '@/components/LineaVet'") !== 1) {
  abortar('el import no quedo agregado.');
}

fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('OK: ' + RUTA_DASHBOARD);
console.log('');
console.log('Listo. La linea del veterinario ya aparece en el Dashboard.');
