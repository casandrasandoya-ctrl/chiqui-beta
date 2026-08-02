const fs = require('fs');
const path = require('path');

// ============================================================
// generar_343_panel_semanas.js
// ============================================================
// En la vista de MES, el grafico de 31 barras se reemplaza por el mes
// desglosado en SEMANAS PLEGABLES.
//
// POR QUE
// 31 barras en un telefono son ilegibles: los numeros quedan diminutos
// y se pisan. Pero promediar el mes en 4 barras borra el detalle (que
// dia fue el record, cuando empezo a subir).
//
// Asi se conservan las dos cosas: cada semana muestra su promedio
// diario sin desplegar, y adentro esta el detalle dia por dia con su
// propio grafico. Se revisa solo la semana que interesa.
//
// SEMANAS DE CALENDARIO
// Se agrupa de lunes a domingo, no en bloques de 7 dias desde el 1. Si
// se cortara cada 7 dias, las "semanas" de julio 2026 irian de
// miercoles a martes, mezclando fines de semana.
//
// Por eso un mes puede dar 4, 5 o 6 semanas, con la primera y la
// ultima incompletas. Verificado: julio 2026 da 5 (5+7+7+7+5) y agosto
// 2026 da 6 (2+7+7+7+7+1). Las incompletas lo indican, y el resumen
// muestra PROMEDIO diario y no total, porque una semana de 3 dias no
// se compara con una de 7.
//
// La semana y el año conservan su grafico de barras: ahi no hay
// problema de legibilidad.
//
// REQUISITO: scripts 337 a 342 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA_COMPONENTE = 'components/PanelSemanas.tsx';
const RUTA_PANEL = 'app/admin/page.tsx';

