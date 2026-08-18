const fs = require('fs');
const path = require('path');

// ============================================================
// generar_428_boton_link_vet_bien.js
// ============================================================
// EL 404 NO ERA SOLO LA URL.
//
// El script 427 corrigio /vet/token por /vet?token=, y estaba bien —
// pero el link seguia fallando. La causa de fondo era otra:
//
//   MI BOTON GENERABA EL TOKEN EN EL NAVEGADOR
//   const nuevoToken = crypto.randomUUID()
//   .insert({ ..., token: nuevoToken, activo: true, expira_en: ... })
//
//   EL COMPONENTE QUE SI FUNCIONA no genera nada:
//   .insert({ mascota_id, user_id }).select('token')
//
// La base tiene su propio valor por defecto para el token. Al escribir
// uno inventado desde el navegador, se guardaba un token que el RPC
// "obtener_datos_veterinario" no reconoce — de ahi el 404. Ademas mi
// version filtraba por columnas (activo, expira_en) que puede que ni
// existan con esos nombres.
//
// ESTE SCRIPT reemplaza el componente entero por uno que hace
// EXACTAMENTE lo mismo que components/LinkVet.tsx, que lleva meses
// funcionando. Deje de inventar y copie lo que ya servia.
//
// Y ahora, si algo falla, muestra el mensaje real de Postgres en vez de
// dejar al usuario con un link roto sin saberlo.
//
// REQUISITO: script 402 desplegado (el que creo el componente).
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/BotonLinkVet.tsx';
const BOTON_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0AvdXRpbHMvc3VwYWJhc2UvY2xpZW50JwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIEJPVMOTTiBMSU5LIFZFVAovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gR2VuZXJhIGVsIGxpbmsgeSBsbyBjb3BpYSBhbCBwb3J0YXBhcGVsZXMuCi8vCi8vIEhBQ0UgRVhBQ1RBTUVOVEUgTE8gTUlTTU8gUVVFIGNvbXBvbmVudHMvTGlua1ZldC50c3gsIHF1ZSBsbGV2YSBtZXNlcwovLyBmdW5jaW9uYW5kby4gTGEgdmVyc2nDs24gYW50ZXJpb3IgZGUgZXN0ZSBib3TDs24gaW52ZW50YWJhIHN1IHByb3BpYQovLyBmb3JtYSBkZSBjcmVhciBlbCB0b2tlbiDigJRsbyBnZW5lcmFiYSBlbiBlbCBuYXZlZ2Fkb3IgY29uCi8vIGNyeXB0by5yYW5kb21VVUlEKCkgeSBsbyBlc2NyaWLDrWEgYSBtYW5v4oCUIHkgZWwgcmVzdWx0YWRvIGVyYW4gbGlua3MKLy8gcXVlIGRhYmFuIDQwNDogZXNlIHRva2VuIG5vIGNvaW5jaWTDrWEgY29uIGVsIHF1ZSBsYSBiYXNlIGdlbmVyYSBzb2xhLgovLwovLyBBY8OhIHNlIGluc2VydGFuIHNvbG8gbWFzY290YV9pZCB5IHVzZXJfaWQsIHkgbGEgYmFzZSByZWxsZW5hIGVsIHRva2VuCi8vIHkgc3UgdmVuY2ltaWVudG8gY29uIHN1cyB2YWxvcmVzIHBvciBkZWZlY3RvLiBFcyBsYSDDum5pY2EgZm9ybWEgZGUKLy8gcXVlIGVsIHRva2VuIHF1ZSBzZSBndWFyZGEgc2VhIGVsIG1pc21vIHF1ZSBlbCBSUEMgdmEgYSByZWNvbm9jZXIuCi8vCi8vIFNpIGVsIG5hdmVnYWRvciBubyBkZWphIGNvcGlhciwgc2UgbXVlc3RyYSBlbCBsaW5rIHBhcmEgY29waWFybG8gYQovLyBtYW5vIGVuIHZleiBkZSBmYWxsYXIgZW4gc2lsZW5jaW8uCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCb3RvbkxpbmtWZXQoewogIG1hc2NvdGFJZCwKICBtYXNjb3RhTm9tYnJlLAp9OiB7CiAgbWFzY290YUlkOiBzdHJpbmcKICBtYXNjb3RhTm9tYnJlOiBzdHJpbmcKfSkgewogIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KCkKICBjb25zdCBbY2FyZ2FuZG8sIHNldENhcmdhbmRvXSA9IHVzZVN0YXRlKGZhbHNlKQogIGNvbnN0IFtjb3BpYWRvLCBzZXRDb3BpYWRvXSA9IHVzZVN0YXRlKGZhbHNlKQogIGNvbnN0IFtsaW5rTWFudWFsLCBzZXRMaW5rTWFudWFsXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpCiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZSgnJykKCiAgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhcllDb3BpYXIoZTogUmVhY3QuTW91c2VFdmVudCkgewogICAgZS5wcmV2ZW50RGVmYXVsdCgpCiAgICBlLnN0b3BQcm9wYWdhdGlvbigpCiAgICBpZiAoY2FyZ2FuZG8pIHJldHVybgogICAgc2V0Q2FyZ2FuZG8odHJ1ZSkKICAgIHNldEVycm9yKCcnKQogICAgc2V0TGlua01hbnVhbChudWxsKQoKICAgIHRyeSB7CiAgICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpCiAgICAgIGlmICghdXNlcikgewogICAgICAgIHNldEVycm9yKCdObyBzZSBwdWRvIHZlcmlmaWNhciB0dSBzZXNpw7NuLicpCiAgICAgICAgcmV0dXJuCiAgICAgIH0KCiAgICAgIC8vIE1pc21vIGluc2VydCBxdWUgTGlua1ZldDogc29sbyBlc3RvcyBkb3MgY2FtcG9zLiBMYSBiYXNlIGdlbmVyYQogICAgICAvLyBlbCB0b2tlbiB5IHN1IHZlbmNpbWllbnRvLiBFc2NyaWJpciBlbCB0b2tlbiBhIG1hbm8gZGVzZGUgYWPDoQogICAgICAvLyBlcyBsbyBxdWUgcHJvZHVjw61hIGxvcyBsaW5rcyByb3Rvcy4KICAgICAgY29uc3QgeyBkYXRhLCBlcnJvcjogZXJySW5zZXJ0IH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAgIC5mcm9tKCdsaW5rc192ZXRlcmluYXJpbycpCiAgICAgICAgLmluc2VydCh7IG1hc2NvdGFfaWQ6IG1hc2NvdGFJZCwgdXNlcl9pZDogdXNlci5pZCB9KQogICAgICAgIC5zZWxlY3QoJ3Rva2VuJykKICAgICAgICAuc2luZ2xlKCkKCiAgICAgIGlmIChlcnJJbnNlcnQgfHwgIWRhdGEpIHsKICAgICAgICAvLyBFbCBtZW5zYWplIHJlYWwgZGUgUG9zdGdyZXMsIG5vIHVuYSBmcmFzZSBnZW7DqXJpY2E6IHNpIGFsZ28KICAgICAgICAvLyBmYWxsYSwgaGF5IHF1ZSBwb2RlciBzYWJlciBxdcOpLgogICAgICAgIHNldEVycm9yKCdObyBzZSBwdWRvIGdlbmVyYXIgZWwgbGluazogJyArIChlcnJJbnNlcnQ/Lm1lc3NhZ2UgfHwgJ2Vycm9yIGRlc2Nvbm9jaWRvJykpCiAgICAgICAgcmV0dXJuCiAgICAgIH0KCiAgICAgIGNvbnN0IHVybCA9IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59L3ZldD90b2tlbj0ke2RhdGEudG9rZW59YAoKICAgICAgdHJ5IHsKICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh1cmwpCiAgICAgICAgc2V0Q29waWFkbyh0cnVlKQogICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0Q29waWFkbyhmYWxzZSksIDI1MDApCiAgICAgIH0gY2F0Y2ggewogICAgICAgIC8vIEFsZ3Vub3MgbmF2ZWdhZG9yZXMgbm8gcGVybWl0ZW4gY29waWFyLiBTZSBtdWVzdHJhIGVsIGxpbmsKICAgICAgICAvLyBwYXJhIGNvcGlhcmxvIGEgbWFubyBlbiB2ZXogZGUgbm8gaGFjZXIgbmFkYS4KICAgICAgICBzZXRMaW5rTWFudWFsKHVybCkKICAgICAgfQogICAgfSBmaW5hbGx5IHsKICAgICAgc2V0Q2FyZ2FuZG8oZmFsc2UpCiAgICB9CiAgfQoKICByZXR1cm4gKAogICAgPD4KICAgICAgPGJ1dHRvbgogICAgICAgIG9uQ2xpY2s9e2dlbmVyYXJZQ29waWFyfQogICAgICAgIGRpc2FibGVkPXtjYXJnYW5kb30KICAgICAgICBjbGFzc05hbWU9ImZsZXgtMSBiZy1bI0ZGRkNGOF0gYm9yZGVyIGJvcmRlci1bI0VFRTJENF0gcm91bmRlZC0yeGwgcHktMyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMS41IGRpc2FibGVkOm9wYWNpdHktNjAiCiAgICAgID4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtc20gZm9udC1ib2xkIHRleHQtWyM4QzU3MkZdIj4KICAgICAgICAgIHtjYXJnYW5kbyA/ICdHZW5lcmFuZG8uLi4nIDogY29waWFkbyA/ICfinJMgTGluayBjb3BpYWRvJyA6ICdMaW5rIFZldCd9CiAgICAgICAgPC9zcGFuPgogICAgICAgIHshY2FyZ2FuZG8gJiYgIWNvcGlhZG8gJiYgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIj7wn5SXPC9zcGFuPn0KICAgICAgPC9idXR0b24+CgogICAgICB7KGxpbmtNYW51YWwgfHwgZXJyb3IpICYmICgKICAgICAgICA8ZGl2CiAgICAgICAgICBjbGFzc05hbWU9ImZpeGVkIGluc2V0LTAgei1bNjBdIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHB4LTgiCiAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAncmdiYSg2MSw0MywzMSwwLjQ1KScgfX0KICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHsgc2V0TGlua01hbnVhbChudWxsKTsgc2V0RXJyb3IoJycpIH19CiAgICAgICAgPgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImJnLVsjRkZGQ0Y4XSByb3VuZGVkLTJ4bCB3LWZ1bGwgbWF4LXcteHMgcC01IiBvbkNsaWNrPXtlID0+IGUuc3RvcFByb3BhZ2F0aW9uKCl9PgogICAgICAgICAgICB7ZXJyb3IgPyAoCiAgICAgICAgICAgICAgPD4KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0iZm9udC1ib2xkIHRleHQtc20gdGV4dC1bI0UwNTI1Ml0gbWItMiI+Tm8gc2UgcHVkbyBnZW5lcmFyPC9wPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIGJyZWFrLXdvcmRzIj57ZXJyb3J9PC9wPgogICAgICAgICAgICAgIDwvPgogICAgICAgICAgICApIDogKAogICAgICAgICAgICAgIDw+CiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9ImZvbnQtYm9sZCB0ZXh0LXNtIHRleHQtWyMzRDJCMUZdIG1iLTEiPkxpbmsgcGFyYSB0dSB2ZXRlcmluYXJpbzwvcD4KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC14cyB0ZXh0LVsjOEE3NTYwXSBtYi0zIj5Dw7NwaWFsbyB5IGNvbXDDoXJ0ZWxvLjwvcD4KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0iY29waWFibGUgdGV4dC1bMTFweF0gdGV4dC1bIzNEMkIxRl0gYmctWyNGQkVBRDldIHJvdW5kZWQteGwgcC0zIGJyZWFrLWFsbCBzZWxlY3QtYWxsIj4KICAgICAgICAgICAgICAgICAge2xpbmtNYW51YWx9CiAgICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgICAgPC8+CiAgICAgICAgICAgICl9CiAgICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IHNldExpbmtNYW51YWwobnVsbCk7IHNldEVycm9yKCcnKSB9fQogICAgICAgICAgICAgIGNsYXNzTmFtZT0idy1mdWxsIG10LTMgcHktMi41IHJvdW5kZWQteGwgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtWyM4QTc1NjBdIGJnLVsjRjBFMkNFXSIKICAgICAgICAgICAgPgogICAgICAgICAgICAgIENlcnJhcgogICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICApfQogICAgPC8+CiAgKQp9Cg==';

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
  abortar('no se encontro ' + RUTA + '. Corre primero el script 402.');
}

