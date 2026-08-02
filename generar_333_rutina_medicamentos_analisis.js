const fs = require('fs');
const path = require('path');

// ============================================================
// generar_333_rutina_medicamentos_analisis.js
// ============================================================
// EL PROBLEMA
// En "Rutinas de cuidado" (Analisis), Medicamentos aparecia como
// PENDIENTE aunque el tratamiento ya hubiera terminado.
//
// LA CAUSA
// Esa seccion no consulta la tabla medicamentos. Trabaja solo con la
// columna booleana medicamento_hoy de registros_diarios: cuenta cada
// cuantos dias se marco, saca un promedio, y si paso mas tiempo que
// ese promedio la da por atrasada.
//
// Para un cuidado periodico (bano, corte de unas) eso esta bien. Para
// un medicamento NO, porque un tratamiento TERMINA. Que hayan pasado 4
// dias sin dosis no es un atraso: es lo que corresponde cuando el
// tratamiento acabo.
//
// LA SOLUCION
//  1. Analisis ahora consulta si hay tratamientos activos, con la misma
//     regla derivada que usa el resto de la app (estado='activo' Y
//     fecha_fin vacia o futura).
//  2. Si NO hay ninguno activo, la rutina de medicamentos deja de
//     contar como pendiente y muestra "Sin tratamientos activos" en vez
//     de un atraso inventado.
//  3. Si SI hay activos, todo sigue igual que hasta ahora.
//
// REQUISITO: el script 329 ya desplegado (este se apoya en la consulta
// de historial de enriquecimiento que agrego).
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Estado: cuantos tratamientos activos hay
  // ---------------------------------------------------------
  {
    nombre: 'estado de tratamientos activos',
    viejo: "  const [enriqHistorial, setEnriqHistorial] = useState<any[]>([])",
    nuevo: [
      "  const [enriqHistorial, setEnriqHistorial] = useState<any[]>([])",
      "  // Cuantos tratamientos siguen vigentes hoy. La rutina de",
      "  // medicamentos lo necesita para no marcar como atraso los dias",
      "  // posteriores al fin de un tratamiento.",
      "  const [medsActivosCount, setMedsActivosCount] = useState(0)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Consulta de medicamentos
  // ---------------------------------------------------------
  {
    nombre: 'destructuracion del Promise.all',
    viejo: "    const [{ data: r }, { data: enr }, { data: hist }, { data: enrHist }] = await Promise.all([",
    nuevo: "    const [{ data: r }, { data: enr }, { data: hist }, { data: enrHist }, { data: medsAct }] = await Promise.all([",
  },
  {
    nombre: 'consulta de medicamentos activos',
    viejo: [
      "      supabase",
      "        .from('enriquecimientos')",
      "        .select('fecha, actividad')",
      "        .eq('mascota_id', mascotaId)",
      "        .order('fecha', { ascending: true })",
      "        .limit(2000),",
    ].join('\n'),
    nuevo: [
      "      supabase",
      "        .from('enriquecimientos')",
      "        .select('fecha, actividad')",
      "        .eq('mascota_id', mascotaId)",
      "        .order('fecha', { ascending: true })",
      "        .limit(2000),",
      "      // Tratamientos marcados como activos. La fecha de termino se",
      "      // filtra despues, en codigo, porque el campo estado no se",
      "      // actualiza solo cuando llega esa fecha.",
      "      supabase",
      "        .from('medicamentos')",
      "        .select('fecha_fin')",
      "        .eq('mascota_id', mascotaId)",
      "        .eq('estado', 'activo'),",
    ].join('\n'),
  },
  {
    nombre: 'calculo de tratamientos vigentes',
    viejo: "    setEnriqHistorial(enrHist || [])",
    nuevo: [
      "    setEnriqHistorial(enrHist || [])",
      "    // Misma regla derivada que Prevencion, el dashboard y la vista",
      "    // del veterinario: sin fecha_fin, o con fecha_fin de hoy o",
      "    // futura.",
      "    const hoyMedStr = fechaChile(new Date())",
      "    setMedsActivosCount(",
      "      (medsAct || []).filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyMedStr).length",
      "    )",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Que no cuente como pendiente si no hay tratamiento activo
  // ---------------------------------------------------------
  {
    nombre: 'regla de necesita atencion',
    viejo: "        const necesitaAtencion = (r: RutinaCalculada) => !r.diario && (r.proximaEstimadaDias ?? 99999) <= 0",
    nuevo: [
      "        const necesitaAtencion = (r: RutinaCalculada) => {",
      "          // Medicamentos sin tratamiento vigente nunca estan",
      "          // \"pendientes\": el tratamiento termino, no hay nada que",
      "          // hacer. Sin esta excepcion, la cadencia inferida del",
      "          // historial seguia marcando atraso para siempre.",
      "          if (r.columna === 'medicamento_hoy' && medsActivosCount === 0) return false",
      "          return !r.diario && (r.proximaEstimadaDias ?? 99999) <= 0",
      "        }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Texto propio para medicamentos sin tratamiento activo
  // ---------------------------------------------------------
  {
    nombre: 'apertura de renderRutina',
    viejo: [
      "        const renderRutina = (r: RutinaCalculada) => (",
      '          <div key={r.columna} className="px-4 py-3">',
    ].join('\n'),
    nuevo: [
      "        const renderRutina = (r: RutinaCalculada) => {",
      "          // Caso especial: medicamentos sin tratamiento vigente. La",
      "          // maquinaria de rutinas infiere \"cada cuantos dias\" del",
      "          // historial y marca atraso cuando se pasa de ese",
      "          // promedio. Para un medicamento eso es incorrecto: un",
      "          // tratamiento tiene fin, y los dias posteriores sin dosis",
      "          // son lo esperado, no un descuido.",
      "          if (r.columna === 'medicamento_hoy' && medsActivosCount === 0) {",
      "            return (",
      '              <div key={r.columna} className="px-4 py-3">',
      '                <div className="flex items-center gap-2 mb-1">',
      '                  <span className="text-base flex-shrink-0">{r.emoji}</span>',
      '                  <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{r.label}</p>',
      "                </div>",
      '                <p className="text-xs text-[#3D2B1F] leading-relaxed">',
      "                  Última dosis registrada: hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'}",
      "                </p>",
      '                <p className="text-[11px] text-[#8A7560] mt-0.5">{r.ocurrencias} dosis registradas en total</p>',
      '                <p className="text-[11px] font-semibold mt-0.5" style={{ color: \'#8A7560\' }}>',
      "                  ✓ Sin tratamientos activos",
      "                </p>",
      "              </div>",
      "            )",
      "          }",
      "          return (",
      '          <div key={r.columna} className="px-4 py-3">',
    ].join('\n'),
  },
  {
    nombre: 'cierre de renderRutina',
    viejo: [
      "          </div>",
      "        )",
      "        // Nombre corto y emoji para el encabezado de cada grupo.",
    ].join('\n'),
    nuevo: [
      "          </div>",
      "          )",
      "        }",
      "        // Nombre corto y emoji para el encabezado de cada grupo.",
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

if (contenido.includes('medsActivosCount')) {
  abortar('el archivo ya tiene la logica de tratamientos activos. Parece que este script ya se corrio.');
}
if (!contenido.includes('enriqHistorial')) {
  abortar('falta la consulta de historial de enriquecimiento. Corre primero el script 329.');
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
  'const [medsActivosCount, setMedsActivosCount]',
  '{ data: medsAct }',
  'setMedsActivosCount(',
  'Sin tratamientos activos',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
if (contar(contenido, "r.columna === 'medicamento_hoy' && medsActivosCount === 0") !== 2) {
  abortar('la excepcion de medicamentos no quedo en los dos lugares esperados.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Medicamentos ya no aparece pendiente cuando el tratamiento termino.');
