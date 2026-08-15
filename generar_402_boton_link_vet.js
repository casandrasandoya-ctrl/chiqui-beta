const fs = require('fs');
const path = require('path');

// ============================================================
// generar_402_boton_link_vet.js
// ============================================================
// Los dos botones del dashboard quedan iguales y simples, como en el
// diseño: "Ver Perfil" y "Link Vet".
//
// QUE ESTABA MAL
// Puse el componente LineaVet completo junto al boton de perfil, y ese
// componente trae toda su explicacion: titulo, descripcion de que es un
// link para el veterinario, cuanto dura. En el dashboard eso ocupa
// media pantalla y no calza al lado de un boton simple.
//
// AHORA
// Un boton propio que al tocarlo COPIA el link al portapapeles y
// confirma con "✓ Link copiado". Sin explicaciones: la accion es
// evidente y la explicacion vive en Perfil, donde corresponde.
//
// REUSA EL LINK VIGENTE en vez de crear uno nuevo en cada toque. Sin
// eso, la cuenta de Casandra llego a acumular 52 links generados.
//
// Si el navegador no deja copiar, se muestra el link para copiarlo a
// mano — mejor que no hacer nada sin decir por que.
//
// TAMBIEN quita el LineaVet duplicado de mas abajo, si sigue ahi.
//
// REQUISITO: script 401 desplegado.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_COMP = 'components/BotonLinkVet.tsx';
const RUTA_DASH = 'components/DashboardContenido.tsx';

