const fs = require('fs');
const path = require('path');

// ============================================================
// generar_321_nombre_visible_perfil.js
// ============================================================
// Dos cambios en app/perfil/page.tsx:
//
//  1) El NOMBRE de la mascota ahora se muestra en la vista de solo
//     lectura de "Datos del perfil". El campo YA era editable (esta
//     en la lista de campos y guardar() ya lo envia a Supabase), pero
//     no aparecia en la grilla de datos, asi que nadie se daba cuenta
//     de que se podia corregir.
//
//  2) Al guardar, la lista completa de mascotas tambien se refresca.
//     Antes solo se actualizaba la mascota activa, asi que el selector
//     de arriba seguia mostrando el nombre viejo hasta recargar.
//
// Este script NO reescribe el archivo completo: hace reemplazos
// exactos sobre el archivo que ya esta en el proyecto. Si no encuentra
// algun texto tal cual lo espera, ABORTA sin escribir nada.
// ============================================================

const RUTA = 'app/perfil/page.tsx';

const PARES = [
  {
    nombre: 'nombre visible en Datos del perfil',
    viejo: [
      "  const datos: [string, string][] = [",
      "    ['Especie', mascota?.especie || '-'],",
    ].join('\n'),
    nuevo: [
      "  const datos: [string, string][] = [",
      "    // El nombre va primero: es el dato mas visible y el que mas",
      "    // se corrige (una letra mal al crear el perfil). Mostrarlo",
      "    // aqui deja claro que se puede editar con el boton Editar.",
      "    ['Nombre', mascota?.nombre || '-'],",
      "    ['Especie', mascota?.especie || '-'],",
    ].join('\n'),
  },
  {
    nombre: 'refrescar lista de mascotas al guardar',
    viejo: "      setMascota({ ...mascota, ...form } as Mascota)",
    nuevo: [
      "      setMascota({ ...mascota, ...form } as Mascota)",
      "      // El nombre (y el resto de los datos) tambien se refresca en",
      "      // la lista de mascotas, para que el selector de arriba no",
      "      // siga mostrando el nombre viejo hasta recargar la pagina.",
      "      setMascotas(prev => prev.map(ms => (",
      "        ms.id === mascota.id ? ({ ...ms, ...form } as Mascota) : ms",
      "      )))",
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

// --- Verificacion previa: cada texto debe aparecer EXACTAMENTE 1 vez
for (const p of PARES) {
  const n = contar(contenido, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
}

// --- Verificacion extra: setMascotas debe existir en el archivo
if (!contenido.includes('setMascotas')) {
  abortar('el archivo no define setMascotas. No puedo refrescar la lista.');
}

// --- Reemplazo (solo si TODAS las verificaciones pasaron)
for (const p of PARES) {
  contenido = contenido.split(p.viejo).join(p.nuevo);
}

// --- Verificacion final
if (!contenido.includes("['Nombre', mascota?.nombre || '-'],")) {
  abortar('el nombre no quedo agregado a la grilla de datos.');
}
if (contar(contenido, 'setMascotas(prev => prev.map(ms => (') !== 1) {
  abortar('el refresco de la lista de mascotas no quedo aplicado.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El nombre de la mascota ahora se ve y se edita desde Datos del perfil.');
