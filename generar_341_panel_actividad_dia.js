const fs = require('fs');
const path = require('path');

// ============================================================
// generar_341_panel_actividad_dia.js
// ============================================================
// Dos cosas en el panel:
//
//  1. LISTA PLEGADA. Con 24 usuarios la lista de quienes registraron
//     ya ocupaba media pantalla. Ahora va plegada, con el numero al
//     lado, para que esto siga sirviendo con 100 usuarios.
//
//  2. OTRA ACTIVIDAD. Hasta ahora el panel solo veia el registro
//     diario. Se agregan los demas "registros" que la gente guarda:
//     vacunas, antiparasitarios, visitas al veterinario, medicamentos,
//     pesos, observaciones, examenes, examenes de laboratorio,
//     revisiones corporales y momentos.
//
//     Se muestra un resumen por tipo sin desplegar
//     ("💉 2 vacunas · 🏥 1 visita") y el detalle de quien hizo que
//     dentro de un plegable.
//
// UNA ACLARACION IMPORTANTE SOBRE LAS FECHAS
// Se usa la fecha del EVENTO (cuando se puso la vacuna), no la de
// cuando se escribio en la app. Son casi siempre la misma, pero si
// alguien registra hoy una vacuna de hace un mes, aparecera en el dia
// de la vacuna. Es la fecha que la app guarda de forma confiable en
// todas estas tablas.
//
// REQUISITO: scripts 337 a 340 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA_COMPONENTE = 'components/PanelDia.tsx';
const RUTA_PANEL = 'app/admin/page.tsx';

