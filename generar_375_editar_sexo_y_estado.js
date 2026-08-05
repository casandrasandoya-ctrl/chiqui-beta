const fs = require('fs');
const path = require('path');

// ============================================================
// generar_375_editar_sexo_y_estado.js
// ============================================================
// FEEDBACK DE UNA USUARIA
// No se puede corregir el sexo de una mascota si se ingreso mal, ni
// cambiar de fertil a esterilizado cuando la operan despues.
//
// Los dos campos se piden al crear el perfil y despues quedan
// congelados para siempre. Quien se equivoco al empezar no tiene
// salida, y quien esteriliza a su mascota meses despues tampoco.
//
// COMO SE AGREGA SIN ROMPER NADA
// El formulario ya sabe distinguir tipos de campo: tiene una rama para
// las fechas (que usa FechaSelector en vez de un input). Se le agregan
// DOS RAMAS MAS —una para el sexo y otra para la esterilizacion— en vez
// de meter controles sueltos fuera de la lista. Asi cada campo sigue
// viviendo en un solo lugar.
//
// Los botones son los mismos que ya usa la pantalla de crear mascota,
// para que se sienta conocido.
//
// TAMBIEN se agregan los dos campos a la vista de solo lectura, donde
// hoy ni siquiera aparecen: no se ve el sexo por ninguna parte.
//
// Y SE UNIFICA LA PALABRA: el perfil decia "Entero/a" y el dashboard
// dice "Fertil". Dos nombres para lo mismo confunden. Queda "Fertil",
// que fue la decision tomada al hacer la tarjeta nueva.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/perfil/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Los dos campos en la vista de solo lectura
  // ---------------------------------------------------------
  {
    nombre: 'sexo y estado en los datos visibles',
    viejo: [
      "    ['Especie', mascota?.especie || '-'],",
      "    ['Raza', mascota?.raza || '-'],",
    ].join('\n'),
    nuevo: [
      "    ['Especie', mascota?.especie || '-'],",
      "    ['Sexo', mascota?.sexo || '-'],",
      "    // Se distingue el dato vacío del 'no esterilizado': afirmar",
      "    // 'Fértil' sobre algo que nadie ingresó sería inventarlo.",
      "    ['Estado', mascota?.castrado === true ? 'Esterilizado/a' : mascota?.castrado === false ? 'Fértil' : '-'],",
      "    ['Raza', mascota?.raza || '-'],",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Los dos campos en la lista editable
  // ---------------------------------------------------------
  {
    nombre: 'sexo y estado en la lista editable',
    viejo: "              ['Nombre', 'nombre', 'text', 'ej. Luna'],",
    nuevo: [
      "              ['Nombre', 'nombre', 'text', 'ej. Luna'],",
      "              // Tipos propios: se manejan con botones, no con un",
      "              // input de texto. Ver las ramas de abajo.",
      "              ['Sexo', 'sexo', 'sexo', ''],",
      "              ['Estado reproductivo', 'castrado', 'castrado', ''],",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Las dos ramas nuevas del formulario
  // ---------------------------------------------------------
  {
    nombre: 'controles de sexo y esterilizacion',
    viejo: [
      "                {type === 'date' ? (",
      "                  <FechaSelector",
      "                    value={String((form as Record<string, unknown>)[key] || '')}",
      "                    onChange={v => u(key, v)}",
      "                  />",
      "                ) : (",
    ].join('\n'),
    nuevo: [
      "                {type === 'date' ? (",
      "                  <FechaSelector",
      "                    value={String((form as Record<string, unknown>)[key] || '')}",
      "                    onChange={v => u(key, v)}",
      "                  />",
      "                ) : type === 'sexo' ? (",
      "                  /* Mismos botones que la pantalla de crear mascota,",
      "                     para que se sienta conocido. */",
      '                  <div className="flex gap-2">',
      "                    {['Macho', 'Hembra'].map(s => (",
      "                      <button",
      '                        key={s} type="button" onClick={() => u(\'sexo\', s)}',
      "                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${(form as Record<string, unknown>).sexo === s ? 'bg-[#FFBD59]/15 border-[#FFBD59] text-[#FFBD59]' : 'bg-[#FFFCF8] border-[#EEE2D4] text-[#8A7560]'}`}",
      "                      >",
      "                        {s === 'Macho' ? '🐾 Macho' : '🌸 Hembra'}",
      "                      </button>",
      "                    ))}",
      "                  </div>",
      "                ) : type === 'castrado' ? (",
      '                  <div className="flex gap-2">',
      "                    {[['Esterilizado/a', true], ['Fértil', false]].map(([etiqueta, valor]) => (",
      "                      <button",
      '                        key={String(etiqueta)} type="button" onClick={() => u(\'castrado\', valor as boolean)}',
      "                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${(form as Record<string, unknown>).castrado === valor ? 'bg-[#FFBD59]/15 border-[#FFBD59] text-[#FFBD59]' : 'bg-[#FFFCF8] border-[#EEE2D4] text-[#8A7560]'}`}",
      "                      >",
      "                        {etiqueta as string}",
      "                      </button>",
      "                    ))}",
      "                  </div>",
      "                ) : (",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Una sola palabra en toda la app
  // ---------------------------------------------------------
  {
    nombre: 'unificar la palabra con el dashboard',
    viejo: "'Esterilizado/a' : 'Entero/a'}</div>",
    nuevo: "'Esterilizado/a' : 'Fértil'}</div>",
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

if (contenido.includes("['Sexo', 'sexo', 'sexo', '']")) {
  abortar('el perfil ya permite editar el sexo. Parece que este script ya se corrio.');
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
  "type === 'sexo' ?",
  "type === 'castrado' ?",
  "['Sexo', mascota?.sexo || '-'],",
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// La palabra vieja no puede sobrevivir en ningun lado del archivo.
if (contenido.includes("'Entero/a'")) {
  abortar('quedo la palabra vieja en alguna parte.');
}
// Los campos que ya existian tienen que seguir en la lista.
for (const c of ["'nombre', 'text'", "'raza', 'text'", "'fecha_nacimiento', 'date'"]) {
  if (!contenido.includes(c)) {
    abortar('se perdio el campo [' + c + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. El sexo y la esterilizacion ya se pueden corregir.');
