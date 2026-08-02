const fs = require('fs');
const path = require('path');

// ============================================================
// generar_347_selector_intervalo_medicamento.js
// ============================================================
// PASO 1 de 4 de los medicamentos no diarios.
//
// Agrega el selector "Cada cuantos dias" al formulario de medicamento
// en Salud. Sin esto nadie puede marcar su tratamiento como dia por
// medio, y la columna intervalo_dias quedaria siempre en 1.
//
// Opciones rapidas: todos los dias, dia por medio, cada 3 dias,
// semanal. Mas un campo libre para cualquier otro numero, porque un
// veterinario puede recetar cada 5 o cada 15 dias y no queremos
// obligar a elegir mal.
//
// TAMBIEN ARREGLA UN BUG DE FECHA
// La fecha de inicio se calculaba con:
//     new Date().toISOString().split('T')[0]
// Eso convierte a UTC, asi que un tratamiento creado a las 22:00 en
// Chile quedaba guardado CON LA FECHA DE MAÑANA. Es exactamente el
// error que ya esta documentado en las reglas del proyecto para los
// registros de madrugada. Se reemplaza por Intl con America/Santiago.
//
// REQUISITO: el .sql medicamento_intervalo_dias.sql ya corrido.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/prevencion/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. El selector, justo despues de "Tomas por dia"
  // ---------------------------------------------------------
  {
    nombre: 'selector de intervalo',
    viejo: '                <p className="text-[10px] text-[#8A7560] mt-1.5">Ej. "cada 12 horas" → 2 tomas al día.</p>',
    nuevo: [
      '                <p className="text-[10px] text-[#8A7560] mt-1.5">Ej. "cada 12 horas" → 2 tomas al día.</p>',
      "              </div>",
      "              {/* Cada cuántos días toca. Hasta ahora la app asumía que",
      "                  todo tratamiento era diario, así que a quien tenía uno",
      "                  día por medio le preguntaba todos los días y su",
      "                  adherencia salía en 50% haciéndolo bien. */}",
      "              <div>",
      '                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Cada cuántos días</label>',
      '                <div className="grid grid-cols-2 gap-1.5">',
      "                  {[[1, 'Todos los días'], [2, 'Día por medio'], [3, 'Cada 3 días'], [7, 'Una vez por semana']].map(([n, etiqueta]) => {",
      "                    const activo = (Number(form.intervalo_dias) || 1) === n",
      "                    return (",
      "                      <button",
      "                        key={String(n)} type=\"button\"",
      "                        onClick={() => u('intervalo_dias', String(n))}",
      '                        className="py-2.5 rounded-xl text-xs font-bold border transition-all"',
      "                        style={activo",
      "                          ? { background: '#4AABDB', borderColor: '#4AABDB', color: 'white', borderWidth: '1.5px' }",
      "                          : { background: '#FBEAD9', borderColor: '#EEE2D4', color: '#8A7560', borderWidth: '1.5px' }}",
      "                      >",
      "                        {etiqueta}",
      "                      </button>",
      "                    )",
      "                  })}",
      "                </div>",
      "                {/* Campo libre: un veterinario puede recetar cada 5 o",
      "                    cada 15 días, y obligar a elegir mal sería peor. */}",
      '                <div className="flex items-center gap-2 mt-2">',
      '                  <span className="text-[10px] text-[#8A7560] uppercase tracking-wider">Otro</span>',
      "                  <input",
      '                    type="number" min={1} max={90}',
      '                    className="w-20 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2 text-[#3D2B1F] text-sm focus:outline-none"',
      "                    value={String(form.intervalo_dias || '')}",
      "                    onChange={e => u('intervalo_dias', e.target.value)}",
      "                  />",
      '                  <span className="text-[10px] text-[#8A7560]">días</span>',
      "                </div>",
      '                <p className="text-[10px] text-[#8A7560] mt-1.5">',
      "                  Se cuenta desde la fecha de inicio: si empieza el 10 y es día por medio, toca los días 10, 12, 14...",
      "                </p>",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Guardar el intervalo al EDITAR
  // ---------------------------------------------------------
  {
    nombre: 'guardar intervalo al editar',
    viejo: "        const payload: Record<string, unknown> = { ...form, indicado_por_vet: !!form.indicado_por_vet, dosis_por_dia: Number(form.dosis_por_dia) || 1 }",
    nuevo: "        const payload: Record<string, unknown> = { ...form, indicado_por_vet: !!form.indicado_por_vet, dosis_por_dia: Number(form.dosis_por_dia) || 1, intervalo_dias: Math.min(90, Math.max(1, Number(form.intervalo_dias) || 1)) }",
  },

  // ---------------------------------------------------------
  // 3. Guardar el intervalo al CREAR + arreglar la fecha
  // ---------------------------------------------------------
  {
    nombre: 'guardar intervalo al crear y fecha con zona horaria',
    viejo: "        await supabase.from('medicamentos').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0], indicado_por_vet: !!form.indicado_por_vet, dosis_por_dia: Number(form.dosis_por_dia) || 1 })",
    nuevo: [
      "        // La fecha de hoy va con zona horaria de Chile. Antes se usaba",
      "        // toISOString(), que convierte a UTC: un tratamiento creado a",
      "        // las 22:00 quedaba guardado con la fecha de MAÑANA.",
      "        const hoyMed = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())",
      "        await supabase.from('medicamentos').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || hoyMed, indicado_por_vet: !!form.indicado_por_vet, dosis_por_dia: Number(form.dosis_por_dia) || 1, intervalo_dias: Math.min(90, Math.max(1, Number(form.intervalo_dias) || 1)) })",
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

if (contenido.includes('intervalo_dias')) {
  abortar('el formulario ya tiene el intervalo. Parece que este script ya se corrio.');
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
  // Apunta a la ETIQUETA, no a la frase suelta: el comentario JSX de
  // arriba la menciona para explicar el cambio, y una busqueda ingenua
  // contaria dos.
  ">Cada cuántos días</label>",
  "const hoyMed = new Intl.DateTimeFormat",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// intervalo_dias debe quedar en el selector, el campo libre, y los dos guardados
if (contar(contenido, 'intervalo_dias') < 5) {
  abortar('el intervalo no quedo en todos los lugares esperados.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya se puede marcar un tratamiento como dia por medio.');
