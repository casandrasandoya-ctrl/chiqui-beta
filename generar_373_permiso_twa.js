const fs = require('fs');
const path = require('path');

// ============================================================
// generar_373_permiso_twa.js
// ============================================================
// LA CAUSA, CONFIRMADA CON EL DIAGNOSTICO
// La linea de estado en el telefono de Daniela decia:
//
//     permiso — sin pedir · navegador ✓ · base ✓
//
// Los dos eslabones que importan estaban BIEN. Su suscripcion existe en
// el navegador y esta guardada en la base. Lo unico "malo" era el
// permiso, que devolvia 'default'.
//
// Y eso lo rompi yo en el script 364:
//
//     const permisoOk = Notification.permission === 'granted'
//     setActiva(permisoOk && (...))
//
// EN LA APP INSTALADA DESDE GOOGLE PLAY (una TWA), el permiso de
// notificaciones se concede a nivel de ANDROID, no por la web. La API
// Notification.permission puede seguir respondiendo 'default' aunque
// las notificaciones funcionen perfectamente. Casandra lo tiene en
// 'granted' porque activo cuando la app se abria desde el navegador;
// quien instalo desde Play, no.
//
// Hay una prueba logica de que el permiso esta bien: NO SE PUEDE CREAR
// UNA SUSCRIPCION PUSH SIN PERMISO. Si el navegador dice que hay
// suscripcion, el permiso existe — solo que no por donde yo miraba.
//
// LOS DOS CAMBIOS
//  1. Solo 'denied' cuenta como bloqueo. 'default' deja de impedir que
//     se muestre como activo.
//  2. Al activar, si requestPermission devuelve algo distinto de
//     'granted' pero tampoco 'denied', se intenta suscribir igual y que
//     el navegador diga la ultima palabra. Antes se cortaba ahi, asi
//     que un usuario NUEVO de Google Play no podria activar nunca.
//
// El punto 2 importa mas de lo que parece: afecta a todas las personas
// que lleguen por la tienda de aqui en adelante.
//
// REQUISITO: scripts 363 y 364 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const CAMBIOS = [
  {
    ruta: 'components/ConfiguracionNotificaciones.tsx',
    nombre: 'solo denied bloquea',
    viejo: "        const permisoOk = typeof Notification !== 'undefined' && Notification.permission === 'granted'",
    nuevo: [
      "        // En la app instalada desde Google Play el permiso vive a",
      "        // nivel de Android, y esta API puede seguir diciendo",
      "        // 'default' aunque las notificaciones funcionen. Exigir",
      "        // 'granted' dejaba a esas personas viendo \"Activar\" para",
      "        // siempre, aunque su suscripcion existiera.",
      "        //",
      "        // Solo 'denied' es un no real: significa que la persona (o",
      "        // el sistema) las bloqueo a proposito.",
      "        const permisoBloqueado = typeof Notification !== 'undefined' && Notification.permission === 'denied'",
      "        const permisoOk = !permisoBloqueado",
    ].join('\n'),
  },
  {
    ruta: 'utils/pushNotificaciones.ts',
    nombre: 'activar sin exigir granted',
    viejo: [
      "  const permiso = await Notification.requestPermission()",
      "  if (permiso !== 'granted') {",
      "    return { exito: false, error: 'No diste permiso para las notificaciones.' }",
      "  }",
    ].join('\n'),
    nuevo: [
      "  const permiso = await Notification.requestPermission()",
      "  // Solo 'denied' es un no definitivo. En la app instalada desde",
      "  // Google Play el permiso se concede a nivel de Android y esta API",
      "  // puede devolver 'default' aunque todo funcione: si es asi, se",
      "  // intenta suscribir igual y que el navegador diga la ultima",
      "  // palabra. Cortar aqui impedia activar a cualquiera que llegara",
      "  // por la tienda.",
      "  if (permiso === 'denied') {",
      "    return { exito: false, error: 'Tu teléfono tiene bloqueadas las notificaciones para CHIQUI. Actívalas desde Configuración → Apps → CHIQUI → Notificaciones.' }",
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

const porArchivo = new Map();

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  if (!porArchivo.has(c.ruta)) {
    const contenido = fs.readFileSync(destino, 'utf8');
    if (contenido.includes('permisoBloqueado') && c.ruta.includes('Configuracion')) {
      abortar('el componente ya tiene el arreglo. Parece que este script ya se corrio.');
    }
    porArchivo.set(c.ruta, { destino, contenido });
  }

  const actual = porArchivo.get(c.ruta);
  const n = contar(actual.contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  actual.contenido = actual.contenido.split(c.viejo).join(c.nuevo);
}

// --- Verificaciones finales
const comp = porArchivo.get('components/ConfiguracionNotificaciones.tsx');
if (!comp.contenido.includes('const permisoOk = !permisoBloqueado')) {
  abortar('el arreglo del permiso no quedo aplicado.');
}
// permisoOk se sigue usando en la recuperacion silenciosa y en setActiva:
// si desapareciera, esas dos lineas quedarian rotas.
if (contar(comp.contenido, 'permisoOk') < 3) {
  abortar('permisoOk dejo de usarse donde corresponde.');
}
const util = porArchivo.get('utils/pushNotificaciones.ts');
if (util.contenido.includes("if (permiso !== 'granted')")) {
  abortar('quedo la exigencia de granted al activar.');
}
if (!util.contenido.includes("if (permiso === 'denied')")) {
  abortar('la comprobacion de denied no quedo aplicada.');
}

// --- Escribir
console.log('');
for (const [ruta, a] of porArchivo) {
  fs.writeFileSync(a.destino, a.contenido, 'utf8');
  console.log('OK: ' + ruta);
}

console.log('');
console.log('Listo. Quien instalo desde Google Play ya puede activar y verlo activo.');