const PANELSEMANAS_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUEFORUwgU0VNQU5BUyDigJQgZWwgbWVzIGRlc2dsb3NhZG8sIHNlbWFuYSBwb3Igc2VtYW5hCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBQT1IgUVXDiQovLyBVbiBtZXMgZW4gMzEgYmFycmFzIGVzIGlsZWdpYmxlIGVuIHVuIHRlbMOpZm9ubzogbG9zIG7Dum1lcm9zIHF1ZWRhbgovLyBkaW1pbnV0b3MgeSBzZSBwaXNhbiBlbnRyZSBlbGxvcy4gUGVybyBwcm9tZWRpYXIgZWwgbWVzIGVuIDQgbyA1Ci8vIGJhcnJhcyBib3JyYSBlbCBkZXRhbGxlIChxdcOpIGTDrWEgZnVlIGVsIHLDqWNvcmQsIGN1w6FuZG8gZW1wZXrDsyBhCi8vIHN1YmlyKS4KLy8KLy8gQWPDoSBzZSBjb25zZXJ2YW4gbGFzIGRvcyBjb3NhczogY2FkYSBzZW1hbmEgbXVlc3RyYSBzdSByZXN1bWVuIHNpbgovLyBkZXNwbGVnYXIsIHkgYWRlbnRybyBlc3TDoSBlbCBkZXRhbGxlIGTDrWEgcG9yIGTDrWEgY29uIHN1IHByb3BpbwovLyBncsOhZmljby4gQXPDrSBzZSByZXZpc2Egc29sbyBsYSBzZW1hbmEgcXVlIGludGVyZXNhLgovLwovLyBTRU1BTkFTIERFIENBTEVOREFSSU8sIE5PIEJMT1FVRVMgREUgNyBEw41BUwovLyBTZSBhZ3J1cGEgZGUgbHVuZXMgYSBkb21pbmdvLiBTaSBzZSBjb3J0YXJhIGNhZGEgNyBkw61hcyBkZXNkZSBlbCAxLAovLyBsYXMgInNlbWFuYXMiIGRlIGp1bGlvIDIwMjYgaXLDrWFuIGRlIG1pw6lyY29sZXMgYSBtYXJ0ZXMsIG1lemNsYW5kbwovLyBmaW5lcyBkZSBzZW1hbmEgeSB2b2x2aWVuZG8gZWwgcHJvbWVkaW8gcG9jbyBjb21wYXJhYmxlLgovLwovLyBDb21vIGNvbnNlY3VlbmNpYSwgdW4gbWVzIHB1ZWRlIGRhciA0LCA1IG8gaGFzdGEgNiBzZW1hbmFzLCB5IGxhCi8vIHByaW1lcmEgeSBsYSDDumx0aW1hIHN1ZWxlbiBlc3RhciBpbmNvbXBsZXRhcy4gRXNvIHNlIGluZGljYTogdW5hCi8vIHNlbWFuYSBkZSAzIGTDrWFzIG5vIHNlIGNvbXBhcmEgY29uIHVuYSBkZSA3LCB5IHBvciBlc28gZWwgcmVzdW1lbgovLyBtdWVzdHJhIGVsIFBST01FRElPIGRpYXJpbyB5IG5vIGVsIHRvdGFsLgoKaW50ZXJmYWNlIERpYVNlcmllIHsKICBmZWNoYTogc3RyaW5nCiAgdmFsb3I6IG51bWJlcgp9Cgpjb25zdCBMRVRSQV9ESUEgPSBbJ0wnLCAnTScsICdNJywgJ0onLCAnVicsICdTJywgJ0QnXQpjb25zdCBNRVNFU19MQVJHTyA9IFsnZW5lcm8nLCAnZmVicmVybycsICdtYXJ6bycsICdhYnJpbCcsICdtYXlvJywgJ2p1bmlvJywgJ2p1bGlvJywgJ2Fnb3N0bycsICdzZXB0aWVtYnJlJywgJ29jdHVicmUnLCAnbm92aWVtYnJlJywgJ2RpY2llbWJyZSddCgovLyBNZWRpb2TDrWE6IGEgbWVkaWFub2NoZSBsb3MgY2FtYmlvcyBkZSBob3JhcmlvIGRlIHZlcmFubyBwdWVkZW4KLy8gY29ycmVyIGVsIGTDrWEgZGUgbGEgc2VtYW5hLgpmdW5jdGlvbiBpbmRpY2VEaWFTZW1hbmEoaXNvOiBzdHJpbmcpOiBudW1iZXIgewogIGNvbnN0IGQgPSBuZXcgRGF0ZShpc28gKyAnVDEyOjAwOjAwJykKICByZXR1cm4gKGQuZ2V0RGF5KCkgKyA2KSAlIDcgLy8gMCA9IGx1bmVzCn0KCmZ1bmN0aW9uIG51bURpYShpc286IHN0cmluZyk6IG51bWJlciB7CiAgcmV0dXJuIE51bWJlcihpc28uc2xpY2UoOCwgMTApKQp9CgpmdW5jdGlvbiBTZW1hbmEoeyBuLCBkaWFzLCBtYXhNZXMgfTogeyBuOiBudW1iZXI7IGRpYXM6IERpYVNlcmllW107IG1heE1lczogbnVtYmVyIH0pIHsKICBjb25zdCBbYWJpZXJ0YSwgc2V0QWJpZXJ0YV0gPSB1c2VTdGF0ZShmYWxzZSkKCiAgY29uc3QgdG90YWwgPSBkaWFzLnJlZHVjZSgoYSwgZCkgPT4gYSArIGQudmFsb3IsIDApCiAgY29uc3QgcHJvbWVkaW8gPSBkaWFzLmxlbmd0aCA+IDAgPyB0b3RhbCAvIGRpYXMubGVuZ3RoIDogMAogIGNvbnN0IG1heCA9IE1hdGgubWF4KDAsIC4uLmRpYXMubWFwKGQgPT4gZC52YWxvcikpCiAgY29uc3QgbWVqb3IgPSBkaWFzLmZpbmQoZCA9PiBkLnZhbG9yID09PSBtYXgpCiAgY29uc3QgaW5jb21wbGV0YSA9IGRpYXMubGVuZ3RoIDwgNwoKICBjb25zdCBjb2xvciA9IHByb21lZGlvID49IDEyID8gJyM0Q0FGN0QnIDogcHJvbWVkaW8gPj0gNiA/ICcjRjVDODQyJyA6IHByb21lZGlvID49IDEgPyAnI0YwN0EzMCcgOiAnI0I1QTM4RicKICBjb25zdCBtZXNOb21icmUgPSBkaWFzLmxlbmd0aCA+IDAgPyBNRVNFU19MQVJHT1tOdW1iZXIoZGlhc1swXS5mZWNoYS5zbGljZSg1LCA3KSkgLSAxXSA6ICcnCiAgY29uc3QgcmFuZ28gPSBkaWFzLmxlbmd0aCA+IDAKICAgID8gYCR7bnVtRGlhKGRpYXNbMF0uZmVjaGEpfSBhbCAke251bURpYShkaWFzW2RpYXMubGVuZ3RoIC0gMV0uZmVjaGEpfSBkZSAke21lc05vbWJyZX1gCiAgICA6ICcnCgogIHJldHVybiAoCiAgICA8ZGl2IGNsYXNzTmFtZT0iYm9yZGVyLWIgYm9yZGVyLVsjRUVFMkQ0XSBsYXN0OmJvcmRlci0wIj4KICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRBYmllcnRhKHYgPT4gIXYpfSBjbGFzc05hbWU9InctZnVsbCBweS0yLjUgdGV4dC1sZWZ0Ij4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIiPgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXgtMSBtaW4tdy0wIj4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzNEMkIxRl0iPgogICAgICAgICAgICAgIFNlbWFuYSB7bn0KICAgICAgICAgICAgICB7aW5jb21wbGV0YSAmJiA8c3BhbiBjbGFzc05hbWU9InRleHQtWzEwcHhdIGZvbnQtbm9ybWFsIHRleHQtWyNCNUEzOEZdIj4gwrcge2RpYXMubGVuZ3RofSBkw61hczwvc3Bhbj59CiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSB0ZXh0LVsjOEE3NTYwXSI+e3JhbmdvfTwvcD4KICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9InRleHQtcmlnaHQgZmxleC1zaHJpbmstMCI+CiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1zbSBmb250LWJvbGQiIHN0eWxlPXt7IGNvbG9yIH19Pntwcm9tZWRpby50b0ZpeGVkKDEpfTwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVs5cHhdIHRleHQtWyM4QTc1NjBdIj5wcm9tLiBkaWFyaW88L3A+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1bIzhDNTcyRl0gdGV4dC1zbSBmb250LWJvbGQgZmxleC1zaHJpbmstMCI+e2FiaWVydGEgPyAn4payJyA6ICfilrwnfTwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9idXR0b24+CgogICAgICB7YWJpZXJ0YSAmJiAoCiAgICAgICAgPGRpdiBjbGFzc05hbWU9InBiLTMiPgogICAgICAgICAgey8qIExhcyBiYXJyYXMgc2UgZXNjYWxhbiBjb250cmEgZWwgbcOheGltbyBkZWwgTUVTIGNvbXBsZXRvLCBubwogICAgICAgICAgICAgIGNvbnRyYSBlbCBkZSBsYSBzZW1hbmE6IHNpIGNhZGEgc2VtYW5hIHVzYXJhIHN1IHByb3BpYQogICAgICAgICAgICAgIGVzY2FsYSwgdW5hIHNlbWFuYSBmbG9qYSBzZSB2ZXLDrWEgaWd1YWwgZGUgYWx0YSBxdWUgbGEKICAgICAgICAgICAgICBtZWpvciBkZWwgbWVzLiAqL30KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWVuZCBnYXAtMSBoLTIwIG1iLTEiPgogICAgICAgICAgICB7ZGlhcy5tYXAoZCA9PiAoCiAgICAgICAgICAgICAgPGRpdiBrZXk9e2QuZmVjaGF9IGNsYXNzTmFtZT0iZmxleC0xIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktZW5kIGgtZnVsbCI+CiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtWzlweF0gdGV4dC1bIzhBNzU2MF0gbWItMC41Ij57ZC52YWxvciA+IDAgPyBkLnZhbG9yIDogJyd9PC9zcGFuPgogICAgICAgICAgICAgICAgPGRpdgogICAgICAgICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCByb3VuZGVkLXQiCiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7CiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBgJHtNYXRoLm1heCgyLCAoZC52YWxvciAvIE1hdGgubWF4KDEsIG1heE1lcykpICogNzgpfSVgLAogICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IGQudmFsb3IgPiAwID8gJyNGRkJENTknIDogJyNFRUUyRDQnLAogICAgICAgICAgICAgICAgICB9fQogICAgICAgICAgICAgICAgLz4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKSl9CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGdhcC0xIj4KICAgICAgICAgICAge2RpYXMubWFwKGQgPT4gewogICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGluZGljZURpYVNlbWFuYShkLmZlY2hhKQogICAgICAgICAgICAgIGNvbnN0IGZpbmRlID0gaWR4ID49IDUKICAgICAgICAgICAgICByZXR1cm4gKAogICAgICAgICAgICAgICAgPGRpdiBrZXk9e2QuZmVjaGF9IGNsYXNzTmFtZT0iZmxleC0xIHRleHQtY2VudGVyIj4KICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJibG9jayB0ZXh0LVs5cHhdIiBzdHlsZT17eyBjb2xvcjogZmluZGUgPyAnI0NENzQyMScgOiAnIzhBNzU2MCcgfX0+CiAgICAgICAgICAgICAgICAgICAge0xFVFJBX0RJQVtpZHhdfQogICAgICAgICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iYmxvY2sgdGV4dC1bOXB4XSB0ZXh0LVsjQjVBMzhGXSI+e251bURpYShkLmZlY2hhKX08L3NwYW4+CiAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICApCiAgICAgICAgICAgIH0pfQogICAgICAgICAgPC9kaXY+CiAgICAgICAgICB7bWVqb3IgJiYgbWF4ID4gMCAmJiAoCiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTBweF0gdGV4dC1bIzhBNzU2MF0gbXQtMiI+CiAgICAgICAgICAgICAgTWVqb3IgZMOtYToge251bURpYShtZWpvci5mZWNoYSl9IGNvbiB7bWF4fSB7bWF4ID09PSAxID8gJ3BlcnNvbmEnIDogJ3BlcnNvbmFzJ30KICAgICAgICAgICAgPC9wPgogICAgICAgICAgKX0KICAgICAgICA8L2Rpdj4KICAgICAgKX0KICAgIDwvZGl2PgogICkKfQoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUGFuZWxTZW1hbmFzKHsgZGlhcyB9OiB7IGRpYXM6IERpYVNlcmllW10gfSkgewogIGlmIChkaWFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGwKCiAgLy8gQWdydXBhY2nDs24gcG9yIHNlbWFuYXMgZGUgY2FsZW5kYXJpbzogc2UgYWJyZSB1bmEgc2VtYW5hIG51ZXZhIGNhZGEKICAvLyB2ZXogcXVlIGFwYXJlY2UgdW4gbHVuZXMuCiAgY29uc3Qgc2VtYW5hczogRGlhU2VyaWVbXVtdID0gW10KICBsZXQgYWN0dWFsOiBEaWFTZXJpZVtdID0gW10KICBmb3IgKGNvbnN0IGQgb2YgZGlhcykgewogICAgaWYgKGFjdHVhbC5sZW5ndGggPiAwICYmIGluZGljZURpYVNlbWFuYShkLmZlY2hhKSA9PT0gMCkgewogICAgICBzZW1hbmFzLnB1c2goYWN0dWFsKQogICAgICBhY3R1YWwgPSBbXQogICAgfQogICAgYWN0dWFsLnB1c2goZCkKICB9CiAgaWYgKGFjdHVhbC5sZW5ndGggPiAwKSBzZW1hbmFzLnB1c2goYWN0dWFsKQoKICBjb25zdCBtYXhNZXMgPSBNYXRoLm1heCgxLCAuLi5kaWFzLm1hcChkID0+IGQudmFsb3IpKQogIGNvbnN0IHRvdGFsTWVzID0gZGlhcy5yZWR1Y2UoKGEsIGQpID0+IGEgKyBkLnZhbG9yLCAwKQogIGNvbnN0IHByb21NZXMgPSBkaWFzLmxlbmd0aCA+IDAgPyB0b3RhbE1lcyAvIGRpYXMubGVuZ3RoIDogMAoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9Im14LTQgbWItNCI+CiAgICAgIDxoMiBjbGFzc05hbWU9InRleHQteHMgZm9udC1ib2xkIHRleHQtWyM4QzU3MkZdIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBtYi0yIj5QZXJzb25hcyBhY3RpdmFzIHBvciBzZW1hbmE8L2gyPgogICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItWyNFRUUyRDRdIHB4LTQgcHktMSI+CiAgICAgICAge3NlbWFuYXMubWFwKChzLCBpKSA9PiAoCiAgICAgICAgICA8U2VtYW5hIGtleT17c1swXS5mZWNoYX0gbj17aSArIDF9IGRpYXM9e3N9IG1heE1lcz17bWF4TWVzfSAvPgogICAgICAgICkpfQogICAgICA8L2Rpdj4KICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSB0ZXh0LVsjOEE3NTYwXSBtdC0xLjUgcHgtMSI+CiAgICAgICAgUHJvbWVkaW8gZGVsIG1lczoge3Byb21NZXMudG9GaXhlZCgxKX0gcGVyc29uYXMgYWwgZMOtYSDCtyBNZWpvciBkw61hOiB7bWF4TWVzfQogICAgICA8L3A+CiAgICA8L2Rpdj4KICApCn0K';

