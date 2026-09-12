// ============================================================
// generar_502_panel_escritorio.js
// ============================================================
// Crea el panel lateral de escritorio y le reserva el sitio.
//
// 1. components/PanelEscritorio.tsx  (archivo nuevo)
// 2. app/layout.tsx                  (2 reemplazos exactos)
// 3. app/globals.css                 (se reemplaza el bloque de
//                                     escritorio completo)
//
// Si algo no calza, ABORTA sin escribir nada.
// ============================================================

const fs = require('fs')
const path = require('path')

const RAIZ = process.cwd()
const RUTA_PANEL = path.join(RAIZ, 'components', 'PanelEscritorio.tsx')
const RUTA_LAYOUT = path.join(RAIZ, 'app', 'layout.tsx')
const RUTA_CSS = path.join(RAIZ, 'app', 'globals.css')

const B64_PANEL = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCcKaW1wb3J0IExpbmsgZnJvbSAnbmV4dC9saW5rJwppbXBvcnQgeyB1c2VQYXRobmFtZSB9IGZyb20gJ25leHQvbmF2aWdhdGlvbicKaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC91dGlscy9zdXBhYmFzZS9jbGllbnQnCmltcG9ydCB7IGRldGVybWluYXJNYXNjb3RhQWN0aXZhLCBvYnRlbmVyTWFzY290YUFjdGl2YUlkIH0gZnJvbSAnQC91dGlscy9tYXNjb3RhQWN0aXZhJwoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIFBBTkVMIEVTQ1JJVE9SSU8g4oCUIGxhIG5hdmVnYWNpw7NuIGxhdGVyYWwKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIEVuIGVsIHRlbMOpZm9ubyBDSElRVUkgc2UgbmF2ZWdhIGNvbiBlbCBtZW7DuiBkZSBhYmFqbyB5IGVzdMOhIGJpZW46IGVsCi8vIHB1bGdhciBsbGVnYSBzb2xvLiBFbiB1biBtb25pdG9yIGVzZSBtaXNtbyBtZW7DuiBxdWVkYSBsZWpvcyBkZSBkb25kZQovLyBlc3TDoSBtaXJhbmRvIGxhIHBlcnNvbmEsIHkgdG9kYSBsYSBtaXRhZCBpenF1aWVyZGEgZGUgbGEgcGFudGFsbGEKLy8gc29icmEuCi8vCi8vIEVzdGUgcGFuZWwgZXhpc3RlIFNPTE8gZGVzZGUgMTAyNHB4IChgaGlkZGVuIGxnOmZsZXhgKS4gRWwgdGVsw6lmb25vIG5vCi8vIGxvIHZlIG51bmNhLCB5IG5vIGhheSBxdWUgdG9jYXIgbmluZ3VuYSBwYW50YWxsYSBwYXJhIHF1ZSBhcGFyZXpjYTogc2UKLy8gZGlidWphIHVuYSBzb2xhIHZleiBkZXNkZSBhcHAvbGF5b3V0LnRzeCwgaWd1YWwgcXVlIE1lbnVGbG90YW50ZS4KLy8KLy8gRXMgYGZpeGVkYCwgYXPDrSBxdWUgTk8gb2N1cGEgbHVnYXIgZW4gZWwgZmx1am8uIEVsIHNpdGlvIHNlIGxvIHJlc2VydmEKLy8gZWwgcGFkZGluZy1sZWZ0IGRlbCBib2R5IGVuIGdsb2JhbHMuY3NzLCBlbmdhbmNoYWRvIGNvbgovLyA6aGFzKC5wYW5lbC1lc2NyaXRvcmlvKS4gUE9SIEVTTyBMQSBDTEFTRSBERUwgPGFzaWRlPiBJTVBPUlRBOiBzaSBzZQovLyByZW5vbWJyYSwgZWwgY29udGVuaWRvIHNlIG1ldGUgcG9yIGRlYmFqbyBkZWwgcGFuZWwuCi8vCi8vIE5PIGFwYXJlY2UgZW4gbGFzIHBhbnRhbGxhcyBzaW4gc2VzacOzbiBuaSBlbiBsYSB2aXN0YSBkZWwgdmV0ZXJpbmFyaW8sCi8vIHF1ZSBubyBlcyBkZWwgdHV0b3IgeSB0aWVuZSBzdSBwcm9waW8gYW5jaG8uCi8vCi8vIHotMzA6IHBvciBkZWJham8gZGUgTWVudUZsb3RhbnRlICh6LTQwKSB5IGRlIGxvcyBtb2RhbGVzICh6LTYwKS4KCmNvbnN0IFNJTl9QQU5FTCA9IFsnL2xvZ2luJywgJy9yZWdpc3RybycsICcvYmllbnZlbmlkYScsICcvdmV0JywgJy9wcml2YWNpZGFkJywgJy9saW5rcyddCgovLyBMYXMgY2luY28gc2VjY2lvbmVzIHF1ZSBZQSBleGlzdGVuLiAiU2FsdWQiIGVzIHNvbG8gbGEgZXRpcXVldGE6IGxhCi8vIHJ1dGEgcmVhbCBlcyAvcHJldmVuY2lvbiwgcXVlIGVzIGRvbmRlIHZpdmVuIHZhY3VuYXMsCi8vIGFudGlwYXJhc2l0YXJpb3MsIG1lZGljYW1lbnRvcyB5IGV4w6FtZW5lcy4KY29uc3QgSVRFTVMgPSBbCiAgeyBocmVmOiAnL2Rhc2hib2FyZCcsIGxhYmVsOiAnSW5pY2lvJywgaWNvbm86ICfwn4+gJyB9LAogIHsgaHJlZjogJy9jYWxlbmRhcmlvJywgbGFiZWw6ICdDYWxlbmRhcmlvJywgaWNvbm86ICfwn5OFJyB9LAogIHsgaHJlZjogJy9wcmV2ZW5jaW9uJywgbGFiZWw6ICdTYWx1ZCcsIGljb25vOiAn8J+puicgfSwKICB7IGhyZWY6ICcvYW5hbGlzaXMnLCBsYWJlbDogJ0Fuw6FsaXNpcycsIGljb25vOiAn8J+TiicgfSwKICB7IGhyZWY6ICcvcGVyZmlsJywgbGFiZWw6ICdQZXJmaWwnLCBpY29ubzogJ/CfkaQnIH0sCl0KCnR5cGUgTWFzY290YVBhbmVsID0geyBpZDogc3RyaW5nOyBub21icmU6IHN0cmluZzsgZXNwZWNpZTogc3RyaW5nOyBlZGFkOiBzdHJpbmcgfQoKLy8gRWRhZCBlbiB0ZXh0byBjb3J0by4gQW50ZXMgZGUgbG9zIGRvcyBhw7FvcyBzZSBjdWVudGEgZW4gbWVzZXM6IGxhCi8vIGRpZmVyZW5jaWEgZW50cmUgdW4gY2FjaG9ycm8gZGUgMyBtZXNlcyB5IHVubyBkZSAxMCBlcyBlbm9ybWUsIHkKLy8gIjAgYcOxb3MiIG5vIGRpY2UgbmFkYS4KZnVuY3Rpb24gZWRhZFRleHRvKG5hY2ltaWVudG86IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiBzdHJpbmcgewogIGlmICghbmFjaW1pZW50bykgcmV0dXJuICcnCiAgY29uc3QgbiA9IG5ldyBEYXRlKFN0cmluZyhuYWNpbWllbnRvKS5zbGljZSgwLCAxMCkgKyAnVDEyOjAwOjAwJykKICBpZiAoaXNOYU4obi5nZXRUaW1lKCkpKSByZXR1cm4gJycKICAvLyBNZWRpb2TDrWEgeSBob3JhIGRlIENoaWxlLCBpZ3VhbCBxdWUgZW4gZWwgcmVzdG8gZGUgbGEgYXBwOiBjYWxjdWxhcgogIC8vIHNvYnJlIG1lZGlhbm9jaGUgc2Ugcm9tcGUgZW4gbG9zIGNhbWJpb3MgZGUgaG9yYXJpbyBkZSB2ZXJhbm8uCiAgY29uc3QgaG95SVNPID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQoJ2VuLUNBJywgeyB0aW1lWm9uZTogJ0FtZXJpY2EvU2FudGlhZ28nIH0pLmZvcm1hdChuZXcgRGF0ZSgpKQogIGNvbnN0IGhveSA9IG5ldyBEYXRlKGhveUlTTyArICdUMTI6MDA6MDAnKQogIGxldCBtZXNlcyA9IChob3kuZ2V0RnVsbFllYXIoKSAtIG4uZ2V0RnVsbFllYXIoKSkgKiAxMiArIChob3kuZ2V0TW9udGgoKSAtIG4uZ2V0TW9udGgoKSkKICBpZiAoaG95LmdldERhdGUoKSA8IG4uZ2V0RGF0ZSgpKSBtZXNlcy0tCiAgaWYgKG1lc2VzIDwgMCkgcmV0dXJuICcnCiAgaWYgKG1lc2VzIDwgMjQpIHJldHVybiBtZXNlcyA8PSAxID8gJzEgbWVzJyA6IG1lc2VzICsgJyBtZXNlcycKICBjb25zdCBhbmlvcyA9IE1hdGguZmxvb3IobWVzZXMgLyAxMikKICByZXR1cm4gYW5pb3MgKyAoYW5pb3MgPT09IDEgPyAnIGHDsW8nIDogJyBhw7FvcycpCn0KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFBhbmVsRXNjcml0b3JpbygpIHsKICBjb25zdCBwYXRobmFtZSA9IHVzZVBhdGhuYW1lKCkKICBjb25zdCBydXRhID0gcGF0aG5hbWUgfHwgJycKICBjb25zdCBbbWFzY290YSwgc2V0TWFzY290YV0gPSB1c2VTdGF0ZTxNYXNjb3RhUGFuZWwgfCBudWxsPihudWxsKQogIC8vIExhIG1hc2NvdGEgYWN0aXZhIHZpdmUgZW4gbG9jYWxTdG9yYWdlLCB5IGNhbWJpYXJsYSBOTyBjYW1iaWEgbGEKICAvLyBydXRhOiBubyBoYXkgZXZlbnRvIGFsIHF1ZSBlbmdhbmNoYXJzZSBkZW50cm8gZGUgbGEgbWlzbWEgcGVzdGHDsWEuCiAgLy8gU2UgcmV2aXNhIGNhZGEgc2VndW5kbyB5IG1lZGlvLCBpZ3VhbCBxdWUgQ2hpcXVpRmxvdGFudGUsIHkgY29uIGVsCiAgLy8gTUlTTU8gaGVscGVyLiBEb3MgbGVjdHVyYXMgZGlzdGludGFzIHNlIGRlc2luY3Jvbml6YW4geSBlbCBwYW5lbAogIC8vIHRlcm1pbmFyw61hIG1vc3RyYW5kbyB1biBhbmltYWwgbWllbnRyYXMgZWwgY2hhdCBoYWJsYSBkZSBvdHJvLgogIGNvbnN0IFtpZEFjdGl2bywgc2V0SWRBY3Rpdm9dID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCkKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGNvbnN0IHJldmlzYXIgPSAoKSA9PiB7CiAgICAgIGNvbnN0IGlkID0gb2J0ZW5lck1hc2NvdGFBY3RpdmFJZCgpCiAgICAgIHNldElkQWN0aXZvKHByZXYgPT4gKHByZXYgPT09IGlkID8gcHJldiA6IGlkKSkKICAgIH0KICAgIHJldmlzYXIoKQogICAgY29uc3QgdCA9IHNldEludGVydmFsKHJldmlzYXIsIDE1MDApCiAgICByZXR1cm4gKCkgPT4gY2xlYXJJbnRlcnZhbCh0KQogIH0sIFtdKQoKICBjb25zdCBvY3VsdG8gPSAhcnV0YSB8fCBTSU5fUEFORUwuc29tZShyID0+IHJ1dGEgPT09IHIgfHwgcnV0YS5zdGFydHNXaXRoKHIgKyAnLycpKQoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgaWYgKG9jdWx0bykgcmV0dXJuCiAgICBsZXQgdml2byA9IHRydWUKICAgIDsoYXN5bmMgKCkgPT4gewogICAgICB0cnkgewogICAgICAgIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KCkKICAgICAgICBjb25zdCB7IGRhdGE6IHsgdXNlciB9IH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIoKQogICAgICAgIGlmICghdXNlcikgcmV0dXJuCiAgICAgICAgLy8gU29sbyBsbyBpbXByZXNjaW5kaWJsZS4gUGVkaXIgY29sdW1uYXMgZGUgbcOhcyBhY8OhIGVzIHBlbGlncm9zbzoKICAgICAgICAvLyBzaSB1bmEgbm8gZXhpc3RlLCBmYWxsYSBUT0RBIGxhIGNvbnN1bHRhIHkgbGEgdGFyamV0YSBkZSBhYmFqbwogICAgICAgIC8vIHNlIHF1ZWRhIHZhY8OtYS4KICAgICAgICBjb25zdCB7IGRhdGE6IG1hc2NvdGFzIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAgICAgLmZyb20oJ21hc2NvdGFzJykKICAgICAgICAgIC5zZWxlY3QoJ2lkLCBub21icmUsIGVzcGVjaWUnKQogICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlci5pZCkKICAgICAgICAgIC5pcygnYXJjaGl2YWRhX2VuJywgbnVsbCkKICAgICAgICBpZiAoIW1hc2NvdGFzIHx8IG1hc2NvdGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuCiAgICAgICAgY29uc3QgbSA9IGRldGVybWluYXJNYXNjb3RhQWN0aXZhKG1hc2NvdGFzKQogICAgICAgIC8vIEVsIGlkIGd1YXJkYWRvIHBvZHLDrWEgc2VyIGRlIG90cmEgY3VlbnRhIHNpIGFsZ3VpZW4gY2FtYmnDsyBkZQogICAgICAgIC8vIHNlc2nDs24gZW4gZWwgbWlzbW8gZXF1aXBvOiBzZSBjb21wcnVlYmEgY29udHJhIGxhIGxpc3RhIHJlYWwuCiAgICAgICAgaWYgKCFtIHx8ICFtYXNjb3Rhcy5zb21lKCh4OiBhbnkpID0+IHguaWQgPT09IG0uaWQpKSByZXR1cm4KCiAgICAgICAgLy8gTGEgZmVjaGEgZGUgbmFjaW1pZW50byB2YSBhcGFydGUgeSBwcm90ZWdpZGE6IHNpIGZhbHRhLCBlbAogICAgICAgIC8vIHBhbmVsIG11ZXN0cmEgbGEgZXNwZWNpZSBzaW4gbGEgZWRhZCBlbiB2ZXogZGUgbm8gbW9zdHJhciBuYWRhLgogICAgICAgIGxldCBlZGFkID0gJycKICAgICAgICB0cnkgewogICAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZQogICAgICAgICAgICAuZnJvbSgnbWFzY290YXMnKQogICAgICAgICAgICAuc2VsZWN0KCdmZWNoYV9uYWNpbWllbnRvJykKICAgICAgICAgICAgLmVxKCdpZCcsIG0uaWQpCiAgICAgICAgICAgIC5zaW5nbGUoKQogICAgICAgICAgaWYgKGRhdGEpIGVkYWQgPSBlZGFkVGV4dG8oKGRhdGEgYXMgYW55KS5mZWNoYV9uYWNpbWllbnRvKQogICAgICAgIH0gY2F0Y2ggewogICAgICAgICAgLy8gU2luIGZlY2hhIGRlIG5hY2ltaWVudG86IHNlIG9taXRlIGxhIGVkYWQuCiAgICAgICAgfQoKICAgICAgICBpZiAoIXZpdm8pIHJldHVybgogICAgICAgIHNldE1hc2NvdGEoeyBpZDogbS5pZCwgbm9tYnJlOiBtLm5vbWJyZSB8fCAnVHUgcGVsdWRvJywgZXNwZWNpZTogbS5lc3BlY2llIHx8ICcnLCBlZGFkIH0pCiAgICAgIH0gY2F0Y2ggKGUpIHsKICAgICAgICAvLyBFbCBwYW5lbCBlcyBuYXZlZ2FjacOzbjogdGllbmUgcXVlIGFwYXJlY2VyIGF1bnF1ZSBsb3MgZGF0b3MgZGUKICAgICAgICAvLyBsYSBtYXNjb3RhIGZhbGxlbi4gTG8gw7puaWNvIHF1ZSBzZSBwaWVyZGUgZXMgbGEgdGFyamV0YS4KICAgICAgICBjb25zb2xlLmVycm9yKCdQYW5lbEVzY3JpdG9yaW86JywgZSkKICAgICAgfQogICAgfSkoKQogICAgcmV0dXJuICgpID0+IHsgdml2byA9IGZhbHNlIH0KICB9LCBbb2N1bHRvLCBpZEFjdGl2b10pCgogIGlmIChvY3VsdG8pIHJldHVybiBudWxsCgogIC8vIFNlIG1hcmNhIGVsIMOtdGVtIGFjdGl2byBwb3IgcHJlZmlqbyBwYXJhIHF1ZSBsYXMgc3VicMOhZ2luYXMKICAvLyAoL2NhbGVuZGFyaW8vYWxnbykgc2lnYW4gaWx1bWluYW5kbyBzdSBzZWNjacOzbi4KICBjb25zdCBlc0FjdGl2byA9IChocmVmOiBzdHJpbmcpID0+IHJ1dGEgPT09IGhyZWYgfHwgcnV0YS5zdGFydHNXaXRoKGhyZWYgKyAnLycpCgogIHJldHVybiAoCiAgICA8YXNpZGUgY2xhc3NOYW1lPSJwYW5lbC1lc2NyaXRvcmlvIGhpZGRlbiBsZzpmbGV4IGZpeGVkIGxlZnQtMCB0b3AtMCBib3R0b20tMCB3LTYwIHotMzAgZmxleC1jb2wgYmctWyNGRkZDRjhdIGJvcmRlci1yIGJvcmRlci1bI0VFRTJENF0iPgogICAgICA8ZGl2IGNsYXNzTmFtZT0icHgtNSBweS00IGJnLVsjOEM1NzJGXSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiI+CiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LWxnIGxlYWRpbmctbm9uZSI+8J+Qvjwvc3Bhbj4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImZvbnQtaGVhZGluZyBmb250LWV4dHJhYm9sZCB0ZXh0LXdoaXRlIHRleHQtbGcgbGVhZGluZy1ub25lIj5FbnRyZSBTZcOxYWxlczwvc3Bhbj4KICAgICAgPC9kaXY+CgogICAgICA8bmF2IGNsYXNzTmFtZT0iZmxleC0xIG92ZXJmbG93LXktYXV0byBweC0zIHB0LTUiPgogICAgICAgIDxwIGNsYXNzTmFtZT0icHgtMiBwYi0yIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGUgdGV4dC1bI0I1QTM4Rl0iPgogICAgICAgICAgTWVuw7ogcHJpbmNpcGFsCiAgICAgICAgPC9wPgogICAgICAgIHtJVEVNUy5tYXAoaXQgPT4gewogICAgICAgICAgY29uc3Qgb24gPSBlc0FjdGl2byhpdC5ocmVmKQogICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgPExpbmsKICAgICAgICAgICAgICBrZXk9e2l0LmhyZWZ9CiAgICAgICAgICAgICAgaHJlZj17aXQuaHJlZn0KICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtYi0xIHB4LTMgcHktMi41IHJvdW5kZWQteGwgdHJhbnNpdGlvbi1jb2xvcnMgJHsKICAgICAgICAgICAgICAgIG9uCiAgICAgICAgICAgICAgICAgID8gJ2JnLVsjRjBFMkNFXSB0ZXh0LVsjOEM1NzJGXSBmb250LWJvbGQnCiAgICAgICAgICAgICAgICAgIDogJ3RleHQtWyMzRDJCMUZdIGhvdmVyOmJnLVsjRjVFREUzXScKICAgICAgICAgICAgICB9YH0KICAgICAgICAgICAgPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1iYXNlIGxlYWRpbmctbm9uZSI+e2l0Lmljb25vfTwvc3Bhbj4KICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtc20iPntpdC5sYWJlbH08L3NwYW4+CiAgICAgICAgICAgIDwvTGluaz4KICAgICAgICAgICkKICAgICAgICB9KX0KICAgICAgPC9uYXY+CgogICAgICB7bWFzY290YSAmJiAoCiAgICAgICAgPGRpdiBjbGFzc05hbWU9Im0tMyBwLTMgcm91bmRlZC0yeGwgYmctWyNGNUVERTNdIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTFweF0gZm9udC1zZW1pYm9sZCB0ZXh0LVsjQjVBMzhGXSBtYi0yIj5UdXMgUGVsdWRvczwvcD4KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyI+CiAgICAgICAgICAgIHsvKiBDw61yY3VsbyBjb24gbGEgaW5pY2lhbC4gTGEgZm90byByZWFsIHZlbmRyw6EgY3VhbmRvIGVzdMOpCiAgICAgICAgICAgICAgICBjb25maXJtYWRvIGVsIG5vbWJyZSBkZSBsYSBjb2x1bW5hIGVuIGxhIHRhYmxhIG1hc2NvdGFzOgogICAgICAgICAgICAgICAgcGVkaXIgdW5hIGNvbHVtbmEgcXVlIG5vIGV4aXN0ZSByb21wZSBsYSBjb25zdWx0YSBlbnRlcmEuICovfQogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0idy05IGgtOSBzaHJpbmstMCByb3VuZGVkLWZ1bGwgYmctWyNGRkJENTldIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZvbnQtaGVhZGluZyBmb250LWV4dHJhYm9sZCB0ZXh0LXNtIHRleHQtWyM4QzU3MkZdIj4KICAgICAgICAgICAgICB7bWFzY290YS5ub21icmUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCl9CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibWluLXctMCI+CiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LVsjM0QyQjFGXSB0cnVuY2F0ZSI+e21hc2NvdGEubm9tYnJlfTwvcD4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzExcHhdIHRleHQtWyM4QTc1NjBdIHRydW5jYXRlIj4KICAgICAgICAgICAgICAgIHtbbWFzY290YS5lc3BlY2llLCBtYXNjb3RhLmVkYWRdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgwrcgJyl9CiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICApfQogICAgPC9hc2lkZT4KICApCn0K'
const B64_TAIL = 'LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgIENISVFVSSBFTiBFU0NSSVRPUklPCiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQogICBFbiBlbCB0ZWzDqWZvbm8gbm8gY2FtYmlhIG5hZGE6IFBhbmVsRXNjcml0b3JpbyBlc3TDoSBlbiBgaGlkZGVuYCB5CiAgIGVzdGFzIHJlZ2xhcyB2aXZlbiBkZW50cm8gZGUgdW4gbWVkaWEgcXVlcnkgZGUgMTAyNHB4LgoKICAgRGVzZGUgYWjDrSBlbCBwYW5lbCBzZSBkaWJ1amEgZmlqbyBhIGxhIGl6cXVpZXJkYS4gQWwgc2VyIGBmaXhlZGAgTk8KICAgb2N1cGEgbHVnYXIgZW4gZWwgZmx1am8sIGFzw60gcXVlIGVzIGVsIHBhZGRpbmctbGVmdCBkZWwgYm9keSBlbCBxdWUKICAgbGUgcmVzZXJ2YSBlbCBzaXRpbzogMjQwcHggZGVsIHBhbmVsICsgMjRweCBkZSBhaXJlLgoKICAgU2UgZW5nYW5jaGEgY29uIDpoYXMoLnBhbmVsLWVzY3JpdG9yaW8pIHkgbm8gY29uIHVuYSByZWdsYSBmaWphCiAgIHBvcnF1ZSBlbCBwYW5lbCBubyBhcGFyZWNlIGVuIGxvZ2luLCByZWdpc3RybyBuaSBlbiBsYSB2aXN0YSBkZWwKICAgdmV0ZXJpbmFyaW8uIEVuIGVzYXMgcGFudGFsbGFzIGVsIGJvZHkgZGViZSBzZWd1aXIgY2VudHJhZG8gZW4gNDIwcHgKICAgY29tbyBzaWVtcHJlLgoKICAgQW50ZXMgYWPDoSBoYWLDrWEgdW4gdG9wZSBmaWpvIGRlIGFuY2hvLiBTZSBxdWl0w7MgYSBwcm9ww7NzaXRvOiBjb24gZWwKICAgcGFuZWwsIGxhIGFwcCB1c2EgbGEgcGFudGFsbGEgY29tcGxldGEuICovCkBtZWRpYSAobWluLXdpZHRoOiAxMDI0cHgpIHsKICBib2R5OmhhcygucGFuZWwtZXNjcml0b3JpbykgewogICAgbWF4LXdpZHRoOiAxMDAlOwogICAgcGFkZGluZy1sZWZ0OiAyNjRweDsKICAgIHBhZGRpbmctcmlnaHQ6IDI0cHg7CiAgfQp9CgoKLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgIFRJUE9HUkFGSUEgREUgRVNDUklUT1JJTwogICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KICAgU2luIGVzdG8sIGFtcGxpYXIgZWwgYW5jaG8gc29sbyBwcm9kdWNlIHVuIHRlbMOpZm9ubyBhbmNobzogbGEgbGV0cmEKICAgZGUgMTJweCBwZW5zYWRhIHBhcmEgbGVlciBhIDMwY20gcXVlZGEgaW5jw7Ntb2RhIGVuIHVuIG1vbml0b3IgYSA2MC4KCiAgIFNvbG8gc2UgdG9jYSBlbCB0YW1hw7FvLCBubyBsYXMgZmFtaWxpYXMgbmkgbG9zIGNvbG9yZXM6IGxhIGFwcCBzZQogICBzaWd1ZSB2aWVuZG8gaWd1YWwsIHBlcm8gbGVnaWJsZS4KCiAgIExhIHZpc3RhIGRlbCB2ZXRlcmluYXJpbyBxdWVkYSBmdWVyYTogeWEgdGllbmUgc3UgcHJvcGlvIHRhbWHDsW8uICovCkBtZWRpYSAobWluLXdpZHRoOiAxMDI0cHgpIHsKICBib2R5Om5vdCg6aGFzKC52aXN0YS12ZXQpKSB7CiAgICBmb250LXNpemU6IDE1cHg7CiAgfQoKICAvKiBFbCB0ZXh0byBkZSBjb250ZW5pZG8uIExvcyB0YW1hw7FvcyBkZSBUYWlsd2luZCBlc3TDoW4gZW4gcmVtLCBwZXJvCiAgICAgbGFzIGNsYXNlcyBsb3MgZmlqYW4gZW4gcHgsIGFzw60gcXVlIGhheSBxdWUgc3ViaXJsb3MgdW5vIGEgdW5vLiAqLwogIGJvZHk6bm90KDpoYXMoLnZpc3RhLXZldCkpIC50ZXh0LXhzIHsgZm9udC1zaXplOiAxM3B4OyBsaW5lLWhlaWdodDogMS41OyB9CiAgYm9keTpub3QoOmhhcygudmlzdGEtdmV0KSkgLnRleHQtc20geyBmb250LXNpemU6IDE1cHg7IGxpbmUtaGVpZ2h0OiAxLjU1OyB9CiAgYm9keTpub3QoOmhhcygudmlzdGEtdmV0KSkgLnRleHQtYmFzZSB7IGZvbnQtc2l6ZTogMTZweDsgfQogIGJvZHk6bm90KDpoYXMoLnZpc3RhLXZldCkpIC50ZXh0LWxnIHsgZm9udC1zaXplOiAxOXB4OyB9CiAgYm9keTpub3QoOmhhcygudmlzdGEtdmV0KSkgLnRleHQteGwgeyBmb250LXNpemU6IDIycHg7IH0KICBib2R5Om5vdCg6aGFzKC52aXN0YS12ZXQpKSAudGV4dC0yeGwgeyBmb250LXNpemU6IDI2cHg7IH0KCiAgLyogTG9zIHRleHRvcyBkaW1pbnV0b3MgZGUgZXRpcXVldGEgc3ViZW4gbWVub3M6IHNpZ3VlbiBzaWVuZG8KICAgICBzZWN1bmRhcmlvcywgc29sbyBkZWphbiBkZSBzZXIgaWxlZ2libGVzLiAqLwogIGJvZHk6bm90KDpoYXMoLnZpc3RhLXZldCkpIC50ZXh0LVxbMTBweFxdIHsgZm9udC1zaXplOiAxMnB4OyB9CiAgYm9keTpub3QoOmhhcygudmlzdGEtdmV0KSkgLnRleHQtXFsxMXB4XF0geyBmb250LXNpemU6IDEzcHg7IH0KCiAgLyogTcOhcyBhaXJlOiBlbiBwYW50YWxsYSBncmFuZGUsIGVsIGVzcGFjaWFkbyBkZSBtw7N2aWwgc2UgdmUKICAgICBhcHJldGFkby4gKi8KICBib2R5Om5vdCg6aGFzKC52aXN0YS12ZXQpKSAubXgtNCB7IG1hcmdpbi1sZWZ0OiAyNHB4OyBtYXJnaW4tcmlnaHQ6IDI0cHg7IH0KICBib2R5Om5vdCg6aGFzKC52aXN0YS12ZXQpKSAucHgtNCB7IHBhZGRpbmctbGVmdDogMjRweDsgcGFkZGluZy1yaWdodDogMjRweDsgfQogIGJvZHk6bm90KDpoYXMoLnZpc3RhLXZldCkpIC5weC01IHsgcGFkZGluZy1sZWZ0OiAyOHB4OyBwYWRkaW5nLXJpZ2h0OiAyOHB4OyB9CgogIC8qIEVsIHBhbmVsIHRpZW5lIHN1IHByb3BpbyBlc3BhY2lhZG86IG5vIGRlYmUgaGVyZWRhciBlbCBkZSBsYSBhcHAuICovCiAgLnBhbmVsLWVzY3JpdG9yaW8gLnB4LTUgeyBwYWRkaW5nLWxlZnQ6IDIwcHg7IHBhZGRpbmctcmlnaHQ6IDIwcHg7IH0KICAucGFuZWwtZXNjcml0b3JpbyAudGV4dC1cWzExcHhcXSB7IGZvbnQtc2l6ZTogMTFweDsgfQp9CgovKiBOT1RBIOKAlCBsbyBxdWUgc2UgcXVpdMOzIGVuIGVsIHNjcmlwdCA1MDIgeSBwb3IgcXXDqToKCiAgIDEpIEVsIHRvcGUgZmlqbyBkZSBhbmNobyBkZWwgYm9keSBlbiBlc2NyaXRvcmlvLiBFcmEgdW4gcGFyY2hlOgogICAgICBlbnNhbmNoYWJhIGxhIGFwcCwgcGVybyBzZWd1w61hIHZpw6luZG9zZSBjb21vIHVuIHRlbMOpZm9ubyBhbmNoby4KICAgICAgTG8gcmVlbXBsYXphIGVsIHBhbmVsIGxhdGVyYWwuCgogICAyKSBFbCByZWNlbnRyYWRvIGRlIGxvcyBlbGVtZW50b3MgYHBvc2l0aW9uOiBmaXhlZGAgY29uIHNlbGVjdG9yZXMKICAgICAgZGVsIHRpcG8gW2NsYXNzKj0iZml4ZWQiXS4gU2VydsOtYSBwYXJhIHF1ZSBlbCBtZW7DuiBkZSBhYmFqbwogICAgICBhY29tcGHDsWFyYSBhbCBib2R5IGN1YW5kbyBlc3RlIHRlbsOtYSB1biB0b3BlLiBTaW4gZXNlIHRvcGUsIHlhIG5vCiAgICAgIGhhY2UgZmFsdGEuCgogICAzKSBMYSByZWdsYSBtdWx0aS1jb2x1bW5hIHNvYnJlIC5kYXNoYm9hcmQtd2ViLiBFc2UgbW9kbyBkZSBDU1MKICAgICAgcmVwYXJ0ZSBlbCBjb250ZW5pZG8gY29tbyBsYXMgY29sdW1uYXMgZGUgdW4gZGlhcmlvLCBubyBjb21vIHVuYQogICAgICBncmlsbGE6IGVsIG9yZGVuIGRlIGxlY3R1cmEgcXVlZGEgcmFybyB5IGxhcyB0YXJqZXRhcyBzYWx0YW4gZGUKICAgICAgbGFkbyBhbCBjYW1iaWFyIGRlIGFsdG8uIEVsIGRhc2hib2FyZCBwYXNhIGEgZ3JpbGxhIHJlYWwgZW4gdW4KICAgICAgc2NyaXB0IGFwYXJ0ZS4gKi8K'

