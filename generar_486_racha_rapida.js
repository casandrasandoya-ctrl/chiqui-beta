const fs = require('fs');
const path = require('path');

// ============================================================
// generar_486_racha_rapida.js
// ============================================================
// LA ESPERA ERA MUY LARGA al terminar de guardar.
//
// LA CAUSA: el modal aparecia recien DESPUES de calcular la racha, y
// ese calculo iba en fila detras del guardado:
//
//   guardar (~400ms) -> consultar 400 dias (~600ms) -> mostrar
//
// Un segundo entero mirando una pantalla congelada, y en conexion lenta
// dos o tres.
//
// EL ARREGLO, en tres partes
//
// 1. EL MODAL APARECE PRIMERO, apenas se guarda. La persona ve la
//    carita de inmediato y el numero llega solo, con un "contando..."
//    de por medio. Es preferible ver algo en 100ms y que el numero
//    aparezca, a mirar una pantalla en blanco un segundo entero.
//
// 2. SE PIDEN 120 DIAS EN VEZ DE 400. Una racha mas larga que eso es
//    rarisima, y traer 400 costaba el triple para el mismo resultado.
//
// 3. SI EL CALCULO FALLA, el modal ya esta en pantalla: se completa con
//    lo minimo para que se pueda cerrar, en vez de dejarla atrapada.
//
// REQUISITO: script 483 desplegado.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_MODAL = 'components/ModalLogro.tsx';
const RUTA_REG = 'app/registro-diario/page.tsx';
const MODAL_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgaGl0b1JhY2hhIH0gZnJvbSAnQC9jb21wb25lbnRzL05vdmVkYWRlcycKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNT0RBTCBERSBMT0dSTyDigJQgZWwgbW9tZW50byBkZXNwdcOpcyBkZSBndWFyZGFyCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBBcGFyZWNlIGFsIGd1YXJkYXIgZWwgcmVnaXN0cm8gZGVsIGTDrWEuIEVzIGVsIG1vbWVudG8gZW4gcXVlIGxhCi8vIHBlcnNvbmEgWUEgaGl6byBlbCBlc2Z1ZXJ6bzogcmVjb25vY2VybG8gYWjDrSBlcyBsbyBxdWUgaGFjZSBxdWUKLy8gdnVlbHZhIG1hw7FhbmEuCi8vCi8vIEFudGVzIGVzdG8gc29sbyBzZSB2ZcOtYSBlbiBOb3ZlZGFkZXMsIGRvbmRlIGNhc2kgbmFkaWUgZW50cmEuCi8vCi8vIFFVw4kgTVVFU1RSQQovLyBTdSBwcm9waWEgaGlzdG9yaWEsIG5vIGNvbXBhcmFjaW9uZXMgY29uIG90cm9zOiBsYSByYWNoYSwgY3XDoW50b3MKLy8gZMOtYXMgbGxldmEgZXN0ZSBtZXMsIHF1w6kgZMOtYXMgZGUgbGEgc2VtYW5hIHJlZ2lzdHLDsy4gIkxsZXZhcyAxMiBkw61hcwovLyBzZWd1aWRvcyIgbGUgaW1wb3J0YSBtw6FzIGEgbGEgbWF5b3LDrWEgcXVlICJlc3TDoXMgZW4gZWwgMjAlIG3DoXMKLy8gY29uc3RhbnRlIiDigJQgeSBhZGVtw6FzIGVzIHVuIGRhdG8gcXVlIHPDrSB0ZW5lbW9zLgovLwovLyBDb21wYXJhciBjb24gbGEgY29tdW5pZGFkIHJlcXVlcmlyw61hIGNvbnN1bHRhciBkYXRvcyBkZSB0b2RvcyBsb3MKLy8gdXN1YXJpb3MgZGVzZGUgZWwgbmF2ZWdhZG9yIGRlIGNhZGEgdW5vLCBxdWUgbm8gZXMgYWxnbyBxdWUgc2UgcHVlZGEKLy8gaGFjZXIgYmllbiBzaW4gdW5hIHZpc3RhIGFncmVnYWRhIGVuIGVsIHNlcnZpZG9yLgoKaW50ZXJmYWNlIFByb3BzIHsKICBub21icmU6IHN0cmluZwogIC8vIG51bGwgPSB0b2RhdsOtYSBjYWxjdWzDoW5kb3NlLiBFbCBtb2RhbCBhcGFyZWNlIGlndWFsIHkgZWwgbsO6bWVybwogIC8vIGxsZWdhIGRlc3B1w6lzOiBlcyBwcmVmZXJpYmxlIHZlciBhbGdvIGVuIDEwMG1zIHkgcXVlIGVsIG7Dum1lcm8KICAvLyBhcGFyZXpjYSwgYSBtaXJhciB1bmEgcGFudGFsbGEgZW4gYmxhbmNvIHVuIHNlZ3VuZG8gZW50ZXJvLgogIHJhY2hhOiBudW1iZXIgfCBudWxsCiAgLy8gTGEgbWVqb3IgcmFjaGEgaGlzdMOzcmljYS4gVmVyIGN1w6FudG8gbGUgZmFsdGEgcGFyYSBzdXBlcmFybGEgZXMgbcOhcwogIC8vIG1vdGl2YWRvciBxdWUgZWwgbsO6bWVybyBhY3R1YWwgc29sby4KICBtZWpvclJhY2hhOiBudW1iZXIgfCBudWxsCiAgZGlhc0RlbE1lczogbnVtYmVyIHwgbnVsbAogIGRpYXNNZXNQYXNhZG86IG51bWJlciB8IG51bGwKICAvLyBMb3Mgw7psdGltb3MgNyBkw61hcyBURVJNSU5BTkRPIEhPWSwgY29uIHN1IG5vbWJyZSByZWFsLiBFbXBlemFyIGVuCiAgLy8gZG9taW5nbyBkZWphYmEgbGEgbWF5b3LDrWEgZGUgbG9zIGNoZWNrcyBmdWVyYSBkZSB2aXN0YSBsb3MgbHVuZXMuCiAgdWx0aW1vczc6IHsgbGV0cmE6IHN0cmluZzsgaGVjaG86IGJvb2xlYW4gfVtdIHwgbnVsbAogIGVkaXRhbmRvOiBib29sZWFuCiAgb25DZXJyYXI6ICgpID0+IHZvaWQKfQoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWxMb2dybyh7CiAgbm9tYnJlLCByYWNoYSwgbWVqb3JSYWNoYSwgZGlhc0RlbE1lcywgZGlhc01lc1Bhc2FkbywgdWx0aW1vczcsIGVkaXRhbmRvLCBvbkNlcnJhciwKfTogUHJvcHMpIHsKICBjb25zdCBbZW50cmFuZG8sIHNldEVudHJhbmRvXSA9IHVzZVN0YXRlKHRydWUpCgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBjb25zdCB0ID0gc2V0VGltZW91dCgoKSA9PiBzZXRFbnRyYW5kbyhmYWxzZSksIDUwKQogICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nCiAgICByZXR1cm4gKCkgPT4geyBjbGVhclRpbWVvdXQodCk7IGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnJyB9CiAgfSwgW10pCgogIC8vIExhIGltYWdlbiB5IGVsIG1lbnNhamUgc2FsZW4gZGUgaGl0b1JhY2hhKCksIGxhIG1pc21hIGZ1bmNpw7NuIHF1ZQogIC8vIHVzYSBOb3ZlZGFkZXMuIEhheSAxNSBuaXZlbGVzIHlhIGRpc2XDsWFkb3Mg4oCUaW5pY2lvLCA3LCAxNSwgMzAsIDQ1LAogIC8vIDEwMCwgY29yb25hLCBzdXBlcmjDqXJvZeKAlCB5IGR1cGxpY2FybG9zIGFjw6EgaGFicsOtYSBzaWduaWZpY2FkbyBkb3MKICAvLyBzaXN0ZW1hcyBxdWUgc2UgZGVzaW5jcm9uaXphbi4KICBjb25zdCBjYXJnYW5kbyA9IHJhY2hhID09PSBudWxsCiAgY29uc3QgaGl0byA9IGVkaXRhbmRvCiAgICA/IHsgaW1nOiAnL2NoaXF1aS9jaGlxdWlfYW1vci5wbmcnLCBtZW5zYWplOiBgQWN0dWFsaXphc3RlIGVsIHJlZ2lzdHJvIGRlICR7bm9tYnJlfS4gTG9zIGRhdG9zIGFsIGTDrWEgdmFsZW4gbcOhcyBxdWUgbG9zIGRhdG9zIGEgbWVkaWFzLmAgfQogICAgLy8gTWllbnRyYXMgY2FyZ2Egc2UgbXVlc3RyYSBsYSBpbWFnZW4gZGUgaW5pY2lvOiBlcyBsYSDDum5pY2EgcXVlCiAgICAvLyBzaXJ2ZSBwYXJhIGN1YWxxdWllciByYWNoYSwgYXPDrSBubyBoYXkgc2FsdG8gdmlzdWFsIGN1YW5kbyBsbGVnYQogICAgLy8gZWwgbsO6bWVybyByZWFsLgogICAgOiBoaXRvUmFjaGEocmFjaGEgPz8gMSkKICBjb25zdCBpbWFnZW4gPSBoaXRvLmltZwogIC8vIEVsIG1lbnNhamUgZGUgaGl0b1JhY2hhIHlhIHRyYWUgZWwgbsO6bWVybyBkZSBkw61hcyBhZGVsYW50ZTsgYWPDoSBlbAogIC8vIG7Dum1lcm8gdmEgYXBhcnRlIHkgZW4gZ3JhbmRlLCBhc8OtIHF1ZSBzZSByZWNvcnRhIGVzYSBwYXJ0ZS4KICBjb25zdCBtZW5zYWplID0gaGl0by5tZW5zYWplLnJlcGxhY2UoL17wn5SlIFxkKyBkw61hcz8oIHNlZ3VpZG9zKT9cLlxzKi8sICcnKQoKICAvLyBMYSBjb21wYXJhY2nDs24gY29uIGVsIG1lcyBwYXNhZG8gc29sbyBzZSBtdWVzdHJhIHNpIGVzIGZhdm9yYWJsZSB5CiAgLy8gc2kgaGF5IGNvbiBxdcOpIGNvbXBhcmFyLiBSZWNvcmRhcmxlIGEgYWxndWllbiBxdWUgdmEgcGVvciBxdWUgZWwgbWVzCiAgLy8gcGFzYWRvIGp1c3RvIGN1YW5kbyBhY2FiYSBkZSByZWdpc3RyYXIgZXMgY29udHJhcHJvZHVjZW50ZS4KICBjb25zdCBtZWpvclF1ZUFudGVzID0gZGlhc01lc1Bhc2FkbyAhPT0gbnVsbCAmJiBkaWFzRGVsTWVzICE9PSBudWxsICYmIGRpYXNNZXNQYXNhZG8gPiAwICYmIGRpYXNEZWxNZXMgPiBkaWFzTWVzUGFzYWRvCiAgY29uc3QgZGlmZXJlbmNpYSA9IChkaWFzRGVsTWVzID8/IDApIC0gKGRpYXNNZXNQYXNhZG8gPz8gMCkKCiAgcmV0dXJuICgKICAgIDxkaXYKICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC0wIHotWzcwXSBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweC02IG92ZXJmbG93LXktYXV0byIKICAgICAgc3R5bGU9e3sKICAgICAgICBiYWNrZ3JvdW5kOiAnI0ZCRUFEOScsCiAgICAgICAgb3BhY2l0eTogZW50cmFuZG8gPyAwIDogMSwKICAgICAgICB0cmFuc2l0aW9uOiAnb3BhY2l0eSAuM3MgZWFzZScsCiAgICAgIH19CiAgICA+CiAgICAgIDxwIGNsYXNzTmFtZT0iZm9udC1oZWFkaW5nIHRleHQteGwgZm9udC1leHRyYWJvbGQgdGV4dC1bIzhDNTcyRl0gbWItOCI+UmFjaGEgZGlhcmlhPC9wPgoKICAgICAgPGltZwogICAgICAgIHNyYz17aW1hZ2VufQogICAgICAgIGFsdD0iIgogICAgICAgIGNsYXNzTmFtZT0idy0zMiBoLTMyIG9iamVjdC1jb250YWluIgogICAgICAgIHN0eWxlPXt7CiAgICAgICAgICB0cmFuc2Zvcm06IGVudHJhbmRvID8gJ3NjYWxlKC43KScgOiAnc2NhbGUoMSknLAogICAgICAgICAgdHJhbnNpdGlvbjogJ3RyYW5zZm9ybSAuNDVzIGN1YmljLWJlemllciguMzQsMS41NiwuNjQsMSkgLjFzJywKICAgICAgICB9fQogICAgICAvPgoKICAgICAgPHAKICAgICAgICBjbGFzc05hbWU9ImZvbnQtaGVhZGluZyB0ZXh0LTZ4bCBmb250LWV4dHJhYm9sZCB0ZXh0LVsjQ0Q3NDIxXSBtdC02IGxlYWRpbmctbm9uZSIKICAgICAgICBzdHlsZT17eyBvcGFjaXR5OiBjYXJnYW5kbyA/IDAuMjUgOiAxLCB0cmFuc2l0aW9uOiAnb3BhY2l0eSAuMjVzIGVhc2UnIH19CiAgICAgID4KICAgICAgICB7Y2FyZ2FuZG8gPyAnwrcnIDogcmFjaGF9CiAgICAgIDwvcD4KICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWhlYWRpbmcgdGV4dC14bCBmb250LWV4dHJhYm9sZCB0ZXh0LVsjQ0Q3NDIxXSBtdC0xIj4KICAgICAgICB7Y2FyZ2FuZG8gPyAnY29udGFuZG8uLi4nIDogcmFjaGEgPT09IDEgPyAnZMOtYSBzZWd1aWRvJyA6ICdkw61hcyBzZWd1aWRvcyd9CiAgICAgIDwvcD4KCiAgICAgIHsvKiBMYSBtZWpvciByYWNoYTogdmVyIGN1w6FudG8gZmFsdGEgcGFyYSBzdXBlcmFybGEgbW90aXZhIG3DoXMgcXVlCiAgICAgICAgICBlbCBuw7ptZXJvIGFjdHVhbCBzb2xvLiBTb2xvIHNlIG11ZXN0cmEgc2kgeWEgaHVibyB1bmEgbWVqb3IuICovfQogICAgICB7IWNhcmdhbmRvICYmIG1lam9yUmFjaGEgIT09IG51bGwgJiYgcmFjaGEgIT09IG51bGwgJiYgbWVqb3JSYWNoYSA+IHJhY2hhICYmICgKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtZnVsbCBweC01IHB5LTIgbXQtMyI+CiAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEzcHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzhBNzU2MF0iPgogICAgICAgICAgICBUdSBtZWpvciByYWNoYTogPHN0cm9uZyBjbGFzc05hbWU9InRleHQtWyMzRDJCMUZdIj57bWVqb3JSYWNoYX08L3N0cm9uZz4KICAgICAgICAgIDwvcD4KICAgICAgICA8L2Rpdj4KICAgICAgKX0KICAgICAgeyFjYXJnYW5kbyAmJiByYWNoYSAhPT0gbnVsbCAmJiByYWNoYSA+IDEgJiYgcmFjaGEgPT09IG1lam9yUmFjaGEgJiYgKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyb3VuZGVkLWZ1bGwgcHgtNSBweS0yIG10LTMiIHN0eWxlPXt7IGJhY2tncm91bmQ6ICcjNENBRjdEJyB9fT4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTNweF0gZm9udC1ib2xkIHRleHQtd2hpdGUiPkVzIHR1IG1lam9yIHJhY2hhPC9wPgogICAgICAgIDwvZGl2PgogICAgICApfQoKICAgICAgey8qIExvcyDDumx0aW1vcyA3IGTDrWFzIHRlcm1pbmFuZG8gaG95LiBDb24gZWwgbm9tYnJlIHJlYWwgZGVsIGTDrWE6CiAgICAgICAgICBlcyBtw6FzIGbDoWNpbCByZWNvbm9jZXIgImF5ZXIgbm8gcmVnaXN0csOpIiBxdWUgY29udGFyIHBvc2ljaW9uZXMKICAgICAgICAgIGVuIHVuYSBzZW1hbmEgcXVlIGVtcGllemEgZWwgZG9taW5nby4gKi99CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGdhcC0yIG10LTciPgogICAgICAgIHsodWx0aW1vczcgfHwgQXJyYXkuZnJvbSh7IGxlbmd0aDogNyB9LCAoKSA9PiAoeyBsZXRyYTogJ8K3JywgaGVjaG86IGZhbHNlIH0pKSkubWFwKChkLCBpKSA9PiB7CiAgICAgICAgICBjb25zdCBlc0hveSA9IGkgPT09IDYKICAgICAgICAgIHJldHVybiAoCiAgICAgICAgICAgIDxkaXYga2V5PXtpfSBjbGFzc05hbWU9ImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC0yIj4KICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0ZXh0LVsxMHB4XSBmb250LWJvbGQgdXBwZXJjYXNlICR7ZXNIb3kgPyAndGV4dC1bI0NENzQyMV0nIDogJ3RleHQtWyNCNUEzOEZdJ31gfT4KICAgICAgICAgICAgICAgIHtkLmxldHJhfQogICAgICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgICAgICA8ZGl2CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9InctMTAgaC0xMCByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1sZyBmb250LWJvbGQiCiAgICAgICAgICAgICAgICBzdHlsZT17ZC5oZWNobwogICAgICAgICAgICAgICAgICA/IHsgYmFja2dyb3VuZDogJyNGRkJENTknLCBjb2xvcjogJyNGRkZDRjgnIH0KICAgICAgICAgICAgICAgICAgOiB7IGJhY2tncm91bmQ6ICcjRjBFMkNFJywgY29sb3I6ICcjRDZDM0FCJyB9fQogICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgIHtkLmhlY2hvID8gJ+KckycgOiAnwrcnfQogICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICkKICAgICAgICB9KX0KICAgICAgPC9kaXY+CgogICAgICA8cAogICAgICAgIGNsYXNzTmFtZT0idGV4dC1bMTRweF0gdGV4dC1bIzhBNzU2MF0gdGV4dC1jZW50ZXIgbGVhZGluZy1yZWxheGVkIG10LTcgbWF4LXcteHMiCiAgICAgICAgc3R5bGU9e3sgb3BhY2l0eTogY2FyZ2FuZG8gPyAwIDogMSwgdHJhbnNpdGlvbjogJ29wYWNpdHkgLjNzIGVhc2UnIH19CiAgICAgID4KICAgICAgICB7Y2FyZ2FuZG8gPyAnXHUwMEEwJyA6IG1lbnNhamV9CiAgICAgIDwvcD4KCiAgICAgIHttZWpvclF1ZUFudGVzICYmICgKICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEzcHhdIHRleHQtWyM4QTc1NjBdIHRleHQtY2VudGVyIG10LTMiPgogICAgICAgICAgRXN0ZSBtZXMgbGxldmFzIDxzdHJvbmcgY2xhc3NOYW1lPSJ0ZXh0LVsjQ0Q3NDIxXSI+e2RpZmVyZW5jaWF9IHtkaWZlcmVuY2lhID09PSAxID8gJ2TDrWEnIDogJ2TDrWFzJ30gbcOhczwvc3Ryb25nPiBxdWUgZWwgbWVzIHBhc2Fkby4KICAgICAgICA8L3A+CiAgICAgICl9CgogICAgICA8YnV0dG9uCiAgICAgICAgb25DbGljaz17b25DZXJyYXJ9CiAgICAgICAgY2xhc3NOYW1lPSJtdC04IG1iLTQgdy1mdWxsIG1heC13LXhzIHB5LTQgcm91bmRlZC0yeGwgZm9udC1oZWFkaW5nIGZvbnQtZXh0cmFib2xkIHRleHQtbGcgdGV4dC13aGl0ZSBhY3RpdmU6c2NhbGUtWzAuOThdIHRyYW5zaXRpb24tdHJhbnNmb3JtIgogICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICcjQ0Q3NDIxJywgYm94U2hhZG93OiAnMCA0cHggMCAjQTg1QzE4JyB9fQogICAgICA+CiAgICAgICAgQ29udGludWFyCiAgICAgIDwvYnV0dG9uPgogICAgPC9kaXY+CiAgKQp9Cg==';

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
for (const [r, d] of [[RUTA_MODAL, dModal], [RUTA_REG, dReg]]) {
  if (!fs.existsSync(d)) abortar('no se encontro ' + r + '.');
}

