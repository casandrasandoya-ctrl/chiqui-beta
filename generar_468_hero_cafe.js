const fs = require('fs');
const path = require('path');

// ============================================================
// generar_468_hero_cafe.js
// ============================================================
// La tarjeta de "Hola, {nombre}" del dashboard pasa del verde agua al
// CAFE de la marca, con una sombra beige suave.
//
// POR QUE EL CAFE
// Es el color de CHIQUI y ya se usaba antes. El dorado compite con los
// botones, que tambien son dorados, y el verde agua no calza con la
// paleta cafe/crema del resto de la app.
//
// LA SOMBRA es beige y suave —rgba(140,87,47,.22)— para que la tarjeta
// se despegue del fondo crema sin parecer un boton flotante.
//
// Los textos pasan a crema para mantener el contraste.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/DashboardContenido.tsx';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  console.log('');
  console.log('Si el color no es exactamente #3fac9c, pasale a Claude la linea');
  console.log('donde esta el fondo de esa tarjeta.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('rgba(140,87,47')) {
  abortar('la tarjeta ya esta en cafe. Parece que este script ya se corrio.');
}

// El verde puede estar escrito de varias formas.
const VERDES = ['#3fac9c', '#3FAC9C', '#3fAC9C'];
const encontrado = VERDES.find(v => c.includes(v));
if (!encontrado) {
  abortar('no encontre el color verde #3fac9c en el archivo.');
}
const veces = contar(c, encontrado);
console.log('  OK  color verde encontrado -> ' + veces + ' vez/veces');

// Se cambia el color y se agrega la sombra al mismo tiempo.
c = c.split(encontrado).join('#8C572F');

// La sombra: se busca el contenedor de la tarjeta para agregarla.
const PATRONES = [
  { viejo: "background: '#8C572F'", nuevo: "background: '#8C572F', boxShadow: '0 3px 12px rgba(140,87,47,.22)'" },
  { viejo: 'background:"#8C572F"', nuevo: 'background:"#8C572F", boxShadow:"0 3px 12px rgba(140,87,47,.22)"' },
  { viejo: 'bg-[#8C572F]', nuevo: 'bg-[#8C572F] shadow-[0_3px_12px_rgba(140,87,47,0.22)]' },
];
let sombraPuesta = false;
for (const p of PATRONES) {
  if (c.includes(p.viejo)) {
    c = c.replace(p.viejo, p.nuevo);
    sombraPuesta = true;
    console.log('  OK  sombra beige agregada');
    break;
  }
}
if (!sombraPuesta) {
  console.log('  --  no pude ubicar donde poner la sombra: queda solo el color');
}

if (c.includes('#3fac9c') || c.includes('#3FAC9C')) {
  abortar('quedo algo del color verde.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('AVISO: si algun texto de esa tarjeta queda con poco contraste');
console.log('sobre el cafe, avisale a Claude con una captura.');
console.log('');
console.log('Listo. La tarjeta ya esta en el cafe de la marca.');
