const fs = require('fs');
const path = require('path');

// ============================================================
// generar_433_episodios_concretos.js
// ============================================================
// EL PROBLEMA
// "Lo observado este mes" decia cosas como:
//
//   "Se detectaron 8 dias con sintomas notables"
//   "Se registraron 2 episodios de vomito"
//
// Un tutor que lee eso no sabe QUE paso, CUANDO, ni que contarle al
// veterinario. Casandra lo dijo directo: "es muy general, que hago con
// esa informacion".
//
// LO QUE PASABA DE VERDAD en los datos de Chiquito ese mes:
//   - 25 y 26 de julio: vomito dos dias seguidos
//   - 27 de julio: heces blandas
//   - 5 de julio: heces con sangre
// Los tres primeros son UN episodio de tres dias. El resumen los
// enterraba junto a "gases" en el mismo saco de "8 dias".
//
// LO QUE HACE AHORA
//   - Agrupa los dias con sintomas en EPISODIOS: dias seguidos o
//     separados por uno. Un malestar de tres dias es distinto a tres
//     malestares sueltos.
//   - Nombra los sintomas con palabras naturales ("vomito", "heces con
//     sangre") en vez de valores tecnicos.
//   - Muestra LA NOTA que escribio la persona junto al sintoma. Eso es
//     lo que convierte "heces con sangre" —que asusta— en "heces con
//     sangre, y anote que habia comido un hueso".
//
// LO QUE NO HACE
// No interpreta clinicamente, no gradua urgencia y no recomienda. Solo
// ordena los hechos que la propia persona registro. La graduacion
// ("esto amerita consulta hoy") necesita criterio veterinario, y eso
// queda para cuando el hermano de Casandra defina los umbrales.
//
// SE QUITAN tres insights genericos que quedaban redundantes: el de
// "dias con sintomas notables", el de la moda de energia y el conteo
// suelto de vomitos. Los episodios dicen lo mismo y mejor.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const VIEJO = "    if (naranjos > 0 || rojos > 0) insights.push({ icon: '\ud83d\udc41', text: `Se detectaron ${naranjos + rojos} d\u00edas con s\u00edntomas notables en ${textoPeriodo}. Vale la pena observar.`, tipo: 'warn' })\n    const modaEnerg = modaCampo('energia')\n    if (modaEnerg) insights.push({ icon: '\u26a1', text: `La se\u00f1al de energ\u00eda m\u00e1s frecuente fue \"${modaEnerg.val.replace(/_/g,' ')}\" (${modaEnerg.count} de ${total} d\u00edas).`, tipo: 'info' })\n    const vomitos = contarValor('digestion', 'vomito')\n    if (vomitos > 0) insights.push({ icon: '\ud83e\udd2e', text: `Se registraron ${vomitos} episodios de v\u00f3mito. Si se repiten, ser\u00eda bueno comentarlo con el veterinario.`, tipo: 'warn' })\n    const rascado = contarValor('pelaje', 'rasca')\n    if (rascado >= 3) insights.push({ icon: '\ud83d\udc3e', text: `Not\u00e9 ${rascado} d\u00edas con rascado registrado. Quiz\u00e1s ser\u00eda bueno comentarlo en la pr\u00f3xima consulta veterinaria.`, tipo: 'warn' })";
const NUEVO = "    // --- EPISODIOS CONCRETOS ---\n    // Antes esto dec\u00eda \"Se detectaron 8 d\u00edas con s\u00edntomas notables\".\n    // Un tutor que lee eso no sabe qu\u00e9 pas\u00f3, cu\u00e1ndo, ni qu\u00e9 contarle al\n    // veterinario. Ahora se nombran los hechos con sus fechas.\n    //\n    // Los d\u00edas con s\u00edntomas se agrupan en EPISODIOS: d\u00edas seguidos o\n    // separados por uno, porque un malestar de tres d\u00edas es una cosa\n    // distinta a tres malestares sueltos en el mes.\n    //\n    // Y se muestra la NOTA que escribi\u00f3 la persona junto al s\u00edntoma.\n    // Eso es lo que convierte \"heces con sangre\" \u2014que asusta\u2014 en\n    // \"heces con sangre, y anot\u00e9 que hab\u00eda comido un hueso\".\n    //\n    // No hay interpretaci\u00f3n cl\u00ednica: solo se ordenan los hechos que la\n    // propia persona registr\u00f3.\n    const NORMALES: Record<string, string[]> = {\n      digestion: ['normal'], heces: ['normal'], apetito: ['normal'], agua: ['normal'],\n      energia: ['normal', 'alta', 'muy_alta'], animo: ['normal', 'feliz', 'muy_feliz'],\n      movilidad: ['normal'], pelaje: ['brillante', 'normal'], conducta: ['sociable', 'normal'],\n      arenero: ['normal'],\n    }\n    // Etiqueta natural + peso. El peso solo ORDENA dentro del episodio\n    // (lo m\u00e1s relevante primero), no grad\u00faa urgencia ni recomienda nada.\n    const ETQ: Record<string, [string, number]> = {\n      'digestion:vomito': ['vomit\u00f3', 10], 'digestion:diarrea': ['diarrea', 10],\n      'digestion:nauseas': ['n\u00e1useas', 6], 'digestion:gases': ['gases', 2],\n      'digestion:mal_aliento': ['mal aliento', 4],\n      'heces:con_sangre': ['heces con sangre', 12], 'heces:blandas': ['heces blandas', 7],\n      'heces:duras': ['heces duras', 5], 'heces:no_hizo': ['no hizo heces', 6],\n      'heces:diarrea': ['diarrea', 10],\n      'apetito:nada': ['no comi\u00f3', 11], 'apetito:menos': ['comi\u00f3 menos', 7],\n      'apetito:mas': ['comi\u00f3 m\u00e1s', 2],\n      'agua:menos': ['tom\u00f3 menos agua', 6], 'agua:mas': ['tom\u00f3 m\u00e1s agua', 4],\n      'agua:nada': ['no tom\u00f3 agua', 10],\n      'energia:muy_baja': ['energ\u00eda muy baja', 10], 'energia:baja': ['energ\u00eda baja', 7],\n      'animo:decaido': ['deca\u00eddo', 8], 'animo:ansioso': ['ansioso', 5],\n      'animo:irritable': ['irritable', 6],\n      'movilidad:cojera': ['cojera', 9], 'movilidad:rigidez': ['rigidez', 6],\n      'movilidad:dificultad': ['dificultad al moverse', 8],\n      'pelaje:rasca': ['se rasc\u00f3', 4], 'pelaje:lame_exceso': ['se lami\u00f3 mucho', 5],\n      'pelaje:caida': ['ca\u00edda de pelo', 4],\n      'conducta:esconde': ['se escondi\u00f3', 7], 'conducta:agresivo': ['agresivo', 6],\n      'arenero:sangre': ['sangre en la orina', 12], 'arenero:dificultad': ['dificultad al orinar', 11],\n    }\n\n    const diasConSintoma = registros\n      .filter(r => r.fecha)\n      .map(r => {\n        const hallazgos: { etq: string; peso: number }[] = []\n        for (const [campo, normales] of Object.entries(NORMALES)) {\n          const v = r[campo]\n          if (v && !normales.includes(v)) {\n            const par = ETQ[`${campo}:${v}`]\n            hallazgos.push(par\n              ? { etq: par[0], peso: par[1] }\n              : { etq: String(v).replace(/_/g, ' '), peso: 3 })\n          }\n        }\n        return { fecha: r.fecha as string, hallazgos, nota: (r.nota || '').trim() }\n      })\n      .filter(d => d.hallazgos.length > 0)\n      .sort((a, b) => a.fecha.localeCompare(b.fecha))\n\n    // Agrupar en episodios. Mediod\u00eda para que los cambios de horario de\n    // verano no corran el conteo de d\u00edas.\n    const episodios: { dias: typeof diasConSintoma }[] = []\n    for (const d of diasConSintoma) {\n      const ultimo = episodios[episodios.length - 1]\n      const finAnterior = ultimo?.dias[ultimo.dias.length - 1]?.fecha\n      const separacion = finAnterior\n        ? Math.round((new Date(d.fecha + 'T12:00:00').getTime() - new Date(finAnterior + 'T12:00:00').getTime()) / 86400000)\n        : 999\n      if (ultimo && separacion <= 2) ultimo.dias.push(d)\n      else episodios.push({ dias: [d] })\n    }\n\n    const MES_EP = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']\n    const fmtEp = (f: string) => {\n      const d = new Date(f + 'T12:00:00')\n      return `${d.getDate()} ${MES_EP[d.getMonth()]}`\n    }\n\n\n    // QUE SE MUESTRA Y QUE NO\n    // Un vomito suelto o un dia de rascado son hechos aislados: mostrarlos\n    // como hallazgo convierte el resumen en ruido y hace que se deje de\n    // leer. Un episodio entra si cumple alguna de estas:\n    //   - dura 2 dias o mas (hay continuidad)\n    //   - trae algo de peso alto (sangre, no comio, cojera)\n    //   - el mismo sintoma se repite 3 veces o mas en el periodo\n    const PESO_MINIMO = 7\n    const repeticiones = new Map<string, number>()\n    for (const d of diasConSintoma) {\n      for (const h of d.hallazgos) {\n        repeticiones.set(h.etq, (repeticiones.get(h.etq) || 0) + 1)\n      }\n    }\n\n    const episodiosRelevantes = episodios.filter(ep => {\n      if (ep.dias.length >= 2) return true\n      const hs = ep.dias[0].hallazgos\n      if (hs.some(h => h.peso >= PESO_MINIMO)) return true\n      return hs.some(h => (repeticiones.get(h.etq) || 0) >= 3)\n    })\n\n    // Los m\u00e1s recientes primero: lo de ayer importa m\u00e1s que lo del mes\n    // pasado.\n    for (const ep of episodiosRelevantes.slice().reverse()) {\n      const primero = ep.dias[0].fecha\n      const ultimo = ep.dias[ep.dias.length - 1].fecha\n      const titulo = primero === ultimo\n        ? `El ${fmtEp(primero)}`\n        : `Del ${fmtEp(primero)} al ${fmtEp(ultimo)}`\n\n      // Un mismo s\u00edntoma en varios d\u00edas se nombra una vez.\n      const pesos = new Map<string, number>()\n      for (const d of ep.dias) {\n        for (const h of d.hallazgos) {\n          pesos.set(h.etq, Math.max(pesos.get(h.etq) || 0, h.peso))\n        }\n      }\n      const lista = Array.from(pesos.entries()).sort((a, b) => b[1] - a[1]).map(([e]) => e)\n\n      const notas = ep.dias.filter(d => d.nota).map(d => d.nota)\n      const textoNotas = notas.length > 0 ? ` \ud83d\udcac \"${notas[notas.length - 1]}\"` : ''\n\n      insights.push({\n        icon: '\ud83d\udd0d',\n        text: `${titulo} \u2014 ${lista.join(', ')}.${textoNotas}`,\n        tipo: 'warn',\n      })\n    }";

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

