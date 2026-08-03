const fs = require('fs');
const path = require('path');

// ============================================================
// generar_357_fix_recordatorio_y_perfil.js
// ============================================================
// DOS ARREGLOS.
//
// ------------------------------------------------------------
// A) COLUMNA EQUIVOCADA EN /bienvenida  (error introducido en el 355)
// ------------------------------------------------------------
// perfil_usuario identifica al usuario con la columna 'id', NO con
// 'user_id'. Se confirma en dos lugares del propio proyecto:
//   - app/auth/callback/route.ts:  upsert({ id: user.id }, { onConflict: 'id' })
//   - components/Novedades.tsx:    .eq('id', user.id)
// El script 355 escribio 'user_id', asi que ese guardado fallaba en
// silencio y el nombre seguia sin llegar a la base.
//
// ------------------------------------------------------------
// B) EL RECORDATORIO SE VE DESACTIVADO AL REABRIR LA APP
// ------------------------------------------------------------
// Al montar, el estado se decidia SOLO mirando si el navegador tiene
// una suscripcion viva:
//
//     const suscrito = await tieneSuscripcionActiva()
//     setActiva(suscrito)
//
// Ignoraba por completo lo guardado en preferencias_usuario. Si el
// service worker se reinstalo —cosa que pasa en CADA despliegue— esa
// consulta devuelve null y la app muestra "desactivada", aunque en la
// base este activa y el servidor pueda seguir enviandole.
//
// AHORA:
//  1. Se lee tambien notificaciones_activas de la base: es donde quedo
//     registrada la INTENCION de la persona.
//  2. Si la base dice que si, el permiso sigue dado, pero el navegador
//     perdio la suscripcion, se REHACE EN SILENCIO. La persona ya dijo
//     que si una vez; no hay por que volver a pedirselo.
//  3. tieneSuscripcionActiva() recibe el mismo trato que el 354:
//     registra el service worker y espera con limite. Antes podia
//     quedarse esperando para siempre, y como el componente devuelve
//     null mientras carga, la seccion de recordatorio DESAPARECIA
//     entera de la pantalla.
//
// REQUISITOS: scripts 353, 354 y 355 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  // ---------------------------------------------------------
  // A) La columna correcta
  // ---------------------------------------------------------
  {
    ruta: 'app/bienvenida/page.tsx',
    nombre: 'columna correcta en perfil_usuario',
    viejo: [
      "      await supabase.from('perfil_usuario').upsert({",
      "        user_id: user.id,",
      "        nombre: n,",
      "      }, { onConflict: 'user_id' })",
    ].join('\n'),
    nuevo: [
      "      // La columna es 'id', no 'user_id': asi la usan el callback de",
      "      // Google y Novedades. Con 'user_id' este guardado fallaba en",
      "      // silencio y el nombre nunca llegaba a la base.",
      "      await supabase.from('perfil_usuario').upsert({",
      "        id: user.id,",
      "        nombre: n,",
      "      }, { onConflict: 'id' })",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // B1) Comprobar la suscripcion sin quedarse colgado
  // ---------------------------------------------------------
  {
    ruta: 'utils/pushNotificaciones.ts',
    nombre: 'comprobacion de suscripcion con limite',
    viejo: [
      "export async function tieneSuscripcionActiva(): Promise<boolean> {",
      "  if (!notificacionesSoportadas()) return false",
      "  try {",
      "    const registration = await navigator.serviceWorker.ready",
      "    const subscription = await registration.pushManager.getSubscription()",
      "    return !!subscription",
      "  } catch {",
      "    return false",
      "  }",
      "}",
    ].join('\n'),
    nuevo: [
      "export async function tieneSuscripcionActiva(): Promise<boolean> {",
      "  if (!notificacionesSoportadas()) return false",
      "  try {",
      "    // Mismo trato que al activar: despertar el service worker y no",
      "    // esperar para siempre. Antes, si ready no resolvia, esta",
      "    // funcion se colgaba y el componente —que devuelve null",
      "    // mientras carga— hacia DESAPARECER toda la sección de",
      "    // recordatorio de la pantalla.",
      "    try {",
      "      await navigator.serviceWorker.register('/sw.js')",
      "    } catch { /* ya registrado o rechazado: seguimos */ }",
      "",
      "    const registration = await Promise.race([",
      "      navigator.serviceWorker.ready,",
      "      new Promise<null>(resolver => setTimeout(() => resolver(null), 8000)),",
      "    ])",
      "    if (!registration) return false",
      "",
      "    const subscription = await registration.pushManager.getSubscription()",
      "    return !!subscription",
      "  } catch {",
      "    return false",
      "  }",
      "}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // B2) El estado se decide con la base, no solo con el navegador
  // ---------------------------------------------------------
  {
    ruta: 'components/ConfiguracionNotificaciones.tsx',
    nombre: 'estado real del recordatorio',
    viejo: [
      "      const { data: { user } } = await supabase.auth.getUser()",
      "      if (user) {",
      "        const { data: prefs } = await supabase",
      "          .from('preferencias_usuario')",
      "          .select('hora_recordatorio, notificaciones_activas')",
      "          .eq('user_id', user.id)",
      "          .maybeSingle()",
      "        if (prefs?.hora_recordatorio) setHora(prefs.hora_recordatorio)",
      "      }",
      "",
      "      if (soporta) {",
      "        const suscrito = await tieneSuscripcionActiva()",
      "        setActiva(suscrito)",
      "      }",
    ].join('\n'),
    nuevo: [
      "      const { data: { user } } = await supabase.auth.getUser()",
      "      // La base guarda la INTENCIÓN de la persona. El navegador",
      "      // guarda la suscripción técnica, que se puede perder sola",
      "      // (por ejemplo cada vez que se reinstala el service worker,",
      "      // o sea en cada despliegue). Hay que mirar las dos cosas.",
      "      let prefActiva = false",
      "      if (user) {",
      "        const { data: prefs } = await supabase",
      "          .from('preferencias_usuario')",
      "          .select('hora_recordatorio, notificaciones_activas')",
      "          .eq('user_id', user.id)",
      "          .maybeSingle()",
      "        if (prefs?.hora_recordatorio) setHora(prefs.hora_recordatorio)",
      "        prefActiva = prefs?.notificaciones_activas === true",
      "      }",
      "",
      "      if (soporta) {",
      "        const permisoOk = typeof Notification !== 'undefined' && Notification.permission === 'granted'",
      "        let suscrito = await tieneSuscripcionActiva()",
      "",
      "        // Recuperación silenciosa: la persona ya dijo que sí y el",
      "        // permiso sigue dado, pero el navegador perdió la",
      "        // suscripción. Se rehace sin molestarla — antes esto se",
      "        // veía como \"desactivada\" y había que activar de nuevo.",
      "        if (!suscrito && prefActiva && permisoOk) {",
      "          const recuperado = await activarNotificaciones()",
      "          suscrito = recuperado.exito",
      "        }",
      "",
      "        setActiva(suscrito && permisoOk)",
      "      }",
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
    if (c.ruta === 'app/bienvenida/page.tsx') {
      abortar('no encontre el guardado del script 355 en bienvenida. Corre primero el 355.');
    }
    if (c.ruta === 'utils/pushNotificaciones.ts') {
      abortar('no encontre tieneSuscripcionActiva como se espera. Revisa que el 354 este corrido.');
    }
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificaciones finales
const bienv = porArchivo.get('app/bienvenida/page.tsx');
if (bienv.contenido.includes("user_id: user.id,\n        nombre: n,")) {
  abortar('quedo la columna equivocada en bienvenida.');
}
const comp = porArchivo.get('components/ConfiguracionNotificaciones.tsx');
if (!comp.contenido.includes('prefActiva') || !comp.contenido.includes('const recuperado = await activarNotificaciones()')) {
  abortar('la recuperacion silenciosa no quedo aplicada.');
}
const util = porArchivo.get('utils/pushNotificaciones.ts');
if (contar(util.contenido, "navigator.serviceWorker.register('/sw.js')") !== 2) {
  abortar('el registro del service worker no quedo en las dos funciones.');
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. El recordatorio ya no se olvida al reabrir la app.');