const BOTON_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0AvdXRpbHMvc3VwYWJhc2UvY2xpZW50JwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIEJPVMOTTiBMSU5LIFZFVAovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gQm90w7NuIHNpbXBsZSBxdWUgY29waWEgZWwgbGluayBhbCBwb3J0YXBhcGVsZXMuIFJlZW1wbGF6YSBhbCBibG9xdWUKLy8gZXhwbGljYXRpdm8gcXVlIG9jdXBhYmEgbWVkaWEgcGFudGFsbGE6IGVuIGVsIGRhc2hib2FyZCBsbyBxdWUgc2UKLy8gbmVjZXNpdGEgZXMgbGEgYWNjacOzbiwgbm8gbGEgZXhwbGljYWNpw7NuLgovLwovLyBSRVVTQSBFTCBMSU5LIFZJR0VOVEUgZW4gdmV6IGRlIGNyZWFyIHVubyBudWV2byBlbiBjYWRhIHRvcXVlLiBTaW4KLy8gZXNvLCBsYSBjdWVudGEgZGUgQ2FzYW5kcmEgbGxlZ8OzIGEgYWN1bXVsYXIgNTIgbGlua3MgZ2VuZXJhZG9zIOKAlCB1bm8KLy8gcG9yIGNhZGEgdmV6IHF1ZSBhbGd1aWVuIHRvY8OzIGVsIGJvdMOzbi4KLy8KLy8gU2kgZWwgbmF2ZWdhZG9yIG5vIGRlamEgY29waWFyIChwYXNhIGVuIGFsZ3Vub3MgY29udGV4dG9zKSwgc2UKLy8gbXVlc3RyYSBlbCBsaW5rIHBhcmEgY29waWFybG8gYSBtYW5vIGVuIHZleiBkZSBmYWxsYXIgZW4gc2lsZW5jaW8uCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCb3RvbkxpbmtWZXQoewogIG1hc2NvdGFJZCwKICBtYXNjb3RhTm9tYnJlLAp9OiB7CiAgbWFzY290YUlkOiBzdHJpbmcKICBtYXNjb3RhTm9tYnJlOiBzdHJpbmcKfSkgewogIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KCkKICBjb25zdCBbY2FyZ2FuZG8sIHNldENhcmdhbmRvXSA9IHVzZVN0YXRlKGZhbHNlKQogIGNvbnN0IFtjb3BpYWRvLCBzZXRDb3BpYWRvXSA9IHVzZVN0YXRlKGZhbHNlKQogIGNvbnN0IFtsaW5rTWFudWFsLCBzZXRMaW5rTWFudWFsXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpCgogIGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXJZQ29waWFyKGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHsKICAgIGUucHJldmVudERlZmF1bHQoKQogICAgZS5zdG9wUHJvcGFnYXRpb24oKQogICAgaWYgKGNhcmdhbmRvKSByZXR1cm4KICAgIHNldENhcmdhbmRvKHRydWUpCiAgICBzZXRMaW5rTWFudWFsKG51bGwpCgogICAgdHJ5IHsKICAgICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCkKICAgICAgaWYgKCF1c2VyKSB7IHNldENhcmdhbmRvKGZhbHNlKTsgcmV0dXJuIH0KCiAgICAgIGNvbnN0IGFob3JhID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpCgogICAgICAvLyBTZSBidXNjYSB1biBsaW5rIHF1ZSBzaWdhIHZpZ2VudGUgYW50ZXMgZGUgY3JlYXIgb3Ryby4gQ3JlYXIgdW5vCiAgICAgIC8vIGVuIGNhZGEgdG9xdWUgbGxlbmEgbGEgdGFibGEgZGUgbGlua3MgcXVlIG5hZGllIHVzYS4KICAgICAgY29uc3QgeyBkYXRhOiBleGlzdGVudGUgfSA9IGF3YWl0IHN1cGFiYXNlCiAgICAgICAgLmZyb20oJ2xpbmtzX3ZldGVyaW5hcmlvJykKICAgICAgICAuc2VsZWN0KCd0b2tlbiwgZXhwaXJhX2VuJykKICAgICAgICAuZXEoJ21hc2NvdGFfaWQnLCBtYXNjb3RhSWQpCiAgICAgICAgLmVxKCdhY3Rpdm8nLCB0cnVlKQogICAgICAgIC5ndCgnZXhwaXJhX2VuJywgYWhvcmEpCiAgICAgICAgLm9yZGVyKCdleHBpcmFfZW4nLCB7IGFzY2VuZGluZzogZmFsc2UgfSkKICAgICAgICAubGltaXQoMSkKICAgICAgICAubWF5YmVTaW5nbGUoKQoKICAgICAgbGV0IHRva2VuID0gZXhpc3RlbnRlPy50b2tlbiBhcyBzdHJpbmcgfCB1bmRlZmluZWQKCiAgICAgIGlmICghdG9rZW4pIHsKICAgICAgICBjb25zdCBudWV2b1Rva2VuID0gY3J5cHRvLnJhbmRvbVVVSUQoKQogICAgICAgIGNvbnN0IGV4cGlyYSA9IG5ldyBEYXRlKCkKICAgICAgICBleHBpcmEuc2V0RGF0ZShleHBpcmEuZ2V0RGF0ZSgpICsgNykKICAgICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdsaW5rc192ZXRlcmluYXJpbycpLmluc2VydCh7CiAgICAgICAgICBtYXNjb3RhX2lkOiBtYXNjb3RhSWQsCiAgICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLAogICAgICAgICAgdG9rZW46IG51ZXZvVG9rZW4sCiAgICAgICAgICBhY3Rpdm86IHRydWUsCiAgICAgICAgICBleHBpcmFfZW46IGV4cGlyYS50b0lTT1N0cmluZygpLAogICAgICAgIH0pCiAgICAgICAgaWYgKGVycm9yKSB7IHNldENhcmdhbmRvKGZhbHNlKTsgcmV0dXJuIH0KICAgICAgICB0b2tlbiA9IG51ZXZvVG9rZW4KICAgICAgfQoKICAgICAgY29uc3QgdXJsID0gYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0vdmV0LyR7dG9rZW59YAoKICAgICAgdHJ5IHsKICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh1cmwpCiAgICAgICAgc2V0Q29waWFkbyh0cnVlKQogICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0Q29waWFkbyhmYWxzZSksIDI1MDApCiAgICAgIH0gY2F0Y2ggewogICAgICAgIC8vIEFsZ3Vub3MgbmF2ZWdhZG9yZXMgbm8gcGVybWl0ZW4gY29waWFyLiBTZSBtdWVzdHJhIGVsIGxpbmsKICAgICAgICAvLyBwYXJhIGNvcGlhcmxvIGEgbWFubyBlbiB2ZXogZGUgbm8gaGFjZXIgbmFkYS4KICAgICAgICBzZXRMaW5rTWFudWFsKHVybCkKICAgICAgfQogICAgfSBmaW5hbGx5IHsKICAgICAgc2V0Q2FyZ2FuZG8oZmFsc2UpCiAgICB9CiAgfQoKICByZXR1cm4gKAogICAgPD4KICAgICAgPGJ1dHRvbgogICAgICAgIG9uQ2xpY2s9e2dlbmVyYXJZQ29waWFyfQogICAgICAgIGRpc2FibGVkPXtjYXJnYW5kb30KICAgICAgICBjbGFzc05hbWU9ImZsZXgtMSBiZy1bI0ZGRkNGOF0gYm9yZGVyIGJvcmRlci1bI0VFRTJENF0gcm91bmRlZC0yeGwgcHktMyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMS41IGRpc2FibGVkOm9wYWNpdHktNjAiCiAgICAgID4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtc20gZm9udC1ib2xkIHRleHQtWyM4QzU3MkZdIj4KICAgICAgICAgIHtjYXJnYW5kbyA/ICdHZW5lcmFuZG8uLi4nIDogY29waWFkbyA/ICfinJMgTGluayBjb3BpYWRvJyA6ICdMaW5rIFZldCd9CiAgICAgICAgPC9zcGFuPgogICAgICAgIHshY2FyZ2FuZG8gJiYgIWNvcGlhZG8gJiYgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIj7wn5SXPC9zcGFuPn0KICAgICAgPC9idXR0b24+CgogICAgICB7bGlua01hbnVhbCAmJiAoCiAgICAgICAgPGRpdgogICAgICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC0wIHotWzYwXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweC04IgogICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogJ3JnYmEoNjEsNDMsMzEsMC40NSknIH19CiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRMaW5rTWFudWFsKG51bGwpfQogICAgICAgID4KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJiZy1bI0ZGRkNGOF0gcm91bmRlZC0yeGwgdy1mdWxsIG1heC13LXhzIHAtNSIgb25DbGljaz17ZSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpfT4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWJvbGQgdGV4dC1zbSB0ZXh0LVsjM0QyQjFGXSBtYi0xIj5MaW5rIHBhcmEgdHUgdmV0ZXJpbmFyaW88L3A+CiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC14cyB0ZXh0LVsjOEE3NTYwXSBtYi0zIj5Dw7NwaWFsbyB5IGNvbXDDoXJ0ZWxvLiBEdXJhIDcgZMOtYXMuPC9wPgogICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzExcHhdIHRleHQtWyMzRDJCMUZdIGJnLVsjRkJFQUQ5XSByb3VuZGVkLXhsIHAtMyBicmVhay1hbGwgc2VsZWN0LWFsbCI+CiAgICAgICAgICAgICAge2xpbmtNYW51YWx9CiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldExpbmtNYW51YWwobnVsbCl9CiAgICAgICAgICAgICAgY2xhc3NOYW1lPSJ3LWZ1bGwgbXQtMyBweS0yLjUgcm91bmRlZC14bCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzhBNzU2MF0gYmctWyNGMEUyQ0VdIgogICAgICAgICAgICA+CiAgICAgICAgICAgICAgQ2VycmFyCiAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICl9CiAgICA8Lz4KICApCn0K';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoComp = path.join(process.cwd(), RUTA_COMP);
const destinoDash = path.join(process.cwd(), RUTA_DASH);

