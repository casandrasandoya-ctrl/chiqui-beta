const fs = require('fs');
const path = require('path');

// ============================================================
// generar_393_zoom_fotos.js
// ============================================================
// LO QUE PASO EN LA CONSULTA
// La veterinaria intento hacer zoom en la foto de una observacion —
// queria ver que habia en el vomito — y no pudo. La foto esta ahi
// justamente para que ella la mire.
//
// EL ARREGLO
// Un componente FotoAmpliable que envuelve la imagen: al tocarla se
// abre a pantalla completa sobre fondo oscuro, donde el gesto de
// pellizcar SI funciona. Se cierra tocando fuera, con la ✕ o con Escape.
//
// Se aplica en los DOS lugares donde hay fotos clinicas:
//   - app/vet/page.tsx        (la foto de cada evolucion)
//   - app/prevencion/page.tsx (la foto de la observacion)
//
// TRES DETALLES QUE IMPORTAN
//  - Lleva una etiqueta "🔍 Ampliar" encima. Sin esa señal nadie lo
//    intenta: la veterinaria probo porque necesitaba ver, no porque la
//    interfaz se lo ofreciera.
//  - El fondo va OSCURO, no claro: sobre negro se distinguen mejor los
//    detalles de color de una lesion o una deposicion.
//  - Es un componente de CLIENTE, y por eso funciona tambien dentro de
//    /vet, que se dibuja en el servidor y no puede tener estado.
//
// Crea un archivo nuevo y modifica dos existentes. Si algo no calza,
// ABORTA sin escribir NADA.
// ============================================================

const RUTA_COMP = 'components/FotoAmpliable.tsx';
const RUTA_VET = 'app/vet/page.tsx';
const RUTA_PREV = 'app/prevencion/page.tsx';

