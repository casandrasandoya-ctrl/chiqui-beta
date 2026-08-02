const fs = require('fs');
const path = require('path');

// ============================================================
// generar_336_medicamentos_no_son_rutina.js
// ============================================================
// EL PROBLEMA (el de fondo, no el sintoma)
// "Rutinas de cuidado" infiere una cadencia del historial: mira cada
// cuantos dias se marco algo y estima cuando toca de nuevo. Para
// cambiar la arena eso es util, porque ahi la costumbre ES la regla y
// descubrirla aporta.
//
// Para un medicamento es incorrecto y ademas riesgoso. La pauta ya la
// dio el veterinario. Mostrar "Registras medicamentos cada 4 dias
// aprox." no describe el tratamiento: describe cada cuanto se abrio la
// app. Y "Te tocaria en 3 dias", con semaforo amarillo, aparenta ser
// una recomendacion que puede contradecir la receta.
//
// EL CAMBIO
// Medicamentos deja de comportarse como rutina. En vez de cadencia
// inferida muestra el tratamiento real: nombre, la frecuencia RECETADA
// y cuanto se ha cumplido — la misma adherencia que ve el veterinario.
// Si no hay tratamientos vigentes, lo dice y punto.
//
// Tampoco cuenta nunca como "pendiente": recordar la dosis de hoy es
// tarea del dashboard, que ya lo hace bien. Analisis es retrospectivo,
// muestra cumplimiento, no urgencia.
//
// REQUISITO: script 333 desplegado (este modifica lo que aquel creo).
//
// Hace reemplazos exactos. Si no encuentra el texto tal cual lo
// espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Helper de adherencia (mismo criterio que la vista del vet)
  // ---------------------------------------------------------
  {
    nombre: 'helper de adherencia',
    viejo: "function textoCada(dias: number): string {",
    nuevo: [
      "// Adherencia: dosis REGISTRADAS sobre las que correspondian entre",
      "// la fecha de inicio y la de termino (o hoy, si sigue en curso).",
      "// Mismo calculo que usa la vista del veterinario.",
      "//",
      "// Las fechas se construyen a MEDIODIA para que los cambios de",
      "// horario de verano no desplacen el conteo de dias.",
      "function adherenciaMed(med: any): { esperadas: number; dadas: number; pct: number } | null {",
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
      "  return { esperadas, dadas: Number(med.tomas) || 0, pct: Math.round(((Number(med.tomas) || 0) / esperadas) * 100) }",
      "}",
      "",
      "function textoCada(dias: number): string {",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Estado: la lista de tratamientos, no solo el conteo
  // ---------------------------------------------------------
  {
    nombre: 'estado de tratamientos vigentes',
    viejo: [
      "  // Cuantos tratamientos siguen vigentes hoy. La rutina de",
      "  // medicamentos lo necesita para no marcar como atraso los dias",
      "  // posteriores al fin de un tratamiento.",
      "  const [medsActivosCount, setMedsActivosCount] = useState(0)",
    ].join('\n'),
    nuevo: [
      "  // Tratamientos vigentes hoy, con sus dosis registradas. La",
      "  // seccion de medicamentos los muestra tal cual fueron recetados",
      "  // en vez de inferir una cadencia del historial.",
      "  const [medsVigentes, setMedsVigentes] = useState<any[]>([])",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Traer los datos del tratamiento y sus dosis
  // ---------------------------------------------------------
  {
    nombre: 'campos del tratamiento en la consulta',
    viejo: [
      "      supabase",
      "        .from('medicamentos')",
      "        .select('fecha_fin')",
      "        .eq('mascota_id', mascotaId)",
      "        .eq('estado', 'activo'),",
    ].join('\n'),
    nuevo: [
      "      supabase",
      "        .from('medicamentos')",
      "        .select('id, nombre, dosis, frecuencia, dosis_por_dia, fecha_inicio, fecha_fin')",
      "        .eq('mascota_id', mascotaId)",
      "        .eq('estado', 'activo'),",
    ].join('\n'),
  },
  {
    nombre: 'conteo de dosis registradas',
    viejo: [
      "    // Misma regla derivada que Prevencion, el dashboard y la vista",
      "    // del veterinario: sin fecha_fin, o con fecha_fin de hoy o",
      "    // futura.",
      "    const hoyMedStr = fechaChile(new Date())",
      "    setMedsActivosCount(",
      "      (medsAct || []).filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyMedStr).length",
      "    )",
    ].join('\n'),
    nuevo: [
      "    // Misma regla derivada que Prevencion, el dashboard y la vista",
      "    // del veterinario: sin fecha_fin, o con fecha_fin de hoy o",
      "    // futura.",
      "    const hoyMedStr = fechaChile(new Date())",
      "    const vigentes = (medsAct || []).filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyMedStr)",
      "    if (vigentes.length === 0) {",
      "      setMedsVigentes([])",
      "    } else {",
      "      // Dosis efectivamente registradas de cada tratamiento, para",
      "      // mostrar cumplimiento real en vez de una cadencia inventada.",
      "      const { data: tomasMed } = await supabase",
      "        .from('medicamento_tomas')",
      "        .select('medicamento_id')",
      "        .in('medicamento_id', vigentes.map((md: any) => md.id))",
      "      const conteo: Record<string, number> = {}",
      "      for (const t of ((tomasMed || []) as { medicamento_id: string }[])) {",
      "        conteo[t.medicamento_id] = (conteo[t.medicamento_id] || 0) + 1",
      "      }",
      "      setMedsVigentes(vigentes.map((md: any) => ({ ...md, tomas: conteo[md.id] || 0 })))",
      "    }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Nunca "pendiente"
  // ---------------------------------------------------------
  {
    nombre: 'medicamentos fuera del conteo de pendientes',
    viejo: [
      "          // Medicamentos sin tratamiento vigente nunca estan",
      '          // "pendientes": el tratamiento termino, no hay nada que',
      "          // hacer. Sin esta excepcion, la cadencia inferida del",
      "          // historial seguia marcando atraso para siempre.",
      "          if (r.columna === 'medicamento_hoy' && medsActivosCount === 0) return false",
    ].join('\n'),
    nuevo: [
      "          // Medicamentos NUNCA cuenta como pendiente aqui. La",
      "          // cadencia inferida no aplica a un tratamiento con pauta",
      "          // medica, y recordar la dosis de hoy ya es tarea del",
      "          // dashboard. Analisis muestra cumplimiento, no urgencia.",
      "          if (r.columna === 'medicamento_hoy') return false",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. La tarjeta: tratamiento real en vez de cadencia inferida
  // ---------------------------------------------------------
  {
    nombre: 'tarjeta de medicamentos',
    viejo: [
      "          // Caso especial: medicamentos sin tratamiento vigente. La",
      '          // maquinaria de rutinas infiere "cada cuantos dias" del',
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
    ].join('\n'),
    nuevo: [
      "          // Medicamentos NO es una rutina. La maquinaria de rutinas",
      '          // infiere "cada cuantos dias" del historial, y eso para un',
      "          // medicamento es falso: la pauta la dio el veterinario, no",
      "          // la costumbre. Decir \"cada 4 dias aprox.\" describe cada",
      "          // cuanto se abrio la app, y \"te tocaria en 3 dias\" puede",
      "          // contradecir la receta con apariencia de recomendacion.",
      "          //",
      "          // Se muestra el tratamiento tal cual existe: nombre,",
      "          // frecuencia recetada y cumplimiento real.",
      "          if (r.columna === 'medicamento_hoy') {",
      "            return (",
      '              <div key={r.columna} className="px-4 py-3">',
      '                <div className="flex items-center gap-2 mb-1">',
      '                  <span className="text-base flex-shrink-0">{r.emoji}</span>',
      '                  <p className="text-xs font-semibold text-[#3D2B1F] flex-1">{r.label}</p>',
      "                </div>",
      "                {medsVigentes.length === 0 ? (",
      "                  <>",
      '                    <p className="text-xs text-[#3D2B1F] leading-relaxed">',
      "                      Última dosis registrada: hace {r.diasDesdeUltima} {r.diasDesdeUltima === 1 ? 'día' : 'días'}",
      "                    </p>",
      '                    <p className="text-[11px] text-[#8A7560] mt-0.5">{r.ocurrencias} días con dosis registradas</p>',
      '                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: \'#8A7560\' }}>',
      "                      ✓ Sin tratamientos activos",
      "                    </p>",
      "                  </>",
      "                ) : (",
      '                  <div className="space-y-2.5">',
      "                    {medsVigentes.map((md: any) => {",
      "                      const adh = adherenciaMed(md)",
      "                      const colorAdh = !adh ? '#8A7560' : adh.pct >= 80 ? '#4CAF7D' : adh.pct >= 50 ? '#F5C842' : '#E05252'",
      "                      return (",
      "                        <div key={md.id}>",
      '                          <p className="text-xs font-semibold text-[#3D2B1F]">{md.nombre}</p>',
      '                          <p className="text-[11px] text-[#8A7560]">',
      "                            {md.dosis ? `${md.dosis} · ` : ''}{md.frecuencia || (Number(md.dosis_por_dia) > 1 ? `${md.dosis_por_dia} dosis al día` : '1 dosis al día')}",
      "                          </p>",
      "                          {adh && (",
      "                            <>",
      '                              <div className="h-1.5 rounded-full bg-[#EEE2D4] overflow-hidden mt-1">',
      "                                <div className=\"h-full rounded-full\" style={{ width: `${Math.min(100, adh.pct)}%`, background: colorAdh }} />",
      "                              </div>",
      '                              <p className="text-[11px] mt-0.5" style={{ color: colorAdh }}>',
      "                                {adh.dadas} de {adh.esperadas} dosis registradas · {adh.pct}%",
      "                              </p>",
      "                            </>",
      "                          )}",
      "                        </div>",
      "                      )",
      "                    })}",
      '                    <p className="text-[10px] text-[#8A7560] italic leading-relaxed">',
      "                      Cuenta las dosis que registraste. Una dosis sin registrar no significa que no se haya dado.",
      "                    </p>",
      "                  </div>",
      "                )}",
      "              </div>",
      "            )",
      "          }",
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

if (contenido.includes('medsVigentes')) {
  abortar('el archivo ya tiene la seccion nueva. Parece que este script ya se corrio.');
}
if (!contenido.includes('medsActivosCount')) {
  abortar('falta la logica de tratamientos activos. Corre primero el script 333.');
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

// Verificaciones finales
const ESPERADOS = [
  'function adherenciaMed',
  'const [medsVigentes, setMedsVigentes]',
  "from('medicamento_tomas')",
  'Sin tratamientos activos',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// No puede quedar ninguna referencia al estado viejo, o el build falla
if (contenido.includes('medsActivosCount')) {
  abortar('quedo una referencia a medsActivosCount, que ya no existe.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Medicamentos ya no finge ser una rutina.');
