const fs = require('fs');
const path = require('path');

// ============================================================
// generar_386_tipo_categoria.js
// ============================================================
// EL ERROR DEL BUILD
//
//   Type error: Parameter 'o' implicitly has an 'any' type.
//   const opSel = cat.opciones.find(o => o.value === selVal)
//
// POR QUE
// Antes, cat venia de CATS.map(cat => ...) donde CATS es Categoria[],
// asi que TypeScript sabia que cat.opciones era Opcion[] e inferia el
// tipo de 'o' solo.
//
// Al fusionar los dos bucles, cat pasa a venir de una lista MIXTA
// (observaciones y grupos de cuidados), que es any. TypeScript pierde
// el rastro: cat.opciones es any, y 'o' queda sin tipo.
//
// EL ARREGLO
// Declarar el tipo al sacarlo de la lista. Con eso la inferencia
// vuelve a funcionar igual que antes, sin tocar nada mas.
//
// Es exactamente lo que Babel no puede ver: valida sintaxis, no tipos.
// Aca lo caza el build de Vercel, que es donde siempre aparecen.
//
// REQUISITO: script 385 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const VIEJO = "          const cat = item.cat";

const NUEVO = [
  "          // Se declara el tipo: al venir de una lista mixta,",
  "          // TypeScript lo veia como 'any' y perdia la inferencia",
  "          // dentro de cat.opciones.find(...), lo que rompia el build.",
  "          const cat = item.cat as Categoria",
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

if (contenido.includes('item.cat as Categoria')) {
  abortar('el tipo ya esta declarado. Parece que este script ya se corrio.');
}
// La interfaz tiene que existir en el archivo, o la declaracion no
// compilaria tampoco.
if (!contenido.includes('interface Categoria')) {
  abortar('no encontre la interfaz Categoria en el archivo.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'categoria de la lista mixta -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

if (contar(contenido, 'const cat = item.cat as Categoria') !== 1) {
  abortar('la declaracion de tipo no quedo aplicada.');
}
// La linea que fallaba tiene que seguir tal cual: lo unico que cambia
// es de donde viene 'cat'.
if (!contenido.includes('const opSel = cat.opciones.find(o => o.value === selVal)')) {
  abortar('se altero la linea del build. No deberia haber cambiado.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El tipo vuelve a inferirse y el build deberia pasar.');
