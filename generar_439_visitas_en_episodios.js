const fs = require('fs');
const path = require('path');

// ============================================================
// generar_439_visitas_en_episodios.js
// ============================================================
// Los episodios reconocen si el tutor YA fue al veterinario.
//
// EL CASO
// Chiquito tuvo vomito el 25 y 26 de julio, y Casandra lo llevo al
// veterinario. Hoy el resumen le sigue diciendo "vomito dos dias
// seguidos" como si nada hubiera pasado, cuando ella ya actuo.
//
// AHORA
//   Del 25 al 27 jul — vomito, heces blandas.
//   ✅ Fuiste al veterinario el 28 jul.
//
// Y el episodio pasa de naranjo a verde: dejo de ser algo pendiente.
//
// LAS VISITAS VIENEN DE DOS LUGARES
// La tabla visitas_veterinarias (Prevencion) y los dias marcados
// "fue al vet" en el registro diario. Se miran los dos y se quitan las
// fechas repetidas — es la misma combinacion que ya hace el componente
// de Visitas.
//
// LA VENTANA es desde el primer dia del episodio hasta una semana
// despues del ultimo. Antes no tiene sentido (la visita seria por otra
// cosa) y mucho despues tampoco.
//
// REQUISITOS: scripts 433 y 437 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/analisis/page.tsx';

const PARES = [
  { nombre: 'estado de las visitas', viejo: "  const [signosHistorial, setSignosHistorial] = useState<SignoEvento[]>([])", nuevo: "  const [signosHistorial, setSignosHistorial] = useState<SignoEvento[]>([])\n  // Fechas en que se fue al veterinario, de las dos fuentes.\n  const [visitasVet, setVisitasVet] = useState<string[]>([])" },
  { nombre: 'funcion que las carga', viejo: "  async function cargarSignos(mascotaId: string) {", nuevo: "  // Visitas al veterinario. Vienen de DOS lugares y hay que mirar los\n  // dos: la tabla formal de Prevenci\u00f3n, y los d\u00edas marcados \"fue al\n  // vet\" en el registro diario. Es la misma combinaci\u00f3n que hace el\n  // componente de Visitas.\n  //\n  // Sirven para reconocer que el tutor YA actu\u00f3: si hubo episodios y\n  // despu\u00e9s una consulta, dec\u00edrselo vale m\u00e1s que dejarle la alerta\n  // abierta como si no hubiera hecho nada.\n  async function cargarVisitas(mascotaId: string) {\n    const [{ data: formales }, { data: marcadas }] = await Promise.all([\n      supabase.from('visitas_veterinarias').select('fecha').eq('mascota_id', mascotaId),\n      supabase.from('registros_diarios').select('fecha').eq('mascota_id', mascotaId).eq('fue_al_vet', true),\n    ])\n    const fechas = new Set<string>()\n    for (const v of (formales || [])) if (v.fecha) fechas.add(String(v.fecha).slice(0, 10))\n    for (const r of (marcadas || [])) if (r.fecha) fechas.add(String(r.fecha).slice(0, 10))\n    setVisitasVet(Array.from(fechas).sort())\n  }\n\n  async function cargarSignos(mascotaId: string) {" },
  { nombre: 'llamada a la carga', viejo: "    await cargarSignos(m.id)", nuevo: "    await cargarSignos(m.id)\n    await cargarVisitas(m.id)" },
  { nombre: 'cruce en los episodios', viejo: "      const notas = ep.dias.filter(d => d.nota).map(d => d.nota)\n      const textoNotas = notas.length > 0 ? ` \ud83d\udcac \"${notas[notas.length - 1]}\"` : ''\n\n      insights.push({\n        icon: '\ud83d\udd0d',\n        text: `${titulo} \u2014 ${lista.join(', ')}.${textoNotas}`,\n        tipo: 'warn',\n      })", nuevo: "      const notas = ep.dias.filter(d => d.nota).map(d => d.nota)\n      const textoNotas = notas.length > 0 ? ` \ud83d\udcac \"${notas[notas.length - 1]}\"` : ''\n\n      // \u00bfSe fue al veterinario por esto? Se busca una visita entre el\n      // primer d\u00eda del episodio y hasta una semana despu\u00e9s del \u00faltimo.\n      // Si la hubo, el episodio deja de ser una alerta abierta: el\n      // tutor ya actu\u00f3, y dec\u00edrselo vale m\u00e1s que insistir.\n      const limite = new Date(ultimo + 'T12:00:00')\n      limite.setDate(limite.getDate() + 7)\n      const limiteStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(limite)\n      const visita = visitasVet.find(f => f >= primero && f <= limiteStr)\n      const textoVisita = visita ? ` \u2705 Fuiste al veterinario el ${fmtEp(visita)}.` : ''\n\n      insights.push({\n        icon: '\ud83d\udd0d',\n        text: `${titulo} \u2014 ${lista.join(', ')}.${textoNotas}${textoVisita}`,\n        tipo: visita ? 'good' : 'warn',\n      })" },
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

if (c.includes('visitasVet')) {
  abortar('las visitas ya estan cruzadas. Parece que este script ya se corrio.');
}
if (!c.includes('const diasConSintoma')) {
  abortar('faltan los episodios del script 433. Correlo primero.');
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
const ESPERADOS = ['const [visitasVet', 'async function cargarVisitas', 'Fuiste al veterinario el'];
for (const e of ESPERADOS) {
  if (contar(c, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La carga tiene que llamarse, o el estado queda siempre vacio.
if (!c.includes('await cargarVisitas(m.id)')) {
  abortar('la carga de visitas no se llama.');
}
// Las dos fuentes tienen que consultarse.
for (const t of ["from('visitas_veterinarias')", "eq('fue_al_vet', true)"]) {
  if (!c.includes(t)) {
    abortar('falta la consulta [' + t + ']. Se perderia una de las dos fuentes.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Los episodios reconocen cuando ya fuiste al veterinario.');
