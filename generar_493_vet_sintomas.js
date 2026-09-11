const fs = require('fs');
const path = require('path');

// ============================================================
// generar_493_vet_sintomas.js
// ============================================================
// DOS BUGS EN LA VISTA DEL VETERINARIO.
//
// 1. SINTOMAS QUE NUNCA APARECIAN
//    La lista de valores no coincidia con lo que guarda el registro:
//
//      guarda 'blandas'         -> la vista no lo buscaba
//      guarda 'con_sangre'      -> buscaba 'diarrea_con_sangre'
//      guarda 'estrenimiento'   -> buscaba 'estreñimiento' CON TILDE
//      guarda 'color_raro'      -> no lo buscaba
//      guarda 'mucosidad'       -> no lo buscaba
//
//    De heces, solo 'diarrea' coincidia. Las heces blandas, el
//    estreñimiento y el color anormal NUNCA aparecieron como motivo de
//    consulta, aunque estuvieran registrados.
//
//    Lo mismo pasaba en apetito ('menos'), agua ('menos', 'mas'),
//    conducta ('esconde') y movilidad ('dificultad'). Y el arenero no
//    estaba considerado: la sangre en la orina de un gato no aparecia.
//
// 2. LA DIETA ESPECIAL NO FILTRABA POR FECHA
//    Mostraba la ultima aunque fuera de hace meses, dentro de un bloque
//    titulado "ultimos 7 dias". Ahora se limita a 14 dias: una dieta
//    blanda suele durar mas de una semana y sigue siendo relevante,
//    pero la de hace dos meses no.
//
// Y SE AGREGA EL DETALLE A CADA CHIP:
//
//    Antes:  Vómito
//    Ahora:  Vómito · bilis, 2 veces
//
// En el mismo espacio, el veterinario sabe si preguntar mas o no.
//
// Los chips visibles pasan de 6 a 10: con los detalles cada uno dice
// mas, y cortar a 6 podia dejar fuera justo el sintoma de la consulta.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA = 'app/vet/page.tsx';