const PANELDIA_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUEFORUwgRMONQSDigJQgc2VsZWN0b3IgZGUgZMOtYSBkZWwgcGFuZWwgaW50ZXJubwovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUE9SIFFVw4kgRVMgVU4gQ09NUE9ORU5URSBERSBDTElFTlRFCi8vIExhIHByaW1lcmEgdmVyc2nDs24gbW92w61hIGVsIGTDrWEgY29uIGVubGFjZXMgKD9kPS4uLiksIGxvIHF1ZQovLyByZWNhcmdhYmEgbGEgcMOhZ2luYSBlbnRlcmEgZW4gY2FkYSBjbGljay4gQWPDoSBlbCBzZXJ2aWRvciBtYW5kYSBkZQovLyB1bmEgdmV6IGxvcyDDumx0aW1vcyA2MCBkw61hcyB5YSBjYWxjdWxhZG9zIHkgZWwgY2FtYmlvIGRlIGTDrWEgZXMKLy8gcHVybyBlc3RhZG8gbG9jYWw6IGluc3RhbnTDoW5lbywgc2luIGlkYSB5IHZ1ZWx0YS4KLy8KLy8gUVXDiSBNVUVTVFJBCi8vICAxLiBUaXJhIGRlIDE0IGTDrWFzIGNvbiBsYSBjYW50aWRhZCBkZSBwZXJzb25hcyBhY3RpdmFzIGNhZGEgdW5vLiBFcwovLyAgICAgbGEgdmVudGFuYSBxdWUgR29vZ2xlIFBsYXkgcGlkZSBkZW1vc3RyYXIgcGFyYSBzYWxpciBkZSBjbG9zZWQKLy8gICAgIHRlc3RpbmcgKDEyKyB0ZXN0ZXJzIGFjdGl2b3MgZHVyYW50ZSAxNCBkw61hcyBzZWd1aWRvcyksIGFzw60gcXVlCi8vICAgICBzaXJ2ZSBkZSBuYXZlZ2FjacOzbiB5IGRlIGV2aWRlbmNpYSBhIGxhIHZlei4KLy8gIDIuIFF1acOpbmVzIGhpY2llcm9uIHN1IFJFR0lTVFJPIERJQVJJTyBlc2UgZMOtYSwgY29uIHN1cyBtYXNjb3Rhcy4KLy8gIDMuIE9UUkEgQUNUSVZJREFEIGRlIGVzZSBkw61hOiB2YWN1bmFzLCB2aXNpdGFzIGFsIHZldGVyaW5hcmlvLAovLyAgICAgcGVzb3MsIGV4w6FtZW5lcywgbW9tZW50b3MuLi4gdG9kbyBsbyBxdWUgbGEgZ2VudGUgZ3VhcmRhIGVuIGxhCi8vICAgICBhcHAgeSBxdWUgbm8gZXMgZWwgcmVnaXN0cm8gZGlhcmlvLgovLwovLyBMYXMgZG9zIGxpc3RhcyB2YW4gcGxlZ2FkYXMgcG9yIGRlZmVjdG86IGNvbiAyNCB1c3VhcmlvcyB5YSBvY3VwYWJhbgovLyBtZWRpYSBwYW50YWxsYSwgeSBsYSBpZGVhIGVzIHF1ZSBlc3RvIHNpZ2Egc2lydmllbmRvIGNvbiAxMDAuCgppbnRlcmZhY2UgTWFzY290YURpYSB7CiAgbm9tYnJlOiBzdHJpbmcKICBlc3BlY2llOiBzdHJpbmcKfQppbnRlcmZhY2UgVXN1YXJpb0RpYSB7CiAgbm9tYnJlOiBzdHJpbmcKICBtYXNjb3RhczogTWFzY290YURpYVtdCn0KaW50ZXJmYWNlIE90cm9SZWdpc3RybyB7CiAgZW1vamk6IHN0cmluZwogIGxhYmVsOiBzdHJpbmcKICBxdWllbjogc3RyaW5nCiAgZGV0YWxsZTogc3RyaW5nCn0KZXhwb3J0IGludGVyZmFjZSBEaWFQYW5lbCB7CiAgZmVjaGE6IHN0cmluZwogIHVzdWFyaW9zOiBVc3VhcmlvRGlhW10KICBvdHJvczogT3Ryb1JlZ2lzdHJvW10KfQoKY29uc3QgRElBU19TRU0gPSBbJ2RvbWluZ28nLCAnbHVuZXMnLCAnbWFydGVzJywgJ21pw6lyY29sZXMnLCAnanVldmVzJywgJ3ZpZXJuZXMnLCAnc8OhYmFkbyddCmNvbnN0IE1FU0VTX0xBUkdPID0gWydlbmVybycsICdmZWJyZXJvJywgJ21hcnpvJywgJ2FicmlsJywgJ21heW8nLCAnanVuaW8nLCAnanVsaW8nLCAnYWdvc3RvJywgJ3NlcHRpZW1icmUnLCAnb2N0dWJyZScsICdub3ZpZW1icmUnLCAnZGljaWVtYnJlJ10KCi8vIE1lZGlvZMOtYTogY29uc3RydWlyIGxhIGZlY2hhIGEgbWVkaWFub2NoZSBzZSBjYWUgZW4gbG9zIGNhbWJpb3MgZGUKLy8gaG9yYXJpbyBkZSB2ZXJhbm8geSBwdWVkZSBjb3JyZXIgZWwgZMOtYSBkZSBsYSBzZW1hbmEuCmZ1bmN0aW9uIGZtdExhcmdhKGlzbzogc3RyaW5nKTogc3RyaW5nIHsKICBjb25zdCBkID0gbmV3IERhdGUoaXNvICsgJ1QxMjowMDowMCcpCiAgcmV0dXJuIGAke0RJQVNfU0VNW2QuZ2V0RGF5KCldfSAke2QuZ2V0RGF0ZSgpfSBkZSAke01FU0VTX0xBUkdPW2QuZ2V0TW9udGgoKV19YAp9CgpmdW5jdGlvbiBlbW9qaUVzcGVjaWUoZXNwZWNpZTogc3RyaW5nKTogc3RyaW5nIHsKICBpZiAoZXNwZWNpZSA9PT0gJ1BlcnJvJykgcmV0dXJuICfwn5C2JwogIGlmIChlc3BlY2llID09PSAnR2F0bycpIHJldHVybiAn8J+QsScKICByZXR1cm4gJ/CfkL4nCn0KCmZ1bmN0aW9uIGNvbG9yRGlhKG46IG51bWJlcik6IHN0cmluZyB7CiAgaWYgKG4gPj0gMTIpIHJldHVybiAnIzRDQUY3RCcKICBpZiAobiA+PSA2KSByZXR1cm4gJyNGNUM4NDInCiAgaWYgKG4gPj0gMSkgcmV0dXJuICcjRjA3QTMwJwogIHJldHVybiAnI0VFRTJENCcKfQoKZnVuY3Rpb24gUGxlZ2FibGUoeyB0aXR1bG8sIG4sIGNoaWxkcmVuIH06IHsgdGl0dWxvOiBzdHJpbmc7IG46IG51bWJlcjsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9KSB7CiAgY29uc3QgW2FiaWVydG8sIHNldEFiaWVydG9dID0gdXNlU3RhdGUoZmFsc2UpCiAgaWYgKG4gPT09IDApIHJldHVybiBudWxsCiAgcmV0dXJuICgKICAgIDxkaXYgY2xhc3NOYW1lPSJtdC0zIHB0LTIuNSBib3JkZXItdCBib3JkZXItWyNFRUUyRDRdIj4KICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRBYmllcnRvKHYgPT4gIXYpfSBjbGFzc05hbWU9InctZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LWxlZnQiPgogICAgICAgIDxwIGNsYXNzTmFtZT0iZmxleC0xIHRleHQtWzExcHhdIGZvbnQtYm9sZCB0ZXh0LVsjOEM1NzJGXSI+e3RpdHVsb308L3A+CiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdGV4dC1bIzFBMTIwMF0gYmctWyNGRkJENTldIHJvdW5kZWQtZnVsbCBweC0yIHB5LTAuNSI+e259PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1bIzhDNTcyRl0gdGV4dC1zbSBmb250LWJvbGQiPnthYmllcnRvID8gJ+KWsicgOiAn4pa8J308L3NwYW4+CiAgICAgIDwvYnV0dG9uPgogICAgICB7YWJpZXJ0byAmJiA8ZGl2IGNsYXNzTmFtZT0ibXQtMi41Ij57Y2hpbGRyZW59PC9kaXY+fQogICAgPC9kaXY+CiAgKQp9CgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQYW5lbERpYSh7IGRpYXMsIHRvdGFsVXN1YXJpb3MgfTogeyBkaWFzOiBEaWFQYW5lbFtdOyB0b3RhbFVzdWFyaW9zOiBudW1iZXIgfSkgewogIC8vIEVsIMO6bHRpbW8gZWxlbWVudG8gZXMgaG95OiBlbCBzZXJ2aWRvciBsb3MgbWFuZGEgZW4gb3JkZW4uCiAgY29uc3QgdWx0aW1vID0gZGlhcy5sZW5ndGggLSAxCiAgY29uc3QgW3NlbCwgc2V0U2VsXSA9IHVzZVN0YXRlKHVsdGltbykKCiAgaWYgKGRpYXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbAoKICBjb25zdCBkaWEgPSBkaWFzW3NlbF0KICBjb25zdCBlc0hveSA9IHNlbCA9PT0gdWx0aW1vCiAgY29uc3QgYW50ZXJpb3IgPSBzZWwgPiAwID8gZGlhc1tzZWwgLSAxXSA6IG51bGwKCiAgLy8gTG9zIDE0IGTDrWFzIHF1ZSB0ZXJtaW5hbiBlbiBlbCBlbGVnaWRvLgogIGNvbnN0IGRlc2RlID0gTWF0aC5tYXgoMCwgc2VsIC0gMTMpCiAgY29uc3QgdGlyYSA9IGRpYXMuc2xpY2UoZGVzZGUsIHNlbCArIDEpCgogIC8vIFJlc3VtZW4gZGUgbGEgb3RyYSBhY3RpdmlkYWQsIGFncnVwYWRvIHBvciB0aXBvLCBwYXJhIG1vc3RyYXJsbwogIC8vIGNvbW8gdW5hIGzDrW5lYSBjb3J0YSBzaW4gdGVuZXIgcXVlIGRlc3BsZWdhciBuYWRhLgogIGNvbnN0IHBvclRpcG8gPSBuZXcgTWFwPHN0cmluZywgeyBlbW9qaTogc3RyaW5nOyBuOiBudW1iZXIgfT4oKQogIGZvciAoY29uc3QgbyBvZiBkaWEub3Ryb3MpIHsKICAgIGNvbnN0IGFjdHVhbCA9IHBvclRpcG8uZ2V0KG8ubGFiZWwpIHx8IHsgZW1vamk6IG8uZW1vamksIG46IDAgfQogICAgYWN0dWFsLm4rKwogICAgcG9yVGlwby5zZXQoby5sYWJlbCwgYWN0dWFsKQogIH0KICBjb25zdCByZXN1bWVuT3Ryb3MgPSBBcnJheS5mcm9tKHBvclRpcG8uZW50cmllcygpKS5zb3J0KChhLCBiKSA9PiBiWzFdLm4gLSBhWzFdLm4pCgogIHJldHVybiAoCiAgICA8ZGl2IGNsYXNzTmFtZT0ibXgtNCBtYi00Ij4KICAgICAgPGgyIGNsYXNzTmFtZT0idGV4dC14cyBmb250LWJvbGQgdGV4dC1bIzhDNTcyRl0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIG1iLTIiPkFjdGl2aWRhZCBwb3IgZMOtYTwvaDI+CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJiZy1bI0ZGRkNGOF0gcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1bI0VFRTJENF0gcC00Ij4KCiAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggZ2FwLTAuNSBtYi0zIj4KICAgICAgICAgIHt0aXJhLm1hcCgodCwgaSkgPT4gewogICAgICAgICAgICBjb25zdCBpZHggPSBkZXNkZSArIGkKICAgICAgICAgICAgY29uc3QgbiA9IHQudXN1YXJpb3MubGVuZ3RoCiAgICAgICAgICAgIHJldHVybiAoCiAgICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgICAga2V5PXt0LmZlY2hhfQogICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsKGlkeCl9CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9ImZsZXgtMSB0ZXh0LWNlbnRlciByb3VuZGVkLWxnIHB5LTEiCiAgICAgICAgICAgICAgICBzdHlsZT17aWR4ID09PSBzZWwKICAgICAgICAgICAgICAgICAgPyB7IGJhY2tncm91bmQ6IGNvbG9yRGlhKG4pLCBib3JkZXI6ICcycHggc29saWQgIzNEMkIxRicgfQogICAgICAgICAgICAgICAgICA6IHsgYmFja2dyb3VuZDogY29sb3JEaWEobiksIGJvcmRlcjogJzJweCBzb2xpZCB0cmFuc3BhcmVudCcgfX0KICAgICAgICAgICAgICA+CiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHRleHQtWzhweF0gdGV4dC1bIzNEMkIxRl0vNzAiPntOdW1iZXIodC5mZWNoYS5zbGljZSg4LCAxMCkpfTwvc3Bhbj4KICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iYmxvY2sgdGV4dC1bMTFweF0gZm9udC1ib2xkIHRleHQtWyMzRDJCMUZdIj57bn08L3NwYW4+CiAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICkKICAgICAgICAgIH0pfQogICAgICAgIDwvZGl2PgoKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIj4KICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsKHMgPT4gTWF0aC5tYXgoMCwgcyAtIDEpKX0KICAgICAgICAgICAgZGlzYWJsZWQ9e3NlbCA9PT0gMH0KICAgICAgICAgICAgY2xhc3NOYW1lPSJ0ZXh0LWxnIHB4LTIgZGlzYWJsZWQ6b3BhY2l0eS0yNSIKICAgICAgICAgICAgc3R5bGU9e3sgY29sb3I6ICcjOEM1NzJGJyB9fQogICAgICAgICAgPgogICAgICAgICAgICDil4AKICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9InRleHQtY2VudGVyIGZsZXgtMSI+CiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC14cyB0ZXh0LVsjOEE3NTYwXSBjYXBpdGFsaXplIj4KICAgICAgICAgICAgICB7Zm10TGFyZ2EoZGlhLmZlY2hhKX17ZXNIb3kgPyAnIMK3IGhveScgOiAnJ30KICAgICAgICAgICAgPC9wPgogICAgICAgICAgICA8cCBjbGFzc05hbWU9ImZvbnQtYm9sZCB0ZXh0LTJ4bCBtdC0wLjUiIHN0eWxlPXt7IGNvbG9yOiBkaWEudXN1YXJpb3MubGVuZ3RoID4gMCA/ICcjNENBRjdEJyA6ICcjQjVBMzhGJyB9fT4KICAgICAgICAgICAgICB7ZGlhLnVzdWFyaW9zLmxlbmd0aH0gPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIGZvbnQtbm9ybWFsIHRleHQtWyM4QTc1NjBdIj5kZSB7dG90YWxVc3Vhcmlvc308L3NwYW4+CiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSB0ZXh0LVsjOEE3NTYwXSI+aGljaWVyb24gc3UgcmVnaXN0cm8gZGlhcmlvPC9wPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbChzID0+IE1hdGgubWluKHVsdGltbywgcyArIDEpKX0KICAgICAgICAgICAgZGlzYWJsZWQ9e2VzSG95fQogICAgICAgICAgICBjbGFzc05hbWU9InRleHQtbGcgcHgtMiBkaXNhYmxlZDpvcGFjaXR5LTI1IgogICAgICAgICAgICBzdHlsZT17eyBjb2xvcjogJyM4QzU3MkYnIH19CiAgICAgICAgICA+CiAgICAgICAgICAgIOKWtgogICAgICAgICAgPC9idXR0b24+CiAgICAgICAgPC9kaXY+CgogICAgICAgIHtkaWEudXN1YXJpb3MubGVuZ3RoID09PSAwICYmIGRpYS5vdHJvcy5sZW5ndGggPT09IDAgJiYgKAogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIG10LTIgdGV4dC1jZW50ZXIiPgogICAgICAgICAgICB7ZXNIb3kgPyAnVG9kYXbDrWEgbm8gaGF5IGFjdGl2aWRhZCBob3kuJyA6ICdTaW4gYWN0aXZpZGFkIGVzZSBkw61hLid9CiAgICAgICAgICA8L3A+CiAgICAgICAgKX0KCiAgICAgICAgPFBsZWdhYmxlIHRpdHVsbz0iUXVpw6luZXMgcmVnaXN0cmFyb24iIG49e2RpYS51c3Vhcmlvcy5sZW5ndGh9PgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9InNwYWNlLXktMS41Ij4KICAgICAgICAgICAge2RpYS51c3Vhcmlvcy5tYXAoKHUsIGkpID0+ICgKICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWJhc2VsaW5lIGp1c3RpZnktYmV0d2VlbiBnYXAtMiI+CiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQteHMgdGV4dC1bIzNEMkIxRl0gdHJ1bmNhdGUiPnt1Lm5vbWJyZX08L3A+CiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEwcHhdIHRleHQtWyM4QTc1NjBdIGZsZXgtc2hyaW5rLTAgdHJ1bmNhdGUiPgogICAgICAgICAgICAgICAgICB7dS5tYXNjb3Rhcy5tYXAobSA9PiBgJHtlbW9qaUVzcGVjaWUobS5lc3BlY2llKX0gJHttLm5vbWJyZX1gKS5qb2luKCcgwrcgJyl9CiAgICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICkpfQogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9QbGVnYWJsZT4KCiAgICAgICAgey8qIE90cmEgYWN0aXZpZGFkOiB0b2RvIGxvIHF1ZSBsYSBnZW50ZSBndWFyZGEgZW4gbGEgYXBwIHkgcXVlCiAgICAgICAgICAgIE5PIGVzIGVsIHJlZ2lzdHJvIGRpYXJpby4gRWwgcmVzdW1lbiBwb3IgdGlwbyBzZSB2ZSBzaW4KICAgICAgICAgICAgZGVzcGxlZ2FyOyBlbCBkZXRhbGxlIGRlIHF1acOpbiBoaXpvIHF1w6ksIGFkZW50cm8uICovfQogICAgICAgIHtyZXN1bWVuT3Ryb3MubGVuZ3RoID4gMCAmJiAoCiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibXQtMyBwdC0yLjUgYm9yZGVyLXQgYm9yZGVyLVsjRUVFMkQ0XSI+CiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTFweF0gdGV4dC1bIzNEMkIxRl0gbGVhZGluZy1yZWxheGVkIj4KICAgICAgICAgICAgICB7cmVzdW1lbk90cm9zLm1hcCgoW2xhYmVsLCB2XSkgPT4gYCR7di5lbW9qaX0gJHt2Lm59ICR7bGFiZWx9JHt2Lm4gPiAxID8gJ3MnIDogJyd9YCkuam9pbignIMK3ICcpfQogICAgICAgICAgICA8L3A+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICApfQoKICAgICAgICA8UGxlZ2FibGUgdGl0dWxvPSJEZXRhbGxlIGRlIGxhIG90cmEgYWN0aXZpZGFkIiBuPXtkaWEub3Ryb3MubGVuZ3RofT4KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJzcGFjZS15LTEuNSI+CiAgICAgICAgICAgIHtkaWEub3Ryb3MubWFwKChvLCBpKSA9PiAoCiAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1iYXNlbGluZSBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIiPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyMzRDJCMUZdIHRydW5jYXRlIj4KICAgICAgICAgICAgICAgICAge28uZW1vaml9IHtvLmRldGFsbGV9CiAgICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzEwcHhdIHRleHQtWyM4QTc1NjBdIGZsZXgtc2hyaW5rLTAgdHJ1bmNhdGUiPntvLnF1aWVufTwvcD4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKSl9CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L1BsZWdhYmxlPgoKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG10LTMgcHQtMiBib3JkZXItdCBib3JkZXItWyNFRUUyRDRdIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTBweF0gdGV4dC1bIzhBNzU2MF0iPgogICAgICAgICAgICB7YW50ZXJpb3IKICAgICAgICAgICAgICA/IGBFbCBkw61hIGFudGVyaW9yOiAke2FudGVyaW9yLnVzdWFyaW9zLmxlbmd0aH0gJHthbnRlcmlvci51c3Vhcmlvcy5sZW5ndGggPT09IDEgPyAndXN1YXJpbycgOiAndXN1YXJpb3MnfWAKICAgICAgICAgICAgICA6ICdTaW4gZGF0b3MgYW50ZXJpb3Jlcyd9CiAgICAgICAgICA8L3A+CiAgICAgICAgICB7IWVzSG95ICYmICgKICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRTZWwodWx0aW1vKX0gY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdGV4dC1bI0NENzQyMV0iPgogICAgICAgICAgICAgIFZvbHZlciBhIGhveQogICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgICl9CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgKQp9Cg==';