const actual = fs.readFileSync(destino, 'utf8');

if (!actual.includes('BotonLinkVet')) {
  abortar('el archivo no es el boton que esperaba.');
}
// La LLAMADA, no la mencion: el componente nuevo nombra
// crypto.randomUUID() en un comentario para explicar el error.
if (!actual.includes('= crypto.randomUUID()')) {
  abortar('el boton ya no genera el token a mano. Parece que este script ya se corrio.');
}
console.log('  OK  el boton actual genera el token a mano (esa era la causa)');

const nuevo = Buffer.from(BOTON_B64, 'base64').toString('utf8');

// El contenido nuevo NO puede generar el token, y SI debe insertar como
// lo hace LinkVet.
// Se busca la LLAMADA, no la mencion: el comentario del componente
// nombra crypto.randomUUID() para explicar cual era el error, y una
// busqueda ingenua lo confundiria con codigo.
if (nuevo.includes('= crypto.randomUUID()')) {
  abortar('el contenido nuevo todavia genera el token. Script corrupto.');
}
for (const r of ["'use client'", 'export default function BotonLinkVet', "insert({ mascota_id: mascotaId, user_id: user.id })", '/vet?token=']) {
  if (!nuevo.includes(r)) {
    abortar('el contenido nuevo no incluye [' + r + ']. Script corrupto, no se escribio nada.');
  }
}
console.log('  OK  el contenido nuevo deja que la base genere el token');

fs.writeFileSync(destino, nuevo, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('IMPORTANTE: los links generados antes desde el dashboard NO se');
console.log('arreglan solos — su token nunca fue valido. Hay que generar uno');
console.log('nuevo y reenviarlo.');
console.log('');
console.log('Listo. El boton ahora genera el link igual que el del Perfil.');
