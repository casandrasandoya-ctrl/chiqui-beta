const fs = require('fs');
const path = require('path');

// ============================================================
// generar_483_arreglar_modal.js
// ============================================================
// ESTADO REAL, confirmado con la salida de los scripts anteriores:
//
//   registro-diario   YA ESTA BIEN. El script 479 corrio completo: la
//                     racha ya es estricta, el modal ya esta conectado
//                     y el calculo ya usa created_at.
//
//   ModalLogro.tsx    Es lo unico roto. Tiene el error que tumbo el
//                     build —'semana' en la desestructuracion cuando la
//                     interfaz dice 'ultimos7'— y usa imagenes
//                     genericas en vez de los stickers de racha.
//
// ESTE SCRIPT HACE DOS COSAS Y NADA MAS
//   1. Exporta hitoRacha desde Novedades (los 15 niveles ya diseñados).
//   2. Reemplaza ModalLogro.tsx por la version corregida.
//
// No toca el registro diario: ahi no hay nada que arreglar.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_MODAL = 'components/ModalLogro.tsx';
const RUTA_NOV = 'components/Novedades.tsx';
const MODAL_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgaGl0b1JhY2hhIH0gZnJvbSAnQC9jb21wb25lbnRzL05vdmVkYWRlcycKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNT0RBTCBERSBMT0dSTyDigJQgZWwgbW9tZW50byBkZXNwdcOpcyBkZSBndWFyZGFyCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBBcGFyZWNlIGFsIGd1YXJkYXIgZWwgcmVnaXN0cm8gZGVsIGTDrWEuIEVzIGVsIG1vbWVudG8gZW4gcXVlIGxhCi8vIHBlcnNvbmEgWUEgaGl6byBlbCBlc2Z1ZXJ6bzogcmVjb25vY2VybG8gYWjDrSBlcyBsbyBxdWUgaGFjZSBxdWUKLy8gdnVlbHZhIG1hw7FhbmEuCi8vCi8vIEFudGVzIGVzdG8gc29sbyBzZSB2ZcOtYSBlbiBOb3ZlZGFkZXMsIGRvbmRlIGNhc2kgbmFkaWUgZW50cmEuCi8vCi8vIFFVw4kgTVVFU1RSQQovLyBTdSBwcm9waWEgaGlzdG9yaWEsIG5vIGNvbXBhcmFjaW9uZXMgY29uIG90cm9zOiBsYSByYWNoYSwgY3XDoW50b3MKLy8gZMOtYXMgbGxldmEgZXN0ZSBtZXMsIHF1w6kgZMOtYXMgZGUgbGEgc2VtYW5hIHJlZ2lzdHLDsy4gIkxsZXZhcyAxMiBkw61hcwovLyBzZWd1aWRvcyIgbGUgaW1wb3J0YSBtw6FzIGEgbGEgbWF5b3LDrWEgcXVlICJlc3TDoXMgZW4gZWwgMjAlIG3DoXMKLy8gY29uc3RhbnRlIiDigJQgeSBhZGVtw6FzIGVzIHVuIGRhdG8gcXVlIHPDrSB0ZW5lbW9zLgovLwovLyBDb21wYXJhciBjb24gbGEgY29tdW5pZGFkIHJlcXVlcmlyw61hIGNvbnN1bHRhciBkYXRvcyBkZSB0b2RvcyBsb3MKLy8gdXN1YXJpb3MgZGVzZGUgZWwgbmF2ZWdhZG9yIGRlIGNhZGEgdW5vLCBxdWUgbm8gZXMgYWxnbyBxdWUgc2UgcHVlZGEKLy8gaGFjZXIgYmllbiBzaW4gdW5hIHZpc3RhIGFncmVnYWRhIGVuIGVsIHNlcnZpZG9yLgoKaW50ZXJmYWNlIFByb3BzIHsKICBub21icmU6IHN0cmluZwogIHJhY2hhOiBudW1iZXIKICAvLyBMYSBtZWpvciByYWNoYSBoaXN0w7NyaWNhLiBWZXIgY3XDoW50byBsZSBmYWx0YSBwYXJhIHN1cGVyYXJsYSBlcyBtw6FzCiAgLy8gbW90aXZhZG9yIHF1ZSBlbCBuw7ptZXJvIGFjdHVhbCBzb2xvLgogIG1lam9yUmFjaGE6IG51bWJlcgogIGRpYXNEZWxNZXM6IG51bWJlcgogIGRpYXNNZXNQYXNhZG86IG51bWJlcgogIC8vIExvcyDDumx0aW1vcyA3IGTDrWFzIFRFUk1JTkFORE8gSE9ZLCBjb24gc3Ugbm9tYnJlIHJlYWwuIEVtcGV6YXIgZW4KICAvLyBkb21pbmdvIGRlamFiYSBsYSBtYXlvcsOtYSBkZSBsb3MgY2hlY2tzIGZ1ZXJhIGRlIHZpc3RhIGxvcyBsdW5lcy4KICB1bHRpbW9zNzogeyBsZXRyYTogc3RyaW5nOyBoZWNobzogYm9vbGVhbiB9W10KICBlZGl0YW5kbzogYm9vbGVhbgogIG9uQ2VycmFyOiAoKSA9PiB2b2lkCn0KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsTG9ncm8oewogIG5vbWJyZSwgcmFjaGEsIG1lam9yUmFjaGEsIGRpYXNEZWxNZXMsIGRpYXNNZXNQYXNhZG8sIHVsdGltb3M3LCBlZGl0YW5kbywgb25DZXJyYXIsCn06IFByb3BzKSB7CiAgY29uc3QgW2VudHJhbmRvLCBzZXRFbnRyYW5kb10gPSB1c2VTdGF0ZSh0cnVlKQoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgY29uc3QgdCA9IHNldFRpbWVvdXQoKCkgPT4gc2V0RW50cmFuZG8oZmFsc2UpLCA1MCkKICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJwogICAgcmV0dXJuICgpID0+IHsgY2xlYXJUaW1lb3V0KHQpOyBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJycgfQogIH0sIFtdKQoKICAvLyBMYSBpbWFnZW4geSBlbCBtZW5zYWplIHNhbGVuIGRlIGhpdG9SYWNoYSgpLCBsYSBtaXNtYSBmdW5jacOzbiBxdWUKICAvLyB1c2EgTm92ZWRhZGVzLiBIYXkgMTUgbml2ZWxlcyB5YSBkaXNlw7FhZG9zIOKAlGluaWNpbywgNywgMTUsIDMwLCA0NSwKICAvLyAxMDAsIGNvcm9uYSwgc3VwZXJow6lyb2XigJQgeSBkdXBsaWNhcmxvcyBhY8OhIGhhYnLDrWEgc2lnbmlmaWNhZG8gZG9zCiAgLy8gc2lzdGVtYXMgcXVlIHNlIGRlc2luY3Jvbml6YW4uCiAgY29uc3QgaGl0byA9IGVkaXRhbmRvCiAgICA/IHsgaW1nOiAnL2NoaXF1aS9jaGlxdWlfYW1vci5wbmcnLCBtZW5zYWplOiBgQWN0dWFsaXphc3RlIGVsIHJlZ2lzdHJvIGRlICR7bm9tYnJlfS4gTG9zIGRhdG9zIGFsIGTDrWEgdmFsZW4gbcOhcyBxdWUgbG9zIGRhdG9zIGEgbWVkaWFzLmAgfQogICAgOiBoaXRvUmFjaGEocmFjaGEpCiAgY29uc3QgaW1hZ2VuID0gaGl0by5pbWcKICAvLyBFbCBtZW5zYWplIGRlIGhpdG9SYWNoYSB5YSB0cmFlIGVsIG7Dum1lcm8gZGUgZMOtYXMgYWRlbGFudGU7IGFjw6EgZWwKICAvLyBuw7ptZXJvIHZhIGFwYXJ0ZSB5IGVuIGdyYW5kZSwgYXPDrSBxdWUgc2UgcmVjb3J0YSBlc2EgcGFydGUuCiAgY29uc3QgbWVuc2FqZSA9IGhpdG8ubWVuc2FqZS5yZXBsYWNlKC9e8J+UpSBcZCsgZMOtYXM/KCBzZWd1aWRvcyk/XC5ccyovLCAnJykKCiAgLy8gTGEgY29tcGFyYWNpw7NuIGNvbiBlbCBtZXMgcGFzYWRvIHNvbG8gc2UgbXVlc3RyYSBzaSBlcyBmYXZvcmFibGUgeQogIC8vIHNpIGhheSBjb24gcXXDqSBjb21wYXJhci4gUmVjb3JkYXJsZSBhIGFsZ3VpZW4gcXVlIHZhIHBlb3IgcXVlIGVsIG1lcwogIC8vIHBhc2FkbyBqdXN0byBjdWFuZG8gYWNhYmEgZGUgcmVnaXN0cmFyIGVzIGNvbnRyYXByb2R1Y2VudGUuCiAgY29uc3QgbWVqb3JRdWVBbnRlcyA9IGRpYXNNZXNQYXNhZG8gPiAwICYmIGRpYXNEZWxNZXMgPiBkaWFzTWVzUGFzYWRvCiAgY29uc3QgZGlmZXJlbmNpYSA9IGRpYXNEZWxNZXMgLSBkaWFzTWVzUGFzYWRvCgogIHJldHVybiAoCiAgICA8ZGl2CiAgICAgIGNsYXNzTmFtZT0iZml4ZWQgaW5zZXQtMCB6LVs3MF0gZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHgtNiBvdmVyZmxvdy15LWF1dG8iCiAgICAgIHN0eWxlPXt7CiAgICAgICAgYmFja2dyb3VuZDogJyNGQkVBRDknLAogICAgICAgIG9wYWNpdHk6IGVudHJhbmRvID8gMCA6IDEsCiAgICAgICAgdHJhbnNpdGlvbjogJ29wYWNpdHkgLjNzIGVhc2UnLAogICAgICB9fQogICAgPgogICAgICA8cCBjbGFzc05hbWU9ImZvbnQtaGVhZGluZyB0ZXh0LXhsIGZvbnQtZXh0cmFib2xkIHRleHQtWyM4QzU3MkZdIG1iLTgiPlJhY2hhIGRpYXJpYTwvcD4KCiAgICAgIDxpbWcKICAgICAgICBzcmM9e2ltYWdlbn0KICAgICAgICBhbHQ9IiIKICAgICAgICBjbGFzc05hbWU9InctMzIgaC0zMiBvYmplY3QtY29udGFpbiIKICAgICAgICBzdHlsZT17ewogICAgICAgICAgdHJhbnNmb3JtOiBlbnRyYW5kbyA/ICdzY2FsZSguNyknIDogJ3NjYWxlKDEpJywKICAgICAgICAgIHRyYW5zaXRpb246ICd0cmFuc2Zvcm0gLjQ1cyBjdWJpYy1iZXppZXIoLjM0LDEuNTYsLjY0LDEpIC4xcycsCiAgICAgICAgfX0KICAgICAgLz4KCiAgICAgIDxwIGNsYXNzTmFtZT0iZm9udC1oZWFkaW5nIHRleHQtNnhsIGZvbnQtZXh0cmFib2xkIHRleHQtWyNDRDc0MjFdIG10LTYgbGVhZGluZy1ub25lIj4KICAgICAgICB7cmFjaGF9CiAgICAgIDwvcD4KICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWhlYWRpbmcgdGV4dC14bCBmb250LWV4dHJhYm9sZCB0ZXh0LVsjQ0Q3NDIxXSBtdC0xIj4KICAgICAgICB7cmFjaGEgPT09IDEgPyAnZMOtYSBzZWd1aWRvJyA6ICdkw61hcyBzZWd1aWRvcyd9CiAgICAgIDwvcD4KCiAgICAgIHsvKiBMYSBtZWpvciByYWNoYTogdmVyIGN1w6FudG8gZmFsdGEgcGFyYSBzdXBlcmFybGEgbW90aXZhIG3DoXMgcXVlCiAgICAgICAgICBlbCBuw7ptZXJvIGFjdHVhbCBzb2xvLiBTb2xvIHNlIG11ZXN0cmEgc2kgeWEgaHVibyB1bmEgbWVqb3IuICovfQogICAgICB7bWVqb3JSYWNoYSA+IHJhY2hhICYmICgKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtZnVsbCBweC01IHB5LTIgbXQtMyI+CiAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEzcHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzhBNzU2MF0iPgogICAgICAgICAgICBUdSBtZWpvciByYWNoYTogPHN0cm9uZyBjbGFzc05hbWU9InRleHQtWyMzRDJCMUZdIj57bWVqb3JSYWNoYX08L3N0cm9uZz4KICAgICAgICAgIDwvcD4KICAgICAgICA8L2Rpdj4KICAgICAgKX0KICAgICAge3JhY2hhID4gMCAmJiByYWNoYSA9PT0gbWVqb3JSYWNoYSAmJiByYWNoYSA+IDEgJiYgKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyb3VuZGVkLWZ1bGwgcHgtNSBweS0yIG10LTMiIHN0eWxlPXt7IGJhY2tncm91bmQ6ICcjNENBRjdEJyB9fT4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTNweF0gZm9udC1ib2xkIHRleHQtd2hpdGUiPkVzIHR1IG1lam9yIHJhY2hhPC9wPgogICAgICAgIDwvZGl2PgogICAgICApfQoKICAgICAgey8qIExvcyDDumx0aW1vcyA3IGTDrWFzIHRlcm1pbmFuZG8gaG95LiBDb24gZWwgbm9tYnJlIHJlYWwgZGVsIGTDrWE6CiAgICAgICAgICBlcyBtw6FzIGbDoWNpbCByZWNvbm9jZXIgImF5ZXIgbm8gcmVnaXN0csOpIiBxdWUgY29udGFyIHBvc2ljaW9uZXMKICAgICAgICAgIGVuIHVuYSBzZW1hbmEgcXVlIGVtcGllemEgZWwgZG9taW5nby4gKi99CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGdhcC0yIG10LTciPgogICAgICAgIHt1bHRpbW9zNy5tYXAoKGQsIGkpID0+IHsKICAgICAgICAgIGNvbnN0IGVzSG95ID0gaSA9PT0gdWx0aW1vczcubGVuZ3RoIC0gMQogICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT0iZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTIiPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQtWzEwcHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgJHtlc0hveSA/ICd0ZXh0LVsjQ0Q3NDIxXScgOiAndGV4dC1bI0I1QTM4Rl0nfWB9PgogICAgICAgICAgICAgICAge2QubGV0cmF9CiAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgIDxkaXYKICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0idy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LWxnIGZvbnQtYm9sZCIKICAgICAgICAgICAgICAgIHN0eWxlPXtkLmhlY2hvCiAgICAgICAgICAgICAgICAgID8geyBiYWNrZ3JvdW5kOiAnI0ZGQkQ1OScsIGNvbG9yOiAnI0ZGRkNGOCcgfQogICAgICAgICAgICAgICAgICA6IHsgYmFja2dyb3VuZDogJyNGMEUyQ0UnLCBjb2xvcjogJyNENkMzQUInIH19CiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAge2QuaGVjaG8gPyAn4pyTJyA6ICfCtyd9CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgKQogICAgICAgIH0pfQogICAgICA8L2Rpdj4KCiAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTRweF0gdGV4dC1bIzhBNzU2MF0gdGV4dC1jZW50ZXIgbGVhZGluZy1yZWxheGVkIG10LTcgbWF4LXcteHMiPgogICAgICAgIHttZW5zYWplfQogICAgICA8L3A+CgogICAgICB7bWVqb3JRdWVBbnRlcyAmJiAoCiAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxM3B4XSB0ZXh0LVsjOEE3NTYwXSB0ZXh0LWNlbnRlciBtdC0zIj4KICAgICAgICAgIEVzdGUgbWVzIGxsZXZhcyA8c3Ryb25nIGNsYXNzTmFtZT0idGV4dC1bI0NENzQyMV0iPntkaWZlcmVuY2lhfSB7ZGlmZXJlbmNpYSA9PT0gMSA/ICdkw61hJyA6ICdkw61hcyd9IG3DoXM8L3N0cm9uZz4gcXVlIGVsIG1lcyBwYXNhZG8uCiAgICAgICAgPC9wPgogICAgICApfQoKICAgICAgPGJ1dHRvbgogICAgICAgIG9uQ2xpY2s9e29uQ2VycmFyfQogICAgICAgIGNsYXNzTmFtZT0ibXQtOCBtYi00IHctZnVsbCBtYXgtdy14cyBweS00IHJvdW5kZWQtMnhsIGZvbnQtaGVhZGluZyBmb250LWV4dHJhYm9sZCB0ZXh0LWxnIHRleHQtd2hpdGUgYWN0aXZlOnNjYWxlLVswLjk4XSB0cmFuc2l0aW9uLXRyYW5zZm9ybSIKICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnI0NENzQyMScsIGJveFNoYWRvdzogJzAgNHB4IDAgI0E4NUMxOCcgfX0KICAgICAgPgogICAgICAgIENvbnRpbnVhcgogICAgICA8L2J1dHRvbj4KICAgIDwvZGl2PgogICkKfQo=';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const dModal = path.join(process.cwd(), RUTA_MODAL);
const dNov = path.join(process.cwd(), RUTA_NOV);