if (fs.existsSync(destinoComp)) {
  abortar('ya existe ' + RUTA_COMP + '. No lo sobrescribo por si tiene cambios tuyos.');
}
if (!fs.existsSync(destinoDash)) {
  abortar('no se encontro ' + RUTA_DASH + '. Corre el script desde la raiz del proyecto.');
}

let dash = fs.readFileSync(destinoDash, 'utf8');

if (dash.includes('BotonLinkVet')) {
  abortar('el dashboard ya usa el boton nuevo. Parece que este script ya se corrio.');
}

// --- 1. El boton de arriba
const VIEJO_ARRIBA = '        <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />';
const NUEVO_ARRIBA = '        <BotonLinkVet mascotaId={m.id} mascotaNombre={m.nombre} />';

const nArriba = contar(dash, VIEJO_ARRIBA);
console.log('  ' + (nArriba >= 1 ? 'OK ' : 'X  ') + 'boton junto a Ver Perfil -> ' + nArriba + ' coincidencia(s)');
if (nArriba === 0) {
  abortar('no encontre el LineaVet junto al boton de perfil. Corre primero el 401.');
}

// Solo se reemplaza la PRIMERA aparicion: la de arriba. Si hay una
// segunda mas abajo, se quita despues.
const posArriba = dash.indexOf(VIEJO_ARRIBA);
dash = dash.slice(0, posArriba) + NUEVO_ARRIBA + dash.slice(posArriba + VIEJO_ARRIBA.length);

// --- 2. El duplicado de abajo, si sigue
const restantes = contar(dash, '<LineaVet');
console.log('  --  LineaVet restantes: ' + restantes);

if (restantes > 0) {
  const pos = dash.indexOf('<LineaVet');
  const inicioLinea = dash.lastIndexOf('\n', pos) + 1;
  const finEtiqueta = dash.indexOf('/>', pos);
  if (finEtiqueta === -1) {
    abortar('no encontre el cierre del LineaVet duplicado.');
  }
  const bloque = dash.slice(inicioLinea, finEtiqueta + 2);

  if (bloque.length > 200) {
    abortar('el bloque a quitar es demasiado largo (' + bloque.length + '). No se escribio nada.');
  }
  if (!bloque.includes('<LineaVet')) {
    abortar('el bloque delimitado no contiene LineaVet. No se escribio nada.');
  }
  console.log('  OK  duplicado delimitado (' + bloque.length + ' caracteres)');

  dash = dash.slice(0, inicioLinea)
    + '      {/* El link del veterinario vive arriba, junto a Ver Perfil. */}\n'
    + dash.slice(finEtiqueta + 2);
}

// --- Verificaciones, acotadas a lo que este script toca
if (contar(dash, '<BotonLinkVet') !== 1) {
  abortar('el boton nuevo no quedo exactamente una vez.');
}
if (dash.includes('<LineaVet')) {
  abortar('quedo algun LineaVet sin quitar.');
}

// --- Import
const ANCLA = "'use client'";
if (contar(dash, ANCLA) !== 1) {
  abortar('no encontre donde poner el import.');
}
dash = dash.replace(ANCLA, ANCLA + "\nimport BotonLinkVet from '@/components/BotonLinkVet'");

const comp = Buffer.from(BOTON_B64, 'base64').toString('utf8');
for (const r of ["'use client'", 'export default function BotonLinkVet', 'clipboard.writeText']) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMP);
fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('OK: ' + RUTA_DASH);

console.log('');
console.log('AVISO: si el import de LineaVet quedo sin uso, no rompe el build.');
console.log('Si Vercel te marca algo, avisale a Claude.');
console.log('');
console.log('Listo. Dos botones iguales, y el del vet copia el link.');
