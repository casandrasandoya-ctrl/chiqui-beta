const fs = require('fs');
const path = require('path');

// ============================================================
// generar_390_alerta_en_la_grilla.js
// ============================================================
// Los signos de alerta se mudan a la fila de salud, junto a Veterinario
// y Prevencion, como pidio el diseño.
//
// SE VE DISTINTO A PROPOSITO
// El chip va en ROJO, no en canela como los cuidados. No es un cuidado
// mas: es lo unico de esta pantalla que puede significar una urgencia.
// Y si tiene algo marcado, conserva el borde rojo aunque este cerrado —
// para que no se pierda entre las otras quince casillas.
//
// EL CONTENIDO NO SE TOCA
// La grilla de signos, el campo de "describe brevemente" y el aviso de
// que el dia quedara marcado en rojo se mueven tal cual estaban.
//
// COMO SE QUITA EL BLOQUE VIEJO
// Se corta desde el contenedor de la seccion hasta el comentario de
// CUIDADOS. Antes de escribir, el script comprueba que lo que va a
// quitar contenga las tres marcas de los signos y que NO alcance a
// Momentos, Hitos ni a la grilla. Si algo de eso falla, aborta.
//
// REQUISITOS: scripts 387, 388 y 389 desplegados.
//
// Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const CHIP_ALERTA = [
  "          // --- Casilla de SIGNOS DE ALERTA ---",
  "          // En rojo, no en canela: no es un cuidado mas. Y si hay algo",
  "          // marcado conserva el borde aunque este cerrada, para que no",
  "          // se pierda entre las otras casillas.",
  "          if (item.tipo === 'alerta') {",
  "            const hayAlerta = signos.size > 0",
  "            return (",
  '              <div key="alerta" className={signosAbierto ? \'w-full\' : \'w-[calc(33.333%-0.25rem)]\'}>',
  "                <button",
  '                  type="button"',
  "                  onClick={() => setSignosAbierto(v => !v)}",
  '                  className="w-full flex items-center gap-1.5 px-1.5 py-2 rounded-xl text-left"',
  "                  style={{",
  "                    border: (signosAbierto || hayAlerta) ? '2px solid #E05252' : '2px solid transparent',",
  "                    background: (signosAbierto || hayAlerta) ? '#FFFCF8' : 'transparent',",
  "                  }}",
  "                >",
  '                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{background:\'#E0525220\'}}>🚨</div>',
  '                  <div className="flex-1 min-w-0">',
  '                    <p className="text-[12px] font-semibold leading-tight truncate text-[#E05252]">Alerta</p>',
  "                    {hayAlerta && (",
  '                      <p className="text-[10px] mt-0.5 text-[#E05252]">✓ {signos.size}</p>',
  "                    )}",
  "                  </div>",
  '                  <span className="text-[#8C572F] text-[10px] font-bold flex-shrink-0">{signosAbierto ? \'▲\' : \'▼\'}</span>',
  "                </button>",
  "                {signosAbierto && (",
  '                  <div className="pb-3 pt-1">',
  '                    <div className="grid grid-cols-2 gap-2">',
  "                      {SIGNOS_ALERTA.map(s => {",
  "                        const activo = signos.has(s.value)",
  "                        return (",
  "                          <button",
  "                            key={s.value}",
  "                            onClick={() => toggleSigno(s.value)}",
  '                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 border text-left"',
  "                            style={activo",
  "                              ? { background: '#E0525215', borderColor: '#E05252', borderWidth: '1.5px' }",
  "                              : { background: '#FFFCF8', borderColor: '#EEE2D4', borderWidth: '1.5px' }}",
  "                          >",
  '                            <span className="text-base flex-shrink-0">{s.emoji}</span>',
  '                            <span className="text-xs font-medium text-[#3D2B1F]">{s.label}</span>',
  "                          </button>",
  "                        )",
  "                      })}",
  "                    </div>",
  "                    {signos.has('otro_signo') && (",
  "                      <input",
  '                        className="w-full mt-2 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"',
  '                        placeholder="Describe brevemente qué pasó"',
  "                        value={signoOtroTexto}",
  "                        onChange={e => setSignoOtroTexto(e.target.value)}",
  "                        maxLength={120}",
  "                      />",
  "                    )}",
  "                    {hayAlerta && (",
  '                      <p className="text-[10px] text-[#E05252] mt-2 leading-relaxed">',
  "                        Este día quedará marcado en rojo en el calendario y tu veterinario lo verá destacado.",
  "                      </p>",
  "                    )}",
  "                  </div>",
  "                )}",
  "              </div>",
  "            )",
  "          }",
  "",
  "          // --- Casilla de CUIDADO ---",
  "          if (item.tipo === 'grupo') {",
].join('\n');