function abortar(msg) {
  console.error('')
  console.error('ABORTADO — no se escribio ningun archivo.')
  console.error(msg)
  console.error('')
  process.exit(1)
}

// --- Comprobaciones previas -------------------------------------------
for (const r of [RUTA_LAYOUT, RUTA_CSS]) {
  if (!fs.existsSync(r)) abortar('No existe: ' + r + '\nCorre el script desde la raiz del proyecto (C:\\Users\\casan\\chiqui-beta).')
}

let layout = fs.readFileSync(RUTA_LAYOUT, 'utf8')
let css = fs.readFileSync(RUTA_CSS, 'utf8')

// --- LAYOUT: anclajes --------------------------------------------------
const A1 = "import ChiquiFlotante from '@/components/ChiquiFlotante'"
const A2 = '        <RegistrarServiceWorker />'

function contar(txt, aguja) {
  let n = 0, i = 0
  while ((i = txt.indexOf(aguja, i)) !== -1) { n++; i += aguja.length }
  return n
}

if (contar(layout, A1) !== 1) {
  abortar('En app/layout.tsx se esperaba 1 vez esta linea y hay ' + contar(layout, A1) + ':\n  ' + A1 + '\n\nPegame el archivo app/layout.tsx tal como esta.')
}
if (contar(layout, A2) !== 1) {
  abortar('En app/layout.tsx se esperaba 1 vez esta linea y hay ' + contar(layout, A2) + ':\n  ' + A2 + '\n\nPegame el archivo app/layout.tsx tal como esta.')
}
if (layout.indexOf('PanelEscritorio') !== -1) {
  abortar('app/layout.tsx ya menciona PanelEscritorio. Parece que este script ya se corrio.')
}

