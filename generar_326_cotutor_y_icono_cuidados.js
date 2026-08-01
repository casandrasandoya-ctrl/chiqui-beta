const fs = require('fs');
const path = require('path');

// ============================================================
// generar_326_cotutor_y_icono_cuidados.js
// ============================================================
// 1) REESCRIBE components/GestionCotutor.tsx
//    Bug: "Cancelar invitacion" cambiaba la pantalla sin revisar si el
//    update habia funcionado. Si la base no aceptaba el cambio (error,
//    o RLS que actualiza 0 filas SIN devolver error), la invitacion se
//    veia cancelada pero al volver al Perfil el codigo seguia ahi.
//    Ahora el update pide .select() para saber cuantas filas cambiaron
//    de verdad, muestra el motivo si falla, y relee el estado de la
//    base en vez de asumirlo.
//
// 2) CAMBIA EL ICONO de "Cuidados recientes" en el Dashboard:
//    chiqui_doctor.png -> chiqui_cuidados.png
//    ANTES verifica que el archivo exista en public/chiqui/. Si no
//    esta, ABORTA sin tocar nada (asi no queda una imagen rota).
//
// Si algo no calza, ABORTA sin escribir ningun archivo.
// ============================================================

const RUTA_COTUTOR = 'components/GestionCotutor.tsx';
const RUTA_DASHBOARD = 'components/DashboardContenido.tsx';
const RUTA_ICONO = 'public/chiqui/chiqui_cuidados.png';

