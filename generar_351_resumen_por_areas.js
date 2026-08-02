const fs = require('fs');
const path = require('path');

// ============================================================
// generar_351_resumen_por_areas.js
// ============================================================
// El resumen de la comunidad pasa de una lista plana de 12 numeros a
// SEIS AREAS PLEGABLES, cada una con su total al lado. Se abre solo la
// que interesa.
//
// Las areas siguen la misma division que la app, para que leer el
// panel se parezca a usarla:
//   Observacion · Prevencion · Tratamiento · Actividad · Cuidados ·
//   Alimentacion
//
// SE AGREGAN indicadores que faltaban:
//   - Diagnosticos (tabla enfermedades)
//   - Corte de uñas, limpieza dental, limpieza de oidos
//   - Cambio de alimento, probo alimento nuevo, compro alimento
//   - Revisiones corporales
//
// Todos esos cuidados viven como columnas booleanas dentro del
// registro diario, no en tablas propias: por eso se suman a la
// consulta de registros_diarios en vez de pedir tablas nuevas.
//
// Se usa <details>, el mismo elemento que ya usa la vista del
// veterinario: no necesita JavaScript, asi que el panel sigue siendo
// un componente de servidor.
//
// REQUISITO: script 350 desplegado.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Mas columnas del registro diario
  // ---------------------------------------------------------
  {
    nombre: 'columnas de cuidados y alimentacion',
    viejo: "    db.from('registros_diarios').select('user_id, mascota_id, fecha, paseo, se_bano').limit(50000),",
    nuevo: "    db.from('registros_diarios').select('user_id, mascota_id, fecha, paseo, se_bano, corte_unas, limpieza_dental, limpieza_oidos, cambio_alimento, probo_alimento_nuevo, compro_alimento').limit(50000),",
  },

  // ---------------------------------------------------------
  // 2. La tabla de enfermedades
  // ---------------------------------------------------------
  {
    nombre: 'consulta de diagnosticos',
    viejo: [
      "    db.from('medicamento_tomas').select('mascota_id, fecha').limit(50000),",
      "  ])",
    ].join('\n'),
    nuevo: [
      "    db.from('medicamento_tomas').select('mascota_id, fecha').limit(50000),",
      "    db.from('enfermedades').select('mascota_id, fecha_diagnostico'),",
      "  ])",
    ].join('\n'),
  },
  {
    nombre: 'destructuracion de diagnosticos',
    viejo: "    { data: tomas },",
    nuevo: [
      "    { data: tomas },",
      "    { data: enfs },",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Agrupar el resumen por areas
  // ---------------------------------------------------------
  {
    nombre: 'calculo agrupado',
    viejo: [
      "  const resumenComunidad: [string, string, number][] = [",
      "    ['📝', 'Registros diarios', regsPeriodo.length],",
      "    // 'no_paseo' es un valor real que significa que ese dia NO",
      "    // salio: contarlo como paseo seria mentir.",
      "    ['🐾', 'Paseos', regsPeriodo.filter((r: any) => r.paseo && r.paseo !== 'no_paseo').length],",
      "    ['💊', 'Dosis de medicamento', contarPorMascota(tomas, 'fecha')],",
      "    ['🦴', 'Enriquecimiento', contarPorMascota(enriq, 'fecha')],",
      "    ['💉', 'Vacunas', contarPorMascota(vacunas, 'fecha_aplicacion')],",
      "    ['🪱', 'Antiparasitarios', contarPorMascota(antis, 'fecha_aplicacion')],",
      "    ['🩺', 'Visitas al veterinario', contarPorUsuario(visitas, 'fecha')],",
      "    // Los dos tipos de examen se suman: para leer el resumen son",
      "    // lo mismo.",
      "    ['🧪', 'Exámenes', contarPorMascota(exams, 'fecha') + contarPorMascota(examsLab, 'fecha')],",
      "    ['👁️', 'Observaciones', contarPorMascota(obs, 'fecha_inicio')],",
      "    ['⚖️', 'Controles de peso', contarPorMascota(pesos, 'fecha')],",
      "    ['🚿', 'Baños', regsPeriodo.filter((r: any) => r.se_bano).length],",
      "    ['✨', 'Momentos', contarPorUsuario(momentos, 'fecha')],",
      "  ]",
    ].join('\n'),
    nuevo: [
      "  // Cuenta cuantos dias del periodo tienen marcada una columna del",
      "  // registro diario. Esos cuidados no tienen tabla propia: viven",
      "  // como booleanos dentro del registro del dia.",
      "  const contarMarca = (campo: string) => regsPeriodo.filter((r: any) => r[campo]).length",
      "",
      "  // Las areas siguen la misma division que la app, para que leer el",
      "  // panel se parezca a usarla.",
      "  const gruposResumen: { area: string; emoji: string; items: [string, string, number][] }[] = [",
      "    {",
      "      area: 'Observación', emoji: '📝',",
      "      items: [",
      "        ['📝', 'Registros diarios', regsPeriodo.length],",
      "        ['👁️', 'Observaciones', contarPorMascota(obs, 'fecha_inicio')],",
      "        ['🦠', 'Diagnósticos', contarPorMascota(enfs, 'fecha_diagnostico')],",
      "      ],",
      "    },",
      "    {",
      "      area: 'Prevención', emoji: '🛡️',",
      "      items: [",
      "        ['💉', 'Vacunas', contarPorMascota(vacunas, 'fecha_aplicacion')],",
      "        ['🪱', 'Antiparasitarios', contarPorMascota(antis, 'fecha_aplicacion')],",
      "        // Los dos tipos de examen se suman: para leer el resumen",
      "        // son lo mismo.",
      "        ['🧪', 'Exámenes', contarPorMascota(exams, 'fecha') + contarPorMascota(examsLab, 'fecha')],",
      "        ['⚖️', 'Controles de peso', contarPorMascota(pesos, 'fecha')],",
      "        ['🔍', 'Revisiones corporales', contarPorMascota(revis, 'fecha')],",
      "      ],",
      "    },",
      "    {",
      "      area: 'Tratamiento', emoji: '💊',",
      "      items: [",
      "        // Dosis registradas, no tratamientos creados: un tratamiento",
      "        // son muchas dosis, y lo que dice algo es si se cumplieron.",
      "        ['💊', 'Dosis de medicamento', contarPorMascota(tomas, 'fecha')],",
      "        ['🏥', 'Visitas al veterinario', contarPorUsuario(visitas, 'fecha')],",
      "      ],",
      "    },",
      "    {",
      "      area: 'Actividad', emoji: '🐾',",
      "      items: [",
      "        // 'no_paseo' es un valor real que significa que ese dia NO",
      "        // salio: contarlo como paseo seria mentir.",
      "        ['🐾', 'Paseos', regsPeriodo.filter((r: any) => r.paseo && r.paseo !== 'no_paseo').length],",
      "        ['🦴', 'Enriquecimiento', contarPorMascota(enriq, 'fecha')],",
      "        ['✨', 'Momentos', contarPorUsuario(momentos, 'fecha')],",
      "      ],",
      "    },",
      "    {",
      "      area: 'Cuidados', emoji: '🚿',",
      "      items: [",
      "        ['🚿', 'Baños', contarMarca('se_bano')],",
      "        ['✂️', 'Corte de uñas', contarMarca('corte_unas')],",
      "        ['🦷', 'Limpieza dental', contarMarca('limpieza_dental')],",
      "        ['👂', 'Limpieza de oídos', contarMarca('limpieza_oidos')],",
      "      ],",
      "    },",
      "    {",
      "      area: 'Alimentación', emoji: '🍽️',",
      "      items: [",
      "        ['🔄', 'Cambios de alimento', contarMarca('cambio_alimento')],",
      "        ['🆕', 'Probó algo nuevo', contarMarca('probo_alimento_nuevo')],",
      "        ['🛒', 'Compras de alimento', contarMarca('compro_alimento')],",
      "      ],",
      "    },",
      "  ]",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Render plegable por area
  // ---------------------------------------------------------
  {
    nombre: 'render por areas',
    viejo: [
      '        <div className="grid grid-cols-2 gap-2.5">',
      "          {resumenComunidad.map(([emoji, label, n]) => (",
      '            <div key={label} className="bg-[#FBEAD9]/50 rounded-xl px-3 py-2.5">',
      '              <p className="text-[10px] text-[#8A7560] leading-tight">{emoji} {label}</p>',
      '              <p className="font-bold text-xl text-[#3D2B1F] mt-0.5" style={{ color: n > 0 ? \'#3D2B1F\' : \'#B5A38F\' }}>{n}</p>',
      "            </div>",
      "          ))}",
      "        </div>",
    ].join('\n'),
    nuevo: [
      "        {gruposResumen.map(g => {",
      "          const totalArea = g.items.reduce((a, it) => a + it[2], 0)",
      "          return (",
      '            <details key={g.area} className="border-b border-[#EEE2D4] last:border-0">',
      '              <summary className="py-2.5 flex items-center gap-2 cursor-pointer list-none">',
      '                <span className="text-sm">{g.emoji}</span>',
      '                <p className="flex-1 text-xs font-semibold text-[#3D2B1F]">{g.area}</p>',
      '                <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">{totalArea}</span>',
      '                <span className="text-[#8C572F] text-sm font-bold">▼</span>',
      "              </summary>",
      '              <div className="grid grid-cols-2 gap-2.5 pb-3">',
      "                {g.items.map(([emoji, label, n]) => (",
      '                  <div key={label} className="bg-[#FBEAD9]/50 rounded-xl px-3 py-2.5">',
      '                    <p className="text-[10px] text-[#8A7560] leading-tight">{emoji} {label}</p>',
      '                    <p className="font-bold text-xl mt-0.5" style={{ color: n > 0 ? \'#3D2B1F\' : \'#B5A38F\' }}>{n}</p>',
      "                  </div>",
      "                ))}",
      "              </div>",
      "            </details>",
      "          )",
      "        })}",
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

if (contenido.includes('gruposResumen')) {
  abortar('el panel ya tiene el resumen por areas. Parece que este script ya se corrio.');
}
if (!contenido.includes('resumenComunidad')) {
  abortar('falta el resumen de la comunidad. Corre primero el script 350.');
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
  'const gruposResumen:',
  'const contarMarca =',
  "db.from('enfermedades')",
  "{ data: enfs },",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La variable vieja no puede quedar: si sobrevive sin usarse, confunde;
// si sobrevive usada, el render quedo a medias.
if (contenido.includes('resumenComunidad')) {
  abortar('quedo una referencia a resumenComunidad, que ya no existe.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El resumen ya viene agrupado por area y plegable.');