// --- CSS: el bloque de escritorio va desde este comentario hasta el final
const MARCA = '/* ============================================================\n   CHIQUI EN ESCRITORIO'

if (contar(css, MARCA) !== 1) {
  abortar('En app/globals.css se esperaba 1 vez el comentario "CHIQUI EN ESCRITORIO" y hay ' + contar(css, MARCA) + '.\n\nPegame app/globals.css tal como esta.')
}
// Lo que se quita tiene que ser realmente el bloque viejo: si no estan
// el tope de 900px y las columnas, el archivo no es el que se espera.
const cola = css.slice(css.indexOf(MARCA))
for (const senal of ['max-width: 900px', 'columns: 2']) {
  if (cola.indexOf(senal) === -1) {
    abortar('En app/globals.css no aparece "' + senal + '" dentro del bloque de escritorio.\nEl archivo no esta en el estado esperado.\n\nPegame app/globals.css tal como esta.')
  }
}

// --- Todo calza: recien ahora se escribe -------------------------------
const nuevoPanel = Buffer.from(B64_PANEL, 'base64').toString('utf8')
const nuevaCola = Buffer.from(B64_TAIL, 'base64').toString('utf8')

layout = layout.replace(A1, A1 + "\nimport PanelEscritorio from '@/components/PanelEscritorio'")
layout = layout.replace(A2, '        {/* Navegacion lateral. Solo se dibuja desde 1024px; el\n            telefono no la ve. Ver components/PanelEscritorio.tsx. */}\n        <PanelEscritorio />\n' + A2)

