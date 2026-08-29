const fs = require('fs');
const path = require('path');

// ============================================================
// generar_487_modal_final.js
// ============================================================
// AUTONOMO: no depende de que se haya corrido ningun script anterior.
// Deja components/ModalLogro.tsx en su version final, con TODO:
//
//   - Sin el error de tipos que tumba el build ('semana' en la
//     desestructuracion cuando la interfaz dice 'ultimos7').
//   - Con los stickers reales de racha, via hitoRacha() de Novedades.
//   - Apareciendo al instante, con el numero llegando despues.
//
// Y exporta hitoRacha desde Novedades si hace falta.
//
// POR QUE ESTE SCRIPT
// El build sigue fallando con el mismo error de la version del script
// 479, lo que significa que el 483 no llego a aplicarse. En vez de
// seguir encadenando scripts que dependen unos de otros, este escribe
// el archivo completo de una vez.
//
// LO QUE NO TOCA: app/registro-diario/page.tsx. Si ya corriste el 486,
// esa parte esta bien. Si no, el modal funciona igual — solo demora un
// poco mas en aparecer.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_MODAL = 'components/ModalLogro.tsx';
const RUTA_NOV = 'components/Novedades.tsx';
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
const dNov = path.join(process.cwd(), RUTA_NOV);

if (!fs.existsSync(dNov)) abortar('no se encontro ' + RUTA_NOV + '.');
if (!fs.existsSync(dModal)) abortar('no se encontro ' + RUTA_MODAL + '. Avisale a Claude.');

let nov = fs.readFileSync(dNov, 'utf8');
const previo = fs.readFileSync(dModal, 'utf8');

// Se reconoce el archivo como propio antes de reemplazarlo.
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

// --- El modal final
const modal = Buffer.from(MODAL_B64, 'base64').toString('utf8');

for (const r of ["'use client'", 'export default function ModalLogro',
                 'ultimos7, editando', 'hitoRacha(racha', 'const cargando',
                 "import { hitoRacha } from '@/components/Novedades'"]) {
  if (!modal.includes(r)) abortar('el modal nuevo no incluye [' + r + ']. Script corrupto.');
}

// EL ERROR QUE TUMBA EL BUILD no puede estar.
if (/semana[,:]/.test(modal)) {
  abortar('el modal nuevo todavia menciona "semana". Script corrupto.');
}
console.log('  OK  el modal nuevo no tiene el error de tipos');

fs.writeFileSync(dNov, nov, 'utf8');
console.log('');
console.log('OK: ' + RUTA_NOV);
fs.writeFileSync(dModal, modal, 'utf8');
console.log('OK: ' + RUTA_MODAL);

console.log('');
console.log('El build deberia pasar. Si vuelve a fallar, pasale a Claude el');
console.log('error COMPLETO: el archivo y la linea.');