const FOTO_B64 = 'J3VzZSBjbGllbnQnCmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCcKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBGT1RPIEFNUExJQUJMRQovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gTmFjacOzIGRlIHVuYSBjb25zdWx0YSByZWFsOiBsYSB2ZXRlcmluYXJpYSBpbnRlbnTDsyBoYWNlciB6b29tIGVuIGxhCi8vIGZvdG8gZGUgdW5hIG9ic2VydmFjacOzbiDigJRxdWVyw61hIHZlciBxdcOpIGhhYsOtYSBlbiBlbCB2w7NtaXRv4oCUIHkgbm8KLy8gcHVkby4gTGEgZm90byBleGlzdGUganVzdGFtZW50ZSBwYXJhIHF1ZSBlbGxhIGxhIG1pcmUuCi8vCi8vIEFsIHRvY2FybGEgc2UgYWJyZSBhIHBhbnRhbGxhIGNvbXBsZXRhIHNvYnJlIGZvbmRvIG9zY3VybywgZG9uZGUgZWwKLy8gZ2VzdG8gZGUgcGVsbGl6Y2FyIHBhcmEgYW1wbGlhciBzw60gZnVuY2lvbmEuIFNlIGNpZXJyYSB0b2NhbmRvIGZ1ZXJhLAovLyBjb24gbGEg4pyVIG8gY29uIGxhIHRlY2xhIEVzY2FwZS4KLy8KLy8gRXMgdW4gY29tcG9uZW50ZSBkZSBjbGllbnRlIHBvcnF1ZSBuZWNlc2l0YSBlc3RhZG8sIHkgYXPDrSBwdWVkZQovLyB1c2Fyc2UgdGFtYmnDqW4gZGVudHJvIGRlIC92ZXQsIHF1ZSBzZSBkaWJ1amEgZW4gZWwgc2Vydmlkb3IuCi8vCi8vIEVsIGZvbmRvIHZhIG9zY3VybyB5IG5vIGNsYXJvOiBzb2JyZSBuZWdybyBzZSBkaXN0aW5ndWVuIG1lam9yIGxvcwovLyBkZXRhbGxlcyBkZSBjb2xvciBkZSB1bmEgbGVzacOzbiBvIHVuYSBkZXBvc2ljacOzbiwgcXVlIGVzIGxvIHF1ZSBzZQovLyBlc3TDoSBtaXJhbmRvLgoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRm90b0FtcGxpYWJsZSh7CiAgc3JjLAogIGFsdCwKICBjbGFzc05hbWUsCn06IHsKICBzcmM6IHN0cmluZwogIGFsdDogc3RyaW5nCiAgY2xhc3NOYW1lPzogc3RyaW5nCn0pIHsKICBjb25zdCBbYWJpZXJ0YSwgc2V0QWJpZXJ0YV0gPSB1c2VTdGF0ZShmYWxzZSkKCiAgLy8gRXNjYXBlIHBhcmEgY2VycmFyLCB5IGJsb3F1ZW8gZGVsIHNjcm9sbCBkZSBmb25kbyBtaWVudHJhcyBlc3TDoQogIC8vIGFiaWVydGEuCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGlmICghYWJpZXJ0YSkgcmV0dXJuCiAgICBmdW5jdGlvbiBhbFRlY2xlYXIoZTogS2V5Ym9hcmRFdmVudCkgewogICAgICBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSBzZXRBYmllcnRhKGZhbHNlKQogICAgfQogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGFsVGVjbGVhcikKICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJwogICAgcmV0dXJuICgpID0+IHsKICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGFsVGVjbGVhcikKICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnCiAgICB9CiAgfSwgW2FiaWVydGFdKQoKICByZXR1cm4gKAogICAgPD4KICAgICAgPGJ1dHRvbgogICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBYmllcnRhKHRydWUpfQogICAgICAgIGNsYXNzTmFtZT0idy1mdWxsIGJsb2NrIHJlbGF0aXZlIG10LTIiCiAgICAgICAgYXJpYS1sYWJlbD17YEFtcGxpYXIgZm90bzogJHthbHR9YH0KICAgICAgPgogICAgICAgIDxpbWcgc3JjPXtzcmN9IGFsdD17YWx0fSBjbGFzc05hbWU9e2NsYXNzTmFtZX0gLz4KICAgICAgICB7LyogU2XDsWFsIGRlIHF1ZSBzZSBwdWVkZSBhbXBsaWFyOiBzaW4gZXN0bywgbmFkaWUgbG8gaW50ZW50YS4gKi99CiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJhYnNvbHV0ZSBib3R0b20tMiByaWdodC0yIGJnLVsjM0QyQjFGXS83MCB0ZXh0LXdoaXRlIHRleHQtWzEwcHhdIGZvbnQtc2VtaWJvbGQgcm91bmRlZC1mdWxsIHB4LTIgcHktMSI+CiAgICAgICAgICDwn5SNIEFtcGxpYXIKICAgICAgICA8L3NwYW4+CiAgICAgIDwvYnV0dG9uPgoKICAgICAge2FiaWVydGEgJiYgKAogICAgICAgIDxkaXYKICAgICAgICAgIGNsYXNzTmFtZT0iZml4ZWQgaW5zZXQtMCB6LVs3MF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIiCiAgICAgICAgICBzdHlsZT17eyBiYWNrZ3JvdW5kOiAncmdiYSgwLDAsMCwwLjkyKScgfX0KICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEFiaWVydGEoZmFsc2UpfQogICAgICAgID4KICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgdHlwZT0iYnV0dG9uIgogICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBYmllcnRhKGZhbHNlKX0KICAgICAgICAgICAgYXJpYS1sYWJlbD0iQ2VycmFyIgogICAgICAgICAgICBjbGFzc05hbWU9ImFic29sdXRlIHRvcC00IHJpZ2h0LTQgdy0xMCBoLTEwIHJvdW5kZWQtZnVsbCBiZy13aGl0ZS8xNSB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtbGcgZm9udC1ib2xkIHotMTAiCiAgICAgICAgICA+CiAgICAgICAgICAgIOKclQogICAgICAgICAgPC9idXR0b24+CgogICAgICAgICAgey8qIG92ZXJmbG93LWF1dG8gcGVybWl0ZSBkZXNwbGF6YXJzZSBjdWFuZG8gbGEgaW1hZ2VuIHNlIGFtcGzDrWEKICAgICAgICAgICAgICBjb24gZWwgZ2VzdG8gZGUgcGVsbGl6Y2FyLiAqL30KICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJ3LWZ1bGwgaC1mdWxsIG92ZXJmbG93LWF1dG8gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00Ij4KICAgICAgICAgICAgPGltZwogICAgICAgICAgICAgIHNyYz17c3JjfQogICAgICAgICAgICAgIGFsdD17YWx0fQogICAgICAgICAgICAgIGNsYXNzTmFtZT0ibWF4LXctZnVsbCBtYXgtaC1mdWxsIG9iamVjdC1jb250YWluIgogICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0KICAgICAgICAgICAgLz4KICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgIDxwIGNsYXNzTmFtZT0iYWJzb2x1dGUgYm90dG9tLTUgbGVmdC0wIHJpZ2h0LTAgdGV4dC1jZW50ZXIgdGV4dC13aGl0ZS81MCB0ZXh0LVsxMXB4XSI+CiAgICAgICAgICAgIFBlbGxpemNhIHBhcmEgYWNlcmNhciDCtyBUb2NhIGZ1ZXJhIHBhcmEgY2VycmFyCiAgICAgICAgICA8L3A+CiAgICAgICAgPC9kaXY+CiAgICAgICl9CiAgICA8Lz4KICApCn0K';

