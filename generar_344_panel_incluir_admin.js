const fs = require('fs');
const path = require('path');

// ============================================================
// generar_344_panel_incluir_admin.js
// ============================================================
// La cuenta de Casandra estaba excluida de TODAS las metricas del
// panel. La razon original era buena (tiene mascotas de prueba y llego
// a acumular 52 links de veterinario), pero el efecto era que
// desaparecia de su propia app: Chiquito es un perro real y ella
// registra a diario como cualquier otra usuaria.
//
// Ahora se incluye, y se marca con un distintivo en la lista para
// saber leer el numero. Es mejor verla y saber quien es, que no verla.
//
// El sesgo restante son las mascotas de prueba, que suman al conteo de
// perros y gatos. Es 1 cuenta entre 25: se nota poco, y archivar las
// mascotas de prueba lo resuelve del todo cuando ella quiera.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const PARES = [
  {
    nombre: 'incluir la cuenta propia',
    viejo: [
      "  // La cuenta propia se excluye de TODO: es la de pruebas.",
      "  const TODOS: any[] = (usuarios || []).filter((u: any) => u.id !== adminId)",
    ].join('\n'),
    nuevo: [
      "  // La cuenta propia SI cuenta: es una usuaria real, con una mascota",
      "  // real y registro diario. Antes estaba excluida por sus mascotas de",
      "  // prueba, pero eso la borraba de su propia app. Se incluye y se",
      "  // marca en la lista para saber leer el numero.",
      "  const TODOS: any[] = usuarios || []",
    ].join('\n'),
  },
  {
    nombre: 'marca de administradora en la lista',
    viejo: [
      "    return {",
      "      nombre: u.nombre || '(sin nombre)',",
      "      email: u.email || '',",
    ].join('\n'),
    nuevo: [
      "    return {",
      "      nombre: u.nombre || '(sin nombre)',",
      "      esAdmin: u.id === adminId,",
      "      email: u.email || '',",
    ].join('\n'),
  },
  {
    nombre: 'distintivo junto al nombre',
    viejo: '                  <p className="text-xs font-semibold text-[#3D2B1F] truncate">{f.nombre}</p>',
    nuevo: [
      '                  <p className="text-xs font-semibold text-[#3D2B1F] truncate">',
      "                    {f.nombre}",
      "                    {f.esAdmin && (",
      '                      <span className="ml-1.5 text-[9px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-1.5 py-0.5 align-middle">',
      "                        tú",
      "                      </span>",
      "                    )}",
      "                  </p>",
    ].join('\n'),
  },
  {
    nombre: 'aviso del encabezado',
    viejo: "          Actualizado al {fmtFecha(hoy)} · Sin tu cuenta de pruebas",
    nuevo: "          Actualizado al {fmtFecha(hoy)} · Incluye tu cuenta",
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
  abortar('no se encontro ' + RUTA + '. Corre primero los scripts 337 a 343.');
}

let contenido = fs.readFileSync(destino, 'utf8');

if (contenido.includes('esAdmin')) {
  abortar('el panel ya incluye la cuenta propia. Parece que este script ya se corrio.');
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
  'const TODOS: any[] = usuarios || []',
  'esAdmin: u.id === adminId',
  '{f.esAdmin && (',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// adminId sigue usandose para la seguridad: si desapareciera, el panel
// quedaria abierto a cualquiera con sesion.
if (!contenido.includes('user.id !== adminId')) {
  abortar('se perdio la comprobacion de seguridad. No se escribio nada.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Tu cuenta ya aparece en el panel, marcada como tuya.');
