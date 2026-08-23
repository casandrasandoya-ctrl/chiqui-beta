const fs = require('fs');
const path = require('path');

// ============================================================
// generar_452_visitas_en_el_chat.js
// ============================================================
// El chat ya sabe responder "¿cuando fue al veterinario?" — este script
// le pasa los datos que necesita.
//
// LO QUE RESPONDERA
//   La última vez que fueron al veterinario fue el 28 jul.
//   Esos días habías registrado: vomitó, heces blandas.
//   💬 "solo bilis y saliva"
//   En total llevas 2 visitas registradas.
//
// EL CRUCE es lo que hace util el dato. Una fecha sola no dice nada;
// una fecha con lo que se registro esos dias si — y es justo lo que uno
// quiere recordar cuando vuelve a haber sintomas.
//
// La ventana es de 5 dias alrededor de la visita. Mas lejos ya seria
// otra cosa.
//
// QUE SE AGREGA
//   - fechaISO a cada señal, para poder compararla con las visitas.
//   - visitasVet y el formateador de fechas al objeto del chat.
//
// Las visitas ya se cargan desde el script 439 (de las DOS fuentes: la
// tabla de Prevencion y los dias marcados en el registro diario), asi
// que aca solo se reusan.
//
// REQUISITOS: scripts 439, 448 y 451 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  { nombre: 'tipo de las señales', viejo: "  const senalesChat: { campo: string; etiqueta: string; fecha: string; nota: string }[] = []", nuevo: "  const senalesChat: { campo: string; etiqueta: string; fecha: string; fechaISO: string; nota: string }[] = []" },
  { nombre: 'fecha ISO en cada señal', viejo: "        senalesChat.push({\n          campo,\n          etiqueta: ETQ_CHAT[`${campo}:${v}`] || String(v).replace(/_/g, ' '),\n          fecha: fmtChat(r.fecha),\n          nota: (r.nota || '').trim(),\n        })", nuevo: "        senalesChat.push({\n          campo,\n          etiqueta: ETQ_CHAT[`${campo}:${v}`] || String(v).replace(/_/g, ' '),\n          fecha: fmtChat(r.fecha),\n          // La fecha sin formatear, para poder cruzarla con las visitas\n          // al veterinario.\n          fechaISO: String(r.fecha).slice(0, 10),\n          nota: (r.nota || '').trim(),\n        })" },
  { nombre: 'visitas en los datos del chat', viejo: "    senales: senalesChat,", nuevo: "    senales: senalesChat,\n    // Las visitas ya se cargan para los episodios (script 439): ac\u00e1 se\n    // reusan para poder responder \"\u00bfcu\u00e1ndo fue al veterinario?\".\n    visitasVet,\n    fmtVisita: fmtChat," },
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

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('fmtVisita:')) {
  abortar('las visitas ya estan en el chat. Parece que este script ya se corrio.');
}
if (!c.includes('const senalesChat')) {
  abortar('faltan las señales del script 448. Correlo primero.');
}
// visitasVet viene del script 439.
if (!c.includes('visitasVet')) {
  abortar('no encontre visitasVet. Corre primero el script 439.');
}
console.log('  OK  visitasVet ya se carga');

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
const ESPERADOS = ['fechaISO: String(r.fecha).slice(0, 10)', 'visitasVet,', 'fmtVisita: fmtChat,'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// El tipo tiene que incluir fechaISO, o TypeScript rechaza el push.
if (!c.includes('fecha: string; fechaISO: string; nota: string')) {
  abortar('el tipo de las señales no incluye fechaISO: el build fallaria.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya se puede preguntar cuando fue la ultima visita al vet.');
