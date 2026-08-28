const fs = require('fs');
const path = require('path');

// ============================================================
// generar_479_racha_estricta.js
// ============================================================
// Al guardar el registro diario aparece una pantalla de logro, estilo
// Duolingo: la racha, los dias de la semana marcados, y un mensaje que
// cambia segun el hito.
//
// POR QUE ACA
// Guardar es el momento en que la persona YA hizo el esfuerzo.
// Reconocerlo ahi es lo que hace que vuelva mañana. Antes esto solo
// aparecia en Novedades, donde casi nadie entra.
//
// QUE MUESTRA
//   Racha en dias, grande.
//   Los 7 dias de la semana, con check en los registrados. Ver los
//   checks acumulados hace la racha tangible: no es un numero, son
//   dias marcados.
//   Un mensaje segun el hito: primer registro, 3 dias, una semana, un
//   mes, cien dias.
//   Y si este mes va mejor que el pasado, lo dice.
//
// SOBRE COMPARAR CON OTROS DUEÑOS
// No se puede hoy: calcular "estas en el 20% mas constante" requiere
// consultar datos de toda la comunidad desde el navegador de cada
// usuario, y eso no se hace bien sin una vista agregada en el servidor.
//
// Se muestra su PROPIA historia, que ademas suele importar mas: "llevas
// 12 dias seguidos" pesa mas que compararse con desconocidos.
//
// LA COMPARACION CON EL MES PASADO solo se muestra si es FAVORABLE.
// Recordarle a alguien que va peor justo cuando acaba de registrar es
// contraproducente.
//
// Si el calculo de la racha falla, se vuelve al dashboard como siempre:
// el registro ya se guardo, que es lo que importa.
//
// Crea un componente y modifica el registro diario. Si algo no calza,
// ABORTA sin escribir NADA.
// ============================================================