const PARES = [
  {
    nombre: 'alerta en la fila de salud',
    viejo: "    { titulo: '¿Hubo algo de salud hoy?', items: [buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención')] },",
    nuevo: "    { titulo: '¿Hubo algo de salud hoy?', items: [{ esAlerta: true }, buscarGrupo('Veterinario y salud'), buscarGrupo('Prevención')] },",
  },
  {
    nombre: 'reconocer la casilla de alerta',
    viejo: [
      "    for (const it of items) {",
      "      // Un cuidado se distingue de una observación por tener 'items'.",
      "      if (it.items) { CASILLAS.push({ tipo: 'grupo', grupo: it }); yaEnGrilla.add(it.titulo) }",
      "      else CASILLAS.push({ tipo: 'cat', cat: it })",
      "    }",
    ].join('\n'),
    nuevo: [
      "    for (const it of items) {",
      "      // Tres tipos: la alerta va marcada, un cuidado tiene 'items',",
      "      // y lo demás es una observación.",
      "      if (it.esAlerta) CASILLAS.push({ tipo: 'alerta' })",
      "      else if (it.items) { CASILLAS.push({ tipo: 'grupo', grupo: it }); yaEnGrilla.add(it.titulo) }",
      "      else CASILLAS.push({ tipo: 'cat', cat: it })",
      "    }",
    ].join('\n'),
  },
  {
    nombre: 'dibujo de la casilla de alerta',
    viejo: [
      "          // --- Casilla de CUIDADO ---",
      "          if (item.tipo === 'grupo') {",
    ].join('\n'),
    nuevo: CHIP_ALERTA,
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

if (contenido.includes("item.tipo === 'alerta'")) {
  abortar('la alerta ya esta en la grilla. Parece que este script ya se corrio.');
}
if (!contenido.includes('¿Hubo algo de salud hoy?')) {
  abortar('faltan los titulos como pregunta. Corre primero el script 389.');
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

// --- Quitar el bloque viejo de signos
const idxTexto = contenido.indexOf('¿Ocurrió algo grave hoy?');
if (idxTexto === -1) {
  abortar('no encontre la seccion vieja de signos.');
}
const ini = contenido.lastIndexOf('<div className="mx-4', idxTexto);
const fin = contenido.indexOf('{/* CUIDADOS', idxTexto);
if (ini === -1 || fin === -1 || fin < ini) {
  abortar('no pude delimitar la seccion vieja de signos.');
}
// El corte parte desde el inicio de la linea del contenedor.
const iniLinea = contenido.lastIndexOf('\n', ini) + 1;
const bloqueViejo = contenido.slice(iniLinea, fin);

for (const s of ['SIGNOS_ALERTA', 'setSignosAbierto', '¿Ocurrió algo grave hoy?']) {
  if (!bloqueViejo.includes(s)) {
    abortar('el bloque a quitar no contiene [' + s + ']. No se escribio nada.');
  }
}
for (const s of ['MOMENTOS_CATALOGO', 'hitosLogrados', 'CASILLAS', 'getGruposCuidados']) {
  if (bloqueViejo.includes(s)) {
    abortar('el corte alcanzaria a [' + s + ']. No se escribio nada.');
  }
}
if (bloqueViejo.length > 4000) {
  abortar('el bloque a quitar es demasiado largo (' + bloqueViejo.length + '). No se escribio nada.');
}
console.log('  OK  bloque viejo delimitado (' + bloqueViejo.split('\n').length + ' lineas)');

contenido = contenido.slice(0, iniLinea)
  + '      {/* Los signos de alerta ahora viven en la grilla de arriba,\n          en la fila de salud. */}\n'
  + contenido.slice(fin);

// --- Verificaciones finales
if (contar(contenido, 'SIGNOS_ALERTA.map') !== 1) {
  abortar('los signos quedaron duplicados o desaparecieron.');
}
if (contar(contenido, '¿Ocurrió algo grave hoy?') !== 0) {
  abortar('quedo la seccion vieja de signos.');
}
for (const s of ['MOMENTOS_CATALOGO', 'hitosLogrados', 'toggleSigno', 'signoOtroTexto']) {
  if (!contenido.includes(s)) {
    abortar('se perdio [' + s + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Alerta, Veterinario y Prevencion en la misma fila.');
