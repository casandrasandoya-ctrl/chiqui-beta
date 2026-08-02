const fs = require('fs');
const path = require('path');

// ============================================================
// generar_350_resumen_comunidad.js
// ============================================================
// Agrega al panel un RESUMEN DE LA COMUNIDAD: cuanto se registro de
// cada cosa en el periodo elegido. No cuantas personas entraron, sino
// que paso con la salud de estos animales.
//
// Doce indicadores: registros diarios, paseos, dosis de medicamento,
// enriquecimiento, vacunas, antiparasitarios, visitas al veterinario,
// examenes, observaciones, controles de peso, baños y momentos.
//
// DE DONDE SALE CADA UNO
// Casi todo ya se consultaba (script 341). Se agregan dos cosas:
//   - medicamento_tomas: las DOSIS efectivamente registradas, que dice
//     mucho mas que cuantos tratamientos se crearon.
//   - las columnas paseo y se_bano de registros_diarios, que viven
//     dentro del registro del dia y no en una tabla propia.
//
// RESPETA EL PERIODO elegido arriba (semana, mes o año), asi que sirve
// igual para "esta semana" que para "julio 2026".
//
// Los examenes suman las dos tablas (documentos y examenes de
// laboratorio) porque para leer el resumen son lo mismo.
//
// REQUISITO: scripts 337 a 344 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Traer paseo y baño desde el registro diario
  // ---------------------------------------------------------
  {
    nombre: 'columnas de paseo y baño',
    viejo: "    db.from('registros_diarios').select('user_id, mascota_id, fecha').limit(50000),",
    nuevo: [
      "    // paseo y se_bano viven dentro del registro del dia, no en una",
      "    // tabla propia: por eso viajan aca y no en una consulta aparte.",
      "    db.from('registros_diarios').select('user_id, mascota_id, fecha, paseo, se_bano').limit(50000),",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Traer las dosis de medicamento
  // ---------------------------------------------------------
  {
    nombre: 'consulta de dosis de medicamento',
    viejo: [
      "    db.from('revisiones_corporales').select('mascota_id, fecha'),",
      "  ])",
    ].join('\n'),
    nuevo: [
      "    db.from('revisiones_corporales').select('mascota_id, fecha'),",
      "    // Dosis efectivamente registradas. Dice mucho mas que cuantos",
      "    // tratamientos se crearon: un tratamiento son muchas dosis, y",
      "    // lo que importa es si se cumplieron.",
      "    db.from('medicamento_tomas').select('mascota_id, fecha').limit(50000),",
      "  ])",
    ].join('\n'),
  },
  {
    nombre: 'destructuracion de las dosis',
    viejo: "    { data: revis },",
    nuevo: [
      "    { data: revis },",
      "    { data: tomas },",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Contar todo dentro del periodo
  // ---------------------------------------------------------
  {
    nombre: 'calculo del resumen',
    viejo: "  // ---------- Funciones usadas ----------",
    nuevo: [
      "  // ---------- Resumen de la comunidad ----------",
      "  // Que paso con la salud de estos animales en el periodo elegido.",
      "  // Se cuenta solo lo de mascotas conocidas (mascPorId), asi nada",
      "  // que quedara huerfano en la base infla los numeros.",
      "  const enPeriodo = (iso: any) => {",
      "    const f = String(iso || '').slice(0, 10)",
      "    return f >= desde && f <= hasta",
      "  }",
      "  const contarPorMascota = (lista: any[] | null, campoFecha: string) =>",
      "    (lista || []).filter((x: any) => mascPorId.has(x.mascota_id) && enPeriodo(x[campoFecha])).length",
      "  const contarPorUsuario = (lista: any[] | null, campoFecha: string) =>",
      "    (lista || []).filter((x: any) => ids.has(x.user_id) && enPeriodo(x[campoFecha])).length",
      "",
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
      "",
      "  // ---------- Funciones usadas ----------",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Mostrarlo
  // ---------------------------------------------------------
  {
    nombre: 'seccion del resumen',
    viejo: '      <Seccion titulo="Funciones usadas (histórico)">',
    nuevo: [
      "      {/* Resumen de la comunidad: no cuanta gente entro, sino que",
      "          paso con la salud de estos animales. Respeta el periodo",
      "          elegido arriba. */}",
      '      <Seccion titulo="Resumen de la comunidad">',
      '        <div className="grid grid-cols-2 gap-2.5">',
      "          {resumenComunidad.map(([emoji, label, n]) => (",
      '            <div key={label} className="bg-[#FBEAD9]/50 rounded-xl px-3 py-2.5">',
      '              <p className="text-[10px] text-[#8A7560] leading-tight">{emoji} {label}</p>',
      '              <p className="font-bold text-xl text-[#3D2B1F] mt-0.5" style={{ color: n > 0 ? \'#3D2B1F\' : \'#B5A38F\' }}>{n}</p>',
      "            </div>",
      "          ))}",
      "        </div>",
      '        <p className="text-[10px] text-[#8A7560] mt-3 leading-relaxed italic">',
      "          Todo lo registrado en el período elegido. No es cuánta gente entró: es qué pasó con la salud de estos animales.",
      "        </p>",
      "      </Seccion>",
      "",
      '      <Seccion titulo="Funciones usadas (histórico)">',
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
  abortar('no se encontro ' + RUTA + '. Corre primero los scripts 337 a 344.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('resumenComunidad')) {
  abortar('el panel ya tiene el resumen. Parece que este script ya se corrio.');
}
if (!contenido.includes("db.from('revisiones_corporales')")) {
  abortar('falta la consulta de otra actividad. Corre primero el script 341.');
}
if (!contenido.includes('let hasta: string')) {
  abortar('faltan los periodos de calendario. Corre primero el script 342.');
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
  'const resumenComunidad',
  "{ data: tomas },",
  "db.from('medicamento_tomas')",
  '"Resumen de la comunidad"',
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
console.log('Listo. El panel ya resume la salud de la comunidad.');
