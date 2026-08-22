const fs = require('fs');
const path = require('path');

// ============================================================
// generar_435_exportar_tips.js
// ============================================================
// PASO 1 de 2 del chat.
//
// Las tarjetas de Chiqui Tips viven dentro de ChiquiTeCuenta.tsx como
// constantes que nadie mas puede leer. Este script les agrega "export"
// para que el chat las use.
//
// POR QUE IMPORTA
// Ese contenido ya esta escrito y verificado por Casandra: que puede
// comer, cuanta agua necesita, que significan sus heces, como
// reconocer un signo de alerta. Es lo que permite que el chat responda
// "¿le puedo dar uvas?" sin que ningun modelo de lenguaje invente
// nada — la respuesta ya existia.
//
// Es un cambio de DOS PALABRAS. No toca el contenido de las tarjetas
// ni como se muestran hoy en el dashboard.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ChiquiTeCuenta.tsx';

const PARES = [
  { nombre: 'tarjetas de perro', viejo: 'const TARJETAS_PERRO = [', nuevo: 'export const TARJETAS_PERRO = [' },
  { nombre: 'tarjetas de gato', viejo: 'const TARJETAS_GATO = [', nuevo: 'export const TARJETAS_GATO = [' },
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

if (c.includes('export const TARJETAS_PERRO')) {
  abortar('las tarjetas ya estan exportadas. Parece que este script ya se corrio.');
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
if (!c.includes('export const TARJETAS_PERRO = [') || !c.includes('export const TARJETAS_GATO = [')) {
  abortar('las exportaciones no quedaron aplicadas.');
}
// El componente y su uso interno no deben haberse tocado.
if (!c.includes('export default function')) {
  abortar('se perdio el componente.');
}
for (const s of ['TARJETAS_PERRO', 'TARJETAS_GATO', 'TARJETAS_GENERAL']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los tips ya se pueden usar desde otros componentes.');
