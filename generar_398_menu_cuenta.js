const fs = require('fs');
const path = require('path');

// ============================================================
// generar_398_menu_cuenta.js
// ============================================================
// Menu desplegable en la esquina superior derecha del dashboard, con lo
// que es de LA CUENTA: perfil, recordatorios, panel interno y cerrar
// sesion.
//
// QUE NO INCLUYE, Y POR QUE
// No lleva Registrar, Calendario, Analisis ni Salud: esos ya estan en
// la barra de abajo. Cuando la misma cosa se alcanza por dos caminos,
// la gente deja de confiar en cualquiera de los dos — sobre todo
// quienes ya aprendieron el primero.
//
// Tampoco cambia de mascota: eso se queda en los circulos, donde ya
// funciona.
//
// QUE PASA CON EL BOTON "SALIR"
// Se reemplaza por el menu, que lo incluye adentro. El modal de
// confirmacion se mueve al componente nuevo, asi que el dashboard queda
// mas limpio.
//
// El componente vive aparte para poder ponerlo despues en las demas
// pantallas con una sola linea.
//
// Crea un archivo nuevo y modifica uno existente. Si algo no calza,
// ABORTA sin escribir NADA.
// ============================================================

const RUTA_COMP = 'components/MenuCuenta.tsx';
const RUTA_DASH = 'components/DashboardContenido.tsx';