const PARES = [
  // ---------------------------------------------------------
  // 1. Consultar las demas tablas de actividad
  // ---------------------------------------------------------
  {
    nombre: 'consulta de otra actividad',
    viejo: "  // ---------- Quiénes registraron cada día ----------",
    nuevo: [
      "  // ---------- Otra actividad, más allá del registro diario ----------",
      "  // Todo lo que la gente guarda en la app y que no es el registro",
      "  // del día. Se usa la fecha del EVENTO (cuándo se puso la vacuna),",
      "  // no la de cuándo se escribió: es la que todas estas tablas",
      "  // guardan de forma confiable.",
      "  const [",
      "    { data: vacunas },",
      "    { data: antis },",
      "    { data: meds },",
      "    { data: pesos },",
      "    { data: obs },",
      "    { data: exams },",
      "    { data: examsLab },",
      "    { data: revis },",
      "  ] = await Promise.all([",
      "    db.from('vacunas').select('mascota_id, nombre, fecha_aplicacion'),",
      "    db.from('antiparasitarios').select('mascota_id, nombre, fecha_aplicacion'),",
      "    db.from('medicamentos').select('mascota_id, nombre, fecha_inicio'),",
      "    db.from('historial_peso').select('mascota_id, peso, fecha'),",
      "    db.from('observaciones').select('mascota_id, titulo, fecha_inicio'),",
      "    db.from('examenes').select('mascota_id, nombre, categoria, fecha'),",
      "    db.from('examenes_lab').select('mascota_id, tipo, fecha'),",
      "    db.from('revisiones_corporales').select('mascota_id, fecha'),",
      "  ])",
      "",
      "  // ---------- Quiénes registraron cada día ----------",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Armar la actividad por fecha
  // ---------------------------------------------------------
  {
    nombre: 'agrupacion de la otra actividad',
    viejo: "  const diasPanel: DiaPanel[] = Array.from({ length: 60 }, (_, i) => {",
    nuevo: [
      "  // Cada fuente se normaliza a la misma forma. Si una consulta",
      "  // fallara, su lista llega vacía y el resto sigue funcionando.",
      "  const otrosPorFecha = new Map<string, { emoji: string; label: string; quien: string; detalle: string }[]>()",
      "",
      "  const agregarOtro = (mascotaId: string, fecha: string | null, emoji: string, label: string, detalle: string) => {",
      "    if (!fecha) return",
      "    const mm = mascPorId.get(mascotaId)",
      "    if (!mm) return // mascota de otra cuenta o de la cuenta de pruebas",
      "    const f = String(fecha).slice(0, 10)",
      "    const arr = otrosPorFecha.get(f) || []",
      "    arr.push({",
      "      emoji,",
      "      label,",
      "      quien: `${nombrePorUsuario.get(mm.user_id) || '(sin nombre)'} · ${mm.nombre}`,",
      "      detalle,",
      "    })",
      "    otrosPorFecha.set(f, arr)",
      "  }",
      "",
      "  for (const v of (vacunas || [])) agregarOtro(v.mascota_id, v.fecha_aplicacion, '💉', 'vacuna', v.nombre || 'Vacuna')",
      "  for (const a of (antis || [])) agregarOtro(a.mascota_id, a.fecha_aplicacion, '🪱', 'antiparasitario', a.nombre || 'Antiparasitario')",
      "  for (const md of (meds || [])) agregarOtro(md.mascota_id, md.fecha_inicio, '💊', 'medicamento', md.nombre || 'Medicamento')",
      "  for (const pz of (pesos || [])) agregarOtro(pz.mascota_id, pz.fecha, '⚖️', 'peso', `Peso: ${pz.peso} kg`)",
      "  for (const o of (obs || [])) agregarOtro(o.mascota_id, o.fecha_inicio, '🔍', 'observación', o.titulo || 'Observación')",
      "  for (const ex of (exams || [])) agregarOtro(ex.mascota_id, ex.fecha, '📄', 'examen', ex.nombre || ex.categoria || 'Examen')",
      "  for (const el of (examsLab || [])) agregarOtro(el.mascota_id, el.fecha, '🧫', 'examen de lab', el.tipo || 'Examen de laboratorio')",
      "  for (const rv of (revis || [])) agregarOtro(rv.mascota_id, rv.fecha, '🩺', 'revisión corporal', 'Revisión corporal')",
      "",
      "  // Visitas y momentos vienen por user_id, no por mascota.",
      "  for (const vt of (visitas || [])) {",
      "    if (!ids.has(vt.user_id) || !vt.fecha) continue",
      "    const f = String(vt.fecha).slice(0, 10)",
      "    const arr = otrosPorFecha.get(f) || []",
      "    arr.push({ emoji: '🏥', label: 'visita al vet', quien: nombrePorUsuario.get(vt.user_id) || '(sin nombre)', detalle: 'Visita al veterinario' })",
      "    otrosPorFecha.set(f, arr)",
      "  }",
      "  for (const mo of (momentos || [])) {",
      "    if (!ids.has(mo.user_id) || !mo.fecha) continue",
      "    const f = String(mo.fecha).slice(0, 10)",
      "    const arr = otrosPorFecha.get(f) || []",
      "    arr.push({ emoji: '✨', label: 'momento', quien: nombrePorUsuario.get(mo.user_id) || '(sin nombre)', detalle: 'Momento registrado' })",
      "    otrosPorFecha.set(f, arr)",
      "  }",
      "",
      "  const diasPanel: DiaPanel[] = Array.from({ length: 60 }, (_, i) => {",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Incluirla en el payload de cada dia
  // ---------------------------------------------------------
  {
    nombre: 'otra actividad en el payload',
    viejo: [
      "        .sort((a, b) => a.nombre.localeCompare(b.nombre)),",
      "    }",
      "  })",
    ].join('\n'),
    nuevo: [
      "        .sort((a, b) => a.nombre.localeCompare(b.nombre)),",
      "      otros: otrosPorFecha.get(f) || [],",
      "    }",
      "  })",
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

// --- Verificar el panel ANTES de tocar el componente
const destinoPanel = path.join(process.cwd(), RUTA_PANEL);
if (!fs.existsSync(destinoPanel)) {
  abortar('no se encontro ' + RUTA_PANEL + '. Corre primero los scripts 337 a 340.');
}
const destinoComp = path.join(process.cwd(), RUTA_COMPONENTE);
if (!fs.existsSync(destinoComp)) {
  abortar('no se encontro ' + RUTA_COMPONENTE + '. Corre primero el script 340.');
}

let panel = fs.readFileSync(destinoPanel, 'utf8');

if (panel.includes('otrosPorFecha')) {
  abortar('el panel ya tiene la otra actividad. Parece que este script ya se corrio.');
}
if (!panel.includes('diasPanel')) {
  abortar('falta la preparacion de los dias. Corre primero el script 340.');
}

for (const p of PARES) {
  const n = contar(panel, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  panel = panel.split(p.viejo).join(p.nuevo);
}

const ESPERADOS = ['const otrosPorFecha', 'const agregarOtro', 'otros: otrosPorFecha.get(f) || []'];
for (const e of ESPERADOS) {
  if (contar(panel, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

// --- Componente
const comp = Buffer.from(PANELDIA_B64, 'base64').toString('utf8');
for (const r of ['export default function PanelDia', 'function Plegable', 'otros: OtroRegistro[]']) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMPONENTE);
fs.writeFileSync(destinoPanel, panel, 'utf8');
console.log('OK: ' + RUTA_PANEL);
console.log('');
console.log('Listo. El panel ya muestra toda la actividad, no solo el registro diario.');
