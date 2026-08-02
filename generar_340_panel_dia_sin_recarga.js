const fs = require('fs');
const path = require('path');

// ============================================================
// generar_340_panel_dia_sin_recarga.js
// ============================================================
// El selector de dia del panel cambiaba la URL, y eso recargaba la
// pagina entera en cada click. Ahora el servidor manda los ultimos 60
// dias ya calculados y el cambio de dia es puro estado local:
// instantaneo, sin ida y vuelta al servidor.
//
//  1. CREA components/PanelDia.tsx (componente de cliente).
//  2. En app/admin/page.tsx reemplaza el calculo ligado a la URL por
//     la preparacion de los 60 dias, y la seccion JSX por el
//     componente nuevo.
//  3. Los emojis de mascota pasan a ser por ESPECIE: perro, gato, o
//     huella para el resto. Antes eran todos huella.
//  4. Los tabs de periodo vuelven a su enlace simple: ya no necesitan
//     arrastrar el dia elegido, porque el dia ya no vive en la URL.
//
// Los 60 dias se mandan AGRUPADOS (no filas crudas), asi que el peso
// es minimo y se evitan 60 consultas.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA_COMPONENTE = 'components/PanelDia.tsx';
const RUTA_PANEL = 'app/admin/page.tsx';

const PANELDIA_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnCgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUEFORUwgRMONQSDigJQgc2VsZWN0b3IgZGUgZMOtYSBkZWwgcGFuZWwgaW50ZXJubwovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUE9SIFFVw4kgRVMgVU4gQ09NUE9ORU5URSBERSBDTElFTlRFCi8vIExhIHByaW1lcmEgdmVyc2nDs24gbW92w61hIGVsIGTDrWEgY29uIGVubGFjZXMgKD9kPS4uLiksIGxvIHF1ZQovLyByZWNhcmdhYmEgbGEgcMOhZ2luYSBlbnRlcmEgZW4gY2FkYSBjbGljay4gQWPDoSBlbCBzZXJ2aWRvciBtYW5kYSBkZQovLyB1bmEgdmV6IGxvcyDDumx0aW1vcyA2MCBkw61hcyB5YSBjYWxjdWxhZG9zIHkgZWwgY2FtYmlvIGRlIGTDrWEgZXMKLy8gcHVybyBlc3RhZG8gbG9jYWw6IGluc3RhbnTDoW5lbywgc2luIGlkYSB5IHZ1ZWx0YS4KLy8KLy8gU29uIDYwIGTDrWFzIGRlIGRhdG9zIHlhIGFncnVwYWRvcyAobm8gZmlsYXMgY3J1ZGFzKSwgYXPDrSBxdWUgZWwgcGVzbwovLyBlcyBtw61uaW1vIHkgc2UgZXZpdGFuIDYwIGNvbnN1bHRhcy4KLy8KLy8gTEEgVElSQSBERSAxNCBEw41BUwovLyBNdWVzdHJhIGxvcyAxNCBkw61hcyBxdWUgdGVybWluYW4gZW4gZWwgZWxlZ2lkby4gRXMgbGEgdmVudGFuYSBxdWUKLy8gR29vZ2xlIFBsYXkgcGlkZSBkZW1vc3RyYXIgcGFyYSBzYWxpciBkZSBjbG9zZWQgdGVzdGluZzogMTIrIHRlc3RlcnMKLy8gYWN0aXZvcyBkdXJhbnRlIDE0IGTDrWFzIHNlZ3VpZG9zLiBTaXJ2ZSBkZSBuYXZlZ2FjacOzbiB5IGRlIGV2aWRlbmNpYQovLyBhIGxhIHZlei4gVmVyZGUgZGVzZGUgMTIsIGFtYXJpbGxvIGRlc2RlIDYsIG5hcmFuam8gY29uIGFsIG1lbm9zIDEuCgppbnRlcmZhY2UgTWFzY290YURpYSB7CiAgbm9tYnJlOiBzdHJpbmcKICBlc3BlY2llOiBzdHJpbmcKfQppbnRlcmZhY2UgVXN1YXJpb0RpYSB7CiAgbm9tYnJlOiBzdHJpbmcKICBtYXNjb3RhczogTWFzY290YURpYVtdCn0KZXhwb3J0IGludGVyZmFjZSBEaWFQYW5lbCB7CiAgZmVjaGE6IHN0cmluZwogIHVzdWFyaW9zOiBVc3VhcmlvRGlhW10KfQoKY29uc3QgRElBU19TRU0gPSBbJ2RvbWluZ28nLCAnbHVuZXMnLCAnbWFydGVzJywgJ21pw6lyY29sZXMnLCAnanVldmVzJywgJ3ZpZXJuZXMnLCAnc8OhYmFkbyddCmNvbnN0IE1FU0VTX0xBUkdPID0gWydlbmVybycsICdmZWJyZXJvJywgJ21hcnpvJywgJ2FicmlsJywgJ21heW8nLCAnanVuaW8nLCAnanVsaW8nLCAnYWdvc3RvJywgJ3NlcHRpZW1icmUnLCAnb2N0dWJyZScsICdub3ZpZW1icmUnLCAnZGljaWVtYnJlJ10KCi8vIE1lZGlvZMOtYTogY29uc3RydWlyIGxhIGZlY2hhIGEgbWVkaWFub2NoZSBzZSBjYWUgZW4gbG9zIGNhbWJpb3MgZGUKLy8gaG9yYXJpbyBkZSB2ZXJhbm8geSBwdWVkZSBjb3JyZXIgZWwgZMOtYSBkZSBsYSBzZW1hbmEuCmZ1bmN0aW9uIGZtdExhcmdhKGlzbzogc3RyaW5nKTogc3RyaW5nIHsKICBjb25zdCBkID0gbmV3IERhdGUoaXNvICsgJ1QxMjowMDowMCcpCiAgcmV0dXJuIGAke0RJQVNfU0VNW2QuZ2V0RGF5KCldfSAke2QuZ2V0RGF0ZSgpfSBkZSAke01FU0VTX0xBUkdPW2QuZ2V0TW9udGgoKV19YAp9CgpmdW5jdGlvbiBlbW9qaUVzcGVjaWUoZXNwZWNpZTogc3RyaW5nKTogc3RyaW5nIHsKICBpZiAoZXNwZWNpZSA9PT0gJ1BlcnJvJykgcmV0dXJuICfwn5C2JwogIGlmIChlc3BlY2llID09PSAnR2F0bycpIHJldHVybiAn8J+QsScKICByZXR1cm4gJ/CfkL4nCn0KCmZ1bmN0aW9uIGNvbG9yRGlhKG46IG51bWJlcik6IHN0cmluZyB7CiAgaWYgKG4gPj0gMTIpIHJldHVybiAnIzRDQUY3RCcKICBpZiAobiA+PSA2KSByZXR1cm4gJyNGNUM4NDInCiAgaWYgKG4gPj0gMSkgcmV0dXJuICcjRjA3QTMwJwogIHJldHVybiAnI0VFRTJENCcKfQoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUGFuZWxEaWEoeyBkaWFzLCB0b3RhbFVzdWFyaW9zIH06IHsgZGlhczogRGlhUGFuZWxbXTsgdG90YWxVc3VhcmlvczogbnVtYmVyIH0pIHsKICAvLyBFbCDDumx0aW1vIGVsZW1lbnRvIGVzIGhveTogZWwgc2Vydmlkb3IgbG9zIG1hbmRhIGVuIG9yZGVuLgogIGNvbnN0IHVsdGltbyA9IGRpYXMubGVuZ3RoIC0gMQogIGNvbnN0IFtzZWwsIHNldFNlbF0gPSB1c2VTdGF0ZSh1bHRpbW8pCgogIGlmIChkaWFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGwKCiAgY29uc3QgZGlhID0gZGlhc1tzZWxdCiAgY29uc3QgZXNIb3kgPSBzZWwgPT09IHVsdGltbwogIGNvbnN0IGFudGVyaW9yID0gc2VsID4gMCA/IGRpYXNbc2VsIC0gMV0gOiBudWxsCgogIC8vIExvcyAxNCBkw61hcyBxdWUgdGVybWluYW4gZW4gZWwgZWxlZ2lkby4KICBjb25zdCBkZXNkZSA9IE1hdGgubWF4KDAsIHNlbCAtIDEzKQogIGNvbnN0IHRpcmEgPSBkaWFzLnNsaWNlKGRlc2RlLCBzZWwgKyAxKQoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9Im14LTQgbWItNCI+CiAgICAgIDxoMiBjbGFzc05hbWU9InRleHQteHMgZm9udC1ib2xkIHRleHQtWyM4QzU3MkZdIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBtYi0yIj5SZWdpc3Ryb3MgcG9yIGTDrWE8L2gyPgogICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItWyNFRUUyRDRdIHAtNCI+CgogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGdhcC0wLjUgbWItMyI+CiAgICAgICAgICB7dGlyYS5tYXAoKHQsIGkpID0+IHsKICAgICAgICAgICAgY29uc3QgaWR4ID0gZGVzZGUgKyBpCiAgICAgICAgICAgIGNvbnN0IG4gPSB0LnVzdWFyaW9zLmxlbmd0aAogICAgICAgICAgICByZXR1cm4gKAogICAgICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgICAgIGtleT17dC5mZWNoYX0KICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbChpZHgpfQogICAgICAgICAgICAgICAgY2xhc3NOYW1lPSJmbGV4LTEgdGV4dC1jZW50ZXIgcm91bmRlZC1sZyBweS0xIgogICAgICAgICAgICAgICAgc3R5bGU9e2lkeCA9PT0gc2VsCiAgICAgICAgICAgICAgICAgID8geyBiYWNrZ3JvdW5kOiBjb2xvckRpYShuKSwgYm9yZGVyOiAnMnB4IHNvbGlkICMzRDJCMUYnIH0KICAgICAgICAgICAgICAgICAgOiB7IGJhY2tncm91bmQ6IGNvbG9yRGlhKG4pLCBib3JkZXI6ICcycHggc29saWQgdHJhbnNwYXJlbnQnIH19CiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJibG9jayB0ZXh0LVs4cHhdIHRleHQtWyMzRDJCMUZdLzcwIj57TnVtYmVyKHQuZmVjaGEuc2xpY2UoOCwgMTApKX08L3NwYW4+CiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHRleHQtWzExcHhdIGZvbnQtYm9sZCB0ZXh0LVsjM0QyQjFGXSI+e259PC9zcGFuPgogICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICApCiAgICAgICAgICB9KX0KICAgICAgICA8L2Rpdj4KCiAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMiI+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbChzID0+IE1hdGgubWF4KDAsIHMgLSAxKSl9CiAgICAgICAgICAgIGRpc2FibGVkPXtzZWwgPT09IDB9CiAgICAgICAgICAgIGNsYXNzTmFtZT0idGV4dC1sZyBweC0yIGRpc2FibGVkOm9wYWNpdHktMjUiCiAgICAgICAgICAgIHN0eWxlPXt7IGNvbG9yOiAnIzhDNTcyRicgfX0KICAgICAgICAgID4KICAgICAgICAgICAg4peACiAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJ0ZXh0LWNlbnRlciBmbGV4LTEiPgogICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQteHMgdGV4dC1bIzhBNzU2MF0gY2FwaXRhbGl6ZSI+CiAgICAgICAgICAgICAge2ZtdExhcmdhKGRpYS5mZWNoYSl9e2VzSG95ID8gJyDCtyBob3knIDogJyd9CiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWJvbGQgdGV4dC0yeGwgbXQtMC41IiBzdHlsZT17eyBjb2xvcjogZGlhLnVzdWFyaW9zLmxlbmd0aCA+IDAgPyAnIzRDQUY3RCcgOiAnI0I1QTM4RicgfX0+CiAgICAgICAgICAgICAge2RpYS51c3Vhcmlvcy5sZW5ndGh9IDxzcGFuIGNsYXNzTmFtZT0idGV4dC1zbSBmb250LW5vcm1hbCB0ZXh0LVsjOEE3NTYwXSI+ZGUge3RvdGFsVXN1YXJpb3N9PC9zcGFuPgogICAgICAgICAgICA8L3A+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2VsKHMgPT4gTWF0aC5taW4odWx0aW1vLCBzICsgMSkpfQogICAgICAgICAgICBkaXNhYmxlZD17ZXNIb3l9CiAgICAgICAgICAgIGNsYXNzTmFtZT0idGV4dC1sZyBweC0yIGRpc2FibGVkOm9wYWNpdHktMjUiCiAgICAgICAgICAgIHN0eWxlPXt7IGNvbG9yOiAnIzhDNTcyRicgfX0KICAgICAgICAgID4KICAgICAgICAgICAg4pa2CiAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICA8L2Rpdj4KCiAgICAgICAge2RpYS51c3Vhcmlvcy5sZW5ndGggPT09IDAgPyAoCiAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQteHMgdGV4dC1bIzhBNzU2MF0gbXQtMiB0ZXh0LWNlbnRlciI+CiAgICAgICAgICAgIHtlc0hveSA/ICdUb2RhdsOtYSBuYWRpZSBoYSByZWdpc3RyYWRvIGhveS4nIDogJ05hZGllIHJlZ2lzdHLDsyBlc2UgZMOtYS4nfQogICAgICAgICAgPC9wPgogICAgICAgICkgOiAoCiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibXQtMyBzcGFjZS15LTEuNSI+CiAgICAgICAgICAgIHtkaWEudXN1YXJpb3MubWFwKCh1LCBpKSA9PiAoCiAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1iYXNlbGluZSBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIiPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyMzRDJCMUZdIHRydW5jYXRlIj57dS5ub21icmV9PC9wPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSB0ZXh0LVsjOEE3NTYwXSBmbGV4LXNocmluay0wIHRydW5jYXRlIj4KICAgICAgICAgICAgICAgICAge3UubWFzY290YXMubWFwKG0gPT4gYCR7ZW1vamlFc3BlY2llKG0uZXNwZWNpZSl9ICR7bS5ub21icmV9YCkuam9pbignIMK3ICcpfQogICAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICApKX0KICAgICAgICAgIDwvZGl2PgogICAgICAgICl9CgogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gbXQtMyBwdC0yIGJvcmRlci10IGJvcmRlci1bI0VFRTJENF0iPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMHB4XSB0ZXh0LVsjOEE3NTYwXSI+CiAgICAgICAgICAgIHthbnRlcmlvcgogICAgICAgICAgICAgID8gYEVsIGTDrWEgYW50ZXJpb3I6ICR7YW50ZXJpb3IudXN1YXJpb3MubGVuZ3RofSAke2FudGVyaW9yLnVzdWFyaW9zLmxlbmd0aCA9PT0gMSA/ICd1c3VhcmlvJyA6ICd1c3Vhcmlvcyd9YAogICAgICAgICAgICAgIDogJ1NpbiBkYXRvcyBhbnRlcmlvcmVzJ30KICAgICAgICAgIDwvcD4KICAgICAgICAgIHshZXNIb3kgJiYgKAogICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFNlbCh1bHRpbW8pfSBjbGFzc05hbWU9InRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LVsjQ0Q3NDIxXSI+CiAgICAgICAgICAgICAgVm9sdmVyIGEgaG95CiAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgKX0KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICApCn0K';

