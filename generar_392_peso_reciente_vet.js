const fs = require('fs');
const path = require('path');

// ============================================================
// generar_392_peso_reciente_vet.js
// ============================================================
// EL CASO REAL (Casandra, en la consulta)
// Chiquito bajo 1 kg. La app lo mostro correctamente. La vista del
// veterinario decia "Peso estable durante los ultimos 6 meses".
//
// LA CAUSA — no es un error de calculo, es de criterio
// La vista del veterinario compara la PRIMERA pesada de los ultimos 6
// meses contra la ultima. Si hace medio año pesaba 15, subio a 16 y
// volvio a 15, la variacion da cero y escribe "estable" — aunque la
// baja acabe de ocurrir.
//
// Los dos numeros son ciertos. Pero el veterinario necesita saber QUE
// ACABA DE PASAR, no solo donde empezo y termino el semestre.
//
// POR QUE IMPORTA
// Un kilo en un perro de 16 es un 6%. En medicina veterinaria, una
// perdida sobre el 5% sin causa conocida es motivo de estudio. Decirle
// "estable" a quien esta evaluando al animal es entregarle lo
// contrario de lo que paso.
//
// EL ARREGLO
// Se agrega la comparacion con el control ANTERIOR, con el mismo umbral
// del 5% que ya usa la app (PesoTracker). Si el cambio reciente es
// notorio, esa linea manda y va en amarillo. Si no, se mantiene la
// mirada de 6 meses como estaba.
//
// El aumento en cachorros sigue siendo verde: crecer es lo esperado.
// La PERDIDA se marca a cualquier edad.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/vet/page.tsx';

const VIEJO = [
  "    if (enPeriodo.length >= 2) {",
  "      const primero = enPeriodo[0].peso",
  "      const ultimo = enPeriodo[enPeriodo.length - 1].peso",
  "      const variacionPct = primero ? Math.abs((ultimo - primero) / primero) * 100 : 0",
  "      if (variacionPct < 5) {",
  "        resumen.push({ texto: `Peso estable durante los últimos 6 meses (${ultimo} kg).`, nivel: 'verde' })",
].join('\n');

const NUEVO = [
  "    if (enPeriodo.length >= 2) {",
  "      const primero = enPeriodo[0].peso",
  "      const ultimo = enPeriodo[enPeriodo.length - 1].peso",
  "      const variacionPct = primero ? Math.abs((ultimo - primero) / primero) * 100 : 0",
  "",
  "      // Cambio desde el CONTROL ANTERIOR. Mirar solo el primero y el",
  "      // último del semestre puede ocultar lo que acaba de pasar: si",
  "      // pesaba 15, subió a 16 y volvió a 15, la variación da cero y",
  "      // se leía \"estable\" — aunque la baja fuera reciente.",
  "      //",
  "      // Mismo umbral del 5% que usa la app, para que las dos digan lo",
  "      // mismo. Un 5% en un perro de 16 kg es cerca de un kilo.",
  "      const anteriorPeso = enPeriodo[enPeriodo.length - 2].peso",
  "      const cambioReciente = ultimo - anteriorPeso",
  "      const cambioRecientePct = anteriorPeso ? (Math.abs(cambioReciente) / anteriorPeso) * 100 : 0",
  "      const fechaUltimo = enPeriodo[enPeriodo.length - 1].fecha",
  "",
  "      if (cambioRecientePct >= 5 && Math.abs(cambioReciente) >= 0.1) {",
  "        const kg = Math.abs(cambioReciente).toFixed(1).replace('.', ',')",
  "        if (cambioReciente < 0) {",
  "          // La pérdida se marca a cualquier edad, también en cachorros.",
  "          resumen.push({ texto: `Perdió ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg, ${fechaUltimo}).`, nivel: 'amarillo' })",
  "        } else if (esCachorroCrecimiento) {",
  "          resumen.push({ texto: `Aumentó ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg), acorde a su crecimiento.`, nivel: 'verde' })",
  "        } else {",
  "          resumen.push({ texto: `Aumentó ${kg} kg desde el control anterior (${anteriorPeso} kg → ${ultimo} kg, ${fechaUltimo}).`, nivel: 'amarillo' })",
  "        }",
  "      } else if (variacionPct < 5) {",
  "        resumen.push({ texto: `Peso estable durante los últimos 6 meses (${ultimo} kg).`, nivel: 'verde' })",
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

if (contenido.includes('cambioReciente')) {
  abortar('la vista del veterinario ya compara el control anterior. Parece que este script ya se corrio.');
}
// La consulta tiene que traer la fecha, o el texto quedaria incompleto.
if (!contenido.includes('esCachorroCrecimiento')) {
  abortar('no encontre la logica de cachorros. El archivo no es el esperado.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'resumen de peso -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = [
  'const cambioReciente = ultimo - anteriorPeso',
  'desde el control anterior',
  'Peso estable durante los últimos 6 meses',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las ramas de 6 meses tienen que seguir existiendo: son el respaldo
// cuando no hay cambio reciente notorio.
for (const r of ['Peso aumentó de', 'Peso disminuyó de']) {
  if (!contenido.includes(r)) {
    abortar('se perdio la rama [' + r + '] de los 6 meses.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El veterinario ya ve el cambio reciente, no solo el semestre.');