if (c.includes('const diasConSintoma')) {
  abortar('los episodios ya estan. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'insights genericos -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '. Pasale a Claude el bloque de insights.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
const ESPERADOS = ['const diasConSintoma', 'const episodiosRelevantes', 'heces con sangre'];
for (const e of ESPERADOS) {
  if (contar(c, e) < 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Los insights que SI se conservan.
for (const s of ['signosUltimos30 > 0', 'pctBien >= 80']) {
  if (!c.includes(s)) {
    abortar('se perdio el insight de [' + s + '].');
  }
}
// El array de insights tiene que seguir siendo el mismo que se dibuja.
if (!c.includes('insights.map((ins, i)')) {
  abortar('se perdio el dibujo de los insights.');
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);

// Aviso, no error: si quedaron funciones sin uso.
const sinUso = [];
if (!c.includes('modaCampo(')) sinUso.push('modaCampo');
if (!c.includes('contarValor(')) sinUso.push('contarValor');
if (sinUso.length > 0) {
  console.log('');
  console.log('AVISO: estas funciones pueden haber quedado sin uso: ' + sinUso.join(', '));
  console.log('No rompen el build. Si Vercel las marca, avisale a Claude.');
}

console.log('');
console.log('Listo. El resumen ya dice que paso y cuando, no cuantos dias.');
