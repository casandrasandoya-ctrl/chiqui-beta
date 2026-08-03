const fs = require('fs');
const path = require('path');

// ============================================================
// generar_361_constancia_desde_el_inicio.js
// ============================================================
// MISMO ERROR QUE EL DEL PROMEDIO DE PASEO, en otros dos lugares.
//
// El anillo de constancia del mes divide por los dias TRANSCURRIDOS
// del mes:
//
//     diasRegistradosMes / diaActualP          <- constancia
//     diasConPaseoMes / diaActualP * 100       <- % de dias con paseo
//
// Si alguien crea su cuenta el 25 y hoy es 28, registro 4 de 4 dias.
// Pero la app calcula 4 de 28 y le muestra 14% de constancia. Su
// primera impresion de CHIQUI es que lo esta haciendo pesimo, cuando
// no se ha saltado un solo dia.
//
// LA CORRECCION
// Se mide desde que la persona EMPEZO A USAR LA APP dentro de ese mes:
// el ultimo entre el dia 1 del mes y su primer registro. Para quien
// lleva meses no cambia nada; para quien recien llega, deja de
// castigarla por dias en que la app ni existia para ella.
//
// El primer registro se saca de paseoHistorial, que trae el historial
// COMPLETO (no la ventana de 30 dias), asi que sirve tambien para
// meses pasados.
//
// AUDITORIA: se revisaron los demas calculos de Analisis y estos
// estaban BIEN, varios con guardas ya escritas:
//   - promedioPorDiaConPaseo divide por los dias con duracion conocida
//   - difMesAnterior se salta si el mes anterior no tuvo actividad
//   - normalidadPorCategoria divide por los dias con ese dato
//   - calcularRutina exige 2 ocurrencias antes de estimar
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Dias del mes en que la persona ya usaba la app
  // ---------------------------------------------------------
  {
    nombre: 'dias del mes con la app en uso',
    viejo: "  const nombreMesActual = NOMBRES_MES_LARGOS[mesActualP - 1]",
    nuevo: [
      "  const nombreMesActual = NOMBRES_MES_LARGOS[mesActualP - 1]",
      "",
      "  // --- Días del mes en que la persona YA usaba la app ---",
      "  // Medir la constancia contra los días transcurridos del mes",
      "  // castiga a quien recién llega: alguien que creó su cuenta el 25",
      "  // y registró los 4 días desde entonces aparecía con 14%.",
      "  // Se cuenta desde el último entre el día 1 del mes y su primer",
      "  // registro. paseoHistorial trae el historial COMPLETO, así que",
      "  // esto también sirve al mirar meses anteriores.",
      "  const primerRegistroEver = paseoHistorial.length > 0",
      "    ? [...paseoHistorial].map(r => r.fecha as string).filter(Boolean).sort()[0]",
      "    : null",
      "  const inicioConteoMes = primerRegistroEver && primerRegistroEver > inicioMesActual",
      "    ? primerRegistroEver",
      "    : inicioMesActual",
      "  const diasDelMesConApp = (() => {",
      "    // Mediodía: restar sobre medianoche falla en los cambios de",
      "    // horario de verano.",
      "    const a = new Date(inicioConteoMes + 'T12:00:00')",
      "    const b = new Date(hoyStrPaseo + 'T12:00:00')",
      "    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)",
      "  })()",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Pilar de registro diario
  // ---------------------------------------------------------
  {
    nombre: 'pilar de constancia del registro',
    viejo: [
      "    const prop = diaActualP > 0 ? Math.min(diasRegistradosMes / diaActualP, 1) : 0",
      "    pilaresConstancia.push({",
      "      label: 'Registro diario', emoji: '📝',",
      "      puntos: Math.round(prop * 40), maximo: 40,",
      "      detalle: `${diasRegistradosMes} de ${diaActualP} días registrados`,",
      "      ok: prop >= 0.6,",
      "    })",
    ].join('\n'),
    nuevo: [
      "    // Se divide por los días en que la app ya existía para esta",
      "    // persona, no por los días del mes.",
      "    const prop = Math.min(diasRegistradosMes / diasDelMesConApp, 1)",
      "    pilaresConstancia.push({",
      "      label: 'Registro diario', emoji: '📝',",
      "      puntos: Math.round(prop * 40), maximo: 40,",
      "      detalle: `${diasRegistradosMes} de ${diasDelMesConApp} días registrados`,",
      "      ok: prop >= 0.6,",
      "    })",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Porcentaje de dias con paseo
  // ---------------------------------------------------------
  {
    nombre: 'porcentaje de dias con paseo',
    viejo: "(diasConPaseoMes / diaActualP) * 100",
    nuevo: "(diasConPaseoMes / diasDelMesConApp) * 100",
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

if (contenido.includes('diasDelMesConApp')) {
  abortar('el archivo ya mide desde el inicio de uso. Parece que este script ya se corrio.');
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

const ESPERADOS = ['const diasDelMesConApp', 'const primerRegistroEver', 'const inicioConteoMes'];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// diasDelMesConApp debe quedar usado en los DOS calculos
if (contar(contenido, 'diasDelMesConApp') < 4) {
  abortar('el nuevo denominador no quedo en los dos calculos.');
}
if (contenido.includes('diasRegistradosMes / diaActualP')) {
  abortar('quedo el denominador viejo en la constancia.');
}
if (contenido.includes('diasConPaseoMes / diaActualP')) {
  abortar('quedo el denominador viejo en el porcentaje de paseos.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. La constancia ya no castiga a quien recien empieza.');