const PARES = [
  // ---------------------------------------------------------
  // 1. Import del componente
  // ---------------------------------------------------------
  {
    nombre: 'import de PanelDia',
    viejo: "import { createVetClient } from '@/utils/supabase/vet-client'",
    nuevo: [
      "import { createVetClient } from '@/utils/supabase/vet-client'",
      "import PanelDia, { type DiaPanel } from '@/components/PanelDia'",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Preparar los 60 dias en vez de leer el dia de la URL
  // ---------------------------------------------------------
  {
    nombre: 'preparacion de los 60 dias',
    viejo: [
      "  // Dia elegido desde la URL. Se valida el formato y que no sea",
      "  // futuro; cualquier otra cosa cae de vuelta en hoy.",
      "  const dParam = searchParams?.d || ''",
      "  const dValido = /^\\d{4}-\\d{2}-\\d{2}$/.test(dParam) && dParam <= hoy",
      "  const diaSel = dValido ? dParam : hoy",
      "  const esHoy = diaSel === hoy",
      "",
      "  const diaPorUsuario = juntarPorUsuario(diaSel)",
      "  const ayerPorUsuario = juntarPorUsuario(sumarDias(diaSel, -1))",
      "  const listaDia = Array.from(diaPorUsuario.entries())",
      "    .map(([uid, mascotasDia]) => ({ nombre: nombrePorUsuario.get(uid) || '(sin nombre)', mascotasDia }))",
      "    .sort((a, b) => a.nombre.localeCompare(b.nombre))",
      "",
      "  // Tira de 14 dias terminando en el elegido: es la ventana que",
      "  // Google Play pide demostrar para salir de closed testing.",
      "  const activosPorFecha = new Map<string, Set<string>>()",
      "  for (const r of regs) {",
      "    if (!activosPorFecha.has(r.fecha)) activosPorFecha.set(r.fecha, new Set())",
      "    activosPorFecha.get(r.fecha)!.add(r.user_id)",
      "  }",
      "  const tira = Array.from({ length: 14 }, (_, i) => {",
      "    const f = sumarDias(diaSel, -(13 - i))",
      "    return { fecha: f, dia: Number(f.slice(8, 10)), n: activosPorFecha.get(f)?.size || 0 }",
      "  })",
      "  const colorDia = (n: number) => n >= 12 ? '#4CAF7D' : n >= 6 ? '#F5C842' : n >= 1 ? '#F07A30' : '#EEE2D4'",
      "  const linkDia = (f: string) => `/admin?p=${periodo}&d=${f}`",
    ].join('\n'),
    nuevo: [
      "  // Los ultimos 60 dias, ya agrupados, para que el selector de dia",
      "  // funcione sin recargar la pagina ni volver al servidor.",
      "  // Se agrupan los registros por fecha UNA vez y despues se recorren",
      "  // los 60 dias, en vez de filtrar la lista completa 60 veces.",
      "  const regsPorFecha = new Map<string, any[]>()",
      "  for (const r of regs) {",
      "    const arr = regsPorFecha.get(r.fecha) || []",
      "    arr.push(r)",
      "    regsPorFecha.set(r.fecha, arr)",
      "  }",
      "",
      "  const diasPanel: DiaPanel[] = Array.from({ length: 60 }, (_, i) => {",
      "    const f = sumarDias(hoy, -(59 - i))",
      "    const mapa = new Map<string, { nombre: string; especie: string }[]>()",
      "    for (const r of (regsPorFecha.get(f) || [])) {",
      "      const arr = mapa.get(r.user_id) || []",
      "      const mm = mascPorId.get(r.mascota_id)",
      "      // Una persona puede registrar varias mascotas el mismo dia.",
      "      if (mm && !arr.some(x => x.nombre === mm.nombre)) {",
      "        arr.push({ nombre: mm.nombre, especie: mm.especie || '' })",
      "      }",
      "      mapa.set(r.user_id, arr)",
      "    }",
      "    return {",
      "      fecha: f,",
      "      usuarios: Array.from(mapa.entries())",
      "        .map(([uid, mascotasDia]) => ({",
      "          nombre: nombrePorUsuario.get(uid) || '(sin nombre)',",
      "          mascotas: mascotasDia,",
      "        }))",
      "        .sort((a, b) => a.nombre.localeCompare(b.nombre)),",
      "    }",
      "  })",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. La seccion JSX pasa a ser el componente
  // ---------------------------------------------------------
  {
    nombre: 'seccion reemplazada por el componente',
    viejo: '      <Seccion titulo="Registros por día">',
    nuevo: [
      "      <PanelDia dias={diasPanel} totalUsuarios={TODOS.length} />",
      "",
      '      <SeccionVieja titulo="Registros por día">',
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Los tabs vuelven a su enlace simple
  // ---------------------------------------------------------
  {
    nombre: 'enlace simple en los tabs',
    viejo: "      href={`/admin?p=${v}&d=${diaSel}`}",
    nuevo: "      href={`/admin?p=${v}`}",
  },

  // ---------------------------------------------------------
  // 5. Limpiar el codigo que queda sin uso
  // ---------------------------------------------------------
  {
    nombre: 'limpieza de codigo muerto',
    viejo: [
      "  // ---------- Quiénes registraron hoy ----------",
      "  // Replica la planilla que se lleva a mano. Es tambien la",
      "  // evidencia que pide Google Play para salir de closed testing:",
      "  // testers activos de verdad, dia a dia.",
      "  const nombrePorUsuario = new Map<string, string>(TODOS.map((u: any) => [u.id, u.nombre || u.email || '(sin nombre)']))",
      "  const ayer = restarDias(1)",
      "",
      "  const juntarPorUsuario = (fecha: string) => {",
      "    const mapa = new Map<string, string[]>()",
      "    for (const r of regs) {",
      "      if (r.fecha !== fecha) continue",
      "      const arr = mapa.get(r.user_id) || []",
      "      const mm = mascPorId.get(r.mascota_id)",
      "      if (mm && !arr.includes(mm.nombre)) arr.push(mm.nombre)",
      "      mapa.set(r.user_id, arr)",
      "    }",
      "    return mapa",
      "  }",
    ].join('\n'),
    nuevo: [
      "  // ---------- Quiénes registraron cada día ----------",
      "  // Replica la planilla que se lleva a mano. Es tambien la",
      "  // evidencia que pide Google Play para salir de closed testing:",
      "  // testers activos de verdad, dia a dia.",
      "  const nombrePorUsuario = new Map<string, string>(TODOS.map((u: any) => [u.id, u.nombre || u.email || '(sin nombre)']))",
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

// --- Verificar el panel ANTES de crear nada
const destinoPanel = path.join(process.cwd(), RUTA_PANEL);
if (!fs.existsSync(destinoPanel)) {
  abortar('no se encontro ' + RUTA_PANEL + '. Corre primero los scripts 337, 338 y 339.');
}

let panel = fs.readFileSync(destinoPanel, 'utf8');

if (panel.includes('PanelDia')) {
  abortar('el panel ya usa PanelDia. Parece que este script ya se corrio.');
}
if (!panel.includes('Registros por día')) {
  abortar('falta el selector de dia. Corre primero el script 339.');
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

// La seccion vieja completa se elimina: va desde la etiqueta marcada
// hasta su cierre. Se corta por posicion en vez de por texto exacto,
// porque el bloque es largo y cualquier diferencia minima lo rompería.
const ini = panel.indexOf('      <SeccionVieja titulo="Registros por día">');
const fin = panel.indexOf('      </Seccion>', ini);
if (ini === -1 || fin === -1) {
  abortar('no pude delimitar la seccion vieja para quitarla.');
}
panel = panel.slice(0, ini) + panel.slice(fin + '      </Seccion>\n'.length);

// --- Verificaciones finales
const ESPERADOS = [
  'import PanelDia',
  'const diasPanel: DiaPanel[]',
  '<PanelDia dias={diasPanel}',
];
for (const e of ESPERADOS) {
  if (contar(panel, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
for (const v of ['SeccionVieja', 'listaDia', 'linkDia', 'diaSel', 'colorDia', 'juntarPorUsuario']) {
  if (panel.includes(v)) {
    abortar('quedo una referencia a ' + v + ', que ya no existe.');
  }
}

// --- Escribir el componente
const comp = Buffer.from(PANELDIA_B64, 'base64').toString('utf8');
for (const r of ['export default function PanelDia', 'emojiEspecie', "'use client'"]) {
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
console.log('Listo. El dia cambia al instante, sin recargar la pagina.');
