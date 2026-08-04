const fs = require('fs');
const path = require('path');

// ============================================================
// generar_371_estado_reproductivo.js
// ============================================================
// EL BUG
// En la tarjeta nueva del dashboard, el estado reproductivo solo se
// mostraba cuando la mascota SI estaba esterilizada:
//
//     if (m.castrado) partes.push('Esterilizado/a')
//
// Si no lo estaba, no aparecia nada y la linea quedaba a medias.
//
// LA PALABRA
// "No esterilizado" y "No castrado" describen por AUSENCIA, y eso
// carga un juicio: sugieren que falta algo que deberia estar. "Entero"
// es el termino veterinario correcto, pero a los tutores les suena
// brusco.
//
// Se usa "Fertil": dice el mismo hecho sin marcarlo como carencia, se
// entiende sin explicacion y no necesita concordar en genero.
//
// Si mas adelante se prefiere "Entero/a", es cambiar esa palabra aqui
// y nada mas.
//
// EL DATO DESCONOCIDO NO SE INVENTA
// Solo se muestra cuando el campo es explicitamente true o false. Si
// estuviera vacio, no se afirma nada: decir "Fertil" sobre un dato que
// nadie ingreso seria inventarlo.
//
// REQUISITO: script 368 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

const VIEJO = "                if (m.castrado) partes.push('Esterilizado/a')";

const NUEVO = [
  "                // Se muestra en los DOS casos: antes, si no estaba",
  "                // esterilizada, la línea quedaba a medias.",
  "                //",
  "                // \"Fértil\" en vez de \"No esterilizado\": describir por",
  "                // ausencia sugiere que falta algo que debería estar, y",
  "                // eso es un juicio que la app no tiene por qué hacer.",
  "                //",
  "                // Si el campo estuviera vacío no se afirma nada: decir",
  "                // \"Fértil\" sobre un dato que nadie ingresó sería",
  "                // inventarlo.",
  "                if (m.castrado === true) partes.push('Esterilizado/a')",
  "                else if (m.castrado === false) partes.push('Fértil')",
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

if (contenido.includes("partes.push('Fértil')")) {
  abortar('la tarjeta ya muestra el estado reproductivo completo. Parece que este script ya se corrio.');
}
if (!contenido.includes('Ver Perfil ▶')) {
  abortar('falta la tarjeta nueva. Corre primero el script 368.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'estado reproductivo -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = [
  "if (m.castrado === true) partes.push('Esterilizado/a')",
  "else if (m.castrado === false) partes.push('Fértil')",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La comprobacion tiene que ser ESTRICTA: con un if suelto, un campo
// vacio se leeria como "no esterilizado" y afirmariamos algo que nadie
// ingreso.
if (contenido.includes('if (m.castrado) partes.push')) {
  abortar('quedo la comprobacion suelta, que afirmaria sobre datos vacios.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. La linea ya no queda a medias.');