const MENU_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCcKaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAnbmV4dC9uYXZpZ2F0aW9uJwppbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL3V0aWxzL3N1cGFiYXNlL2NsaWVudCcKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBNRU7DmiBERSBDVUVOVEEg4oCUIGVzcXVpbmEgc3VwZXJpb3IgZGVyZWNoYQovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gUmXDum5lIGxvIHF1ZSBlcyBkZSBMQSBDVUVOVEEsIG5vIGRlIGxhIG1hc2NvdGE6IHBlcmZpbCBkZWwgdHV0b3IsCi8vIHJlY29yZGF0b3Jpb3MsIHBhbmVsIGludGVybm8geSBjZXJyYXIgc2VzacOzbi4KLy8KLy8gQSBQUk9Qw5NTSVRPIE5PIElOQ0xVWUUgUmVnaXN0cmFyLCBDYWxlbmRhcmlvLCBBbsOhbGlzaXMgbmkgU2FsdWQ6IGVzb3MKLy8geWEgdml2ZW4gZW4gbGEgYmFycmEgZGUgYWJham8uIEN1YW5kbyBsYSBtaXNtYSBjb3NhIHNlIGFsY2FuemEgcG9yCi8vIGRvcyBjYW1pbm9zLCBsYSBnZW50ZSBkZWphIGRlIGNvbmZpYXIgZW4gY3VhbHF1aWVyYSBkZSBsb3MgZG9zIOKAlAovLyBzb2JyZSB0b2RvIHF1aWVuZXMgeWEgYXByZW5kaWVyb24gZWwgcHJpbWVyby4KLy8KLy8gVGFtcG9jbyBpbmNsdXllIGNhbWJpYXIgZGUgbWFzY290YTogZXNvIHNlIHF1ZWRhIGVuIGxvcyBjw61yY3Vsb3MgZGVsCi8vIGRhc2hib2FyZCwgZG9uZGUgeWEgZnVuY2lvbmEgYmllbi4KLy8KLy8gRXMgdW4gY29tcG9uZW50ZSBhcGFydGUgcGFyYSBwb2RlciBwb25lcmxvIGVuIGxhcyBkZW3DoXMgcGFudGFsbGFzIGNvbgovLyB1bmEgc29sYSBsw61uZWEsIGVuIHZleiBkZSByZXBldGlyIGVsIG1lbsO6IGVuIGNhZGEgdW5hLgovLwovLyBFbCBwYW5lbCBpbnRlcm5vIHNvbG8gYXBhcmVjZSBzaSBlbCBzZXJ2aWRvciBjb25maXJtYSBxdWUgbGEgc2VzacOzbgovLyBlcyBsYSBkZSBsYSBhZG1pbmlzdHJhZG9yYS4gUGFyYSBlbCByZXN0byBubyBleGlzdGUuCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNZW51Q3VlbnRhKCkgewogIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpCiAgY29uc3QgW2FiaWVydG8sIHNldEFiaWVydG9dID0gdXNlU3RhdGUoZmFsc2UpCiAgY29uc3QgW2NvbmZpcm1hckNlcnJhciwgc2V0Q29uZmlybWFyQ2VycmFyXSA9IHVzZVN0YXRlKGZhbHNlKQogIGNvbnN0IFtlc0FkbWluLCBzZXRFc0FkbWluXSA9IHVzZVN0YXRlKGZhbHNlKQoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgbGV0IGNhbmNlbGFkbyA9IGZhbHNlCiAgICBmZXRjaCgnL2FwaS9zb3ktYWRtaW4nKQogICAgICAudGhlbihyID0+IHIuanNvbigpKQogICAgICAudGhlbihkID0+IHsgaWYgKCFjYW5jZWxhZG8gJiYgZD8uYWRtaW4pIHNldEVzQWRtaW4odHJ1ZSkgfSkKICAgICAgLmNhdGNoKCgpID0+IHsgLyogc2kgZmFsbGEsIHNpbXBsZW1lbnRlIG5vIHNlIG11ZXN0cmEgKi8gfSkKICAgIHJldHVybiAoKSA9PiB7IGNhbmNlbGFkbyA9IHRydWUgfQogIH0sIFtdKQoKICAvLyBCbG9xdWVvIGRlbCBzY3JvbGwgZGUgZm9uZG8gbWllbnRyYXMgaGF5IGFsZ28gYWJpZXJ0bywgaWd1YWwgcXVlCiAgLy8gZWwgcmVzdG8gZGUgbG9zIG1vZGFsZXMgZGUgbGEgYXBwLgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBjb25zdCBoYXlBbGdvID0gYWJpZXJ0byB8fCBjb25maXJtYXJDZXJyYXIKICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSBoYXlBbGdvID8gJ2hpZGRlbicgOiAnJwogICAgcmV0dXJuICgpID0+IHsgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnIH0KICB9LCBbYWJpZXJ0bywgY29uZmlybWFyQ2VycmFyXSkKCiAgYXN5bmMgZnVuY3Rpb24gY2VycmFyU2VzaW9uKCkgewogICAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoKQogICAgYXdhaXQgc3VwYWJhc2UuYXV0aC5zaWduT3V0KCkKICAgIHJvdXRlci5wdXNoKCcvbG9naW4nKQogICAgcm91dGVyLnJlZnJlc2goKQogIH0KCiAgZnVuY3Rpb24gaXIocnV0YTogc3RyaW5nKSB7CiAgICBzZXRBYmllcnRvKGZhbHNlKQogICAgcm91dGVyLnB1c2gocnV0YSkKICB9CgogIGNvbnN0IE9QQ0lPTiA9ICd3LWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcHgtNCBweS0zIHRleHQtbGVmdCBhY3RpdmU6YmctWyNGQkVBRDldJwoKICByZXR1cm4gKAogICAgPD4KICAgICAgPGJ1dHRvbgogICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFiaWVydG8odHJ1ZSl9CiAgICAgICAgYXJpYS1sYWJlbD0iTWVuw7oiCiAgICAgICAgY2xhc3NOYW1lPSJ3LTEwIGgtMTAgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLVs1cHhdIGZsZXgtc2hyaW5rLTAiCiAgICAgID4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHctNiBoLVsyLjVweF0gcm91bmRlZC1mdWxsIGJnLVsjOEM1NzJGXSIgLz4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHctNiBoLVsyLjVweF0gcm91bmRlZC1mdWxsIGJnLVsjOEM1NzJGXSIgLz4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHctNiBoLVsyLjVweF0gcm91bmRlZC1mdWxsIGJnLVsjOEM1NzJGXSIgLz4KICAgICAgPC9idXR0b24+CgogICAgICB7YWJpZXJ0byAmJiAoCiAgICAgICAgPGRpdgogICAgICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC0wIHotWzYwXSIKICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICdyZ2JhKDYxLDQzLDMxLDAuNDUpJyB9fQogICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWJpZXJ0byhmYWxzZSl9CiAgICAgICAgPgogICAgICAgICAgey8qIEFuY2xhZG8gYXJyaWJhIGEgbGEgZGVyZWNoYTogc2FsZSBkZXNkZSBkb25kZSBzZSB0b2PDsy4gKi99CiAgICAgICAgICA8ZGl2CiAgICAgICAgICAgIGNsYXNzTmFtZT0iYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCB3LTYwIGJnLVsjRkZGQ0Y4XSByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLVsjRUVFMkQ0XSBvdmVyZmxvdy1oaWRkZW4iCiAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0KICAgICAgICAgID4KICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBweC00IHB5LTIuNSBib3JkZXItYiBib3JkZXItWyNFRUUyRDRdIj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtWzExcHhdIGZvbnQtYm9sZCB0ZXh0LVsjOEE3NTYwXSB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXIiPk1pIGN1ZW50YTwvcD4KICAgICAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBYmllcnRvKGZhbHNlKX0KICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9IkNlcnJhciBtZW7DuiIKICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0idGV4dC1bIzhBNzU2MF0gdGV4dC1zbSB3LTYgaC02IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIgogICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgIOKclQogICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gaXIoJy9wZXJmaWwnKX0gY2xhc3NOYW1lPXtPUENJT059PgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1iYXNlIHctNSB0ZXh0LWNlbnRlciI+8J+RpDwvc3Bhbj4KICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LVsjM0QyQjFGXSI+UGVyZmlsIHkgY3VlbnRhPC9zcGFuPgogICAgICAgICAgICA8L2J1dHRvbj4KCiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gaXIoJy9wZXJmaWwnKX0gY2xhc3NOYW1lPXtgJHtPUENJT059IGJvcmRlci10IGJvcmRlci1bI0VFRTJENF1gfT4KICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtYmFzZSB3LTUgdGV4dC1jZW50ZXIiPvCflJQ8L3NwYW4+CiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzNEMkIxRl0iPlJlY29yZGF0b3Jpb3M8L3NwYW4+CiAgICAgICAgICAgIDwvYnV0dG9uPgoKICAgICAgICAgICAge2VzQWRtaW4gJiYgKAogICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gaXIoJy9hZG1pbicpfSBjbGFzc05hbWU9e2Ake09QQ0lPTn0gYm9yZGVyLXQgYm9yZGVyLVsjRUVFMkQ0XWB9PgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LWJhc2Ugdy01IHRleHQtY2VudGVyIj7wn5OKPC9zcGFuPgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzNEMkIxRl0iPlBhbmVsIGludGVybm88L3NwYW4+CiAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICl9CgogICAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBzZXRBYmllcnRvKGZhbHNlKTsgc2V0Q29uZmlybWFyQ2VycmFyKHRydWUpIH19CiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgJHtPUENJT059IGJvcmRlci10IGJvcmRlci1bI0VFRTJENF1gfQogICAgICAgICAgICA+CiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LWJhc2Ugdy01IHRleHQtY2VudGVyIj7wn5qqPC9zcGFuPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0idGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtWyNFMDUyNTJdIj5DZXJyYXIgc2VzacOzbjwvc3Bhbj4KICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgKX0KCiAgICAgIHtjb25maXJtYXJDZXJyYXIgJiYgKAogICAgICAgIDxkaXYKICAgICAgICAgIGNsYXNzTmFtZT0iZml4ZWQgaW5zZXQtMCB6LVs2MF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHgtOCIKICAgICAgICAgIHN0eWxlPXt7IGJhY2tncm91bmQ6ICdyZ2JhKDYxLDQzLDMxLDAuNDUpJyB9fQogICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Q29uZmlybWFyQ2VycmFyKGZhbHNlKX0KICAgICAgICA+CiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYmctWyNGRkZDRjhdIHJvdW5kZWQtMnhsIHctZnVsbCBtYXgtdy14cyBwLTUgdGV4dC1jZW50ZXIiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+CiAgICAgICAgICAgIDxpbWcgc3JjPSIvY2hpcXVpL2NoaXF1aV9ob2xhLnBuZyIgYWx0PSIiIGNsYXNzTmFtZT0idy0xNCBoLTE0IG9iamVjdC1jb250YWluIG14LWF1dG8gbWItMiIgLz4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJmb250LWJvbGQgdGV4dC1zbSB0ZXh0LVsjM0QyQjFGXSBtYi0xIj7Cv0NlcnJhciBzZXNpw7NuPzwvcD4KICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtWyM4QTc1NjBdIG1iLTQiPlRlbmRyw6FzIHF1ZSBpbmljaWFyIHNlc2nDs24gZGUgbnVldm8gcGFyYSB2b2x2ZXIgYSBlbnRyYXIuPC9wPgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBnYXAtMiI+CiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRDb25maXJtYXJDZXJyYXIoZmFsc2UpfSBjbGFzc05hbWU9ImZsZXgtMSBweS0yLjUgcm91bmRlZC14bCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1bIzhBNzU2MF0gYmctWyNGMEUyQ0VdIj4KICAgICAgICAgICAgICAgIENhbmNlbGFyCiAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtjZXJyYXJTZXNpb259IGNsYXNzTmFtZT0iZmxleC0xIHB5LTIuNSByb3VuZGVkLXhsIHRleHQtc20gZm9udC1ib2xkIHRleHQtd2hpdGUiIHN0eWxlPXt7IGJhY2tncm91bmQ6ICcjRTA1MjUyJyB9fT4KICAgICAgICAgICAgICAgIENlcnJhciBzZXNpw7NuCiAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICl9CiAgICA8Lz4KICApCn0K';

