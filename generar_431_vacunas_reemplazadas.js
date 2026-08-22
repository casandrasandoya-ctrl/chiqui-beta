const fs = require('fs');
const path = require('path');

// ============================================================
// generar_431_vacunas_reemplazadas.js
// ============================================================
// EL BUG (reportado por una usuaria, confirmado con una captura)
// El badge de la seccion decia "Al dia" mientras dos vacunas Felocell
// aparecian abajo marcadas "Vencido". Las tres eran la MISMA vacuna:
// la del 1 de agosto de 2026 reemplazo a las anteriores.
//
// LA CAUSA
// El badge aplica la regla del proyecto —"una dosis reemplazada por
// otra mas nueva no cuenta como vencida"— pero las TARJETAS no:
//
//   {v.proxima_fecha && (   ->  cada vacuna muestra su estado, sin
//                               importar si ya fue reforzada
//
// Antiparasitarios ya lo tenia resuelto con idAntiMasReciente. Vacunas
// no.
//
// EL ARREGLO
// Se agrupa por nombre igual que el badge —la antirrabica y la triple
// felina tienen ciclos independientes— y solo la vigente de cada tipo
// muestra su indicador. Las anteriores dicen "Ya reforzada" en gris.
//
// SE MANTIENE LA FECHA VISIBLE en todas: el historial sigue completo,
// lo unico que cambia es que dejan de alarmar.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/prevencion/page.tsx';

const PARES = [
  { nombre: 'apertura del listado', viejo: "              {vacunas.map(v => (\n                <div key={v.id} className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden\">", nuevo: "              {(() => {\n                // Solo la vacuna VIGENTE de cada tipo muestra su estado.\n                // Una dosis reemplazada por otra mas nueva del mismo tipo\n                // no debe seguir marcada en rojo: esa fecha ya no es\n                // informacion accionable, y contradecia al badge de la\n                // seccion, que si aplica esta regla.\n                //\n                // Se agrupa por nombre igual que el badge: la antirrabica\n                // y la triple felina tienen ciclos independientes, asi que\n                // cada tipo conserva su propio indicador.\n                const idsVigentes = new Set<string>()\n                const porNombreVac = new Map<string, any>()\n                for (const v of vacunas) {\n                  const k = (v.nombre || '').toLowerCase().trim()\n                  const prev = porNombreVac.get(k)\n                  if (!prev || String(v.fecha_aplicacion || '').localeCompare(String(prev.fecha_aplicacion || '')) > 0) {\n                    porNombreVac.set(k, v)\n                  }\n                }\n                for (const v of porNombreVac.values()) idsVigentes.add(v.id)\n\n                return vacunas.map(v => (\n                <div key={v.id} className=\"bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden\">" },
  { nombre: 'indicador de la tarjeta', viejo: "                        {v.proxima_fecha && (\n                          <div className=\"text-right mr-1\">\n                            <p className=\"text-xs text-[#8A7560]\">Pr\u00f3xima</p>\n                            <p className=\"text-xs font-bold\" style={{ color: diasColor(v.proxima_fecha) }}>{dias(v.proxima_fecha)}</p>\n                            <p className=\"text-xs text-[#8A7560]\">{fmt(v.proxima_fecha)}</p>\n                          </div>\n                        )}", nuevo: "                        {v.proxima_fecha && idsVigentes.has(v.id) && (\n                          <div className=\"text-right mr-1\">\n                            <p className=\"text-xs text-[#8A7560]\">Pr\u00f3xima</p>\n                            <p className=\"text-xs font-bold\" style={{ color: diasColor(v.proxima_fecha) }}>{dias(v.proxima_fecha)}</p>\n                            <p className=\"text-xs text-[#8A7560]\">{fmt(v.proxima_fecha)}</p>\n                          </div>\n                        )}\n                        {v.proxima_fecha && !idsVigentes.has(v.id) && (\n                          <div className=\"text-right mr-1\">\n                            <p className=\"text-[10px] text-[#B5A38F]\">Ya reforzada</p>\n                          </div>\n                        )}" },
  { nombre: 'cierre del listado', viejo: "                    {v.nota && <p className=\"text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2\">\ud83d\udcdd {v.nota}</p>}\n                  </div>\n                </div>\n              ))}", nuevo: "                    {v.nota && <p className=\"text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2\">\ud83d\udcdd {v.nota}</p>}\n                  </div>\n                </div>\n                ))\n              })()}" },
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

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('idsVigentes')) {
  abortar('las vacunas ya aplican la regla. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

// --- Verificaciones
const ESPERADOS = ['const idsVigentes', 'idsVigentes.has(v.id) &&', 'Ya reforzada'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La fecha de aplicacion tiene que seguir visible en TODAS: el
// historial no se oculta, solo deja de alarmar.
if (!c.includes('Aplicada: {fmt(v.fecha_aplicacion)}')) {
  abortar('se perdio la fecha de aplicacion.');
}
// El menu de editar/eliminar tampoco se toca.
if (!c.includes("setMenuAbierto({ tipo: 'vacuna', id: v.id })")) {
  abortar('se perdio el menu de la vacuna.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('NOTA: la agrupacion es por NOMBRE. "Triple felina" y "Triple');
console.log('felina 2da dosis" se cuentan como vacunas distintas. Si eso da');
console.log('problemas, avisale a Claude.');
console.log('');
console.log('Listo. Una vacuna ya reforzada deja de aparecer vencida.');
