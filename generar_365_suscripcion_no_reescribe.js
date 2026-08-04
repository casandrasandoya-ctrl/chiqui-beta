const fs = require('fs');
const path = require('path');

// ============================================================
// generar_365_suscripcion_no_reescribe.js
// ============================================================
// EL ERROR QUE SEGUIA SALIENDO
// "No se pudo guardar la suscripcion" viene de este upsert:
//
//   .upsert({...}, { onConflict: 'endpoint' })
//
// Un upsert es INSERT ... ON CONFLICT DO UPDATE, asi que necesita
// permiso de INSERT **y** de UPDATE.
//
//   - La PRIMERA vez no hay fila -> camino de INSERT -> funciona.
//     Por eso la fila de Daniela existe.
//   - Cada vez DESPUES, la fila ya existe -> intenta UPDATE -> si falta
//     esa politica RLS, falla.
//
// Es el mismo patron del boton de cancelar invitacion de co-tutor.
//
// EL ARREGLO, QUE FUNCIONA PASE LO QUE PASE
// Antes de escribir, se revisa si esa suscripcion YA esta guardada. Si
// esta, no hay nada que hacer: se devuelve exito sin tocar la base. Y
// si no esta, se usa un INSERT limpio en vez de un upsert, porque no
// hay nada que actualizar.
//
// Asi el arreglo no depende de que la politica exista. Si igual falta,
// el mensaje ahora trae el texto real de Postgres en vez de una frase
// generica — que es lo que nos tuvo cuatro rondas a ciegas.
//
// Guardar varias filas por persona es correcto y esperado: una por
// dispositivo. Las que mueren las limpia el cron cuando el envio
// devuelve 404 o 410.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'utils/pushNotificaciones.ts';

const VIEJO = [
  "  const { error } = await supabase.from('suscripciones_push').upsert({",
  "    user_id: user.id,",
  "    endpoint: subscriptionJson.endpoint!,",
  "    p256dh: subscriptionJson.keys!.p256dh,",
  "    auth: subscriptionJson.keys!.auth,",
  "  }, { onConflict: 'endpoint' })",
  "",
  "  if (error) return { exito: false, error: 'No se pudo guardar la suscripción.' }",
].join('\n');

const NUEVO = [
  "  // ¿Ya está guardada esta misma suscripción? Entonces no hay nada",
  "  // que escribir. Volver a hacer upsert obliga a un UPDATE, y si",
  "  // falta la política RLS de UPDATE eso falla — aunque el dato en la",
  "  // base ya sea correcto. Ese era el error que veían las usuarias al",
  "  // intentar activar por segunda vez.",
  "  const { data: yaGuardada } = await supabase",
  "    .from('suscripciones_push')",
  "    .select('id')",
  "    .eq('user_id', user.id)",
  "    .eq('endpoint', subscriptionJson.endpoint!)",
  "    .maybeSingle()",
  "",
  "  if (yaGuardada) return { exito: true }",
  "",
  "  // No existe: INSERT limpio. No hay nada que actualizar, así que no",
  "  // hace falta el upsert. Tener varias filas por persona es correcto",
  "  // y esperado: una por dispositivo. Las que mueren las limpia el",
  "  // cron cuando el envío devuelve 404 o 410.",
  "  const { error } = await supabase.from('suscripciones_push').insert({",
  "    user_id: user.id,",
  "    endpoint: subscriptionJson.endpoint!,",
  "    p256dh: subscriptionJson.keys!.p256dh,",
  "    auth: subscriptionJson.keys!.auth,",
  "  })",
  "",
  "  if (error) {",
  "    // El mensaje real de Postgres viaja tal cual. La frase genérica",
  "    // de antes nos tuvo cuatro rondas adivinando la causa.",
  "    return { exito: false, error: 'No se pudo guardar la suscripción: ' + (error.message || 'error desconocido') }",
  "  }",
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

if (contenido.includes('yaGuardada')) {
  abortar('el archivo ya evita reescribir la suscripcion. Parece que este script ya se corrio.');
}

const n = contar(contenido, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'guardado de la suscripcion -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia del guardado y encontre ' + n + '.');
}

contenido = contenido.split(VIEJO).join(NUEVO);

const ESPERADOS = [
  'const { data: yaGuardada }',
  'if (yaGuardada) return { exito: true }',
  "from('suscripciones_push').insert({",
  "'No se pudo guardar la suscripción: '",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contenido.includes("{ onConflict: 'endpoint' }")) {
  abortar('quedo el upsert viejo.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya no se reescribe una suscripcion que ya existe.');
