const fs = require('fs');
const path = require('path');

// ============================================================
// generar_354_activar_notificaciones_robusto.js
// ============================================================
// El script 353 evito que el boton quedara congelado, pero eso era
// tratar el sintoma. Este ataca las CAUSAS.
//
// LA PISTA
// La usuaria recargo la app y entonces si funciono. Un fallo que se
// arregla solo al recargar apunta al service worker.
//
// CAUSA 1 — EL SERVICE WORKER TODAVIA NO ESTA LISTO
// Al desplegar una version nueva, el navegador instala un service
// worker nuevo. En esa primera visita puede estar aun instalandose:
// serviceWorker.ready no responde, o subscribe() falla. Al recargar ya
// esta activo y funciona.
//   SOLUCION: registrar el service worker explicitamente antes de
//   pedirle nada. register() es idempotente —si ya existe devuelve el
//   mismo— asi que forzar el registro no rompe nada y cubre el caso de
//   la primera visita tras un despliegue.
//
// CAUSA 2 — YA HABIA UNA SUSCRIPCION, CON OTRA CLAVE
// Si quedo una suscripcion de un intento anterior o de una clave VAPID
// distinta, subscribe() lanza InvalidStateError y falla PARA SIEMPRE,
// por mas veces que se intente.
//   SOLUCION: revisar primero si ya existe una suscripcion. Si existe,
//   se reutiliza (no hay nada que crear). Si al crear una nueva sale
//   InvalidStateError, se cancela la vieja y se reintenta.
//
// CAUSA 3 — FALLO PASAJERO
// Justo despues de un despliegue, el primer intento puede fallar y el
// segundo funcionar.
//   SOLUCION: un reintento automatico a los 1.5 segundos. Uno solo: si
//   falla dos veces seguidas, es un problema real y hay que decirlo.
//
// Los mensajes de error del 353 se conservan para lo que si es
// definitivo (permiso bloqueado, iPhone sin instalar).
//
// REQUISITO: script 353 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'utils/pushNotificaciones.ts';

