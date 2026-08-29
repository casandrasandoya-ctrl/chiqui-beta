const fs = require('fs');
const path = require('path');

// ============================================================
// comprimir_imagenes.js
// ============================================================
// MIDE Y COMPRIME las ilustraciones de /public/chiqui/.
//
// LA SOSPECHA
// El registro diario carga ~20 ilustraciones de golpe. Si son PNG sin
// comprimir de varios cientos de KB cada una, son varios MB por
// pantalla — y eso explica las fotos que aparecen "caidas" mientras
// cargan y la lentitud general.
//
// QUE HACE
//   1. Primero MIDE: te dice cuanto pesa cada imagen y el total.
//   2. Despues comprime las que valga la pena, guardando el original.
//
// Las ilustraciones de Chiqui son dibujos con pocos colores: comprimen
// muchisimo sin que se note. Una PNG de 800 KB suele quedar en 80.
//
// SEGURIDAD
//   - Los originales se copian a public/chiqui_originales/ antes de
//     tocar nada. Si algo se ve mal, se restauran de ahi.
//   - Solo comprime PNG que pesen mas de 100 KB.
//   - Si el resultado no es al menos 20% mas liviano, deja el original.
//
// USO
//   node comprimir_imagenes.js            <- solo mide, no toca nada
//   node comprimir_imagenes.js --aplicar  <- comprime de verdad
// ============================================================

const CARPETA = path.join(process.cwd(), 'public', 'chiqui');
const RESPALDO = path.join(process.cwd(), 'public', 'chiqui_originales');
const APLICAR = process.argv.includes('--aplicar');
const MINIMO_KB = 100;

function kb(bytes) {
  return (bytes / 1024).toFixed(0) + ' KB';
}

if (!fs.existsSync(CARPETA)) {
  console.log('');
  console.log('No se encontro public/chiqui/. Corre el script desde la raiz del proyecto.');
  process.exit(1);
}

const archivos = fs.readdirSync(CARPETA).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
if (archivos.length === 0) {
  console.log('No hay imagenes en public/chiqui/.');
  process.exit(0);
}

// --- 1. MEDIR
const pesos = archivos.map(f => ({
  nombre: f,
  bytes: fs.statSync(path.join(CARPETA, f)).size,
})).sort((a, b) => b.bytes - a.bytes);

const total = pesos.reduce((s, p) => s + p.bytes, 0);
const pesadas = pesos.filter(p => p.bytes > MINIMO_KB * 1024);

console.log('');
console.log('=== LAS 15 MAS PESADAS ===');
pesos.slice(0, 15).forEach(p => {
  console.log('  ' + kb(p.bytes).padStart(8) + '  ' + p.nombre);
});
console.log('');
console.log('  Total de ' + archivos.length + ' imagenes: ' + kb(total));
console.log('  Sobre ' + MINIMO_KB + ' KB: ' + pesadas.length + ' imagenes');
console.log('');

if (total < 2 * 1024 * 1024) {
  console.log('El peso total es razonable. La lentitud probablemente viene de');
  console.log('otro lado — pasale estos numeros a Claude.');
  if (!APLICAR) process.exit(0);
}

if (!APLICAR) {
  console.log('Esto fue solo una MEDICION: no se toco nada.');
  console.log('');
  console.log('Para comprimir de verdad:');
  console.log('  node comprimir_imagenes.js --aplicar');
  console.log('');
  console.log('Antes de eso, pasale estos numeros a Claude.');
  process.exit(0);
}

// --- 2. COMPRIMIR
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('Falta la herramienta de compresion. Instalala con:');
  console.log('  npm install sharp --save-dev');
  console.log('');
  console.log('Y despues corre este script de nuevo con --aplicar.');
  process.exit(1);
}

if (!fs.existsSync(RESPALDO)) fs.mkdirSync(RESPALDO, { recursive: true });

(async () => {
  let ahorro = 0;
  let cambiadas = 0;

  for (const p of pesadas) {
    const origen = path.join(CARPETA, p.nombre);
    const copia = path.join(RESPALDO, p.nombre);
    try {
      // El original se guarda ANTES de tocar nada.
      if (!fs.existsSync(copia)) fs.copyFileSync(origen, copia);

      const buffer = await sharp(origen)
        // 512px de ancho basta: la mas grande se muestra a 128px en
        // pantalla, y al doble por las pantallas retina son 256.
        .resize({ width: 512, withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9, palette: true })
        .toBuffer();

      const antes = p.bytes;
      const despues = buffer.length;
      // Si no mejora al menos un 20%, no vale la pena arriesgar calidad.
      if (despues < antes * 0.8) {
        fs.writeFileSync(origen, buffer);
        ahorro += antes - despues;
        cambiadas++;
        console.log('  ' + kb(antes).padStart(8) + ' -> ' + kb(despues).padStart(8) + '  ' + p.nombre);
      }
    } catch (e) {
      console.log('  (se salto ' + p.nombre + ': ' + e.message + ')');
    }
  }

  console.log('');
  console.log('  ' + cambiadas + ' imagenes comprimidas. Ahorro: ' + kb(ahorro));
  console.log('');
  console.log('  Los originales quedaron en public/chiqui_originales/');
  console.log('  REVISA LA APP antes de subir: si alguna se ve mal, copia');
  console.log('  ese archivo de vuelta desde ahi.');
  console.log('');
  console.log('  Y cuando confirmes que todo se ve bien, BORRA esa carpeta');
  console.log('  antes de hacer commit: si no, el repo pesa el doble.');
})();
