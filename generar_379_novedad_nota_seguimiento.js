const fs = require('fs');
const path = require('path');

// ============================================================
// generar_379_novedad_nota_seguimiento.js
// ============================================================
// Cierra la funcion: la nota marcada como "preguntame mañana" vuelve al
// dia siguiente como novedad, con el texto que la persona escribio.
//
// UN SOLO BOTON, NO DOS
// Habiamos hablado de "Todo bien" y "Sigo preocupada". El componente de
// Novedades esta construido para UNA accion por tarjeta, y forzar dos
// romperia su estructura. Pero el comportamiento es el mismo:
//   - "✓ Todo bien" la cierra para siempre.
//   - No hacer nada la deja volver mañana, hasta 3 dias.
// O sea que "sigo preocupada" es simplemente no cerrarla.
//
// TRES DIAS Y SE APAGA SOLA
// El limite vive en la consulta (fecha >= hoy - 3). Una novedad que
// insiste para siempre deja de leerse, y ahi habriamos perdido tambien
// las que si importan.
//
// EFIMERA: si se cierra con la ✕ sin responder, vuelve en la proxima
// visita al dashboard. Solo el boton la cierra de verdad. Es una
// pregunta sobre la salud del animal: merece insistir un poco.
//
// VA PRIMERA EN LA COLA, antes incluso del cumpleaños. Si alguien anoto
// que su mascota comio algo raro, eso pesa mas que una celebracion.
//
// SE CONSULTA DESDE EL COMPONENTE, no desde el dashboard. Asi el cambio
// toca UN archivo en vez de tres, siguiendo el mismo patron que ya usa
// la novedad de "completa tu nombre".
//
// REQUISITOS: el .sql notas_seguimiento.sql corrido y los scripts 377 y
// 378 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/Novedades.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Buscar la nota pendiente
  // ---------------------------------------------------------
  {
    nombre: 'consulta de la nota pendiente',
    viejo: "  const [faltaNombre, setFaltaNombre] = useState(false)",
    nuevo: [
      "  const [faltaNombre, setFaltaNombre] = useState(false)",
      "",
      "  // Nota marcada como \"pregúntame mañana\" en días anteriores. Se",
      "  // consulta desde acá y no desde el dashboard: así el cambio toca",
      "  // un archivo en vez de tres, igual que la novedad de \"completa tu",
      "  // nombre\" de más abajo.",
      "  const [notaPendiente, setNotaPendiente] = useState<{ fecha: string; nota: string } | null>(null)",
      "  useEffect(() => {",
      "    let activo = true",
      "    ;(async () => {",
      "      const hoyStr = fechaHoyChile()",
      "      // Mediodía: restar días sobre medianoche falla en los cambios",
      "      // de horario de verano.",
      "      const d = new Date(hoyStr + 'T12:00:00')",
      "      d.setDate(d.getDate() - 3)",
      "      const desde = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)",
      "      const { data } = await supabase",
      "        .from('registros_diarios')",
      "        .select('fecha, nota')",
      "        .eq('mascota_id', mascota.id)",
      "        .eq('nota_seguimiento', true)",
      "        .eq('nota_seguimiento_cerrada', false)",
      "        .gte('fecha', desde)",
      "        // Menor que hoy: la nota de hoy todavía no tiene sentido",
      "        // preguntarla — se escribió hace un rato.",
      "        .lt('fecha', hoyStr)",
      "        .order('fecha', { ascending: false })",
      "        .limit(1)",
      "      const fila = (data || [])[0]",
      "      if (activo && fila?.nota) {",
      "        setNotaPendiente({ fecha: fila.fecha as string, nota: String(fila.nota) })",
      "      }",
      "    })()",
      "    return () => { activo = false }",
      "  }, [supabase, mascota.id])",
      "",
      "  // Marcar la nota como resuelta. Se cierra en la base, no en",
      "  // localStorage: es un dato del historial, no una preferencia de",
      "  // esta pantalla.",
      "  async function cerrarNotaSeguimiento(fecha: string) {",
      "    await supabase",
      "      .from('registros_diarios')",
      "      .update({ nota_seguimiento_cerrada: true })",
      "      .eq('mascota_id', mascota.id)",
      "      .eq('fecha', fecha)",
      "    setNotaPendiente(null)",
      "    setToast('✓ Anotado, me quedo tranquilo')",
      "  }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Ponerla al frente de la cola
  // ---------------------------------------------------------
  {
    nombre: 'la novedad al frente de la cola',
    viejo: [
      "    seguimientos, diasSinCampo, medicamentosPendientesHoy, visitasProximas,",
      "  )",
    ].join('\n'),
    nuevo: [
      "    seguimientos, diasSinCampo, medicamentosPendientesHoy, visitasProximas,",
      "  )",
      "",
      "  // La nota con seguimiento va PRIMERA, antes incluso del cumpleaños:",
      "  // si alguien anotó que su mascota comió algo raro, eso pesa más que",
      "  // una celebración.",
      "  if (notaPendiente) {",
      "    const hoyN = fechaHoyChile()",
      "    const dias = Math.round(",
      "      (new Date(hoyN + 'T12:00:00').getTime() - new Date(notaPendiente.fecha + 'T12:00:00').getTime()) / 86400000",
      "    )",
      "    const cuando = dias === 1 ? 'Ayer' : dias === 2 ? 'Anteayer' : `Hace ${dias} días`",
      "    // La nota se muestra recortada: el texto completo ya está en el",
      "    // registro de ese día y en la vista del veterinario.",
      "    const textoNota = notaPendiente.nota.length > 90",
      "      ? notaPendiente.nota.slice(0, 90).trim() + '…'",
      "      : notaPendiente.nota",
      "    pendientesRaw.unshift({",
      "      key: `nota_seg_${mascota.id}_${notaPendiente.fecha}`,",
      "      img: '/chiqui/chiqui_lupa.png',",
      "      mensaje: `👀 ${cuando} anotaste: \"${textoNota}\". ¿Cómo va ${mascota.nombre}?`,",
      "      accion: '✓ Todo bien',",
      "      onAccion: () => cerrarNotaSeguimiento(notaPendiente.fecha),",
      "      // Efímera: si se cierra con la ✕ sin responder, vuelve en la",
      "      // próxima visita. Solo el botón la cierra de verdad — es una",
      "      // pregunta sobre la salud del animal, merece insistir.",
      "      efimera: true,",
      "    })",
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
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('notaPendiente')) {
  abortar('la novedad ya existe. Parece que este script ya se corrio.');
}
// setToast se usa para confirmar; si no existiera, el boton no daria
// ninguna señal de haber funcionado.
if (!contenido.includes('setToast')) {
  abortar('el componente no tiene toast. No podria confirmar la accion.');
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
  'const [notaPendiente, setNotaPendiente]',
  'async function cerrarNotaSeguimiento',
  'pendientesRaw.unshift({',
  "accion: '✓ Todo bien',",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// El unshift tiene que ir DESPUES de que exista pendientesRaw, o la
// variable no estaria definida todavia.
const posLista = contenido.indexOf('const pendientesRaw = calcularNovedades(');
const posUnshift = contenido.indexOf('pendientesRaw.unshift({');
if (posLista === -1 || posUnshift < posLista) {
  abortar('la novedad quedaria antes de que exista la lista.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. La nota vuelve al dia siguiente a preguntar como esta.');