for (const [r, d] of [[RUTA_MODAL, dModal], [RUTA_NOV, dNov]]) {
  if (!fs.existsSync(d)) abortar('no se encontro ' + r + '.');
}

let nov = fs.readFileSync(dNov, 'utf8');
const previo = fs.readFileSync(dModal, 'utf8');

if (previo.includes('hitoRacha(racha)')) {
  abortar('el modal ya esta arreglado. Parece que este script ya se corrio.');
}
if (!previo.includes('export default function ModalLogro')) {
  abortar('no reconozco ' + RUTA_MODAL + '. No lo sobrescribo.');
}
console.log('  OK  el modal existe y es el que hay que reemplazar');

// --- hitoRacha exportada
const VIEJO = 'function hitoRacha(dias: number): { img: string; mensaje: string } {';
const NUEVO = [
  '// Se exporta para que el modal de racha use LA MISMA funcion: dos',
  '// listas de imagenes por nivel se desincronizan al primer cambio.',
  'export function hitoRacha(dias: number): { img: string; mensaje: string } {',
].join('\n');

if (!nov.includes('export function hitoRacha')) {
  const n = contar(nov, VIEJO);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'hitoRacha en Novedades -> ' + n + ' coincidencia(s)');
  if (n !== 1) abortar('esperaba 1 coincidencia de hitoRacha y encontre ' + n + '.');
  nov = nov.split(VIEJO).join(NUEVO);
} else {
  console.log('  --  hitoRacha ya estaba exportada');
}

// --- El modal corregido
const modal = Buffer.from(MODAL_B64, 'base64').toString('utf8');

for (const r of ["'use client'", 'export default function ModalLogro', 'hitoRacha(racha)',
                 'ultimos7, editando', "import { hitoRacha } from '@/components/Novedades'"]) {
  if (!modal.includes(r)) abortar('el modal nuevo no incluye [' + r + ']. Script corrupto.');
}
// EL ERROR QUE TUMBO EL BUILD no puede volver.
if (modal.includes('semana, editando') || modal.includes('semana: boolean[]')) {
  abortar('el modal nuevo todavia usa "semana". Script corrupto.');
}
console.log('  OK  el modal nuevo no tiene el error de tipos');

fs.writeFileSync(dNov, nov, 'utf8');
console.log('');
console.log('OK: ' + RUTA_NOV);
fs.writeFileSync(dModal, modal, 'utf8');
console.log('OK: ' + RUTA_MODAL);

console.log('');
console.log('Listo. El registro diario ya estaba bien: no se toco.');
