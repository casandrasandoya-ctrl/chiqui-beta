const fs = require('fs');
const path = require('path');

// ============================================================
// generar_367_selector_circulos.js
// ============================================================
// Reescribe components/SelectorMascota.tsx: el desplegable pasa a ser
// una fila de circulos, como en el diseño que pidio Casandra.
//
// POR QUE
// Con el desplegable habia que tocar para ver quien mas habia, y
// cambiar de mascota costaba dos toques. Ahora estan todas a la vista
// y cambiar cuesta uno.
//
// La activa lleva un aro verde; las demas quedan en blanco y negro.
// Esa combinacion se entiende sin leer nada. El gris no es decorativo:
// dice "esta no es la que estas mirando".
//
// El nombre y los datos salen de aqui porque ya viven en la tarjeta de
// abajo, mas grandes. Repetirlos era ruido.
//
// El boton + abre "Agrandar familia" con los dos caminos posibles:
// crear una mascota propia o unirse con codigo. Antes esas opciones
// estaban escondidas al final del desplegable, donde casi nadie
// llegaba — es el mismo problema de descubribilidad que ya vimos con
// el link del veterinario.
//
// La FIRMA DEL COMPONENTE NO CAMBIA (mascotas, mascotaActiva,
// onCambiar), asi que las seis paginas que lo usan siguen funcionando
// sin tocarlas.
//
// ANTES de escribir comprueba que exista chiqui_familia.png.
// ============================================================

const RUTA = 'components/SelectorMascota.tsx';
const RUTA_IMG = 'public/chiqui/chiqui_familia.png';