const COTUTOR_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC91dGlscy9zdXBhYmFzZS9jbGllbnQnCgovLyBHZW5lcmEgdW4gY29kaWdvIGNvcnRvIHRpcG8gQ0hJUS1YWFhYCmZ1bmN0aW9uIGdlbmVyYXJDb2RpZ28oKTogc3RyaW5nIHsKICBjb25zdCBjaGFycyA9ICdBQkNERUZHSEpLTE1OUFFSU1RVVldYWVoyMzQ1Njc4OScKICBsZXQgY29kZSA9ICdDSElRLScKICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykgY29kZSArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXQogIHJldHVybiBjb2RlCn0KCmludGVyZmFjZSBQcm9wcyB7CiAgbWFzY290YUlkOiBzdHJpbmcKICBtYXNjb3RhTm9tYnJlOiBzdHJpbmcKfQoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIENPLVRVVE9SCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBRVUUgU0UgQVJSRUdMTzoKLy8gcmV2b2NhcigpIGNhbWJpYWJhIGxhIHBhbnRhbGxhIGEgInNpbl9jb3R1dG9yIiBTSU4gcmV2aXNhciBzaSBlbAovLyB1cGRhdGUgaGFiaWEgZnVuY2lvbmFkby4gU2kgU3VwYWJhc2UgZGV2b2x2aWEgdW4gZXJyb3IsIG8gc2kgbGEKLy8gcG9saXRpY2EgUkxTIG5vIGRlamFiYSB0b2NhciBsYSBmaWxhIChjYXNvIGVuIHF1ZSBTdXBhYmFzZSBOTwovLyBkZXZ1ZWx2ZSBlcnJvcjogc2ltcGxlbWVudGUgYWN0dWFsaXphIDAgZmlsYXMpLCBsYSBwZXJzb25hIHZlaWEgcXVlCi8vIGxhIGludml0YWNpb24gc2UgY2FuY2VsYWJhLi4uIHkgYWwgdm9sdmVyIGEgZW50cmFyIGFsIFBlcmZpbCBlbAovLyBjb2RpZ28gc2VndWlhIGFoaS4gVW4gZmFsbG8gc2lsZW5jaW9zby4KLy8KLy8gQWhvcmE6Ci8vICAxLiBFbCB1cGRhdGUgcGlkZSAuc2VsZWN0KCkgZGUgdnVlbHRhLCBhc2kgc2FiZW1vcyBDVUFOVEFTIGZpbGFzIHNlCi8vICAgICBhY3R1YWxpemFyb24gZGUgdmVyZGFkLiBDZXJvIGZpbGFzID0gbm8gc2UgcHVkbywgYXVucXVlIG5vIGhheWEKLy8gICAgIGVycm9yLgovLyAgMi4gU2kgYWxnbyBmYWxsYSwgc2UgbXVlc3RyYSBlbCBtb3Rpdm8gZW4gcGFudGFsbGEgZW4gdmV6IGRlIGZpbmdpcgovLyAgICAgcXVlIGZ1bmNpb25vLgovLyAgMy4gU2kgZnVuY2lvbmEsIGVsIGVzdGFkbyBzZSB2dWVsdmUgYSBMRUVSIGRlIGxhIGJhc2UgKGNhcmdhcigpKSBlbgovLyAgICAgbHVnYXIgZGUgYXN1bWlybG8uIExvIHF1ZSBzZSB2ZSBlcyBsbyBxdWUgaGF5IGd1YXJkYWRvLgoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gR2VzdGlvbkNvdHV0b3IoeyBtYXNjb3RhSWQsIG1hc2NvdGFOb21icmUgfTogUHJvcHMpIHsKICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudCgpCiAgY29uc3QgW2VzdGFkbywgc2V0RXN0YWRvXSA9IHVzZVN0YXRlPCdjYXJnYW5kbycgfCAnc2luX2NvdHV0b3InIHwgJ3BlbmRpZW50ZScgfCAnYWN0aXZvJz4oJ2NhcmdhbmRvJykKICBjb25zdCBbaW52aXRhY2lvbiwgc2V0SW52aXRhY2lvbl0gPSB1c2VTdGF0ZTxhbnk+KG51bGwpCiAgY29uc3QgW2NvcGlhZG8sIHNldENvcGlhZG9dID0gdXNlU3RhdGUoZmFsc2UpCiAgY29uc3QgW3Byb2Nlc2FuZG8sIHNldFByb2Nlc2FuZG9dID0gdXNlU3RhdGUoZmFsc2UpCiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZSgnJykKCiAgdXNlRWZmZWN0KCgpID0+IHsgY2FyZ2FyKCkgfSwgW21hc2NvdGFJZF0pCgogIGFzeW5jIGZ1bmN0aW9uIGNhcmdhcigpIHsKICAgIHNldEVzdGFkbygnY2FyZ2FuZG8nKQogICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAuZnJvbSgnbWFzY290YV9jb3R1dG9yZXMnKQogICAgICAuc2VsZWN0KCcqJykKICAgICAgLmVxKCdtYXNjb3RhX2lkJywgbWFzY290YUlkKQogICAgICAuaW4oJ2VzdGFkbycsIFsncGVuZGllbnRlJywgJ2FjdGl2byddKQogICAgICAub3JkZXIoJ2NyZWFkb19lbicsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KQogICAgICAubGltaXQoMSkKICAgICAgLm1heWJlU2luZ2xlKCkKCiAgICBpZiAoIWRhdGEpIHsgc2V0RXN0YWRvKCdzaW5fY290dXRvcicpOyBzZXRJbnZpdGFjaW9uKG51bGwpOyByZXR1cm4gfQogICAgc2V0SW52aXRhY2lvbihkYXRhKQogICAgc2V0RXN0YWRvKGRhdGEuZXN0YWRvKQogIH0KCiAgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhckludml0YWNpb24oKSB7CiAgICBzZXRQcm9jZXNhbmRvKHRydWUpCiAgICBzZXRFcnJvcignJykKICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpCiAgICBpZiAoIXVzZXIpIHsKICAgICAgc2V0RXJyb3IoJ05vIHNlIHB1ZG8gdmVyaWZpY2FyIHR1IHNlc2nDs24uIFZ1ZWx2ZSBhIGVudHJhciBlIGludGVudGEgZGUgbnVldm8uJykKICAgICAgc2V0UHJvY2VzYW5kbyhmYWxzZSkKICAgICAgcmV0dXJuCiAgICB9CgogICAgLy8gUmV2b2NhciBpbnZpdGFjaW9uZXMgYW50ZXJpb3JlcyBwZW5kaWVudGVzCiAgICBhd2FpdCBzdXBhYmFzZS5mcm9tKCdtYXNjb3RhX2NvdHV0b3JlcycpCiAgICAgIC51cGRhdGUoeyBlc3RhZG86ICdyZXZvY2FkbycgfSkKICAgICAgLmVxKCdtYXNjb3RhX2lkJywgbWFzY290YUlkKQogICAgICAuZXEoJ2VzdGFkbycsICdwZW5kaWVudGUnKQoKICAgIGNvbnN0IGV4cGlyYSA9IG5ldyBEYXRlKCkKICAgIGV4cGlyYS5zZXREYXRlKGV4cGlyYS5nZXREYXRlKCkgKyA3KQoKICAgIGNvbnN0IHsgZXJyb3I6IGVycklucyB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnbWFzY290YV9jb3R1dG9yZXMnKS5pbnNlcnQoewogICAgICBtYXNjb3RhX2lkOiBtYXNjb3RhSWQsCiAgICAgIGR1ZW5vX3VzZXJfaWQ6IHVzZXIuaWQsCiAgICAgIGNvZGlnb19pbnZpdGFjaW9uOiBnZW5lcmFyQ29kaWdvKCksCiAgICAgIGNvZGlnb19leHBpcmFfZW46IGV4cGlyYS50b0lTT1N0cmluZygpLAogICAgICBlc3RhZG86ICdwZW5kaWVudGUnLAogICAgfSkKCiAgICBpZiAoZXJySW5zKSB7CiAgICAgIHNldEVycm9yKCdObyBzZSBwdWRvIGdlbmVyYXIgZWwgY8OzZGlnby4gUmV2aXNhIHR1IGNvbmV4acOzbiBlIGludGVudGEgZGUgbnVldm8uJykKICAgICAgc2V0UHJvY2VzYW5kbyhmYWxzZSkKICAgICAgcmV0dXJuCiAgICB9CgogICAgLy8gU2UgcmVsZWUgZGUgbGEgYmFzZSBlbiB2ZXogZGUgYXN1bWlyIGVsIHJlc3VsdGFkby4KICAgIGF3YWl0IGNhcmdhcigpCiAgICBzZXRQcm9jZXNhbmRvKGZhbHNlKQogIH0KCiAgYXN5bmMgZnVuY3Rpb24gcmV2b2NhcigpIHsKICAgIGlmICghaW52aXRhY2lvbikgcmV0dXJuCiAgICBzZXRQcm9jZXNhbmRvKHRydWUpCiAgICBzZXRFcnJvcignJykKCiAgICAvLyAuc2VsZWN0KCkgZGV2dWVsdmUgbGFzIGZpbGFzIHJlYWxtZW50ZSBhY3R1YWxpemFkYXMuIFNpbiBlc3RvLAogICAgLy8gdW4gdXBkYXRlIHF1ZSBubyB0b2NhIG5pbmd1bmEgZmlsYSBzZSB2ZSBpZ3VhbCBxdWUgdW5vIGV4aXRvc28uCiAgICBjb25zdCB7IGRhdGEsIGVycm9yOiBlcnJVcGQgfSA9IGF3YWl0IHN1cGFiYXNlCiAgICAgIC5mcm9tKCdtYXNjb3RhX2NvdHV0b3JlcycpCiAgICAgIC51cGRhdGUoeyBlc3RhZG86ICdyZXZvY2FkbycgfSkKICAgICAgLmVxKCdpZCcsIGludml0YWNpb24uaWQpCiAgICAgIC5zZWxlY3QoJ2lkJykKCiAgICBpZiAoZXJyVXBkKSB7CiAgICAgIHNldEVycm9yKCdObyBzZSBwdWRvIGNhbmNlbGFyOiAnICsgZXJyVXBkLm1lc3NhZ2UpCiAgICAgIHNldFByb2Nlc2FuZG8oZmFsc2UpCiAgICAgIGF3YWl0IGNhcmdhcigpCiAgICAgIHJldHVybgogICAgfQoKICAgIGlmICghZGF0YSB8fCBkYXRhLmxlbmd0aCA9PT0gMCkgewogICAgICBzZXRFcnJvcignTm8gc2UgcHVkbyBjYW5jZWxhciBsYSBpbnZpdGFjacOzbiAobGEgYmFzZSBubyBwZXJtaXRpw7MgZWwgY2FtYmlvKS4gQXbDrXNhbGUgYSBzb3BvcnRlIGNvbiBlc3RlIG1lbnNhamUuJykKICAgICAgc2V0UHJvY2VzYW5kbyhmYWxzZSkKICAgICAgYXdhaXQgY2FyZ2FyKCkKICAgICAgcmV0dXJuCiAgICB9CgogICAgLy8gU29sbyBhY2EgZGFtb3MgcG9yIGhlY2hvIGVsIGNhbWJpbywgeSBhdW4gYXNpIGxvIGNvbmZpcm1hbW9zCiAgICAvLyByZWxleWVuZG8gZWwgZXN0YWRvIHJlYWwuCiAgICBhd2FpdCBjYXJnYXIoKQogICAgc2V0UHJvY2VzYW5kbyhmYWxzZSkKICB9CgogIGFzeW5jIGZ1bmN0aW9uIGNvcGlhcigpIHsKICAgIGlmICghaW52aXRhY2lvbikgcmV0dXJuCiAgICB0cnkgewogICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChpbnZpdGFjaW9uLmNvZGlnb19pbnZpdGFjaW9uKQogICAgICBzZXRDb3BpYWRvKHRydWUpCiAgICAgIHNldFRpbWVvdXQoKCkgPT4gc2V0Q29waWFkbyhmYWxzZSksIDIwMDApCiAgICB9IGNhdGNoIHsKICAgICAgLy8gRWwgY8OzZGlnbyB5YSBlc3TDoSB2aXNpYmxlIGVuIHBhbnRhbGxhIHkgZXMgLmNvcGlhYmxlLCBhc8OtIHF1ZQogICAgICAvLyBzZSBwdWVkZSBzZWxlY2Npb25hciBhIG1hbm8uCiAgICAgIHNldEVycm9yKCdUdSBuYXZlZ2Fkb3Igbm8gcGVybWl0acOzIGNvcGlhci4gU2VsZWNjaW9uYSBlbCBjw7NkaWdvIGRlIGFycmliYSB5IGPDs3BpYWxvIGEgbWFuby4nKQogICAgfQogIH0KCiAgY29uc3QgZGlhc1Jlc3RhbnRlcyA9IGludml0YWNpb24/LmNvZGlnb19leHBpcmFfZW4KICAgID8gTWF0aC5tYXgoMCwgTWF0aC5jZWlsKChuZXcgRGF0ZShpbnZpdGFjaW9uLmNvZGlnb19leHBpcmFfZW4pLmdldFRpbWUoKSAtIERhdGUubm93KCkpIC8gODY0MDAwMDApKQogICAgOiAwCgogIGlmIChlc3RhZG8gPT09ICdjYXJnYW5kbycpIHJldHVybiBudWxsCgogIHJldHVybiAoCiAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItWyNFRUUyRDRdIHAtNCI+CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0zIj4KICAgICAgICA8aW1nIHNyYz0iL2NoaXF1aS9jaGlxdWlfYW1vci5wbmciIGFsdD0iIiBjbGFzc05hbWU9InctNyBoLTcgb2JqZWN0LWNvbnRhaW4iIC8+CiAgICAgICAgPGgzIGNsYXNzTmFtZT0iZm9udC1ib2xkIHRleHQtc20gdGV4dC1bIzNEMkIxRl0iPkNvLXR1dG9yPC9oMz4KICAgICAgPC9kaXY+CgogICAgICB7ZXN0YWRvID09PSAnc2luX2NvdHV0b3InICYmICgKICAgICAgICA8PgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIG1iLTMgbGVhZGluZy1yZWxheGVkIj4KICAgICAgICAgICAgSW52aXRhIGEgYWxndWllbiBkZSB0dSBmYW1pbGlhIG8gcGFyZWphIHBhcmEgcXVlIHRhbWJpw6luIHB1ZWRhIHJlZ2lzdHJhciBhIHttYXNjb3RhTm9tYnJlfS4KICAgICAgICAgIDwvcD4KICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgb25DbGljaz17Z2VuZXJhckludml0YWNpb259CiAgICAgICAgICAgIGRpc2FibGVkPXtwcm9jZXNhbmRvfQogICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCBiZy1bI0ZGQkQ1OV0gdGV4dC1bIzFBMTIwMF0gZm9udC1ib2xkIHB5LTIuNSByb3VuZGVkLXhsIHRleHQtc20gZGlzYWJsZWQ6b3BhY2l0eS00MCIKICAgICAgICAgID4KICAgICAgICAgICAge3Byb2Nlc2FuZG8gPyAnR2VuZXJhbmRvLi4uJyA6ICcrIEdlbmVyYXIgY8OzZGlnbyBkZSBpbnZpdGFjacOzbid9CiAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICA8Lz4KICAgICAgKX0KCiAgICAgIHtlc3RhZG8gPT09ICdwZW5kaWVudGUnICYmIGludml0YWNpb24gJiYgKAogICAgICAgIDw+CiAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQteHMgdGV4dC1bIzhBNzU2MF0gbWItMyI+CiAgICAgICAgICAgIENvbXBhcnRlIGVzdGUgY8OzZGlnbyDigJQgdsOhbGlkbyBwb3IgPHN0cm9uZz57ZGlhc1Jlc3RhbnRlc30gZMOtYXM8L3N0cm9uZz46CiAgICAgICAgICA8L3A+CiAgICAgICAgICB7LyogQ8OzZGlnbyB2aXN1YWwgZ3JhbmRlICovfQogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImJnLVsjRkJFQUQ5XSByb3VuZGVkLXhsIHAtNCB0ZXh0LWNlbnRlciBtYi0zIj4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJjb3BpYWJsZSB0ZXh0LTN4bCBmb250LWJsYWNrIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjOEM1NzJGXSI+CiAgICAgICAgICAgICAge2ludml0YWNpb24uY29kaWdvX2ludml0YWNpb259CiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIG10LTEiPkPDs2RpZ28gZGUge21hc2NvdGFOb21icmV9PC9wPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIG9uQ2xpY2s9e2NvcGlhcn0KICAgICAgICAgICAgY2xhc3NOYW1lPSJ3LWZ1bGwgYmctWyM4QzU3MkZdIHRleHQtd2hpdGUgZm9udC1ib2xkIHB5LTIuNSByb3VuZGVkLXhsIHRleHQtc20gbWItMiIKICAgICAgICAgID4KICAgICAgICAgICAge2NvcGlhZG8gPyAn4pyTIENvcGlhZG8nIDogJ/Cfk4sgQ29waWFyIGPDs2RpZ28nfQogICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIG9uQ2xpY2s9e3Jldm9jYXJ9CiAgICAgICAgICAgIGRpc2FibGVkPXtwcm9jZXNhbmRvfQogICAgICAgICAgICBjbGFzc05hbWU9InctZnVsbCBiZy1bI0VFRTJENF0gdGV4dC1bIzhBNzU2MF0gZm9udC1zZW1pYm9sZCBweS0yIHJvdW5kZWQteGwgdGV4dC1zbSBkaXNhYmxlZDpvcGFjaXR5LTQwIgogICAgICAgICAgPgogICAgICAgICAgICB7cHJvY2VzYW5kbyA/ICdDYW5jZWxhbmRvLi4uJyA6ICdDYW5jZWxhciBpbnZpdGFjacOzbid9CiAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICA8Lz4KICAgICAgKX0KCiAgICAgIHtlc3RhZG8gPT09ICdhY3Rpdm8nICYmICgKICAgICAgICA8PgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTMiPgogICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtbGciPuKchTwvc3Bhbj4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXNtIHRleHQtWyMzRDJCMUZdIGZvbnQtc2VtaWJvbGQiPkNvLXR1dG9yIGFjdGl2bzwvcD4KICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIG1iLTMiPgogICAgICAgICAgICBIYXkgdW5hIHBlcnNvbmEgY29uIGFjY2VzbyBjb21wYXJ0aWRvIGEge21hc2NvdGFOb21icmV9LiBQdWVkZSByZWdpc3RyYXIgc8OtbnRvbWFzIHkgcmVjaWJpciBub3RpZmljYWNpb25lcy4KICAgICAgICAgIDwvcD4KICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgb25DbGljaz17cmV2b2Nhcn0KICAgICAgICAgICAgZGlzYWJsZWQ9e3Byb2Nlc2FuZG99CiAgICAgICAgICAgIGNsYXNzTmFtZT0idy1mdWxsIGJnLVsjRTA1MjUyXS8xMCB0ZXh0LVsjRTA1MjUyXSBmb250LWJvbGQgcHktMi41IHJvdW5kZWQteGwgdGV4dC1zbSBkaXNhYmxlZDpvcGFjaXR5LTQwIGJvcmRlciBib3JkZXItWyNFMDUyNTJdLzIwIgogICAgICAgICAgPgogICAgICAgICAgICB7cHJvY2VzYW5kbyA/ICdSZXZvY2FuZG8uLi4nIDogJ1Jldm9jYXIgYWNjZXNvJ30KICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgIDwvPgogICAgICApfQoKICAgICAge2Vycm9yICYmICgKICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzExcHhdIHRleHQtWyNFMDUyNTJdIG10LTMgbGVhZGluZy1yZWxheGVkIj57ZXJyb3J9PC9wPgogICAgICApfQogICAgPC9kaXY+CiAgKQp9Cg==';

