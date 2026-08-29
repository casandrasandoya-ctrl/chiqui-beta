const fs = require('fs');
const path = require('path');

// ============================================================
// generar_490_middleware_sw.js
// ============================================================
// URGENTE: la app no carga. MIDDLEWARE_INVOCATION_TIMEOUT.
//
// LA CAUSA, confirmada con los logs de Vercel:
// El middleware corria sobre /sw.js —el service worker, que el
// navegador pide en CADA carga— y ahi llamaba a Supabase para
// verificar una sesion que ese archivo no necesita. Cuando esa llamada
// tardaba, Vercel cortaba a los 25 segundos y la app entera dejaba de
// cargar.
//
// El matcher excluia _next, favicon y vet, pero NO sw.js.
//
// (Y no eran las imagenes comprimidas: el log decia "External APIs: No
// outgoing requests", o sea que se colgo antes de llamar a nada.)
//
// EL ARREGLO, en dos capas
//   1. El matcher excluye sw.js, el manifest, los iconos y cualquier
//      archivo con extension.
//   2. Y una guarda dentro de la funcion, por si el matcher deja pasar
//      algo: sale de inmediato sin tocar Supabase.
//
// La verificacion de sesion sigue igual para las paginas.
//
// Hace dos reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'middleware.ts';

const PARES = [
  { nombre: 'guarda dentro de la funcion', viejo: "export async function middleware(request: NextRequest) {\n  let supabaseResponse = NextResponse.next({ request })", nuevo: "export async function middleware(request: NextRequest) {\n  // Segunda barrera, por si el matcher deja pasar algo: los archivos\n  // estaticos salen de inmediato, sin tocar Supabase.\n  const ruta = request.nextUrl.pathname\n  if (ruta === '/sw.js' || ruta === '/manifest.webmanifest' || /\\\\.[a-z0-9]+$/i.test(ruta)) {\n    return NextResponse.next()\n  }\n\n  let supabaseResponse = NextResponse.next({ request })" },
  { nombre: 'matcher sin archivos estaticos', viejo: "export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|vet).*)'] }", nuevo: "// El middleware NO debe correr sobre archivos estaticos.\n//\n// Se estaba ejecutando sobre /sw.js \u2014el service worker, que el\n// navegador pide en CADA carga\u2014 y ahi llamaba a Supabase para\n// verificar una sesion que ese archivo no necesita. Cuando esa llamada\n// tardaba, Vercel cortaba con MIDDLEWARE_INVOCATION_TIMEOUT a los 25\n// segundos y la app entera dejaba de cargar.\n//\n// Se excluyen: sw.js, el manifest, los iconos y cualquier archivo con\n// extension (.png, .ico, .txt...). Ninguno necesita sesion.\nexport const config = {\n  matcher: [\n    '/((?!_next/static|_next/image|favicon.ico|vet|sw.js|manifest.webmanifest|robots.txt|icon-|logo-|chiqui/|.*\\\\.[a-z0-9]+$).*)',\n  ],\n}" },
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
  abortar('no se encontro ' + RUTA + ' en la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes("ruta === '/sw.js'")) {
  abortar('el middleware ya esta arreglado. Parece que este script ya se corrio.');
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
if (!c.includes('sw.js')) {
  abortar('sw.js no quedo excluido.');
}
// La verificacion de sesion tiene que seguir intacta.
for (const s of ['supabase.auth.getUser()', 'protectedPaths', 'NextResponse.redirect']) {
  if (!c.includes(s)) {
    abortar('se perdio [' + s + ']: la proteccion de rutas dejaria de funcionar.');
  }
}
console.log('  OK  la verificacion de sesion quedo intacta');

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('SUBE ESTO DE INMEDIATO:');
console.log('  git add .');
console.log('  git commit -m "El middleware no corre sobre archivos estaticos"');
console.log('  git push origin master');
