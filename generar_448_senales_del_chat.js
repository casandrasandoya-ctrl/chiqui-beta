const fs = require('fs');
const path = require('path');

// ============================================================
// generar_448_senales_del_chat.js
// ============================================================
// Le pasa al chat las SEÑALES SUELTAS, para que pueda responder por
// una sola en vez de soltar el episodio completo.
//
//   Antes: "¿cuando vomito?" -> "Del 25 al 27 jul: vomito, heces
//           blandas, tomo mas agua" (todo junto)
//   Ahora: "¿cuando vomito?" -> "2 veces: 26 jul y 25 jul", con la nota
//           de cada dia.
//
// Se arma con el mismo criterio que los episodios —los mismos valores
// normales, las mismas etiquetas— pero SIN agrupar por dias.
//
// Y de paso se quita la raiz 'una' del corte de uñas: esta dentro de
// "vacUNAs" y respondia sobre las uñas a preguntas de vacunas.
//
// REQUISITO: script 447 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  { nombre: 'calculo de las señales', viejo: "  const datosChat = {", nuevo: "  // Se\u00f1ales sueltas, para poder responder por una sola: \"\u00bfcu\u00e1ndo\n  // vomit\u00f3?\" tiene que hablar solo de v\u00f3mito. Se arma con el mismo\n  // criterio que los episodios, pero sin agrupar por d\u00edas.\n  const SENALES_CHAT: Record<string, string[]> = {\n    digestion: ['normal'], heces: ['normal'], apetito: ['normal'], agua: ['normal'],\n    energia: ['normal', 'alta', 'muy_alta'], animo: ['normal', 'feliz', 'muy_feliz'],\n    movilidad: ['normal'], pelaje: ['brillante', 'normal'], conducta: ['sociable', 'normal'],\n    arenero: ['normal'],\n  }\n  const ETQ_CHAT: Record<string, string> = {\n    'digestion:vomito': 'vomit\u00f3', 'digestion:diarrea': 'diarrea', 'digestion:nauseas': 'n\u00e1useas',\n    'digestion:gases': 'gases', 'digestion:mal_aliento': 'mal aliento',\n    'heces:con_sangre': 'heces con sangre', 'heces:blandas': 'heces blandas',\n    'heces:duras': 'heces duras', 'heces:no_hizo': 'no hizo heces', 'heces:diarrea': 'diarrea',\n    'apetito:nada': 'no comi\u00f3', 'apetito:menos': 'comi\u00f3 menos', 'apetito:mas': 'comi\u00f3 m\u00e1s',\n    'agua:menos': 'tom\u00f3 menos agua', 'agua:mas': 'tom\u00f3 m\u00e1s agua', 'agua:nada': 'no tom\u00f3 agua',\n    'energia:muy_baja': 'energ\u00eda muy baja', 'energia:baja': 'energ\u00eda baja',\n    'animo:decaido': 'deca\u00eddo', 'animo:ansioso': 'ansioso', 'animo:irritable': 'irritable',\n    'movilidad:cojera': 'cojera', 'movilidad:rigidez': 'rigidez',\n    'movilidad:dificultad': 'dificultad al moverse',\n    'pelaje:rasca': 'se rasc\u00f3', 'pelaje:lame_exceso': 'se lami\u00f3 mucho', 'pelaje:caida': 'ca\u00edda de pelo',\n    'conducta:esconde': 'se escondi\u00f3', 'conducta:agresivo': 'agresivo',\n    'arenero:sangre': 'sangre en la orina', 'arenero:dificultad': 'dificultad al orinar',\n  }\n  const senalesChat: { campo: string; etiqueta: string; fecha: string; nota: string }[] = []\n  for (const r of (registros || [])) {\n    if (!r.fecha) continue\n    for (const [campo, normales] of Object.entries(SENALES_CHAT)) {\n      const v = (r as any)[campo]\n      if (v && !normales.includes(v)) {\n        senalesChat.push({\n          campo,\n          etiqueta: ETQ_CHAT[`${campo}:${v}`] || String(v).replace(/_/g, ' '),\n          fecha: fmtChat(r.fecha),\n          nota: (r.nota || '').trim(),\n        })\n      }\n    }\n  }\n  // Las m\u00e1s recientes primero: lo de ayer importa m\u00e1s que lo del mes\n  // pasado.\n  senalesChat.reverse()\n\n  const datosChat = {" },
  { nombre: 'campo en los datos', viejo: "    cuidados: cuidadosChat,", nuevo: "    senales: senalesChat,\n    cuidados: cuidadosChat," },
  { nombre: 'raiz del corte de uñas', viejo: "    { campo: 'corte_unas', label: 'Corte de u\u00f1as', palabras: ['una', 'unas', 'garra'] },", nuevo: "    // 'una' NO va: esta dentro de \"vacUNAs\" y respondia el corte de\n    // u\u00f1as a preguntas de vacunas. El chat ademas revisa vacunas\n    // primero, pero mejor no depender solo de eso.\n    { campo: 'corte_unas', label: 'Corte de u\u00f1as', palabras: ['unas', 'unita', 'garra', 'cortar las'] }," },
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

if (c.includes('senalesChat')) {
  abortar('las señales ya estan. Parece que este script ya se corrio.');
}
if (!c.includes('const datosChat = {')) {
  abortar('falta el objeto datosChat. Corre primero los scripts 442 y 446.');
}
// fmtChat se usa para las fechas de cada señal.
if (!c.includes('const fmtChat')) {
  abortar('no encontre fmtChat. Avisale a Claude.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
const ESPERADOS = ['const senalesChat', 'senales: senalesChat,', 'const ETQ_CHAT'];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La raiz peligrosa no puede quedar.
if (c.includes("palabras: ['una', 'unas'")) {
  abortar('quedo la raiz "una" que colisiona con vacunas.');
}
// El calculo tiene que quedar antes del objeto.
if (c.indexOf('const senalesChat') > c.indexOf('const datosChat = {')) {
  abortar('las señales quedarian despues de usarse.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya se puede preguntar por una señal en particular.');
