const fs = require('fs');
const path = require('path');

// ============================================================
// generar_363_diagnostico_recordatorio.js
// ============================================================
// Llevamos tres intentos persiguiendo esto a ciegas. Este script deja
// de adivinar: hace VISIBLE cada punto donde puede estar fallando.
//
// ------------------------------------------------------------
// EL FALLO SILENCIOSO QUE ENCONTRAMOS
// ------------------------------------------------------------
// guardarPreferencia() no revisaba su error:
//
//   await supabase.from('preferencias_usuario').upsert({...})
//
// Sin el { error }, si el guardado falla la app sigue como si nada y
// muestra "listo". Es EXACTAMENTE el mismo patron del boton de
// cancelar invitacion de co-tutor, que tardamos dos rondas en cazar.
//
// Un upsert con onConflict falla cuando falta la restriccion unica
// sobre user_id, o cuando falta la politica RLS de UPDATE. En los dos
// casos, en silencio.
//
// ------------------------------------------------------------
// QUE HACE ESTE SCRIPT
// ------------------------------------------------------------
//  1. guardarPreferencia() devuelve si funciono, y quien la llama lo
//     revisa. Si falla, se muestra el mensaje real de Postgres.
//  2. No se marca como activa si la preferencia no llego a la base:
//     antes se ponia activa en pantalla y al volver aparecia apagada.
//  3. Se agrega una linea de DIAGNOSTICO visible con los tres estados
//     que importan:
//        permiso del telefono · suscripcion del navegador · base
//     Asi, en vez de "no me funciona", se puede mandar una captura que
//     dice exactamente cual de los tres falla.
//
// El diagnostico se ve SOLO cuando el recordatorio esta apagado, para
// no ensuciar la pantalla de quien ya lo tiene andando.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ConfiguracionNotificaciones.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Estado del diagnostico
  // ---------------------------------------------------------
  {
    nombre: 'estado del diagnostico',
    viejo: "  const [permisoDenegado, setPermisoDenegado] = useState(false)",
    nuevo: [
      "  const [permisoDenegado, setPermisoDenegado] = useState(false)",
      "  // Diagnóstico visible: los tres estados que tienen que estar bien",
      "  // para que llegue una notificación. Se muestra solo cuando el",
      "  // recordatorio está apagado, para poder ver cuál de los tres falla",
      "  // en vez de adivinar.",
      "  const [diag, setDiag] = useState<{ permiso: string; navegador: boolean; base: boolean } | null>(null)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. guardarPreferencia devuelve si funciono
  // ---------------------------------------------------------
  {
    nombre: 'guardado con revision de error',
    viejo: [
      "  async function guardarPreferencia(activas: boolean, horaElegida: string) {",
      "    const { data: { user } } = await supabase.auth.getUser()",
      "    if (!user) return",
      "    await supabase.from('preferencias_usuario').upsert({",
      "      user_id: user.id,",
      "      hora_recordatorio: horaElegida,",
      "      notificaciones_activas: activas,",
      "    }, { onConflict: 'user_id' })",
      "  }",
    ].join('\n'),
    nuevo: [
      "  // Devuelve si el guardado funcionó DE VERDAD. Antes no se revisaba",
      "  // el error: si la base rechazaba el cambio, la app decía \"listo\"",
      "  // igual y al volver a entrar el recordatorio aparecía apagado.",
      "  async function guardarPreferencia(activas: boolean, horaElegida: string): Promise<{ ok: boolean; error?: string }> {",
      "    const { data: { user } } = await supabase.auth.getUser()",
      "    if (!user) return { ok: false, error: 'No se pudo verificar tu sesión.' }",
      "    const { error: errPref } = await supabase.from('preferencias_usuario').upsert({",
      "      user_id: user.id,",
      "      hora_recordatorio: horaElegida,",
      "      notificaciones_activas: activas,",
      "    }, { onConflict: 'user_id' })",
      "    if (errPref) {",
      "      // El mensaje de Postgres viaja tal cual: es la única forma de",
      "      // saber si falta la restricción única, la política de UPDATE,",
      "      // o algo que todavía no hemos visto.",
      "      return { ok: false, error: 'No se pudo guardar la preferencia: ' + (errPref.message || 'error desconocido') }",
      "    }",
      "    return { ok: true }",
      "  }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Activar: no dar por activo lo que no se guardo
  // ---------------------------------------------------------
  {
    nombre: 'activar revisa el guardado',
    viejo: [
      "      await guardarPreferencia(true, hora)",
      "      setActiva(true)",
    ].join('\n'),
    nuevo: [
      "      // Si la preferencia no llega a la base, el cron nunca va a",
      "      // encontrar a esta persona. Marcarla como activa en pantalla",
      "      // sería mentirle.",
      "      const guardado = await guardarPreferencia(true, hora)",
      "      if (!guardado.ok) {",
      "        setError(guardado.error || 'No se pudo guardar la preferencia.')",
      "        return",
      "      }",
      "      setActiva(true)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Recoger el diagnostico al cargar
  // ---------------------------------------------------------
  {
    nombre: 'recoleccion del diagnostico',
    viejo: [
      "        setActiva(suscrito && permisoOk)",
      "      }",
    ].join('\n'),
    nuevo: [
      "        setActiva(suscrito && permisoOk)",
      "",
      "        // Foto de los tres estados, para poder mirarla si algo falla.",
      "        setDiag({",
      "          permiso: typeof Notification !== 'undefined' ? Notification.permission : 'sin soporte',",
      "          navegador: suscrito,",
      "          base: prefActiva,",
      "        })",
      "      }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. Mostrarlo
  // ---------------------------------------------------------
  {
    nombre: 'linea de diagnostico visible',
    viejo: [
      "        {soportado && !iosNoInstalado && permisoDenegado && (",
    ].join('\n'),
    nuevo: [
      "        {/* Diagnóstico: solo cuando el recordatorio está apagado.",
      "            Permite mandar una captura que dice cuál de los tres",
      "            eslabones falla, en vez de \"no me funciona\". */}",
      "        {soportado && !activa && diag && (",
      '          <p className="text-[10px] text-[#B5A38F] mb-2 leading-relaxed">',
      "            Estado: permiso {diag.permiso === 'granted' ? '✓' : diag.permiso === 'denied' ? '✕ bloqueado' : '— sin pedir'}",
      "            {' · '}navegador {diag.navegador ? '✓' : '✕'}",
      "            {' · '}base {diag.base ? '✓' : '✕'}",
      "          </p>",
      "        )}",
      "        {soportado && !iosNoInstalado && permisoDenegado && (",
    ].join('\n'),
  },
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
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('setDiag')) {
  abortar('el archivo ya tiene el diagnostico. Parece que este script ya se corrio.');
}
if (!contenido.includes('prefActiva')) {
  abortar('falta el arreglo del script 357. Correlo primero.');
}

for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

for (const p of PARES) {
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

const ESPERADOS = [
  'Promise<{ ok: boolean; error?: string }>',
  'const guardado = await guardarPreferencia(true, hora)',
  'setDiag({',
  'Estado: permiso',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ahora el fallo se ve en vez de esconderse.');