const PARES = [
  { nombre: 'tabla de detalles', viejo: "function detectarMotivosConsulta(registros: any[]): string[] {", nuevo: "// Los detalles que se marcaron dentro de cada senal, en palabras.\nconst DETALLE_VET: Record<string, string> = {\n  espuma: 'espuma', bilis: 'bilis', comida: 'comida', pasto: 'pasto',\n  bola_pelo: 'bola de pelo', sangre_vomito: 'con sangre', otro_vomito: 'otro tipo',\n  '1_vez': '1 vez', '2_veces': '2 veces', '3_mas_veces': '3 o mas veces',\n  hoy_solo: 'solo hoy', varios_dias: 'varios dias', semanas: 'hace semanas',\n  liquidas: 'liquidas', muy_seguido: 'muy seguido',\n  '1_dia': '1 dia sin defecar', '2_dias': '2 dias sin defecar', '3_mas': '3 o mas dias',\n  una: 'salto una comida', dos: 'salto dos comidas', todo: 'no comio en todo el dia',\n  hoy: 'solo hoy', varios: 'varios dias',\n  amarillo: 'amarillas', negro: 'negras', rojo: 'rojas',\n  verde: 'verdes', blanco: 'blancas', gris: 'grises',\n}\n\nfunction detectarMotivosConsulta(registros: any[]): string[] {" },
  { nombre: 'valores reales del registro', viejo: "  const CAMPOS_LABEL: Record<string,Record<string,string>> = {\n    energia: { baja:'Energ\u00eda baja', muy_baja:'Energ\u00eda muy baja' },\n    animo: { triste:'\u00c1nimo deca\u00eddo', ansioso:'Ansiedad', agresivo:'Agresividad' },\n    apetito: { poco:'Poco apetito', nada:'Sin apetito', excesivo:'Apetito excesivo' },\n    agua: { poco:'Poca ingesta de agua', mucho:'Ingesta excesiva de agua', nada:'Sin ingesta de agua' },\n    digestion: { vomito:'V\u00f3mito', diarrea:'Diarrea', constipacion:'Constipaci\u00f3n', gases:'Gases' },\n    heces: { diarrea:'Diarrea', diarrea_con_sangre:'Diarrea con sangre', estre\u00f1imiento:'Estre\u00f1imiento' },\n    pelaje: { caida_excesiva:'Ca\u00edda excesiva de pelo', rasca:'Se rasca', lame_exceso:'Se lame en exceso', opaco:'Pelaje opaco' },\n    conducta: { agresivo:'Cambios de conducta (agresivo)', ansioso:'Ansiedad', escondite:'Se esconde', letargico:'Let\u00e1rgico' },\n    movilidad: { cojera:'Cojera', rigidez:'Rigidez', dolor_aparente:'Dolor aparente', no_salta:'Dificultad para saltar' },\n  }", nuevo: "  // Los valores tienen que coincidir EXACTAMENTE con los que guarda el\n  // registro diario. Antes no coincidian: la vista buscaba\n  // 'diarrea_con_sangre' y 'estre\u00f1imiento' con tilde, cuando el\n  // registro guarda 'con_sangre' y 'estrenimiento'. Resultado: las\n  // heces blandas, el estre\u00f1imiento y el color raro NUNCA aparecian\n  // como motivo de consulta, aunque estuvieran registrados.\n  const CAMPOS_LABEL: Record<string,Record<string,string>> = {\n    energia: { baja:'Energ\u00eda baja', muy_baja:'Energ\u00eda muy baja' },\n    animo: { triste:'\u00c1nimo deca\u00eddo', decaido:'\u00c1nimo deca\u00eddo', ansioso:'Ansiedad', irritable:'Irritabilidad', agresivo:'Agresividad' },\n    apetito: { poco:'Poco apetito', menos:'Comi\u00f3 menos', nada:'Sin apetito', mas:'Apetito aumentado', excesivo:'Apetito excesivo' },\n    agua: { poco:'Poca ingesta de agua', menos:'Tom\u00f3 menos agua', mucho:'Ingesta excesiva de agua', mas:'Tom\u00f3 m\u00e1s agua', nada:'Sin ingesta de agua' },\n    digestion: { vomito:'V\u00f3mito', nauseas:'N\u00e1useas', gases:'Gases', mal_aliento:'Mal aliento' },\n    heces: {\n      blandas:'Heces blandas', diarrea:'Diarrea', con_sangre:'Heces con sangre',\n      estrenimiento:'Estre\u00f1imiento', mucosidad:'Heces con mucosidad',\n      color_raro:'Heces de color anormal', no_hizo:'No defec\u00f3',\n    },\n    arenero: { sangre:'Sangre en la orina', dificultad:'Dificultad al orinar', mucho:'Orina aumentada', poco:'Orina disminuida' },\n    pelaje: { caida_excesiva:'Ca\u00edda excesiva de pelo', caida:'Ca\u00edda de pelo', rasca:'Se rasca', lame_exceso:'Se lame en exceso', opaco:'Pelaje opaco' },\n    conducta: { agresivo:'Cambios de conducta (agresivo)', ansioso:'Ansiedad', esconde:'Se esconde', escondite:'Se esconde', letargico:'Let\u00e1rgico' },\n    movilidad: { cojera:'Cojera', rigidez:'Rigidez', dificultad:'Dificultad al moverse', dolor_aparente:'Dolor aparente', no_salta:'Dificultad para saltar' },\n  }" },
  { nombre: 'detalle en cada chip', viejo: "      if (val && valoresLabel[val]) {\n        const etiqueta = valoresLabel[val]\n        const lista = fechasPorSenal.get(etiqueta) || []\n        if (!lista.includes(r.fecha)) lista.push(r.fecha)\n        fechasPorSenal.set(etiqueta, lista)\n      }", nuevo: "      if (val && valoresLabel[val]) {\n        // Con el detalle: \"V\u00f3mito \u00b7 bilis, 2 veces\" le dice al\n        // veterinario mucho mas que \"Vomito\" a secas, en el mismo\n        // espacio. Es justo lo que decide si pregunta mas o no.\n        const bruto = r[`${campo}_detalle`]\n        const det = bruto\n          ? String(bruto).split(',').map((x: string) => DETALLE_VET[x.trim()] || x.trim().replace(/_/g, ' ')).filter(Boolean).join(', ')\n          : ''\n        const etiqueta = det ? `${valoresLabel[val]} \u00b7 ${det}` : valoresLabel[val]\n        const lista = fechasPorSenal.get(etiqueta) || []\n        if (!lista.includes(r.fecha)) lista.push(r.fecha)\n        fechasPorSenal.set(etiqueta, lista)\n      }" },
  { nombre: 'dieta especial con fecha', viejo: "  const registrosConDieta = registros\n    .filter((r: any) => r.alimentacion_especial)\n    .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))", nuevo: "  // Solo la dieta de los ultimos 14 dias: antes se mostraba la ultima\n  // aunque fuera de hace meses, dentro de un bloque titulado \"ultimos 7\n  // dias\". Se usan 14 y no 7 porque una dieta blanda suele durar mas de\n  // una semana y sigue siendo relevante para la consulta.\n  const hace14 = new Date()\n  hace14.setDate(hace14.getDate() - 14)\n  const limite14 = hace14.toISOString().slice(0, 10)\n  const registrosConDieta = registros\n    .filter((r: any) => r.alimentacion_especial && (r.fecha || '') >= limite14)\n    .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))" },
];

// Este reemplazo es OPCIONAL: si el archivo ya cambio esa parte, se
// salta sin abortar. No es esencial para el arreglo.
const OPCIONALES = [
  { nombre: 'mas chips visibles', viejo: "  return Array.from(senales).slice(0, 6)", nuevo: "  // 10 y no 6: con los detalles cada chip dice mas, y cortar a 6 podia\n  // dejar fuera justo el sintoma por el que vinieron.\n  return Array.from(senales).slice(0, 10)" },
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
if (!fs.existsSync(destino)) abortar('no se encontro ' + RUTA + '.');

let c = fs.readFileSync(destino, 'utf8');

if (c.includes('DETALLE_VET')) {
  abortar('la vista del vet ya esta corregida. Parece que este script ya se corrio.');
}

for (const p of PARES) {
  const n = contar(c, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  c = c.split(p.viejo).join(p.nuevo);
}

for (const p of OPCIONALES) {
  if (contar(c, p.viejo) === 1) {
    c = c.split(p.viejo).join(p.nuevo);
    console.log('  OK  ' + p.nombre);
  } else {
    console.log('  --  ' + p.nombre + ': el archivo ya lo tiene distinto, se salta');
  }
}

// --- Verificaciones
for (const v of ["blandas:'Heces blandas'", "con_sangre:'Heces con sangre'", "estrenimiento:'Estreñimiento'"]) {
  if (!c.includes(v)) abortar('falta el valor [' + v + '] tras el reemplazo.');
}
// El valor con tilde no puede quedar: nunca calzaria.
if (c.includes("estreñimiento:'Estreñimiento'")) {
  abortar("quedo 'estreñimiento' con tilde: ese valor nunca calza con lo que guarda el registro.");
}
console.log('  OK  los valores coinciden con el registro diario');

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Abre tu link de vet: las heces blandas deberian aparecer ahora,');
console.log('y los sintomas con su detalle.');