const CAMBIOS = [
  {
    ruta: RUTA_VET,
    nombre: 'import en la vista del veterinario',
    viejo: "import { createVetClient } from '@/utils/supabase/vet-client'",
    nuevo: [
      "import { createVetClient } from '@/utils/supabase/vet-client'",
      "import FotoAmpliable from '@/components/FotoAmpliable'",
    ].join('\n'),
  },
  {
    ruta: RUTA_VET,
    nombre: 'foto de la evolucion',
    viejo: '                                <img src={p.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl mt-1.5" />',
    nuevo: '                                <FotoAmpliable src={p.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl" />',
  },
  {
    ruta: RUTA_PREV,
    nombre: 'import en Prevencion',
    viejo: "import FechaSelector from '@/components/FechaSelector'",
    nuevo: [
      "import FechaSelector from '@/components/FechaSelector'",
      "import FotoAmpliable from '@/components/FotoAmpliable'",
    ].join('\n'),
  },
  {
    ruta: RUTA_PREV,
    nombre: 'foto de la observacion',
    viejo: '{o.foto_url && obsExpandida !== o.id && <img src={o.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl mt-2" />}',
    nuevo: '{o.foto_url && obsExpandida !== o.id && <FotoAmpliable src={o.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl" />}',
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

if (fs.existsSync(path.join(process.cwd(), RUTA_COMP))) {
  abortar('ya existe ' + RUTA_COMP + '. No lo sobrescribo por si tiene cambios tuyos.');
}

const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    porArchivo.set(c.ruta, { destino, contenido: fs.readFileSync(destino, 'utf8') });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

const comp = Buffer.from(FOTO_B64, 'base64').toString('utf8');
for (const r of ["'use client'", 'export default function FotoAmpliable', 'Pellizca para acercar']) {
  if (!comp.includes(r)) {
    abortar('el componente no incluye [' + r + ']. Script corrupto, no se escribio nada.');
  }
}

// --- Escribir
const destinoComp = path.join(process.cwd(), RUTA_COMP);
const carpeta = path.dirname(destinoComp);
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMP);

for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. Las fotos clinicas ya se pueden ampliar.');
