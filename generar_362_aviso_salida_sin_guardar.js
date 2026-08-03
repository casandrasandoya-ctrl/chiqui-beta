const fs = require('fs');
const path = require('path');

// ============================================================
// generar_362_aviso_salida_sin_guardar.js
// ============================================================
// Si alguien llena el registro diario y sale sin guardar, pierde todo
// el trabajo — y probablemente no lo repita. Ahora se le avisa.
//
// COMO SE DETECTA LA SALIDA
// Next no ofrece forma de cancelar una navegacion ya iniciada, asi que
// hay que atajarla ANTES: se escucha el click en fase de captura y, si
// apunta a otra pagina de la app, se detiene y se muestra el aviso.
// Cubre el menu de abajo, el selector de mascota y cualquier enlace
// interno. El boton atras se intercepta aparte.
//
// Tambien se engancha beforeunload para cerrar o recargar la pestaña.
// Ese aviso lo dibuja el navegador con su propio texto: no se puede
// personalizar, pero es mejor que nada.
//
// COMO SE DETECTA QUE HAY CAMBIOS
// Se compara una "firma" del formulario contra la que tenia al
// terminar de cargar. Asi el aviso NO aparece si la persona solo entro
// a mirar, ni al editar un registro existente sin tocar nada. Avisar
// siempre seria peor que no avisar: la gente aprende a ignorarlo.
//
// La firma se reinicia al cambiar de mascota, porque ahi el formulario
// se limpia y se vuelve a cargar.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/registro-diario/page.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Estados nuevos
  // ---------------------------------------------------------
  {
    nombre: 'estados del aviso de salida',
    viejo: "  const [confirmarGuardado, setConfirmarGuardado] = useState(false)",
    nuevo: [
      "  const [confirmarGuardado, setConfirmarGuardado] = useState(false)",
      "  // Aviso de salida con cambios sin guardar. Guarda a dónde quería",
      "  // ir la persona, para llevarla ahí después de decidir.",
      "  // '__atras__' es el botón de volver, que no tiene URL.",
      "  const [salidaPendiente, setSalidaPendiente] = useState<string | null>(null)",
      "  // Firma del formulario al terminar de cargar. Comparar contra",
      "  // ella evita avisar a quien solo entró a mirar.",
      "  const [firmaInicial, setFirmaInicial] = useState<string | null>(null)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Deteccion de cambios e intercepcion
  // ---------------------------------------------------------
  {
    nombre: 'deteccion de cambios sin guardar',
    viejo: "  const CATS = getCategorias(especie)",
    nuevo: [
      "  const CATS = getCategorias(especie)",
      "",
      "  // --- Aviso de salida con cambios sin guardar ---",
      "  // Firma de todo lo que la persona puede haber tocado. Si difiere",
      "  // de la que había al cargar, hay algo sin guardar.",
      "  const firmaFormulario = JSON.stringify({",
      "    sel, det, nota, paseoMinutos, signoOtroTexto,",
      "    cuidados: Array.from(cuidados).sort(),",
      "    signos: Array.from(signos).sort(),",
      "    franjas: Array.from(franjasAlimento).sort(),",
      "    enriq: enriqDatos,",
      "  })",
      "",
      "  useEffect(() => {",
      "    // Mientras carga —y al cambiar de mascota— se descarta la firma",
      "    // vieja. La nueva se toma en cuanto el formulario queda listo.",
      "    if (cargando) { setFirmaInicial(null); return }",
      "    if (firmaInicial === null) setFirmaInicial(firmaFormulario)",
      "  }, [cargando, firmaFormulario, firmaInicial])",
      "",
      "  const hayCambiosSinGuardar = firmaInicial !== null && firmaFormulario !== firmaInicial",
      "",
      "  // Intercepta el toque en enlaces internos (menú de abajo, selector",
      "  // de mascota). Se escucha en fase de CAPTURA porque Next no deja",
      "  // cancelar una navegación ya iniciada: hay que detenerla antes de",
      "  // que el enlace haga lo suyo.",
      "  useEffect(() => {",
      "    if (!hayCambiosSinGuardar) return",
      "    function alTocar(e: MouseEvent) {",
      "      const destino = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null",
      "      if (!destino) return",
      "      const href = destino.getAttribute('href') || ''",
      "      // Solo enlaces internos, y no los que se quedan en esta misma",
      "      // pantalla.",
      "      if (!href.startsWith('/') || href.startsWith('/registro-diario')) return",
      "      e.preventDefault()",
      "      e.stopPropagation()",
      "      setSalidaPendiente(href)",
      "    }",
      "    document.addEventListener('click', alTocar, true)",
      "    return () => document.removeEventListener('click', alTocar, true)",
      "  }, [hayCambiosSinGuardar])",
      "",
      "  // Cerrar o recargar la pestaña. El aviso lo dibuja el navegador",
      "  // con su propio texto: no se puede personalizar, pero es mejor",
      "  // que perder el registro en silencio.",
      "  useEffect(() => {",
      "    if (!hayCambiosSinGuardar) return",
      "    function antesDeSalir(e: BeforeUnloadEvent) {",
      "      e.preventDefault()",
      "      e.returnValue = ''",
      "    }",
      "    window.addEventListener('beforeunload', antesDeSalir)",
      "    return () => window.removeEventListener('beforeunload', antesDeSalir)",
      "  }, [hayCambiosSinGuardar])",
      "",
      "  // Salir de verdad: se iguala la firma para desactivar el aviso y",
      "  // recién ahí se navega.",
      "  function salirSinGuardar() {",
      "    const destino = salidaPendiente",
      "    setFirmaInicial(firmaFormulario)",
      "    setSalidaPendiente(null)",
      "    if (destino === '__atras__') router.back()",
      "    else if (destino) router.push(destino)",
      "  }",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. El boton de volver tambien avisa
  // ---------------------------------------------------------
  {
    nombre: 'boton de volver',
    viejo: '          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg flex-shrink-0">←</button>',
    nuevo: [
      "          <button",
      "            onClick={() => { if (hayCambiosSinGuardar) setSalidaPendiente('__atras__'); else router.back() }}",
      '            className="w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg flex-shrink-0"',
      "          >←</button>",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. El modal
  // ---------------------------------------------------------
  {
    nombre: 'modal de salida',
    viejo: '      {/* Modal tras "Todo normal": guardar al toque o seguir editando */}',
    nuevo: [
      "      {/* Aviso al salir con cambios sin guardar. Mismo estilo que el",
      "          de \"Todo normal\" para que se sienta conocido. */}",
      "      {salidaPendiente && (",
      '        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8" style={{ background: \'rgba(61,43,31,0.45)\' }} onClick={() => setSalidaPendiente(null)}>',
      '          <div className="bg-[#FFFCF8] rounded-2xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>',
      '            <img src="/chiqui/chiqui_amor.png" alt="" className="w-14 h-14 object-contain mx-auto mb-2" />',
      '            <p className="font-bold text-sm text-[#3D2B1F] mb-1">¿Guardar antes de salir?</p>',
      '            <p className="text-xs text-[#8A7560] mb-4">Marcaste cosas de {mascotaNombre} que aún no se han guardado. Si sales ahora, se pierden.</p>',
      '            <div className="flex flex-col gap-2">',
      "              <button",
      "                onClick={() => { setSalidaPendiente(null); guardar() }}",
      "                disabled={loading || !puedeGuardar}",
      '                className="w-full py-2.5 rounded-xl text-sm font-bold text-[#1A1200] bg-[#FFBD59] disabled:opacity-50">',
      "                {loading ? 'Guardando...' : 'Guardar y salir'}",
      "              </button>",
      '              <button onClick={() => setSalidaPendiente(null)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#8A7560] bg-[#F0E2CE]">',
      "                Seguir aquí",
      "              </button>",
      '              <button onClick={salirSinGuardar} className="w-full py-1.5 text-xs text-[#8A7560]">',
      "                Salir sin guardar",
      "              </button>",
      "            </div>",
      "            {!puedeGuardar && (",
      '              <p className="text-[10px] text-[#8A7560] mt-2">Marca al menos una categoría para poder guardar.</p>',
      "            )}",
      "          </div>",
      "        </div>",
      "      )}",
      '      {/* Modal tras "Todo normal": guardar al toque o seguir editando */}',
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

if (contenido.includes('salidaPendiente')) {
  abortar('el archivo ya tiene el aviso de salida. Parece que este script ya se corrio.');
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
  'const firmaFormulario',
  'const hayCambiosSinGuardar',
  'function salirSinGuardar',
  '¿Guardar antes de salir?',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}
// Los hooks tienen que quedar ANTES del return temprano por carga, o
// React se cae con "rendered fewer hooks than expected".
const posHooks = contenido.indexOf('const hayCambiosSinGuardar')
const posReturnCarga = contenido.indexOf('if (cargando) return <div')
if (posReturnCarga !== -1 && posHooks > posReturnCarga) {
  abortar('los hooks quedaron despues del return de carga. Eso rompe React.');
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Ya no se pierde un registro por salir sin guardar.');
