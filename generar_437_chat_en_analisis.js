const fs = require('fs');
const path = require('path');

// ============================================================
// generar_437_chat_en_analisis.js
// ============================================================
// PASO FINAL: el chat aparece en Analisis, debajo del selector de
// mascota.
//
// QUE DATOS RECIBE
//   - Los EPISODIOS del script 433 (los insights con el icono 🔍).
//     Son las mismas frases que ya se ven en "Lo observado este mes",
//     asi que el chat abre contando exactamente lo que paso.
//   - Los registros del periodo, el porcentaje de normalidad y los
//     paseos, que Analisis ya calcula.
//   - Los medicamentos vigentes, que ya viven en medsVigentes.
//
// QUE NO RECIBE, Y POR QUE
// El peso, las vacunas y los examenes viven en Salud, no en esta
// pantalla. En vez de decir "no esta registrado" —que seria mentir,
// porque si lo esta— el chat responde donde encontrarlos.
//
// Traerlos aca significaria agregar consultas a una pantalla que ya
// hace varias. Si mas adelante se quiere, se hace aparte.
//
// REQUISITOS: scripts 433, 435 y 436 desplegados.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = "      {/* Selector de mascota */}\n      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}";
const NUEVO = "      {/* Selector de mascota */}\n      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}\n\n      {/* Chat de Chiqui. Se abre contando los episodios del per\u00edodo y\n          responde con dos fuentes: los datos registrados y los Chiqui\n          Tips, que ya est\u00e1n escritos y verificados.\n          No es una IA, y lo dice al abrirse. */}\n      {mascota && total > 0 && (\n        <ChiquiChat datos={{\n          nombre: mascota.nombre || 'tu mascota',\n          especie: mascota.especie || '',\n          // Los episodios salen de los insights: son las mismas frases\n          // que ya se muestran en \"Lo observado este mes\", sin el \u00edcono.\n          episodios: insights.filter(i => i.icon === '\ud83d\udd0d').map(i => i.text),\n          totalRegistros: total,\n          pctBien,\n          textoPeriodo,\n          paseosMes: esPerro && actividadChiqui && actividadChiqui.promedioDia > 0\n            ? { cantidad: registros.filter(r => r.paseo && r.paseo !== 'no_paseo').length,\n                minutos: Math.round(actividadChiqui.promedioDia * periodo) }\n            : null,\n          // El peso y las vacunas viven en Salud: el chat lo dice en vez\n          // de afirmar que no est\u00e1n registrados.\n          peso: null,\n          medicamentos: (medsVigentes || []).map((m: any) => ({\n            nombre: m.nombre || 'Medicamento',\n            desde: m.fecha_inicio || '',\n          })),\n          proximaVacuna: null,\n          proximoAnti: null,\n          examenes: [],\n        }} />\n      )}";

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico ningun archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// El componente tiene que existir.
if (!fs.existsSync(path.join(process.cwd(), 'components/ChiquiChat.tsx'))) {
  abortar('falta components/ChiquiChat.tsx. Corre primero los scripts 435 y 436.');
}
console.log('  OK  el componente del chat existe');

const destino = path.join(process.cwd(), RUTA);
if (!fs.existsSync(destino)) {
  abortar('no se encontro ' + RUTA + '. Corre el script desde la raiz del proyecto.');
}

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('ChiquiChat')) {
  abortar('el chat ya esta en Analisis. Parece que este script ya se corrio.');
}
// Los episodios del 433: sin ellos el chat abriria vacio.
if (!c.includes('const diasConSintoma')) {
  abortar('faltan los episodios del script 433. Correlo primero.');
}
console.log('  OK  los episodios del 433 estan');

// Las variables que el chat usa tienen que existir con esos nombres.
for (const v of ['medsVigentes', 'actividadChiqui', 'textoPeriodo', 'pctBien', 'esPerro']) {
  if (!c.includes(v)) {
    abortar('no encontre la variable [' + v + '] en Analisis. Avisale a Claude.');
  }
}
console.log('  OK  las variables que el chat necesita existen');

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'punto de insercion -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia del selector y encontre ' + n + '.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Import
const ANCLA = "import SelectorMascota from '@/components/SelectorMascota'";
if (contar(c, ANCLA) !== 1) {
  abortar('no encontre donde poner el import.');
}
c = c.replace(ANCLA, ANCLA + "\nimport ChiquiChat from '@/components/ChiquiChat'");
console.log('  OK  import agregado');

// --- Verificaciones
if (contar(c, '<ChiquiChat datos=') !== 1) {
  abortar('el chat no quedo exactamente una vez.');
}
if (c.indexOf("import ChiquiChat") > c.indexOf('<ChiquiChat datos=')) {
  abortar('el import quedaria despues del uso.');
}
if (contar(c, 'SelectorMascota mascotas={mascotas}') !== 1) {
  abortar('el selector se duplico o desaparecio.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El chat ya se ve en Analisis, bajo el selector de mascota.');
