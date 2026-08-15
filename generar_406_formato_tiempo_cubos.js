const fs = require('fs');
const path = require('path');

// ============================================================
// generar_406_formato_tiempo_cubos.js
// ============================================================
// EL PROBLEMA
// En los cubos el texto se cortaba: "hace 35..." y "hace 93...". Y un
// texto cortado es peor que uno corto — no se sabe si son 35 dias o 35
// semanas.
//
// EL FORMATO
//   0 dias        -> Hoy
//   1 dia         -> Ayer
//   2 a 30 dias   -> 9d, 30d
//   31 a 59 dias  -> 1m
//   60 o mas      -> 2m, 3m...
//
// Se mantienen "Hoy" y "Ayer" en palabras porque son cortos y se leen
// mejor que "0d". Y sobre el mes se deja de contar en dias: la
// diferencia entre 93 y 97 dias no le dice nada a nadie, pero "3m" si.
//
// El calculo usa 30 dias por mes. No es exacto, pero a esa escala la
// precision no aporta: lo que importa es el orden de magnitud.
//
// REQUISITO: script 405 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

const VIEJO = "        const textoDias = (d: number) => d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : `hace ${d} días`";

const NUEVO = [
  "        // Formato corto: el texto largo se cortaba en el ancho del cubo",
  "        // (\"hace 35...\"), y un texto cortado es peor que uno corto.",
  "        //",
  "        // Sobre el mes se deja de contar en días: la diferencia entre 93",
  "        // y 97 días no le dice nada a nadie, pero \"3m\" sí. Se usan 30",
  "        // días por mes — inexacto, pero a esa escala lo que importa es",
  "        // el orden de magnitud.",
  "        const textoDias = (d: number) => {",
  "          if (d === 0) return 'Hoy'",
  "          if (d === 1) return 'Ayer'",
  "          if (d <= 30) return `${d}d`",
  "          return `${Math.max(1, Math.floor(d / 30))}m`",
  "        }",
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

if (contenido.includes("Math.floor(d / 30)")) {
  abortar('el formato ya esta corto. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'formato de tiempo -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = ["if (d <= 30) return `${d}d`", "Math.max(1, Math.floor(d / 30))"];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('`hace ${d} días`')) {
  abortar('quedo el formato largo que se cortaba.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El tiempo ya cabe sin cortarse.');
