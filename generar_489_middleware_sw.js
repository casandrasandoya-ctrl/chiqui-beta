const fs = require('fs');
const path = require('path');

// ============================================================
// generar_489_middleware_sw.js
// ============================================================
// EL ERROR: MIDDLEWARE_INVOCATION_TIMEOUT en /sw.js, 25 segundos.
//
// El middleware se estaba ejecutando sobre el SERVICE WORKER, que es un
// archivo estatico y no necesita ninguna verificacion de sesion. Se
// colgaba ahi y tumbaba la carga de toda la app.
//
// La pista estaba en los logs: "External APIs: No outgoing requests".
// Ni siquiera alcanzo a consultar Supabase — se colgo antes.
//
// EL ARREGLO
// Una guarda al principio del middleware: si la ruta es un archivo
// estatico, se deja pasar sin hacer nada.
//
// Se cubren: sw.js, manifest, iconos, y cualquier archivo con
// extension. Ninguno necesita sesion.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'middleware.ts';

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  console.log('');
  console.log('Pasale a Claude el contenido de middleware.ts para que lo');
  console.log('arregle con el codigo real.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + ' en la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('ARCHIVOS_ESTATICOS')) {
  abortar('el middleware ya tiene la guarda. Parece que este script ya se corrio.');
}

// --- Encontrar el inicio de la funcion, sea cual sea su forma
const FORMAS = [
  { patron: 'export async function middleware(request: NextRequest) {', variable: 'request' },
  { patron: 'export async function middleware(req: NextRequest) {', variable: 'req' },
  { patron: 'export function middleware(request: NextRequest) {', variable: 'request' },
  { patron: 'export function middleware(req: NextRequest) {', variable: 'req' },
  { patron: 'export async function middleware(request) {', variable: 'request' },
  { patron: 'export async function middleware(req) {', variable: 'req' },
];

const forma = FORMAS.find(f => contar(c, f.patron) === 1);
if (!forma) {
  abortar('no reconoci la firma de la funcion middleware.');
}
console.log('  OK  funcion encontrada (variable: ' + forma.variable + ')');

const GUARDA = forma.patron + `
  // ARCHIVOS_ESTATICOS: el middleware NO debe correr sobre ellos.
  //
  // Se estaba ejecutando sobre /sw.js —el service worker— y se colgaba
  // 25 segundos, tumbando la carga de toda la app con un
  // MIDDLEWARE_INVOCATION_TIMEOUT.
  //
  // Ninguno de estos archivos necesita verificacion de sesion: son
  // estaticos y los sirve el CDN.
  const ruta = ${forma.variable}.nextUrl.pathname
  if (
    ruta === '/sw.js' ||
    ruta === '/manifest.webmanifest' ||
    ruta === '/favicon.ico' ||
    ruta === '/robots.txt' ||
    ruta.startsWith('/icon-') ||
    ruta.startsWith('/chiqui/') ||
    /\\.[a-z0-9]+$/i.test(ruta)
  ) {
    return NextResponse.next()
  }
`;

c = c.split(forma.patron).join(GUARDA);

// --- Verificaciones
if (!c.includes('ARCHIVOS_ESTATICOS')) {
  abortar('la guarda no quedo aplicada.');
}
if (!c.includes('NextResponse')) {
  abortar('el archivo no importa NextResponse: la guarda no funcionaria.');
}
// El resto del middleware tiene que seguir intacto.
if (!c.includes('export const config') && !c.includes('matcher')) {
  console.log('  --  no hay config/matcher: la guarda igual protege');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('  OK  guarda agregada al inicio');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Sube esto de inmediato:');
console.log('  git add .');
console.log('  git commit -m "El middleware no corre sobre archivos estaticos"');
console.log('  git push origin master');