const RUTA_MODAL = 'components/ModalLogro.tsx';
const RUTA_REG = 'app/registro-diario/page.tsx';
const MODAL_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNT0RBTCBERSBMT0dSTyDigJQgZWwgbW9tZW50byBkZXNwdcOpcyBkZSBndWFyZGFyCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBBcGFyZWNlIGFsIGd1YXJkYXIgZWwgcmVnaXN0cm8gZGVsIGTDrWEuIEVzIGVsIG1vbWVudG8gZW4gcXVlIGxhCi8vIHBlcnNvbmEgWUEgaGl6byBlbCBlc2Z1ZXJ6bzogcmVjb25vY2VybG8gYWjDrSBlcyBsbyBxdWUgaGFjZSBxdWUKLy8gdnVlbHZhIG1hw7FhbmEuCi8vCi8vIEFudGVzIGVzdG8gc29sbyBzZSB2ZcOtYSBlbiBOb3ZlZGFkZXMsIGRvbmRlIGNhc2kgbmFkaWUgZW50cmEuCi8vCi8vIFFVw4kgTVVFU1RSQQovLyBTdSBwcm9waWEgaGlzdG9yaWEsIG5vIGNvbXBhcmFjaW9uZXMgY29uIG90cm9zOiBsYSByYWNoYSwgY3XDoW50b3MKLy8gZMOtYXMgbGxldmEgZXN0ZSBtZXMsIHF1w6kgZMOtYXMgZGUgbGEgc2VtYW5hIHJlZ2lzdHLDsy4gIkxsZXZhcyAxMiBkw61hcwovLyBzZWd1aWRvcyIgbGUgaW1wb3J0YSBtw6FzIGEgbGEgbWF5b3LDrWEgcXVlICJlc3TDoXMgZW4gZWwgMjAlIG3DoXMKLy8gY29uc3RhbnRlIiDigJQgeSBhZGVtw6FzIGVzIHVuIGRhdG8gcXVlIHPDrSB0ZW5lbW9zLgovLwovLyBDb21wYXJhciBjb24gbGEgY29tdW5pZGFkIHJlcXVlcmlyw61hIGNvbnN1bHRhciBkYXRvcyBkZSB0b2RvcyBsb3MKLy8gdXN1YXJpb3MgZGVzZGUgZWwgbmF2ZWdhZG9yIGRlIGNhZGEgdW5vLCBxdWUgbm8gZXMgYWxnbyBxdWUgc2UgcHVlZGEKLy8gaGFjZXIgYmllbiBzaW4gdW5hIHZpc3RhIGFncmVnYWRhIGVuIGVsIHNlcnZpZG9yLgoKaW50ZXJmYWNlIFByb3BzIHsKICBub21icmU6IHN0cmluZwogIHJhY2hhOiBudW1iZXIKICAvLyBMYSBtZWpvciByYWNoYSBoaXN0w7NyaWNhLiBWZXIgY3XDoW50byBsZSBmYWx0YSBwYXJhIHN1cGVyYXJsYSBlcyBtw6FzCiAgLy8gbW90aXZhZG9yIHF1ZSBlbCBuw7ptZXJvIGFjdHVhbCBzb2xvLgogIG1lam9yUmFjaGE6IG51bWJlcgogIGRpYXNEZWxNZXM6IG51bWJlcgogIGRpYXNNZXNQYXNhZG86IG51bWJlcgogIC8vIExvcyDDumx0aW1vcyA3IGTDrWFzIFRFUk1JTkFORE8gSE9ZLCBjb24gc3Ugbm9tYnJlIHJlYWwuIEVtcGV6YXIgZW4KICAvLyBkb21pbmdvIGRlamFiYSBsYSBtYXlvcsOtYSBkZSBsb3MgY2hlY2tzIGZ1ZXJhIGRlIHZpc3RhIGxvcyBsdW5lcy4KICB1bHRpbW9zNzogeyBsZXRyYTogc3RyaW5nOyBoZWNobzogYm9vbGVhbiB9W10KICBlZGl0YW5kbzogYm9vbGVhbgogIG9uQ2VycmFyOiAoKSA9PiB2b2lkCn0KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsTG9ncm8oewogIG5vbWJyZSwgcmFjaGEsIGRpYXNEZWxNZXMsIGRpYXNNZXNQYXNhZG8sIHNlbWFuYSwgZWRpdGFuZG8sIG9uQ2VycmFyLAp9OiBQcm9wcykgewogIGNvbnN0IFtlbnRyYW5kbywgc2V0RW50cmFuZG9dID0gdXNlU3RhdGUodHJ1ZSkKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGNvbnN0IHQgPSBzZXRUaW1lb3V0KCgpID0+IHNldEVudHJhbmRvKGZhbHNlKSwgNTApCiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbicKICAgIHJldHVybiAoKSA9PiB7IGNsZWFyVGltZW91dCh0KTsgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnIH0KICB9LCBbXSkKCiAgLy8gRWwgbWVuc2FqZSBzZSBlbGlnZSBwb3IgZWwgaGl0byBtw6FzIGFsdG8gcXVlIHNlIGhheWEgYWxjYW56YWRvLiBFbAogIC8vIG9yZGVuIGltcG9ydGE6IHByaW1lcm8gbG9zIGhpdG9zIGdyYW5kZXMsIGRlc3B1w6lzIGxvcyBjb3RpZGlhbm9zLgogIGNvbnN0IHsgaW1hZ2VuLCBtZW5zYWplIH0gPSAoKCkgPT4gewogICAgaWYgKGVkaXRhbmRvKSB7CiAgICAgIHJldHVybiB7CiAgICAgICAgaW1hZ2VuOiAnL2NoaXF1aS9jaGlxdWlfYW1vci5wbmcnLAogICAgICAgIG1lbnNhamU6IGBDb3JyZWdpc3RlIGVsIHJlZ2lzdHJvIGRlICR7bm9tYnJlfS4gTG9zIGRhdG9zIGFsIGTDrWEgdmFsZW4gbcOhcyBxdWUgbG9zIGRhdG9zIGEgbWVkaWFzLmAsCiAgICAgIH0KICAgIH0KICAgIGlmIChyYWNoYSA+PSAxMDApIHsKICAgICAgcmV0dXJuIHsKICAgICAgICBpbWFnZW46ICcvY2hpcXVpL2NoaXF1aV9jb29sLnBuZycsCiAgICAgICAgbWVuc2FqZTogYENpZW4gZMOtYXMgZXMgbXVjaMOtc2ltby4gVGllbmVzIHVuYSBoaXN0b3JpYSBkZSAke25vbWJyZX0gcXVlIGNhc2kgbmFkaWUgdGllbmUgZGUgc3UgbWFzY290YS5gLAogICAgICB9CiAgICB9CiAgICBpZiAocmFjaGEgPj0gMzApIHsKICAgICAgcmV0dXJuIHsKICAgICAgICBpbWFnZW46ICcvY2hpcXVpL2NoaXF1aV9jb29sLnBuZycsCiAgICAgICAgbWVuc2FqZTogYFVuIG1lcyBlbnRlcm8gc2luIGZhbGxhci4gQ29uIGVzdG8geWEgc2UgcHVlZGVuIHZlciBwYXRyb25lcyBkZSB2ZXJkYWQgZW4gJHtub21icmV9LmAsCiAgICAgIH0KICAgIH0KICAgIGlmIChyYWNoYSA+PSA3KSB7CiAgICAgIHJldHVybiB7CiAgICAgICAgaW1hZ2VuOiAnL2NoaXF1aS9jaGlxdWl2ZXJkZS5wbmcnLAogICAgICAgIG1lbnNhamU6IGBVbmEgc2VtYW5hIGNvbXBsZXRhLiBFcyBqdXN0byBjdWFuZG8gbG9zIHJlZ2lzdHJvcyBlbXBpZXphbiBhIHNlcnZpciBwYXJhIGFsZ28uYCwKICAgICAgfQogICAgfQogICAgaWYgKHJhY2hhID49IDMpIHsKICAgICAgcmV0dXJuIHsKICAgICAgICBpbWFnZW46ICcvY2hpcXVpL2NoaXF1aXZlcmRlLnBuZycsCiAgICAgICAgbWVuc2FqZTogYFZhcyB0b21hbmRvIGVsIHJpdG1vLiBUcmVzIGTDrWFzIHNlZ3VpZG9zIHlhIGVzIHVuIGjDoWJpdG8gZW1wZXphbmRvLmAsCiAgICAgIH0KICAgIH0KICAgIGlmIChyYWNoYSA9PT0gMSAmJiBkaWFzRGVsTWVzID09PSAxKSB7CiAgICAgIHJldHVybiB7CiAgICAgICAgaW1hZ2VuOiAnL2NoaXF1aS9jaGlxdWlfYW1vci5wbmcnLAogICAgICAgIG1lbnNhamU6IGBFc3RlIGVzIHR1IHByaW1lciByZWdpc3RybyBkZSAke25vbWJyZX0uIENhZGEgZMOtYSBxdWUgYW5vdGVzIGhhY2UgZWwgc2lndWllbnRlIG3DoXMgw7p0aWwuYCwKICAgICAgfQogICAgfQogICAgcmV0dXJuIHsKICAgICAgaW1hZ2VuOiAnL2NoaXF1aS9jaGlxdWl2ZXJkZS5wbmcnLAogICAgICBtZW5zYWplOiBgVW4gZMOtYSBtw6FzIGRlIGxhIGhpc3RvcmlhIGRlICR7bm9tYnJlfS5gLAogICAgfQogIH0pKCkKCiAgLy8gTGEgY29tcGFyYWNpw7NuIGNvbiBlbCBtZXMgcGFzYWRvIHNvbG8gc2UgbXVlc3RyYSBzaSBlcyBmYXZvcmFibGUgeQogIC8vIHNpIGhheSBjb24gcXXDqSBjb21wYXJhci4gUmVjb3JkYXJsZSBhIGFsZ3VpZW4gcXVlIHZhIHBlb3IgcXVlIGVsIG1lcwogIC8vIHBhc2FkbyBqdXN0byBjdWFuZG8gYWNhYmEgZGUgcmVnaXN0cmFyIGVzIGNvbnRyYXByb2R1Y2VudGUuCiAgY29uc3QgbWVqb3JRdWVBbnRlcyA9IGRpYXNNZXNQYXNhZG8gPiAwICYmIGRpYXNEZWxNZXMgPiBkaWFzTWVzUGFzYWRvCiAgY29uc3QgZGlmZXJlbmNpYSA9IGRpYXNEZWxNZXMgLSBkaWFzTWVzUGFzYWRvCgogIHJldHVybiAoCiAgICA8ZGl2CiAgICAgIGNsYXNzTmFtZT0iZml4ZWQgaW5zZXQtMCB6LVs3MF0gZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHgtNiBvdmVyZmxvdy15LWF1dG8iCiAgICAgIHN0eWxlPXt7CiAgICAgICAgYmFja2dyb3VuZDogJyNGQkVBRDknLAogICAgICAgIG9wYWNpdHk6IGVudHJhbmRvID8gMCA6IDEsCiAgICAgICAgdHJhbnNpdGlvbjogJ29wYWNpdHkgLjNzIGVhc2UnLAogICAgICB9fQogICAgPgogICAgICA8cCBjbGFzc05hbWU9ImZvbnQtaGVhZGluZyB0ZXh0LXhsIGZvbnQtZXh0cmFib2xkIHRleHQtWyM4QzU3MkZdIG1iLTgiPlJhY2hhIGRpYXJpYTwvcD4KCiAgICAgIDxpbWcKICAgICAgICBzcmM9e2ltYWdlbn0KICAgICAgICBhbHQ9IiIKICAgICAgICBjbGFzc05hbWU9InctMzIgaC0zMiBvYmplY3QtY29udGFpbiIKICAgICAgICBzdHlsZT17ewogICAgICAgICAgdHJhbnNmb3JtOiBlbnRyYW5kbyA/ICdzY2FsZSguNyknIDogJ3NjYWxlKDEpJywKICAgICAgICAgIHRyYW5zaXRpb246ICd0cmFuc2Zvcm0gLjQ1cyBjdWJpYy1iZXppZXIoLjM0LDEuNTYsLjY0LDEpIC4xcycsCiAgICAgICAgfX0KICAgICAgLz4KCiAgICAgIDxwIGNsYXNzTmFtZT0iZm9udC1oZWFkaW5nIHRleHQtNnhsIGZvbnQtZXh0cmFib2xkIHRleHQtWyNDRDc0MjFdIG10LTYgbGVhZGluZy1ub25lIj4KICAgICAgICB7cmFjaGF9CiAgICAgIDwvcD4KICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWhlYWRpbmcgdGV4dC14bCBmb250LWV4dHJhYm9sZCB0ZXh0LVsjQ0Q3NDIxXSBtdC0xIj4KICAgICAgICB7cmFjaGEgPT09IDEgPyAnZMOtYSBzZWd1aWRvJyA6ICdkw61hcyBzZWd1aWRvcyd9CiAgICAgIDwvcD4KCiAgICAgIHsvKiBMYSBtZWpvciByYWNoYTogdmVyIGN1w6FudG8gZmFsdGEgcGFyYSBzdXBlcmFybGEgbW90aXZhIG3DoXMgcXVlCiAgICAgICAgICBlbCBuw7ptZXJvIGFjdHVhbCBzb2xvLiBTb2xvIHNlIG11ZXN0cmEgc2kgeWEgaHVibyB1bmEgbWVqb3IuICovfQogICAgICB7bWVqb3JSYWNoYSA+IHJhY2hhICYmICgKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtZnVsbCBweC01IHB5LTIgbXQtMyI+CiAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEzcHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzhBNzU2MF0iPgogICAgICAgICAgICBUdSBtZWpvciByYWNoYTogPHN0cm9uZyBjbGFzc05hbWU9InRleHQtWyMzRDJCMUZdIj57bWVqb3JSYWNoYX08L3N0cm9uZz4KICAgICAgICAgIDwvcD4KICAgICAgICA8L2Rpdj4KICAgICAgKX0KICAgICAge3JhY2hhID4gMCAmJiByYWNoYSA9PT0gbWVqb3JSYWNoYSAmJiByYWNoYSA+IDEgJiYgKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyb3VuZGVkLWZ1bGwgcHgtNSBweS0yIG10LTMiIHN0eWxlPXt7IGJhY2tncm91bmQ6ICcjNENBRjdEJyB9fT4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTNweF0gZm9udC1ib2xkIHRleHQtd2hpdGUiPkVzIHR1IG1lam9yIHJhY2hhPC9wPgogICAgICAgIDwvZGl2PgogICAgICApfQoKICAgICAgey8qIExvcyDDumx0aW1vcyA3IGTDrWFzIHRlcm1pbmFuZG8gaG95LiBDb24gZWwgbm9tYnJlIHJlYWwgZGVsIGTDrWE6CiAgICAgICAgICBlcyBtw6FzIGbDoWNpbCByZWNvbm9jZXIgImF5ZXIgbm8gcmVnaXN0csOpIiBxdWUgY29udGFyIHBvc2ljaW9uZXMKICAgICAgICAgIGVuIHVuYSBzZW1hbmEgcXVlIGVtcGllemEgZWwgZG9taW5nby4gKi99CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGdhcC0yIG10LTciPgogICAgICAgIHt1bHRpbW9zNy5tYXAoKGQsIGkpID0+IHsKICAgICAgICAgIGNvbnN0IGVzSG95ID0gaSA9PT0gdWx0aW1vczcubGVuZ3RoIC0gMQogICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT0iZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTIiPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQtWzEwcHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgJHtlc0hveSA/ICd0ZXh0LVsjQ0Q3NDIxXScgOiAndGV4dC1bI0I1QTM4Rl0nfWB9PgogICAgICAgICAgICAgICAge2QubGV0cmF9CiAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgIDxkaXYKICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0idy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LWxnIGZvbnQtYm9sZCIKICAgICAgICAgICAgICAgIHN0eWxlPXtkLmhlY2hvCiAgICAgICAgICAgICAgICAgID8geyBiYWNrZ3JvdW5kOiAnI0ZGQkQ1OScsIGNvbG9yOiAnI0ZGRkNGOCcgfQogICAgICAgICAgICAgICAgICA6IHsgYmFja2dyb3VuZDogJyNGMEUyQ0UnLCBjb2xvcjogJyNENkMzQUInIH19CiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAge2QuaGVjaG8gPyAn4pyTJyA6ICfCtyd9CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgKQogICAgICAgIH0pfQogICAgICA8L2Rpdj4KCiAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTRweF0gdGV4dC1bIzhBNzU2MF0gdGV4dC1jZW50ZXIgbGVhZGluZy1yZWxheGVkIG10LTcgbWF4LXcteHMiPgogICAgICAgIHttZW5zYWplfQogICAgICA8L3A+CgogICAgICB7bWVqb3JRdWVBbnRlcyAmJiAoCiAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxM3B4XSB0ZXh0LVsjOEE3NTYwXSB0ZXh0LWNlbnRlciBtdC0zIj4KICAgICAgICAgIEVzdGUgbWVzIGxsZXZhcyA8c3Ryb25nIGNsYXNzTmFtZT0idGV4dC1bI0NENzQyMV0iPntkaWZlcmVuY2lhfSB7ZGlmZXJlbmNpYSA9PT0gMSA/ICdkw61hJyA6ICdkw61hcyd9IG3DoXM8L3N0cm9uZz4gcXVlIGVsIG1lcyBwYXNhZG8uCiAgICAgICAgPC9wPgogICAgICApfQoKICAgICAgPGJ1dHRvbgogICAgICAgIG9uQ2xpY2s9e29uQ2VycmFyfQogICAgICAgIGNsYXNzTmFtZT0ibXQtOCBtYi00IHctZnVsbCBtYXgtdy14cyBweS00IHJvdW5kZWQtMnhsIGZvbnQtaGVhZGluZyBmb250LWV4dHJhYm9sZCB0ZXh0LWxnIHRleHQtd2hpdGUgYWN0aXZlOnNjYWxlLVswLjk4XSB0cmFuc2l0aW9uLXRyYW5zZm9ybSIKICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnI0NENzQyMScsIGJveFNoYWRvdzogJzAgNHB4IDAgI0E4NUMxOCcgfX0KICAgICAgPgogICAgICAgIENvbnRpbnVhcgogICAgICA8L2J1dHRvbj4KICAgIDwvZGl2PgogICkKfQo=';

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
const dReg = path.join(process.cwd(), RUTA_REG);