const BOTON_VIEJO = [
  "        {/* Cerrar sesión — esquina superior derecha, con confirmación */}",
  "        <button",
  "          onClick={() => setConfirmarCerrar(true)}",
  '          className="flex items-center gap-1 text-[#8A7560] active:opacity-60"',
  '          aria-label="Cerrar sesión"',
  "        >",
  '          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">',
  '            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  '            <polyline points="16 17 21 12 16 7" />',
  '            <line x1="21" y1="12" x2="9" y2="12" />',
  "          </svg>",
  '          <span className="text-[11px] font-semibold">Salir</span>',
  "        </button>",
].join('\n');

const BOTON_NUEVO = [
  "        {/* Menú de cuenta: perfil, recordatorios, panel y cerrar",
  "            sesión. Reemplaza al botón suelto de Salir. */}",
  "        <MenuCuenta />",
].join('\n');

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destinoComp = path.join(process.cwd(), RUTA_COMP);
const destinoDash = path.join(process.cwd(), RUTA_DASH);

if (fs.existsSync(destinoComp)) {
  abortar('ya existe ' + RUTA_COMP + '. No lo sobrescribo por si tiene cambios tuyos.');
}
if (!fs.existsSync(destinoDash)) {
  abortar('no se encontro ' + RUTA_DASH + '. Corre el script desde la raiz del proyecto.');
}

