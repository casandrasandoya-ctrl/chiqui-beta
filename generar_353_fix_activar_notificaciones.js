const fs = require('fs');
const path = require('path');

// ============================================================
// generar_353_fix_activar_notificaciones.js
// ============================================================
// EL BUG (reportado por una usuaria)
// Toca "Activar", el boton queda en "Activando..." para siempre, y al
// reiniciar la app las notificaciones siguen apagadas. Sin mensaje de
// error, sin ninguna pista.
//
// LAS DOS CAUSAS
//
// 1. activarNotificaciones() NO tiene try/catch. Si
//    pushManager.subscribe() lanza un error —pasa seguido: el service
//    worker no termino de activarse, el navegador rechaza la clave,
//    iOS pone lo suyo— la promesa se rompe. Y en el componente,
//    setProcesando(false) esta DESPUES del await, asi que nunca se
//    ejecuta: el boton queda congelado.
//
// 2. navigator.serviceWorker.ready puede NO RESOLVERSE NUNCA si el
//    service worker no llega a activarse. Ese await se queda esperando
//    en silencio, indefinidamente, con el mismo resultado visible.
//
// LOS ARREGLOS
//  - Espera al service worker con un limite de 12 segundos. Si no
//    responde, se avisa en vez de esperar para siempre.
//  - subscribe() va dentro de try/catch, con un mensaje distinto segun
//    el tipo de fallo.
//  - En el componente, setProcesando(false) pasa a un finally: pase lo
//    que pase, el boton deja de decir "Activando...".
//
// Este arreglo NO garantiza que las notificaciones funcionen en todos
// los telefonos —hay limitaciones reales de iOS y de cada navegador—
// pero si garantiza que la persona SEPA que fallo, en vez de quedarse
// mirando un boton congelado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  // ---------------------------------------------------------
  // 1. Esperar al service worker con limite de tiempo
  // ---------------------------------------------------------
  {
    ruta: 'utils/pushNotificaciones.ts',
    nombre: 'espera al service worker con limite',
    viejo: [
      "  const registration = await navigator.serviceWorker.ready",
      "  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    ].join('\n'),
    nuevo: [
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
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. subscribe() dentro de try/catch
  // ---------------------------------------------------------
  {
    ruta: 'utils/pushNotificaciones.ts',
    nombre: 'subscribe protegido',
    viejo: [
      "  const subscription = await registration.pushManager.subscribe({",
      "    userVisibleOnly: true,",
      "    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),",
      "  })",
      "",
      "  const subscriptionJson = subscription.toJSON()",
    ].join('\n'),
    nuevo: [
      "  // Sin este try/catch, un fallo aca rompia la promesa entera y el",
      "  // componente se quedaba congelado en \"Activando...\".",
      "  let subscription: PushSubscription",
      "  try {",
      "    subscription = await registration.pushManager.subscribe({",
      "      userVisibleOnly: true,",
      "      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),",
      "    })",
      "  } catch (e: any) {",
      "    // Mensajes distintos segun el fallo, para que la persona sepa",
      "    // si puede hacer algo o no.",
      "    const nombre = String(e?.name || '')",
      "    if (nombre === 'NotAllowedError') {",
      "      return { exito: false, error: 'Tu teléfono bloqueó las notificaciones para CHIQUI. Actívalas desde Configuración → Apps → CHIQUI → Notificaciones.' }",
      "    }",
      "    if (nombre === 'AbortError' || nombre === 'NotSupportedError') {",
      "      return { exito: false, error: 'Este navegador no pudo registrar las notificaciones. Si estás en iPhone, agrega CHIQUI a la pantalla de inicio y ábrela desde ahí.' }",
      "    }",
      "    return { exito: false, error: 'No se pudo activar (' + (nombre || 'error desconocido') + '). Intenta de nuevo en unos minutos.' }",
      "  }",
      "",
      "  const subscriptionJson = subscription.toJSON()",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. El boton siempre vuelve a su estado normal
  // ---------------------------------------------------------
  {
    ruta: 'components/ConfiguracionNotificaciones.tsx',
    nombre: 'boton que nunca queda congelado',
    viejo: [
      "  async function manejarActivar() {",
      "    setProcesando(true)",
      "    setError('')",
      "    const resultado = await activarNotificaciones()",
      "    if (!resultado.exito) {",
      "      // Si el navegador devuelve el permiso como denegado justo en este",
      "      // intento, actualizamos el aviso persistente también.",
      "      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {",
      "        setPermisoDenegado(true)",
      "      }",
      "      setError(resultado.error || 'No se pudo activar.')",
      "      setProcesando(false)",
      "      return",
      "    }",
      "    await guardarPreferencia(true, hora)",
      "    setActiva(true)",
      "    setProcesando(false)",
      "  }",
    ].join('\n'),
    nuevo: [
      "  async function manejarActivar() {",
      "    setProcesando(true)",
      "    setError('')",
      "    // El finally es lo importante: antes, si algo lanzaba un error,",
      "    // setProcesando(false) nunca se ejecutaba y el botón quedaba en",
      "    // \"Activando...\" para siempre, sin decir qué pasó.",
      "    try {",
      "      const resultado = await activarNotificaciones()",
      "      if (!resultado.exito) {",
      "        // Si el navegador devuelve el permiso como denegado justo en",
      "        // este intento, actualizamos el aviso persistente también.",
      "        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {",
      "          setPermisoDenegado(true)",
      "        }",
      "        setError(resultado.error || 'No se pudo activar.')",
      "        return",
      "      }",
      "      await guardarPreferencia(true, hora)",
      "      setActiva(true)",
      "    } catch (e: any) {",
      "      setError('Ocurrió un error inesperado (' + String(e?.name || 'desconocido') + '). Cierra la app por completo e intenta de nuevo.')",
      "    } finally {",
      "      setProcesando(false)",
      "    }",
      "  }",
    ].join('\n'),
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// --- Verificar todo antes de escribir nada
const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    porArchivo.set(c.ruta, { destino, contenido: fs.readFileSync(destino, 'utf8') });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificar el resultado
const util = porArchivo.get('utils/pushNotificaciones.ts');
if (!util.contenido.includes('Promise.race') || !util.contenido.includes("catch (e: any)")) {
  abortar('las protecciones no quedaron aplicadas en pushNotificaciones.ts.');
}
const comp = porArchivo.get('components/ConfiguracionNotificaciones.tsx');
if (contar(comp.contenido, '} finally {') !== 1) {
  abortar('el finally no quedo aplicado en el componente.');
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. El boton ya no puede quedarse congelado en "Activando...".');