if (fs.existsSync(dModal)) {
  abortar('ya existe ' + RUTA_MODAL + '. No lo sobrescribo por si tiene cambios tuyos.');
}
if (!fs.existsSync(dReg)) {
  abortar('no se encontro ' + RUTA_REG + '.');
}

let reg = fs.readFileSync(dReg, 'utf8');

if (reg.includes('ModalLogro')) {
  abortar('el registro diario ya tiene el modal. Parece que este script ya se corrio.');
}

const PARES = [
  { nombre: 'estado de la racha', viejo: "  // Modal que aparece tras \"Todo normal\": ofrece guardar al toque o\n  // seguir editando (algunas usuarias cre\u00edan que marcar ya guardaba).\n  const [confirmarGuardado, setConfirmarGuardado] = useState(false)", nuevo: "  // Modal que aparece tras \"Todo normal\": ofrece guardar al toque o\n  // seguir editando (algunas usuarias cre\u00edan que marcar ya guardaba).\n  const [confirmarGuardado, setConfirmarGuardado] = useState(false)\n  // La racha que se muestra al guardar. null mientras no se ha guardado.\n  const [logro, setLogro] = useState<{ racha: number; mejorRacha: number; ultimos7: { letra: string; hecho: boolean }[]; diasDelMes: number; diasMesPasado: number } | null>(null)" },
  { nombre: 'calculo tras guardar', viejo: "    router.push('/dashboard')\n    router.refresh()\n  }", nuevo: "    // La racha, al guardar. Este es el momento en que la persona ya hizo\n    // el esfuerzo: reconocerlo ac\u00e1 es lo que hace que vuelva ma\u00f1ana.\n    try {\n      const hoyL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())\n      const atras = new Date(hoyL + 'T12:00:00')\n      atras.setDate(atras.getDate() - 400)\n      const desdeL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(atras)\n\n      // Se pide created_at adem\u00e1s de fecha: sin saber CU\u00c1NDO se anot\u00f3\n      // cada d\u00eda no hay forma de distinguir un registro puntual de uno\n      // rellenado despu\u00e9s.\n      const { data: todos } = await supabase\n        .from('registros_diarios')\n        .select('fecha, created_at')\n        .eq('mascota_id', mascotaId)\n        .gte('fecha', desdeL)\n        .order('fecha', { ascending: false })\n\n      const enChile = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)\n\n      // LA REGLA DE LA RACHA\n      // Un d\u00eda cuenta para la racha SOLO si se registr\u00f3 ese mismo d\u00eda.\n      // Rellenar el lunes desde el martes deja el dato guardado \u2014y eso\n      // est\u00e1 bien, sirve igual\u2014 pero no recupera la racha: la racha mide\n      // constancia, no completitud.\n      const aTiempo = new Set<string>()\n      const todasLasFechas = new Set<string>()\n      for (const r of (todos || [])) {\n        const f = String(r.fecha).slice(0, 10)\n        todasLasFechas.add(f)\n        // created_at viene en UTC; se compara en hora de Chile.\n        if (r.created_at && enChile(new Date(r.created_at)) === f) aTiempo.add(f)\n      }\n      // El que se acaba de guardar: cuenta si es de hoy.\n      if (fechaRegistro) {\n        todasLasFechas.add(fechaRegistro)\n        if (fechaRegistro === hoyL) aTiempo.add(fechaRegistro)\n      }\n\n      // Racha: d\u00edas seguidos hacia atr\u00e1s, contando solo los puntuales.\n      let r = 0\n      const cursor = new Date(hoyL + 'T12:00:00')\n      while (aTiempo.has(enChile(cursor))) {\n        r++\n        cursor.setDate(cursor.getDate() - 1)\n      }\n\n      // Los \u00faltimos 7 d\u00edas terminando hoy. Ac\u00e1 se muestran TODOS los\n      // registrados, puntuales o no: el calendario no miente sobre lo\n      // que existe, solo la racha es estricta.\n      const DIAS = ['dom', 'lun', 'mar', 'mi\u00e9', 'jue', 'vie', 's\u00e1b']\n      const ult7: { letra: string; hecho: boolean }[] = []\n      for (let i = 6; i >= 0; i--) {\n        const dia = new Date(hoyL + 'T12:00:00')\n        dia.setDate(dia.getDate() - i)\n        ult7.push({ letra: DIAS[dia.getDay()], hecho: todasLasFechas.has(enChile(dia)) })\n      }\n\n      // La mejor racha hist\u00f3rica, con la misma regla estricta.\n      const ordenadas = Array.from(aTiempo).sort()\n      let mejor = 0\n      let seguidos = 0\n      let anterior: string | null = null\n      for (const f of ordenadas) {\n        if (anterior) {\n          const a = new Date(anterior + 'T12:00:00').getTime()\n          const b = new Date(f + 'T12:00:00').getTime()\n          seguidos = Math.round((b - a) / 86400000) === 1 ? seguidos + 1 : 1\n        } else {\n          seguidos = 1\n        }\n        if (seguidos > mejor) mejor = seguidos\n        anterior = f\n      }\n\n      const mesActual = hoyL.slice(0, 7)\n      const mesAnterior = (() => {\n        const d = new Date(hoyL + 'T12:00:00')\n        d.setMonth(d.getMonth() - 1)\n        return enChile(d).slice(0, 7)\n      })()\n      const delMes = Array.from(todasLasFechas).filter(f => f.startsWith(mesActual)).length\n      const delAnterior = Array.from(todasLasFechas).filter(f => f.startsWith(mesAnterior)).length\n\n      setLogro({ racha: r, mejorRacha: mejor, ultimos7: ult7, diasDelMes: delMes, diasMesPasado: delAnterior })\n      setLoading(false)\n      return\n    } catch {\n      // Si el c\u00e1lculo falla, se vuelve al dashboard como siempre: el\n      // registro ya se guard\u00f3, que es lo que importa.\n    }\n\n    router.push('/dashboard')\n    router.refresh()\n  }" },
  { nombre: 'render del modal', viejo: "      {/* Modal tras \"Todo normal\": guardar al toque o seguir editando */}\n      {confirmarGuardado && (", nuevo: "      {/* La racha, al guardar. Va ac\u00e1 porque cubre toda la pantalla. */}\n      {logro && (\n        <ModalLogro\n          nombre={mascotaNombre}\n          racha={logro.racha}\n          mejorRacha={logro.mejorRacha}\n          ultimos7={logro.ultimos7}\n          diasDelMes={logro.diasDelMes}\n          diasMesPasado={logro.diasMesPasado}\n          editando={yaRegistro}\n          onCerrar={() => { router.push('/dashboard'); router.refresh() }}\n        />\n      )}\n      {/* Modal tras \"Todo normal\": guardar al toque o seguir editando */}\n      {confirmarGuardado && (" },
];

