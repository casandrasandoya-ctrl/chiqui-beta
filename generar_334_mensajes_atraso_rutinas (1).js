const fs = require('fs');
const path = require('path');

// ============================================================
// generar_334_mensajes_atraso_rutinas.js
// ============================================================
// Reescribe estadoProxima() en Analisis (Rutinas de cuidado).
//
// EL PROBLEMA
// Los dos estados de atraso estaban redactados en PASADO:
//   "Hace 12 dias estaba pendiente"
//   "Estaba pendiente hace 2 dias"
// Eso se lee como algo que ocurrio y ya se resolvio, cuando significa
// exactamente lo contrario: sigue sin hacerse y cada dia empeora.
//
// Llamaba la atencion que la misma funcion explicara bien el caso
// bueno ("Te tocaria de nuevo en 95 dias") y mal el caso malo, que es
// justo al reves de lo que conviene.
//
// LOS CAMBIOS
//  1. Los dos casos de atraso pasan a la misma formula, "Van N dias de
//     atraso", y se distinguen solo por color (naranjo hasta 2 dias,
//     rojo desde 3). Antes eran dos frases distintas para la misma
//     idea, lo que hacia el estado mas dificil de leer de un vistazo.
//  2. Se corrige el singular: "Van 1 dia de atraso".
//  3. "Corresponde realizarla hoy" -> "Corresponde hoy". El verbo
//     sobraba y ademas obligaba a un genero ("realizarla") que no
//     calza con todos los cuidados.
//
// NO se toca el condicional "Te tocaria": es una estimacion sacada del
// propio historial de la persona, no una obligacion, y esa suavidad
// esta bien puesta.
//
// Hace un reemplazo exacto. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = [
  "  function estadoProxima(dias: number | null): { texto: string; color: string; icono: string } {",
  "    if (dias === null) return { texto: '', color: '#8A7560', icono: '' }",
  "    if (dias <= -3) return { texto: `Hace ${Math.abs(dias)} días estaba pendiente`, color: '#E05252', icono: '🔴' }",
  "    if (dias < 0) return { texto: `Estaba pendiente hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, color: '#F07A30', icono: '🟠' }",
  "    if (dias === 0) return { texto: 'Corresponde realizarla hoy', color: '#F07A30', icono: '🟠' }",
].join('\n');

const NUEVO = [
  "  function estadoProxima(dias: number | null): { texto: string; color: string; icono: string } {",
  "    if (dias === null) return { texto: '', color: '#8A7560', icono: '' }",
  "    // Atraso. Antes decia \"Hace N dias estaba pendiente\", en pasado,",
  "    // lo que se lee como algo que ya ocurrio y se resolvio. Significa",
  "    // lo contrario: sigue sin hacerse. Los dos tramos comparten ahora",
  "    // la misma frase y se distinguen solo por color, para que el",
  "    // estado se entienda de un vistazo.",
  "    if (dias < 0) {",
  "      const n = Math.abs(dias)",
  "      const texto = `Van ${n} ${n === 1 ? 'día' : 'días'} de atraso`",
  "      return dias <= -3",
  "        ? { texto, color: '#E05252', icono: '🔴' }",
  "        : { texto, color: '#F07A30', icono: '🟠' }",
  "    }",
  "    if (dias === 0) return { texto: 'Corresponde hoy', color: '#F07A30', icono: '🟠' }",
].join('\n');

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

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('de atraso`')) {
  abortar('el archivo ya tiene los mensajes nuevos. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'funcion estadoProxima -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia de la funcion estadoProxima y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

// Verificaciones finales
const ESPERADOS = [
  'de atraso`',
  "'Corresponde hoy'",
  // Los estados positivos NO deben haber cambiado
  '`Te tocaría de nuevo en ${dias} días`',
  "'Te tocaría mañana'",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La verificacion apunta al TEMPLATE LITERAL exacto, no a la frase
// suelta: el comentario de arriba la menciona para explicar el cambio,
// y una busqueda ingenua lo confundiria con codigo viejo.
if (contenido.includes('${Math.abs(dias)} días estaba pendiente')) {
  abortar('quedaron mensajes viejos en pasado.');
}
if (contenido.includes('Corresponde realizarla hoy')) {
  abortar('el texto viejo de hoy sigue presente.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los mensajes de atraso ya se entienden.');