const SELECTOR_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAnbmV4dC9uYXZpZ2F0aW9uJwppbXBvcnQgeyBndWFyZGFyTWFzY290YUFjdGl2YUlkIH0gZnJvbSAnQC91dGlscy9tYXNjb3RhQWN0aXZhJwppbXBvcnQgeyBpY29ub1BvckVzcGVjaWUgfSBmcm9tICdAL3V0aWxzL2ljb25vRXNwZWNpZScKaW1wb3J0IFVuaXJzZUNvbW9Db3R1dG9yIGZyb20gJ0AvY29tcG9uZW50cy9Vbmlyc2VDb21vQ290dXRvcicKCmludGVyZmFjZSBNYXNjb3RhIHsKICBpZDogc3RyaW5nCiAgbm9tYnJlOiBzdHJpbmcKICBlc3BlY2llOiBzdHJpbmcKICByYXphPzogc3RyaW5nCiAgZm90b191cmw/OiBzdHJpbmcKfQoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIFNFTEVDVE9SIERFIE1BU0NPVEEg4oCUIGZpbGEgZGUgY8OtcmN1bG9zCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBBbnRlcyBlcmEgdW4gZGVzcGxlZ2FibGU6IGhhYsOtYSBxdWUgdG9jYXIgcGFyYSB2ZXIgcXVpw6luIG3DoXMgaGFiw61hLCB5Ci8vIGNhbWJpYXIgZGUgbWFzY290YSBjb3N0YWJhIGRvcyB0b3F1ZXMuIEFob3JhIGVzdMOhbiB0b2RhcyBhIGxhIHZpc3RhIHkKLy8gY2FtYmlhciBjdWVzdGEgdW5vLgovLwovLyBMYSBhY3RpdmEgbGxldmEgdW4gYXJvIHZlcmRlOyBsYXMgZGVtw6FzIHF1ZWRhbiBlbiBibGFuY28geSBuZWdyby4gRXNhCi8vIGNvbWJpbmFjacOzbiBzZSBlbnRpZW5kZSBzaW4gbGVlciBuYWRhLCBpbmNsdXNvIHBhcmEgcXVpZW4gbnVuY2EgdmlvCi8vIGxhIGFwcC4gRWwgZ3JpcyBubyBlcyBzb2xvIGRlY29yYXRpdm86IGRpY2UgImVzdGEgbm8gZXMgbGEgcXVlIGVzdMOhcwovLyBtaXJhbmRvIiwgcXVlIGVzIGp1c3RvIGxvIHF1ZSBsYSBnZW50ZSBuZWNlc2l0YSBzYWJlci4KLy8KLy8gRWwgbm9tYnJlIHkgbG9zIGRhdG9zIHlhIG5vIHZhbiBhcXXDrTogdml2ZW4gZW4gbGEgdGFyamV0YSBkZSBhYmFqbywKLy8gZG9uZGUgc2UgdmVuIG3DoXMgZ3JhbmRlcy4gUmVwZXRpcmxvcyBlcmEgcnVpZG8uCi8vCi8vIEVsIGJvdMOzbiArIGFicmUgIkFncmFuZGFyIGZhbWlsaWEiLCBjb24gbG9zIGRvcyBjYW1pbm9zIHBvc2libGVzOgovLyBjcmVhciB1bmEgbWFzY290YSBwcm9waWEgbyB1bmlyc2UgYSB1bmEgY29uIGPDs2RpZ28uIEFudGVzIGVzYXMgZG9zCi8vIG9wY2lvbmVzIGVzdGFiYW4gZXNjb25kaWRhcyBhbCBmaW5hbCBkZWwgZGVzcGxlZ2FibGUuCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTZWxlY3Rvck1hc2NvdGEoewogIG1hc2NvdGFzLAogIG1hc2NvdGFBY3RpdmEsCiAgb25DYW1iaWFyLAp9OiB7CiAgbWFzY290YXM6IE1hc2NvdGFbXQogIG1hc2NvdGFBY3RpdmE6IE1hc2NvdGEKICBvbkNhbWJpYXI6IChtYXNjb3RhOiBNYXNjb3RhKSA9PiB2b2lkCn0pIHsKICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKQogIGNvbnN0IFttb2RhbEZhbWlsaWEsIHNldE1vZGFsRmFtaWxpYV0gPSB1c2VTdGF0ZShmYWxzZSkKCiAgLy8gQmxvcXVlbyBkZWwgc2Nyb2xsIGRlIGZvbmRvIG1pZW50cmFzIGVsIG1vZGFsIGVzdMOhIGFiaWVydG8sIGlndWFsCiAgLy8gcXVlIGVsIHJlc3RvIGRlIGxvcyBtb2RhbGVzIGRlIGxhIGFwcC4KICB1c2VFZmZlY3QoKCkgPT4gewogICAgaWYgKG1vZGFsRmFtaWxpYSkgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nCiAgICBlbHNlIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnJwogICAgcmV0dXJuICgpID0+IHsgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnIH0KICB9LCBbbW9kYWxGYW1pbGlhXSkKCiAgZnVuY3Rpb24gZWxlZ2lyKG06IE1hc2NvdGEpIHsKICAgIGlmIChtLmlkID09PSBtYXNjb3RhQWN0aXZhLmlkKSByZXR1cm4KICAgIGd1YXJkYXJNYXNjb3RhQWN0aXZhSWQobS5pZCkKICAgIG9uQ2FtYmlhcihtKQogIH0KCiAgY29uc3QgaWNvbm8gPSBpY29ub1BvckVzcGVjaWUKCiAgcmV0dXJuICgKICAgIDxkaXYgY2xhc3NOYW1lPSJweC00IHBiLTMiPgogICAgICB7LyogU2Nyb2xsIGhvcml6b250YWwgcGFyYSBjdWFuZG8gaGF5IHZhcmlhcyBtYXNjb3Rhcy4gTGEgYmFycmEgc2UKICAgICAgICAgIG9jdWx0YSBwb3IgQ1NTIGdsb2JhbCwgYXPDrSBxdWUgc2UgZGVzbGl6YSBzaW4gdmVyc2UuICovfQogICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgb3ZlcmZsb3cteC1hdXRvIj4KICAgICAgICB7bWFzY290YXMubWFwKG0gPT4gewogICAgICAgICAgY29uc3QgYWN0aXZhID0gbS5pZCA9PT0gbWFzY290YUFjdGl2YS5pZAogICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgIGtleT17bS5pZH0KICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBlbGVnaXIobSl9CiAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YENhbWJpYXIgYSAke20ubm9tYnJlfWB9CiAgICAgICAgICAgICAgY2xhc3NOYW1lPSJmbGV4LXNocmluay0wIHJvdW5kZWQtZnVsbCIKICAgICAgICAgICAgPgogICAgICAgICAgICAgIDxkaXYKICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0idy1bNjhweF0gaC1bNjhweF0gcm91bmRlZC1mdWxsIG92ZXJmbG93LWhpZGRlbiBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LTN4bCIKICAgICAgICAgICAgICAgIHN0eWxlPXthY3RpdmEKICAgICAgICAgICAgICAgICAgPyB7IGJvcmRlcjogJzNweCBzb2xpZCAjNENBRjdEJywgYmFja2dyb3VuZDogJyNGQkVBRDknIH0KICAgICAgICAgICAgICAgICAgOiB7IGJvcmRlcjogJzNweCBzb2xpZCB0cmFuc3BhcmVudCcsIGJhY2tncm91bmQ6ICcjRkJFQUQ5JywgZmlsdGVyOiAnZ3JheXNjYWxlKDEpJywgb3BhY2l0eTogMC43IH19CiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAge20uZm90b191cmwgPyAoCiAgICAgICAgICAgICAgICAgIDxpbWcgc3JjPXttLmZvdG9fdXJsfSBhbHQ9e20ubm9tYnJlfSBjbGFzc05hbWU9InctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIiAvPgogICAgICAgICAgICAgICAgKSA6ICgKICAgICAgICAgICAgICAgICAgaWNvbm8obS5lc3BlY2llKQogICAgICAgICAgICAgICAgKX0KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICApCiAgICAgICAgfSl9CgogICAgICAgIDxidXR0b24KICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE1vZGFsRmFtaWxpYSh0cnVlKX0KICAgICAgICAgIGFyaWEtbGFiZWw9IkFncmFuZGFyIGZhbWlsaWEiCiAgICAgICAgICBjbGFzc05hbWU9ImZsZXgtc2hyaW5rLTAgdy1bNjhweF0gaC1bNjhweF0gcm91bmRlZC1mdWxsIGJnLVsjRkZCRDU5XSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXdoaXRlIHRleHQtM3hsIGZvbnQtYm9sZCIKICAgICAgICA+CiAgICAgICAgICArCiAgICAgICAgPC9idXR0b24+CiAgICAgIDwvZGl2PgoKICAgICAge21vZGFsRmFtaWxpYSAmJiAoCiAgICAgICAgPGRpdgogICAgICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC0wIHotWzYwXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweC02IgogICAgICAgICAgc3R5bGU9e3sgYmFja2dyb3VuZDogJ3JnYmEoNjEsNDMsMzEsMC41KScgfX0KICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE1vZGFsRmFtaWxpYShmYWxzZSl9CiAgICAgICAgPgogICAgICAgICAgPGRpdgogICAgICAgICAgICBjbGFzc05hbWU9ImJnLVsjOEM1NzJGXSByb3VuZGVkLTN4bCB3LWZ1bGwgbWF4LXcteHMgcC00IHJlbGF0aXZlIG92ZXJmbG93LXktYXV0byIKICAgICAgICAgICAgc3R5bGU9e3sgbWF4SGVpZ2h0OiAnY2FsYygxMDB2aCAtIDgwcHgpJyB9fQogICAgICAgICAgICBvbkNsaWNrPXtlID0+IGUuc3RvcFByb3BhZ2F0aW9uKCl9CiAgICAgICAgICA+CiAgICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRNb2RhbEZhbWlsaWEoZmFsc2UpfQogICAgICAgICAgICAgIGFyaWEtbGFiZWw9IkNlcnJhciIKICAgICAgICAgICAgICBjbGFzc05hbWU9ImFic29sdXRlIC10b3AtMiAtcmlnaHQtMiB3LTggaC04IHJvdW5kZWQtZnVsbCBiZy1bIzNEMkIxRl0gdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LWJhc2UgZm9udC1ib2xkIgogICAgICAgICAgICA+CiAgICAgICAgICAgICAg4pyVCiAgICAgICAgICAgIDwvYnV0dG9uPgoKICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yLjUgbWItMyBwci02Ij4KICAgICAgICAgICAgICA8aW1nIHNyYz0iL2NoaXF1aS9jaGlxdWlfZmFtaWxpYS5wbmciIGFsdD0iIiBjbGFzc05hbWU9InctMTIgaC0xMiBvYmplY3QtY29udGFpbiBmbGV4LXNocmluay0wIiAvPgogICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0iZm9udC1oZWFkaW5nIHRleHQtbGcgZm9udC1leHRyYWJvbGQgdGV4dC1bI0ZGQkQ1OV0iPkFncmFuZGFyIGZhbWlsaWE8L3A+CiAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHsgc2V0TW9kYWxGYW1pbGlhKGZhbHNlKTsgcm91dGVyLnB1c2goJy9tYXNjb3RhL251ZXZhJykgfX0KICAgICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCBiZy1bI0ZGRkNGOF0gcm91bmRlZC14bCBweC0zIHB5LTMgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSB0ZXh0LWxlZnQgbWItMiIKICAgICAgICAgICAgPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idy03IGgtNyByb3VuZGVkLWZ1bGwgYmctWyNGRkJENTldIHRleHQtd2hpdGUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1iYXNlIGZvbnQtYm9sZCBmbGV4LXNocmluay0wIj4rPC9zcGFuPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtWyMzRDJCMUZdIj5BZ3JlZ2FyIG90cmEgbWFzY290YTwvc3Bhbj4KICAgICAgICAgICAgPC9idXR0b24+CgogICAgICAgICAgICB7LyogRWwgY29tcG9uZW50ZSBkZSBjw7NkaWdvIHlhIHRyYWUgc3UgcHJvcGlvIGJvdMOzbiB5IHN1CiAgICAgICAgICAgICAgICBmb3JtdWxhcmlvOiBzZSByZXVzYSB0YWwgY3VhbCBlbiB2ZXogZGUgZHVwbGljYXIgbGEKICAgICAgICAgICAgICAgIGzDs2dpY2EgZGUgdmFsaWRhY2nDs24gZGVsIGPDs2RpZ28uICovfQogICAgICAgICAgICA8VW5pcnNlQ29tb0NvdHV0b3IgLz4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICApfQogICAgPC9kaXY+CiAgKQp9Cg==';

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

