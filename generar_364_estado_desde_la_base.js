const fs = require('fs');
const path = require('path');

// ============================================================
// generar_364_estado_desde_la_base.js
// ============================================================
// LA CAUSA, POR FIN
// La fila de Daniela en la base es identica a la de Casandra:
// notificaciones_activas = true, con su hora, y una suscripcion
// guardada. Su sistema esta COMPLETO: el cron la encuentra y le manda.
//
// El problema era solo lo que la pantalla mostraba. La app decidia el
// estado preguntandole AL NAVEGADOR:
//
//     const suscrito = await tieneSuscripcionActiva()
//     setActiva(suscrito && permisoOk)
//
// Si ese navegador perdio su copia local —pasa cada vez que se
// reinstala el service worker, o sea en cada despliegue— la app
// mostraba "activar" aunque el servidor ya tuviera todo.
//
// Y ahi empezaba el circulo: la persona activaba de nuevo, el segundo
// intento chocaba con la suscripcion que ya existia, y salia el error
// "no se pudo guardar la suscripcion".
//
// EL CAMBIO
// El navegador nunca fue la fuente de verdad. Lo es la BASE, porque es
// de donde el cron saca a quien enviarle. Ahora:
//
//     activa = permiso concedido
//              Y (el navegador tiene suscripcion
//                 O la base tiene preferencia activa + suscripcion)
//
// El permiso si tiene que seguir concedido: sin el, el telefono no
// mostraria la notificacion aunque llegara.
//
// La recuperacion silenciosa del script 357 sigue intentando rehacer
// la copia local, pero ya no es lo que decide lo que se ve.
//
// REQUISITO: script 357 desplegado.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ConfiguracionNotificaciones.tsx';

const VIEJO = "        setActiva(suscrito && permisoOk)";

const NUEVO = [
  "        // El servidor decide a quien mandarle mirando la BASE, no este",
  "        // navegador. Si hay preferencia activa y una suscripcion",
  "        // guardada, la persona SI va a recibir sus recordatorios,",
  "        // aunque este dispositivo haya perdido su copia local.",
  "        //",
  "        // Mostrar \"activar\" en ese caso la hacia intentar de nuevo y",
  "        // chocar con la suscripcion que ya existia — el error que",
  "        // reportaron las usuarias.",
  "        const { data: { user: usuarioActual } } = await supabase.auth.getUser()",
  "        let haySuscripcionGuardada = false",
  "        if (usuarioActual) {",
  "          const { count } = await supabase",
  "            .from('suscripciones_push')",
  "            .select('id', { count: 'exact', head: true })",
  "            .eq('user_id', usuarioActual.id)",
  "          haySuscripcionGuardada = (count || 0) > 0",
  "        }",
  "",
  "        // El permiso si tiene que seguir concedido: sin el, el telefono",
  "        // no mostraria la notificacion aunque llegara.",
  "        setActiva(permisoOk && (suscrito || (prefActiva && haySuscripcionGuardada)))",
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

if (contenido.includes('haySuscripcionGuardada')) {
  abortar('el archivo ya decide con la base. Parece que este script ya se corrio.');
}
if (!contenido.includes('prefActiva')) {
  abortar('falta el arreglo del script 357. Correlo primero.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'decision del estado -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia de la linea que decide el estado y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = [
  'let haySuscripcionGuardada = false',
  "from('suscripciones_push')",
  'setActiva(permisoOk && (suscrito || (prefActiva && haySuscripcionGuardada)))',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes('setActiva(suscrito && permisoOk)')) {
  abortar('quedo la decision vieja basada solo en el navegador.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El estado ya se lee de donde de verdad importa.');