const ICONO_VIEJO = '<img src="/chiqui/chiqui_doctor.png" alt="" className="w-8 h-8 object-contain" />';
const ICONO_NUEVO = '<img src="/chiqui/chiqui_cuidados.png" alt="" className="w-8 h-8 object-contain" />';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// ============================================================
// VERIFICACIONES — todas antes de escribir nada
// ============================================================

// --- 1. El icono nuevo tiene que existir de verdad
const destinoIcono = path.join(process.cwd(), RUTA_ICONO);
if (!fs.existsSync(destinoIcono)) {
  abortar('no existe ' + RUTA_ICONO + '. Confirma el nombre exacto del archivo en public/chiqui/ (puede llamarse distinto).');
}
console.log('  OK existe ' + RUTA_ICONO);

// --- 2. GestionCotutor
const destinoCotutor = path.join(process.cwd(), RUTA_COTUTOR);
if (!fs.existsSync(destinoCotutor)) {
  abortar('no se encontro ' + RUTA_COTUTOR + '. Corre el script desde la raiz del proyecto.');
}
const cotutorActual = fs.readFileSync(destinoCotutor, 'utf8');
if (cotutorActual.includes(".select('id')")) {
  abortar(RUTA_COTUTOR + ' ya tiene la logica nueva. Parece que este script ya se corrio.');
}
for (const s of ['export default function GestionCotutor', 'generarCodigo', 'revocar']) {
  if (!cotutorActual.includes(s)) {
    abortar(RUTA_COTUTOR + ' no contiene [' + s + ']. No es el archivo que esperaba.');
  }
}
console.log('  OK GestionCotutor.tsx es la version vieja');