let reg = fs.readFileSync(dReg, 'utf8');
const modalPrevio = fs.readFileSync(dModal, 'utf8');

if (reg.includes('racha: null')) {
  abortar('la racha ya aparece de inmediato. Parece que este script ya se corrio.');
}
if (!modalPrevio.includes('hitoRacha(racha')) {
  abortar('falta el script 483. Correlo primero.');
}

const PARES = [
  { nombre: 'tipo del estado', viejo: "const [logro, setLogro] = useState<{ racha: number; mejorRacha: number; ultimos7: { letra: string; hecho: boolean }[]; diasDelMes: number; diasMesPasado: number } | null>(null)", nuevo: "const [logro, setLogro] = useState<{ racha: number | null; mejorRacha: number | null; ultimos7: { letra: string; hecho: boolean }[] | null; diasDelMes: number | null; diasMesPasado: number | null } | null>(null)" },
  { nombre: 'mostrar antes de calcular', viejo: "      const hoyL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())\n      const atras = new Date(hoyL + 'T12:00:00')\n      atras.setDate(atras.getDate() - 400)", nuevo: "      // EL MODAL APARECE PRIMERO, sin esperar nada.\n      //\n      // Antes se calculaba la racha y reci\u00e9n despu\u00e9s se mostraba: la\n      // persona miraba una pantalla congelada hasta un segundo entero,\n      // sumando el guardado m\u00e1s la consulta. Ahora ve la carita de\n      // inmediato y el n\u00famero llega solo.\n      setLogro({ racha: null, mejorRacha: null, ultimos7: null, diasDelMes: null, diasMesPasado: null })\n      setLoading(false)\n\n      const hoyL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())\n      const atras = new Date(hoyL + 'T12:00:00')\n      // 120 d\u00edas bastan: una racha m\u00e1s larga que eso es rar\u00edsima, y\n      // traer 400 costaba el triple para el mismo resultado.\n      atras.setDate(atras.getDate() - 120)" },
  { nombre: 'quitar la espera del final', viejo: "      setLogro({ racha: r, mejorRacha: mejor, ultimos7: ult7, diasDelMes: delMes, diasMesPasado: delAnterior })\n      setLoading(false)\n      return\n    } catch {", nuevo: "      setLogro({ racha: r, mejorRacha: mejor, ultimos7: ult7, diasDelMes: delMes, diasMesPasado: delAnterior })\n      return\n    } catch {" },
  { nombre: 'salida cuando falla', viejo: "    } catch {\n      // Si el c\u00e1lculo falla, se vuelve al dashboard como siempre: el\n      // registro ya se guard\u00f3, que es lo que importa.\n    }\n\n    router.push('/dashboard')\n    router.refresh()", nuevo: "    } catch {\n      // El modal YA est\u00e1 en pantalla, as\u00ed que no se puede volver al\n      // dashboard sin m\u00e1s: se completa con lo m\u00ednimo para que la\n      // persona pueda cerrarlo.\n      setLogro({ racha: 1, mejorRacha: 1, ultimos7: null, diasDelMes: null, diasMesPasado: null })\n      return\n    }\n\n    router.push('/dashboard')\n    router.refresh()" },
];