css = css.slice(0, css.indexOf(MARCA)) + nuevaCola

fs.mkdirSync(path.dirname(RUTA_PANEL), { recursive: true })
fs.writeFileSync(RUTA_PANEL, nuevoPanel, 'utf8')
console.log('OK: components/PanelEscritorio.tsx')
fs.writeFileSync(RUTA_LAYOUT, layout, 'utf8')
console.log('OK: app/layout.tsx')
fs.writeFileSync(RUTA_CSS, css, 'utf8')
console.log('OK: app/globals.css')

// --- Verificacion ------------------------------------------------------
const vPanel = fs.readFileSync(RUTA_PANEL, 'utf8')
const vLayout = fs.readFileSync(RUTA_LAYOUT, 'utf8')
const vCss = fs.readFileSync(RUTA_CSS, 'utf8')

const fallas = []

// Lo que tiene que estar
if (vPanel.indexOf('panel-escritorio') === -1) fallas.push('PanelEscritorio.tsx sin la clase panel-escritorio')
if (vPanel.indexOf('/prevencion') === -1) fallas.push('PanelEscritorio.tsx sin la ruta /prevencion')
if (vLayout.indexOf('<PanelEscritorio />') === -1) fallas.push('layout.tsx sin <PanelEscritorio />')
if (vLayout.indexOf("import PanelEscritorio from '@/components/PanelEscritorio'") === -1) fallas.push('layout.tsx sin el import de PanelEscritorio')
if (vCss.indexOf(':has(.panel-escritorio)') === -1) fallas.push('globals.css sin la regla :has(.panel-escritorio)')

