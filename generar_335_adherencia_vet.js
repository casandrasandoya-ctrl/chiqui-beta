const fs = require('fs');
const path = require('path');

// ============================================================
// generar_335_adherencia_vet.js
// ============================================================
// Agrega ADHERENCIA AL TRATAMIENTO en la vista del veterinario.
//
// POR QUE
// Hoy la tarjeta de medicamento dice "Activo" o "Finalizado", pero no
// si el tratamiento SE CUMPLIO. Cuando un tratamiento no funciona, la
// primera pregunta del veterinario es justamente esa, y hasta ahora
// solo podia responderla la memoria del tutor. Los datos ya existen en
// medicamento_tomas: cada dosis con su fecha.
//
// COMO, SIN TOCAR EL RPC
// La pagina /vet ya usa createVetClient (service role) para firmar los
// PDFs de examenes. El RPC obtener_datos_veterinario ya valido el token
// y devolvio los medicamentos autorizados, asi que consultar sus tomas
// POR ESOS IDS no abre ningun acceso nuevo: son datos de la misma
// mascota que el link ya autorizo.
//
// REDACCION — decision deliberada
// Dice "dosis registradas", NO "dosis dadas". Una dosis que el tutor
// dio pero no anoto se ve igual que una que no dio. Si un veterinario
// leyera 60% y concluyera incumplimiento cuando en realidad hubo
// olvido de registro, tomaria una decision clinica sobre un dato
// falso. Por eso ademas va una nota al pie explicandolo.
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/vet/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Calculo de adherencia + nueva firma de la tarjeta
  // ---------------------------------------------------------
  {
    nombre: 'calculo de adherencia y firma de MedicamentoCard',
    viejo: [
      "function MedicamentoCard({ med }: { med: any }) {",
      "  const activo = medicamentoEstaActivo(med)",
    ].join('\n'),
    nuevo: [
      "// Adherencia al tratamiento: cuantas dosis se REGISTRARON sobre",
      "// cuantas correspondian entre la fecha de inicio y la de termino",
      "// (o hoy, si el tratamiento sigue en curso).",
      "//",
      "// Las fechas se construyen a MEDIODIA para que los cambios de",
      "// horario de verano (Chile los tiene dos veces al año) no",
      "// desplacen el conteo de dias al restar 24 horas.",
      "function calcularAdherencia(med: any, dadas: number): { esperadas: number; dadas: number; pct: number } | null {",
      "  if (!med.fecha_inicio) return null",
      "  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
      "  const finReal = med.fecha_fin && med.fecha_fin < hoy ? med.fecha_fin : hoy",
      "  const ini = new Date(med.fecha_inicio + 'T12:00:00')",
      "  const fin = new Date(finReal + 'T12:00:00')",
      "  const dias = Math.floor((fin.getTime() - ini.getTime()) / 86400000) + 1",
      "  if (dias <= 0) return null",
      "  const porDia = Math.max(1, Number(med.dosis_por_dia) || 1)",
      "  const esperadas = dias * porDia",
      "  if (esperadas <= 0) return null",
      "  return { esperadas, dadas, pct: Math.round((dadas / esperadas) * 100) }",
      "}",
      "",
      "function MedicamentoCard({ med, tomas }: { med: any; tomas: number }) {",
      "  const activo = medicamentoEstaActivo(med)",
      "  const adh = calcularAdherencia(med, tomas)",
      "  // Semaforo de salud del proyecto. El ancho de la barra se topa",
      "  // en 100 aunque se hayan registrado mas dosis de las esperadas.",
      "  const colorAdh = !adh ? '#8A7560' : adh.pct >= 80 ? '#4CAF7D' : adh.pct >= 50 ? '#F5C842' : '#E05252'",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. La barra, al final de la tarjeta
  // ---------------------------------------------------------
  {
    nombre: 'barra de adherencia en la tarjeta',
    viejo: '      {med.motivo && <p className="text-xs text-[#8A7560] mt-0.5">Motivo: {med.motivo}</p>}',
    nuevo: [
      '      {med.motivo && <p className="text-xs text-[#8A7560] mt-0.5">Motivo: {med.motivo}</p>}',
      '      {adh && (',
      '        <div className="mt-1.5">',
      '          <div className="h-1.5 rounded-full bg-[#EEE2D4] overflow-hidden">',
      '            <div className="h-full rounded-full" style={{ width: `${Math.min(100, adh.pct)}%`, background: colorAdh }} />',
      '          </div>',
      '          <p className="text-xs mt-1" style={{ color: colorAdh }}>',
      '            <span className="font-bold">{adh.dadas} de {adh.esperadas} dosis registradas</span>',
      '            <span className="text-[#8A7560]"> · {adh.pct}%</span>',
      '          </p>',
      '        </div>',
      '      )}',
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Consulta de las tomas
  // ---------------------------------------------------------
  {
    nombre: 'consulta de dosis registradas',
    viejo: "  const medicamentosFinalizados = medicamentos.filter((m: any) => !medicamentoEstaActivo(m))",
    nuevo: [
      "  const medicamentosFinalizados = medicamentos.filter((m: any) => !medicamentoEstaActivo(m))",
      "",
      "  // Dosis registradas por medicamento. Se consultan SOLO por los",
      "  // ids que el RPC ya devolvio, es decir, medicamentos que el token",
      "  // del link ya autorizo: no se abre ningun acceso nuevo.",
      "  const tomasPorMed: Record<string, number> = {}",
      "  const idsMeds = medicamentos.map((md: any) => md.id).filter(Boolean)",
      "  if (idsMeds.length > 0) {",
      "    const { data: tomasVet } = await supabase",
      "      .from('medicamento_tomas')",
      "      .select('medicamento_id')",
      "      .in('medicamento_id', idsMeds)",
      "    for (const t of ((tomasVet || []) as { medicamento_id: string }[])) {",
      "      tomasPorMed[t.medicamento_id] = (tomasPorMed[t.medicamento_id] || 0) + 1",
      "    }",
      "  }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Pasar las tomas a cada tarjeta
  // ---------------------------------------------------------
  {
    nombre: 'tarjetas de medicamentos activos',
    viejo: "                {medicamentosActivos.map((med: any) => <MedicamentoCard key={med.id} med={med} />)}",
    nuevo: "                {medicamentosActivos.map((med: any) => <MedicamentoCard key={med.id} med={med} tomas={tomasPorMed[med.id] || 0} />)}",
  },
  {
    nombre: 'tarjetas de medicamentos finalizados',
    viejo: "                  {medicamentosFinalizados.map((med: any) => <MedicamentoCard key={med.id} med={med} />)}",
    nuevo: "                  {medicamentosFinalizados.map((med: any) => <MedicamentoCard key={med.id} med={med} tomas={tomasPorMed[med.id] || 0} />)}",
  },

  // ---------------------------------------------------------
  // 5. Nota al pie: que significa realmente el porcentaje
  // ---------------------------------------------------------
  {
    nombre: 'nota sobre lo que mide la adherencia',
    viejo: "          <SeccionVet titulo={`🩹 Medicamentos (${medicamentos.length})`}>",
    nuevo: [
      "          <SeccionVet titulo={`🩹 Medicamentos (${medicamentos.length})`}>",
      '            <p className="text-xs text-[#8A7560] mb-3 leading-relaxed italic">',
      "              El porcentaje refleja las dosis que el tutor registró en la app. Una dosis sin registrar no significa necesariamente que no se haya administrado.",
      "            </p>",
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

if (contenido.includes('calcularAdherencia')) {
  abortar('el archivo ya tiene la adherencia. Parece que este script ya se corrio.');
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
  'function calcularAdherencia',
  'function MedicamentoCard({ med, tomas }',
  "from('medicamento_tomas')",
  'dosis registradas</span>',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Las dos tarjetas deben recibir las tomas
if (contar(contenido, 'tomas={tomasPorMed[med.id] || 0}') !== 2) {
  abortar('las tomas no llegaron a las dos listas de tarjetas.');
}
// Y no puede quedar ninguna llamada sin la prop nueva
if (contenido.includes('<MedicamentoCard key={med.id} med={med} />')) {
  abortar('quedo una tarjeta sin recibir las tomas.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El veterinario ya ve si el tratamiento se cumplio.');