for (const p of PARES) {
  const n = contar(reg, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  reg = reg.split(p.viejo).join(p.nuevo);
}

// --- Import
const ANCLA = "import { useState";
if (!reg.includes(ANCLA)) {
  abortar('no encontre donde poner el import.');
}
const lineas = reg.split('\n');
let ultimo = -1;
for (let i = 0; i < lineas.length; i++) {
  if (lineas[i].startsWith('import ')) ultimo = i;
}
lineas.splice(ultimo + 1, 0, "import ModalLogro from '@/components/ModalLogro'");
reg = lineas.join('\n');
console.log('  OK  import agregado');

// --- Verificaciones
if (contar(reg, '<ModalLogro') !== 1) {
  abortar('el modal no quedo exactamente una vez.');
}
if (reg.indexOf("import ModalLogro") > reg.indexOf('<ModalLogro')) {
  abortar('el import quedaria despues del uso.');
}
// El guardado tiene que seguir funcionando igual.
for (const s of ['router.push(\'/dashboard\')', 'setLogro(']) {
  if (!reg.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

const modal = Buffer.from(MODAL_B64, 'base64').toString('utf8');
for (const r of ["'use client'", 'export default function ModalLogro', 'días de racha'.slice(0, 4)]) {
  if (!modal.includes(r)) {
    abortar('el modal no incluye [' + r + ']. Script corrupto.');
  }
}

const carpeta = path.dirname(dModal);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(dModal, modal, 'utf8');
console.log('');
console.log('OK: ' + RUTA_MODAL);
fs.writeFileSync(dReg, reg, 'utf8');
console.log('OK: ' + RUTA_REG);

console.log('');
console.log('AVISO: el modal usa chiqui_cool.png, chiquiverde.png y');
console.log('chiqui_amor.png. Si alguna no existe, esa imagen no se ve pero');
console.log('el resto funciona.');
console.log('');
console.log('Listo. Guarda un registro y deberia aparecer.');