const PARES = [
  {
    nombre: 'import de PanelSemanas',
    viejo: "import PanelDia, { type DiaPanel } from '@/components/PanelDia'",
    nuevo: [
      "import PanelDia, { type DiaPanel } from '@/components/PanelDia'",
      "import PanelSemanas from '@/components/PanelSemanas'",
    ].join('\n'),
  },
  {
    nombre: 'lista de dias con fecha completa',
    viejo: "  const serie: { etiqueta: string; valor: number }[] = []",
    nuevo: [
      "  const serie: { etiqueta: string; valor: number }[] = []",
      "  // Lo mismo que serie, pero con la fecha completa: el desglose por",
      "  // semanas necesita saber que dia de la semana es cada uno, y la",
      "  // etiqueta del grafico solo guarda el numero.",
      "  const diasDetalle: { fecha: string; valor: number }[] = []",
    ].join('\n'),
  },
  {
    nombre: 'llenado de la lista de dias',
    viejo: [
      "    let f = desde",
      "    while (f <= hasta) {",
      "      serie.push({",
      "        etiqueta: periodo === 'semana' ? fmtFecha(f) : String(Number(f.slice(8, 10))),",
      "        valor: porDia.get(f)?.size || 0,",
      "      })",
      "      f = sumarDias(f, 1)",
      "    }",
    ].join('\n'),
    nuevo: [
      "    let f = desde",
      "    while (f <= hasta) {",
      "      const valor = porDia.get(f)?.size || 0",
      "      serie.push({",
      "        etiqueta: periodo === 'semana' ? fmtFecha(f) : String(Number(f.slice(8, 10))),",
      "        valor,",
      "      })",
      "      diasDetalle.push({ fecha: f, valor })",
      "      f = sumarDias(f, 1)",
      "    }",
    ].join('\n'),
  },
  {
    nombre: 'render segun el periodo',
    viejo: [
      "      <Seccion titulo={periodo === 'anio' ? 'Personas activas por mes' : 'Personas activas por día'}>",
      "        <Barras datos={serie} />",
      "      </Seccion>",
    ].join('\n'),
    nuevo: [
      "      {/* El mes se desglosa en semanas plegables: 31 barras juntas",
      "          no se leen en un teléfono. La semana y el año conservan su",
      "          gráfico, que ahí sí se entiende. */}",
      "      {periodo === 'mes' ? (",
      "        <PanelSemanas dias={diasDetalle} />",
      "      ) : (",
      "        <Seccion titulo={periodo === 'anio' ? 'Personas activas por mes' : 'Personas activas por día'}>",
      "          <Barras datos={serie} />",
      "        </Seccion>",
      "      )}",
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

const destinoPanel = path.join(process.cwd(), RUTA_PANEL);
if (!fs.existsSync(destinoPanel)) {
  abortar('no se encontro ' + RUTA_PANEL + '. Corre primero los scripts 337 a 342.');
}

let panel = fs.readFileSync(destinoPanel, 'utf8');

if (panel.includes('PanelSemanas')) {
  abortar('el panel ya tiene el desglose por semanas. Parece que este script ya se corrio.');
}
if (!panel.includes('mesSel')) {
  abortar('faltan los periodos de calendario. Corre primero el script 342.');
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

const ESPERADOS = [
  'const diasDetalle:',
  'diasDetalle.push(',
  '<PanelSemanas dias={diasDetalle} />',
];
for (const e of ESPERADOS) {
  if (contar(panel, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

const comp = Buffer.from(PANELSEMANAS_B64, 'base64').toString('utf8');
for (const r of ['export default function PanelSemanas', 'indiceDiaSemana', "'use client'"]) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

const destinoComp = path.join(process.cwd(), RUTA_COMPONENTE);
const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMPONENTE);

fs.writeFileSync(destinoPanel, panel, 'utf8');
console.log('OK: ' + RUTA_PANEL);
console.log('');
console.log('Listo. El mes ahora se revisa semana por semana.');
