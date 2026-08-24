const fs = require('fs');
const path = require('path');

// ============================================================
// generar_469_fix_tipo_flotante.js
// ============================================================
// EL ERROR DEL BUILD
//
//   Type error: Argument of type 'string | undefined' is not
//   assignable to parameter of type 'string'.
//   const prev = porDia.get(f) || { etiquetas: [], nota: '' }
//
// LA CAUSA
// fechaISO esta declarado como OPCIONAL en el tipo de las señales
// (fechaISO?: string). Yo siempre lo lleno, pero TypeScript no puede
// saberlo: para el, ahi puede venir undefined, y un Map<string, ...> no
// acepta undefined como clave.
//
// EL ARREGLO
// Comprobarlo y saltar las que no lo tengan. Dos lineas.
//
// Babel no ve esto —valida sintaxis, no tipos— asi que solo aparecio en
// el build. Esta vez reproduje el error con tsc antes de arreglarlo, y
// verifique que el arreglo lo elimina.
//
// REQUISITO: script 467 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ChiquiFlotante.tsx';

const VIEJO = [
  '      for (const x of (senales || [])) {',
  '        const f = x.fechaISO',
  "        const prev = porDia.get(f) || { etiquetas: [], nota: '' }",
].join('\n');

const NUEVO = [
  '      for (const x of (senales || [])) {',
  '        // fechaISO es opcional en el tipo, así que hay que',
  '        // comprobarlo: acá siempre viene, pero TypeScript no lo sabe.',
  '        const f = x.fechaISO',
  '        if (!f) continue',
  "        const prev = porDia.get(f) || { etiquetas: [] as string[], nota: '' }",
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
  abortar('no se encontro ' + RUTA + '.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('if (!f) continue')) {
  abortar('el tipo ya esta corregido. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'bloque de episodios -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

if (!c.includes('if (!f) continue')) {
  abortar('el arreglo no quedo aplicado.');
}
// El resto del calculo tiene que seguir intacto.
for (const s of ['const grupos', 'const episodios', 'porDia.set(f, prev)']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El build deberia pasar.');