for (const p of PARES) {
  const n = contar(reg, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  reg = reg.split(p.viejo).join(p.nuevo);
}

const modal = Buffer.from(MODAL_B64, 'base64').toString('utf8');
for (const r of ['const cargando', "racha: number | null", 'contando...', 'hitoRacha(racha ?? 1)']) {
  if (!modal.includes(r)) abortar('el modal nuevo no incluye [' + r + ']. Script corrupto.');
}
console.log('  OK  el modal tolera datos que llegan despues');

// --- Verificaciones
if (!reg.includes('atras.setDate(atras.getDate() - 120)')) {
  abortar('la consulta sigue pidiendo 400 dias.');
}
// El modal tiene que mostrarse ANTES de la consulta.
const posMostrar = reg.indexOf('setLogro({ racha: null');
const posConsulta = reg.indexOf("from('registros_diarios')\n        .select('fecha, created_at')");
if (posMostrar === -1) {
  abortar('no quedo el paso que muestra el modal primero.');
}
console.log('  OK  el modal se muestra antes de consultar');

fs.writeFileSync(dModal, modal, 'utf8');
console.log('');
console.log('OK: ' + RUTA_MODAL);
fs.writeFileSync(dReg, reg, 'utf8');
console.log('OK: ' + RUTA_REG);

console.log('');
console.log('Listo. El modal deberia aparecer casi al instante, con el numero');
console.log('llegando medio segundo despues.');