if (!fs.existsSync(path.join(process.cwd(), RUTA_IMG))) {
  abortar('no existe ' + RUTA_IMG + '. Confirmame el nombre exacto del archivo en public/chiqui/.');
}
console.log('  OK existe ' + RUTA_IMG);

const actual = fs.readFileSync(destino, 'utf8');
if (actual.includes('Agrandar familia')) {
  abortar('el selector ya tiene el diseño nuevo. Parece que este script ya se corrio.');
}
if (!actual.includes('export default function SelectorMascota')) {
  abortar('el archivo no es el SelectorMascota que esperaba.');
}
console.log('  OK el archivo actual es el selector viejo');

const nuevo = Buffer.from(SELECTOR_B64, 'base64').toString('utf8');

// La firma no puede cambiar: seis paginas dependen de ella.
const REQUERIDOS = [
  'export default function SelectorMascota',
  'mascotas: Mascota[]',
  'mascotaActiva: Mascota',
  'onCambiar: (mascota: Mascota) => void',
  'Agrandar familia',
  "filter: 'grayscale(1)'",
  'UnirseComoCotutor',
];
for (const r of REQUERIDOS) {
  if (!nuevo.includes(r)) {
    abortar('el contenido nuevo no incluye [' + r + ']. Script corrupto, no se escribio nada.');
  }
}
console.log('  OK el contenido nuevo mantiene la misma firma');

fs.writeFileSync(destino, nuevo, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El selector ya es una fila de circulos.');