const cotutorNuevo = Buffer.from(COTUTOR_B64, 'base64').toString('utf8');
for (const r of ['export default function GestionCotutor', ".select('id')", 'data.length === 0']) {
  if (!cotutorNuevo.includes(r)) {
    abortar('el contenido nuevo de GestionCotutor no incluye [' + r + ']. Script corrupto.');
  }
}

// --- 3. Dashboard
const destinoDash = path.join(process.cwd(), RUTA_DASHBOARD);
if (!fs.existsSync(destinoDash)) {
  abortar('no se encontro ' + RUTA_DASHBOARD + '.');
}
let dash = fs.readFileSync(destinoDash, 'utf8');
const nIcono = contar(dash, ICONO_VIEJO);
console.log('  ' + (nIcono === 1 ? 'OK ' : 'X  ') + 'icono de Cuidados recientes -> ' + nIcono + ' coincidencia(s)');
if (nIcono !== 1) {
  abortar('esperaba 1 uso de chiqui_doctor.png con ese tamano en el Dashboard y encontre ' + nIcono + '.');
}

// ============================================================
// ESCRITURA — recien aca se toca el disco
// ============================================================
console.log('');

fs.writeFileSync(destinoCotutor, cotutorNuevo, 'utf8');
console.log('OK: ' + RUTA_COTUTOR);

dash = dash.split(ICONO_VIEJO).join(ICONO_NUEVO);
if (contar(dash, ICONO_NUEVO) !== 1) {
  abortar('el icono no quedo reemplazado correctamente.');
}
fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('OK: ' + RUTA_DASHBOARD);

console.log('');
console.log('Listo. Cancelar invitacion ya avisa si falla, y Cuidados recientes usa su propio icono.');