const VIEJO = [
  "  // navigator.serviceWorker.ready puede no resolverse NUNCA si el",
  "  // service worker no llega a activarse. Ese await dejaba el boton",
  "  // en \"Activando...\" para siempre, sin error ni pista.",
  "  const registration = await Promise.race([",
  "    navigator.serviceWorker.ready,",
  "    new Promise<null>(resolver => setTimeout(() => resolver(null), 12000)),",
  "  ])",
  "  if (!registration) {",
  "    return { exito: false, error: 'La app no terminó de prepararse. Cierra CHIQUI por completo, vuelve a abrirla e intenta de nuevo.' }",
  "  }",
  "",
  "  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "  if (!vapidPublicKey) {",
  "    return { exito: false, error: 'Falta configuración del servidor.' }",
  "  }",
].join('\n');

const NUEVO = [
  "  // CAUSA 1: al desplegar una versión nueva, el service worker se",
  "  // reinstala. En esa primera visita puede estar aún instalándose y",
  "  // serviceWorker.ready no responde — por eso el fallo se arreglaba",
  "  // solo al recargar. Registrarlo explícitamente lo despierta.",
  "  // register() es idempotente: si ya existe, devuelve el mismo.",
  "  try {",
  "    await navigator.serviceWorker.register('/sw.js')",
  "  } catch {",
  "    // Si ya estaba registrado o el navegador lo rechaza, seguimos:",
  "    // el ready de abajo dirá si hay algo utilizable.",
  "  }",
  "",
  "  const registration = await Promise.race([",
  "    navigator.serviceWorker.ready,",
  "    new Promise<null>(resolver => setTimeout(() => resolver(null), 12000)),",
  "  ])",
  "  if (!registration) {",
  "    return { exito: false, error: 'La app no terminó de prepararse. Cierra CHIQUI por completo, vuelve a abrirla e intenta de nuevo.' }",
  "  }",
  "",
  "  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "  if (!vapidPublicKey) {",
  "    return { exito: false, error: 'Falta configuración del servidor.' }",
  "  }",
].join('\n');

const VIEJO_SUB = [
  "  // Sin este try/catch, un fallo aca rompia la promesa entera y el",
  "  // componente se quedaba congelado en \"Activando...\".",
  "  let subscription: PushSubscription",
  "  try {",
  "    subscription = await registration.pushManager.subscribe({",
  "      userVisibleOnly: true,",
  "      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),",
  "    })",
  "  } catch (e: any) {",
].join('\n');

const NUEVO_SUB = [
  "  const opcionesSub: PushSubscriptionOptionsInit = {",
  "    userVisibleOnly: true,",
  "    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),",
  "  }",
  "",
  "  // CAUSA 2: si ya hay una suscripción de un intento anterior, se",
  "  // reutiliza. Crear otra encima lanzaría InvalidStateError y el",
  "  // problema se volvería permanente, no pasajero.",
  "  let subscription: PushSubscription | null = await registration.pushManager.getSubscription()",
  "",
  "  if (!subscription) {",
  "    try {",
  "      subscription = await registration.pushManager.subscribe(opcionesSub)",
  "    } catch (primerError: any) {",
  "      const primerNombre = String(primerError?.name || '')",
  "",
  "      // Suscripción vieja con OTRA clave VAPID: hay que cancelarla",
  "      // antes de poder crear la nueva. Sin esto, falla para siempre.",
  "      if (primerNombre === 'InvalidStateError') {",
  "        try {",
  "          const vieja = await registration.pushManager.getSubscription()",
  "          if (vieja) await vieja.unsubscribe()",
  "        } catch { /* si no se puede cancelar, el reintento dirá */ }",
  "      }",
  "",
  "      // CAUSA 3: fallo pasajero justo después de un despliegue. Un",
  "      // solo reintento: si falla dos veces seguidas, es un problema",
  "      // real y hay que decirlo en vez de insistir.",
  "      if (primerNombre === 'InvalidStateError' || primerNombre === 'AbortError' || primerNombre === '') {",
  "        await new Promise(resolver => setTimeout(resolver, 1500))",
  "        try {",
  "          subscription = await registration.pushManager.subscribe(opcionesSub)",
  "        } catch { subscription = null }",
  "      }",
  "",
  "      if (!subscription) {",
  "        const e: any = primerError",
  "        return manejarErrorSubscribe(e)",
  "      }",
  "    }",
  "  }",
  "",
  "  if (false) {",
  "    const e: any = null",
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

if (contenido.includes('manejarErrorSubscribe')) {
  abortar('el archivo ya tiene la version robusta. Parece que este script ya se corrio.');
}
if (!contenido.includes('Promise.race')) {
  abortar('falta el arreglo del script 353. Correlo primero.');
}

// --- Verificar los dos bloques
for (const [nombre, viejo] of [['registro del service worker', VIEJO], ['creacion de la suscripcion', VIEJO_SUB]]) {
  const n = contar(contenido, viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + nombre + '] y encontre ' + n + '.');
  }
}

contenido = contenido.split(VIEJO).join(NUEVO);
contenido = contenido.split(VIEJO_SUB).join(NUEVO_SUB);

// --- Extraer los mensajes a una funcion reutilizable
const BLOQUE_MENSAJES = [
  "  if (false) {",
  "    const e: any = null",
  "    // Mensajes distintos segun el fallo, para que la persona sepa",
  "    // si puede hacer algo o no.",
  "    const nombre = String(e?.name || '')",
].join('\n');

if (contar(contenido, BLOQUE_MENSAJES) !== 1) {
  abortar('no pude reubicar el bloque de mensajes de error.');
}

// Se saca el bloque neutralizado y se coloca la funcion antes de
// activarNotificaciones.
const desde = contenido.indexOf('  if (false) {');
const hasta = contenido.indexOf('  const subscriptionJson = subscription.toJSON()');
if (desde === -1 || hasta === -1 || hasta < desde) {
  abortar('no pude delimitar el bloque de mensajes.');
}
const bloque = contenido.slice(desde, hasta);
contenido = contenido.slice(0, desde) + contenido.slice(hasta);

const cuerpoMensajes = bloque
  .replace("  if (false) {\n    const e: any = null\n", '')
  .replace(/\n  \}\n\n$/, '\n');

const FUNCION = [
  "// Traduce el error del navegador a algo que la persona pueda",
  "// entender y, si corresponde, resolver.",
  "function manejarErrorSubscribe(e: any): { exito: boolean; error?: string } {",
  cuerpoMensajes.replace(/^/gm, '').trimEnd(),
  "}",
  "",
].join('\n');

const ANCLA_FUNCION = 'export async function activarNotificaciones(';
if (contar(contenido, ANCLA_FUNCION) !== 1) {
  abortar('no encontre donde colocar la funcion de mensajes.');
}
contenido = contenido.replace(ANCLA_FUNCION, FUNCION + ANCLA_FUNCION);

// --- Recien ahora, con el archivo ya armado, se agrega la guarda de
// null. Antes se insertaba mas arriba y la extraccion del bloque de
// mensajes la borraba: tsc lo detecto (Babel no lo ve).
const ANCLA_JSON = '  const subscriptionJson = subscription.toJSON()';
if (contar(contenido, ANCLA_JSON) !== 1) {
  abortar('no encontre donde poner la proteccion de null.');
}
contenido = contenido.replace(ANCLA_JSON, [
  '  // Red de seguridad y, de paso, lo que TypeScript necesita para',
  '  // saber que aqui subscription ya no puede ser null.',
  '  if (!subscription) {',
  "    return { exito: false, error: 'No se pudo crear la suscripción. Cierra la app e intenta de nuevo.' }",
  '  }',
  '',
  ANCLA_JSON,
].join('\n'));

// --- Verificaciones finales
const ESPERADOS = [
  "navigator.serviceWorker.register('/sw.js')",
  'function manejarErrorSubscribe',
  'getSubscription()',
  "primerNombre === 'InvalidStateError'",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('if (false) {')) {
  abortar('quedo el bloque neutralizado sin limpiar.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Se atacan las causas, no solo el sintoma.');
