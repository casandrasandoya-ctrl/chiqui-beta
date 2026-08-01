// generar_316_bloquear_menu_contextual_enlaces.js
// CHIQUI Entre Señales — Bloquear el menú del navegador al mantener presionado
//
// Complemento del script 314. Antes bloqueamos la SELECCIÓN de texto,
// pero al mantener presionado sobre un ENLACE (como "Mi perfil →") o una
// imagen seguía apareciendo el menú del navegador: "abrir en nueva
// pestaña", "compartir vínculo", "copiar dirección", etc. Eso delataba
// que por dentro es una web.
//
// Ahora, desde ClientWrapper (que envuelve toda la app), se cancela ese
// menú contextual en cualquier parte — enlaces incluidos — para que se
// sienta como app nativa.
//
// Excepción: dentro de campos de texto (input/textarea) y de elementos
// marcados como .copiable (ej. el código de co-tutor) SÍ se permite el
// menú, para no perder copiar/pegar donde es útil.
//
// Solo reescribe components/ClientWrapper.tsx. No hay SQL.
//
// Uso:
//   node generar_316_bloquear_menu_contextual_enlaces.js

const fs2 = require('fs')
const path = require('path')

const archivos = [
  {
    ruta: 'components/ClientWrapper.tsx',
    base64: "J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQC91dGlscy9zdXBhYmFzZS9jbGllbnQnCmltcG9ydCBTcGxhc2hTY3JlZW4gZnJvbSAnQC9jb21wb25lbnRzL1NwbGFzaFNjcmVlbicKCi8vIE11ZXN0cmEgZWwgU3BsYXNoU2NyZWVuIGNvbiBwcmVndW50YSByb3RhdGl2YSBkdXJhbnRlIGxhIGNhcmdhIGluaWNpYWwuCi8vIFNpZW1wcmUgZXNwZXJhIHVuIG1pbmltbyBkZSAyLjUgc2VndW5kb3MgcGFyYSBxdWUgbGEgcHJlZ3VudGEgc2VhCi8vIGxlZ2libGUsIGF1bnF1ZSBTdXBhYmFzZSByZXNwb25kYSBtYXMgcmFwaWRvLgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDbGllbnRXcmFwcGVyKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlIH0pIHsKICBjb25zdCBbY2FyZ2FuZG8sIHNldENhcmdhbmRvXSA9IHVzZVN0YXRlKHRydWUpCgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudCgpCiAgICBjb25zdCB0aWVtcG9NaW5pbW8gPSBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIDI1MDApKQogICAgY29uc3Qgc2VzaW9uID0gc3VwYWJhc2UuYXV0aC5nZXRTZXNzaW9uKCkKICAgIC8vIEVzcGVyYXIgQU1CT1M6IHF1ZSBTdXBhYmFzZSByZXNwb25kYSBZIHF1ZSBwYXNlbiAyLjUgc2VndW5kb3MKICAgIFByb21pc2UuYWxsKFtzZXNpb24sIHRpZW1wb01pbmltb10pLnRoZW4oKCkgPT4gc2V0Q2FyZ2FuZG8oZmFsc2UpKQogIH0sIFtdKQoKICAvLyBDYW5jZWxhIGVsIG1lbsO6IGRlbCBuYXZlZ2Fkb3IgcXVlIGFwYXJlY2UgYWwgbWFudGVuZXIgcHJlc2lvbmFkbwogIC8vIChzb2JyZSBlbmxhY2VzLCBpbcOhZ2VuZXMsIGV0Yy4pOiAiYWJyaXIgZW4gbnVldmEgcGVzdGHDsWEiLCAiY29tcGFydGlyCiAgLy8gdsOtbmN1bG8iLCAiY29waWFyIGRpcmVjY2nDs24iLi4uIEVzdG8gaGFjZSBxdWUgbGEgYXBwIHNlIHNpZW50YSBuYXRpdmEKICAvLyB5IG5vIGNvbW8gdW5hIHdlYiBkZW50cm8gZGUgdW4gbmF2ZWdhZG9yLgogIC8vIEV4Y2VwY2nDs246IGRlbnRybyBkZSBjYW1wb3MgZGUgdGV4dG8gKGlucHV0L3RleHRhcmVhKSB5IGRlIGVsZW1lbnRvcwogIC8vIG1hcmNhZG9zIGNvbW8gLmNvcGlhYmxlIChlai4gZWwgY8OzZGlnbyBkZSBjby10dXRvcikgU8ONIHNlIHBlcm1pdGUsCiAgLy8gcGFyYSBubyBwZXJkZXIgZWwgbWVuw7ogZGUgY29waWFyL3BlZ2FyIGRvbmRlIGVzIMO6dGlsLgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBmdW5jdGlvbiBhbE1lbnVDb250ZXh0dWFsKGU6IEV2ZW50KSB7CiAgICAgIGNvbnN0IG9iamV0aXZvID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsCiAgICAgIGlmIChvYmpldGl2byAmJiBvYmpldGl2by5jbG9zZXN0KCdpbnB1dCwgdGV4dGFyZWEsIFtjb250ZW50ZWRpdGFibGU9InRydWUiXSwgLmNvcGlhYmxlJykpIHsKICAgICAgICByZXR1cm4gLy8gcGVybWl0aXIgZWwgbWVuw7ogZW4gY2FtcG9zIHkgZWxlbWVudG9zIGNvcGlhYmxlcwogICAgICB9CiAgICAgIGUucHJldmVudERlZmF1bHQoKQogICAgfQogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBhbE1lbnVDb250ZXh0dWFsKQogICAgcmV0dXJuICgpID0+IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgYWxNZW51Q29udGV4dHVhbCkKICB9LCBbXSkKCiAgaWYgKGNhcmdhbmRvKSByZXR1cm4gPFNwbGFzaFNjcmVlbiAvPgoKICByZXR1cm4gPGRpdiBjbGFzc05hbWU9ImZhZGUtaW4iPntjaGlsZHJlbn08L2Rpdj4KfQo="
  },
]

let errores = 0
for (const a of archivos) {
  try {
    const rutaCompleta = path.join(process.cwd(), a.ruta)
    fs2.mkdirSync(path.dirname(rutaCompleta), { recursive: true })
    const contenido = Buffer.from(a.base64, 'base64').toString('utf8')
    fs2.writeFileSync(rutaCompleta, contenido, 'utf8')
    console.log('OK: ' + a.ruta)
  } catch (e) {
    errores++
    console.error('ERROR escribiendo ' + a.ruta + ': ' + e.message)
  }
}

if (errores === 0) {
  console.log('\nListo. 1 archivo escrito. git add / commit / push.')
} else {
  console.error('\nTerminó con ' + errores + ' error(es). NO hagas push.')
  process.exit(1)
}