let dash = fs.readFileSync(destinoDash, 'utf8');

if (dash.includes('MenuCuenta')) {
  abortar('el dashboard ya tiene el menu. Parece que este script ya se corrio.');
}

// --- Import
const ANCLA_IMPORT = "'use client'";
if (contar(dash, ANCLA_IMPORT) !== 1) {
  abortar('no encontre donde poner el import.');
}
console.log('  OK  punto del import');

// --- Boton de salir
const n = contar(dash, BOTON_VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'boton de salir -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia del boton de salir y encontre ' + n + '.');
}

dash = dash.replace(ANCLA_IMPORT, ANCLA_IMPORT + "\nimport MenuCuenta from '@/components/MenuCuenta'");
dash = dash.split(BOTON_VIEJO).join(BOTON_NUEVO);

// --- Verificaciones
if (!dash.includes('<MenuCuenta />')) {
  abortar('el menu no quedo colocado.');
}
if (dash.includes('aria-label="Cerrar sesión"')) {
  abortar('quedo el boton viejo de salir.');
}

const comp = Buffer.from(MENU_B64, 'base64').toString('utf8');
for (const r of ["'use client'", 'export default function MenuCuenta', 'Cerrar sesión']) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto.');
  }
}

const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMP);
fs.writeFileSync(destinoDash, dash, 'utf8');
console.log('OK: ' + RUTA_DASH);

console.log('');
console.log('AVISO: en el dashboard quedan el estado confirmarCerrar, la funcion');
console.log('cerrarSesion y su modal, ahora sin uso. NO rompen el build, pero si');
console.log('quieres limpiarlos avisale a Claude.');
console.log('');
console.log('Listo. El menu ya esta en la esquina superior derecha.');
