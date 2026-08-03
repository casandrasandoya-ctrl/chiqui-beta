const fs = require('fs');
const path = require('path');

// ============================================================
// generar_355_nombre_obligatorio_bienvenida.js
// ============================================================
// Dos cosas en /bienvenida.
//
// 1. LA CONDICION SE VE
// La validacion del nombre YA existia: los dos botones llaman a
// guardarNombreTutor(), que bloquea si esta vacio. El problema era que
// los botones se veian activos, asi que la persona tocaba y recien ahi
// descubria que faltaba algo. Ahora quedan apagados hasta que escriba
// su nombre, con una linea que lo explica.
//
// 2. EL NOMBRE SE GUARDA EN LOS DOS LUGARES
// guardarNombreTutor() lo guardaba SOLO en la metadata de auth. La
// funcion equivalente del Perfil (guardarNombre) lo guarda ademas en
// perfil_usuario, "para mantener ambos lugares sincronizados" —dice su
// propio comentario— pero /bienvenida se quedo atras.
//
// Consecuencia: alguien que entra por /bienvenida puede quedar con
// nombre en su cuenta pero sin fila util en perfil_usuario. Eso lo
// vuelve invisible o anonimo en el panel de administracion, en la
// vista del veterinario y en co-tutor. Es exactamente el caso que
// aparecio al marcar la comunidad fundadora.
//
// El upsert usa onConflict 'user_id' para no duplicar si la fila ya
// existe.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/bienvenida/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Guardar tambien en perfil_usuario
  // ---------------------------------------------------------
  {
    nombre: 'guardado en los dos lugares',
    viejo: [
      "    setErrorNombre('')",
      "    await supabase.auth.updateUser({ data: { nombre: n } })",
      "    return true",
    ].join('\n'),
    nuevo: [
      "    setErrorNombre('')",
      "    await supabase.auth.updateUser({ data: { nombre: n } })",
      "",
      "    // También en perfil_usuario, igual que hace guardarNombre() en el",
      "    // Perfil. Antes solo se guardaba en la metadata de la cuenta, y",
      "    // quien entraba por acá quedaba sin nombre en la base: invisible",
      "    // o anónimo en el panel, en la vista del veterinario y en",
      "    // co-tutor.",
      "    const { data: { user } } = await supabase.auth.getUser()",
      "    if (user) {",
      "      await supabase.from('perfil_usuario').upsert({",
      "        user_id: user.id,",
      "        nombre: n,",
      "      }, { onConflict: 'user_id' })",
      "    }",
      "",
      "    return true",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Aviso bajo el campo
  // ---------------------------------------------------------
  {
    nombre: 'aviso bajo el campo de nombre',
    viejo: '          {errorNombre && <p className="text-xs text-[#E05252] mt-1.5">{errorNombre}</p>}',
    nuevo: [
      '          {errorNombre && <p className="text-xs text-[#E05252] mt-1.5">{errorNombre}</p>}',
      "          {!errorNombre && !nombreTutor.trim() && (",
      '            <p className="text-xs text-[#8A7560] mt-1.5">Escribe tu nombre para continuar.</p>',
      "          )}",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Los dos botones quedan apagados sin nombre
  // ---------------------------------------------------------
  {
    nombre: 'boton de agregar mascota',
    viejo: [
      "          onClick={async () => { if (await guardarNombreTutor()) router.push('/mascota/nueva') }}",
      '          className="w-full bg-[#FFBD59] rounded-2xl p-5 text-left flex items-center gap-4"',
    ].join('\n'),
    nuevo: [
      "          onClick={async () => { if (await guardarNombreTutor()) router.push('/mascota/nueva') }}",
      "          disabled={!nombreTutor.trim()}",
      '          className="w-full bg-[#FFBD59] rounded-2xl p-5 text-left flex items-center gap-4 disabled:opacity-40"',
    ].join('\n'),
  },
  {
    nombre: 'boton del codigo',
    viejo: [
      "          onClick={async () => { if (await guardarNombreTutor()) setPaso('codigo') }}",
      '          className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-5 text-left flex items-center gap-4"',
    ].join('\n'),
    nuevo: [
      "          onClick={async () => { if (await guardarNombreTutor()) setPaso('codigo') }}",
      "          disabled={!nombreTutor.trim()}",
      '          className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-5 text-left flex items-center gap-4 disabled:opacity-40"',
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

if (contenido.includes("from('perfil_usuario')")) {
  abortar('el archivo ya guarda en perfil_usuario. Parece que este script ya se corrio.');
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
  "from('perfil_usuario').upsert({",
  'Escribe tu nombre para continuar.',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Los DOS botones tienen que quedar condicionados
if (contar(contenido, 'disabled={!nombreTutor.trim()}') !== 2) {
  abortar('los dos botones no quedaron condicionados.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El nombre se pide antes de avanzar y se guarda en los dos lugares.');