// Lo que NO puede haber quedado
if (vCss.indexOf('max-width: 900px') !== -1) fallas.push('globals.css todavia tiene el tope de 900px')
if (vCss.indexOf('columns: 2') !== -1) fallas.push('globals.css todavia tiene columns: 2')

// Lo que no se puede haber perdido
for (const s of ['max-width: 420px', 'body:has(.vista-vet)', '.font-heading', '.bandana', '.pulse-dot', 'padding-bottom: 80px', "@import \"tailwindcss\";"]) {
  if (vCss.indexOf(s) === -1) fallas.push('globals.css PERDIO: ' + s)
}
for (const s of ['<ChiquiFlotante />', '<MenuFlotante />', '<ClientWrapper>', 'InstalarAutomatico', 'themeColor']) {
  if (vLayout.indexOf(s) === -1) fallas.push('layout.tsx PERDIO: ' + s)
}

if (fallas.length) {
  console.error('')
  console.error('ATENCION — los archivos se escribieron pero la verificacion fallo:')
  for (const f of fallas) console.error('  - ' + f)
  process.exit(1)
}

console.log('')
console.log('Verificacion OK.')
console.log('  - Panel lateral creado, visible solo desde 1024px.')
console.log('  - Body sin tope de ancho en escritorio, con sitio para el panel.')
console.log('  - Se quitaron el tope de 900px, el recentrado de los fixed y columns:2.')
console.log('  - El movil no cambia.')
