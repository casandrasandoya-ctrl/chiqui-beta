const fs = require('fs');
const path = require('path');

// ============================================================
// generar_395_zoom_botones_y_chip.js
// ============================================================
// DOS ARREGLOS.
//
// ------------------------------------------------------------
// A) FUERA EL CHIP "Días con estado de alerta reciente"
// ------------------------------------------------------------
// No dice QUE paso, solo que algo paso. Y los sintomas concretos que si
// lo dicen —vomito, animo bajo, cojera— ya estan en la misma lista. Le
// quitaba un lugar (de seis) a informacion real.
//
// El estado del dia no se pierde: sigue en el calendario y en los
// registros diarios, que es donde corresponde.
//
// ------------------------------------------------------------
// B) EL PELLIZCO NO FUNCIONABA
// ------------------------------------------------------------
// No fue el movimiento de Casandra. El navegador solo permite ampliar
// con los dedos si la pagina lo autoriza en su viewport, y en una app
// instalada eso suele venir bloqueado para que no se deforme la
// interfaz al tocar.
//
// Cambiar el viewport afectaria TODA la app, asi que en vez de eso el
// visor lleva sus propios botones de zoom: − 100% +, que amplian la
// imagen en pasos. Con la imagen ampliada, la ventana se puede
// desplazar para recorrerla.
//
// Se agrega tambien tocar la imagen para alternar entre 100% y 250%,
// que es el gesto que la gente prueba primero.
//
// REQUISITO: scripts 393 y 394 desplegados.
//
// Si algo no calza, ABORTA sin escribir NADA.
// ============================================================

const RUTA_COMP = 'components/FotoAmpliable.tsx';
const RUTA_VET = 'app/vet/page.tsx';

const VISOR_VIEJO = [
  "          {/* overflow-auto permite desplazarse cuando la imagen se amplía",
  "              con el gesto de pellizcar. */}",
  '          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">',
  "            <img",
  "              src={src}",
  "              alt={alt}",
  '              className="max-w-full max-h-full object-contain"',
  "              onClick={e => e.stopPropagation()}",
  "            />",
  "          </div>",
  "",
  '          <p className="absolute bottom-5 left-0 right-0 text-center text-white/50 text-[11px]">',
  "            Pellizca para acercar · Toca fuera para cerrar",
  "          </p>",
].join('\n');

const VISOR_NUEVO = [
  "          {/* Botones de zoom propios. El pellizco del navegador solo",
  "              funciona si la página lo autoriza en su viewport, y en la",
  "              app instalada viene bloqueado para que la interfaz no se",
  "              deforme al tocar. Cambiar eso afectaría toda la app, así",
  "              que el visor trae su propio zoom. */}",
  '          <div className="w-full h-full overflow-auto p-4" onClick={e => e.stopPropagation()}>',
  '            <div className="min-w-full min-h-full flex items-center justify-center">',
  "              <img",
  "                src={src}",
  "                alt={alt}",
  "                onClick={() => setZoom(z => (z >= 2.5 ? 1 : 2.5))}",
  "                style={{",
  "                  width: `${zoom * 100}%`,",
  "                  maxWidth: zoom === 1 ? '100%' : 'none',",
  "                  height: 'auto',",
  "                  objectFit: 'contain',",
  "                }}",
  "              />",
  "            </div>",
  "          </div>",
  "",
  '          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">',
  '            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>',
  "              <button",
  "                type=\"button\"",
  "                onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}",
  "                disabled={zoom <= 1}",
  '                aria-label="Alejar"',
  '                className="w-11 h-11 rounded-full bg-white/15 text-white text-xl font-bold disabled:opacity-30"',
  "              >−</button>",
  '              <span className="text-white/80 text-xs font-semibold w-14 text-center">{Math.round(zoom * 100)}%</span>',
  "              <button",
  "                type=\"button\"",
  "                onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}",
  "                disabled={zoom >= 4}",
  '                aria-label="Acercar"',
  '                className="w-11 h-11 rounded-full bg-white/15 text-white text-xl font-bold disabled:opacity-30"',
  "              >+</button>",
  "            </div>",
  '            <p className="text-white/50 text-[11px]">',
  "              {zoom > 1 ? 'Desliza para recorrer la imagen' : 'Toca la imagen o usa + para acercar'}",
  "            </p>",
  "          </div>",
].join('\n');

const PARES_COMP = [
  {
    nombre: 'estado del zoom',
    viejo: "  const [abierta, setAbierta] = useState(false)",
    nuevo: [
      "  const [abierta, setAbierta] = useState(false)",
      "  const [zoom, setZoom] = useState(1)",
    ].join('\n'),
  },
  {
    nombre: 'reiniciar el zoom al abrir',
    viejo: "        onClick={() => setAbierta(true)}",
    nuevo: "        onClick={() => { setZoom(1); setAbierta(true) }}",
  },
  {
    nombre: 'visor con botones de zoom',
    viejo: VISOR_VIEJO,
    nuevo: VISOR_NUEVO,
  },
];

const CHIP_VIEJO = [
  "    if (r.estado_dia === 'rojo' || r.estado_dia === 'naranjo') {",
  "      const lista = fechasPorSenal.get('Días con estado de alerta reciente') || []",
  "      if (!lista.includes(r.fecha)) lista.push(r.fecha)",
  "      fechasPorSenal.set('Días con estado de alerta reciente', lista)",
  "    }",
].join('\n');

const CHIP_NUEVO = [
  "    // El estado del día NO se agrega como motivo: decía que algo pasó",
  "    // sin decir qué, y los síntomas concretos que sí lo dicen ya están",
  "    // en esta misma lista. Ocupaba uno de los seis lugares con",
  "    // información que el veterinario no puede usar.",
  "    //",
  "    // El estado sigue estando en el calendario y en los registros",
  "    // diarios, que es donde corresponde.",
].join('\n');

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// --- Verificar los dos archivos antes de escribir ninguno
const destinoComp = path.join(process.cwd(), RUTA_COMP);
const destinoVet = path.join(process.cwd(), RUTA_VET);

for (const [ruta, destino] of [[RUTA_COMP, destinoComp], [RUTA_VET, destinoVet]]) {
  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + ruta + '. Corre el script desde la raiz del proyecto.');
  }
}

let comp = fs.readFileSync(destinoComp, 'utf8');
let vet = fs.readFileSync(destinoVet, 'utf8');

if (comp.includes('const [zoom, setZoom]')) {
  abortar('el visor ya tiene botones de zoom. Parece que este script ya se corrio.');
}
if (!vet.includes('fechasPorSenal')) {
  abortar('falta el motivo con duracion. Corre primero el script 394.');
}

for (const p of PARES_COMP) {
  const n = contar(comp, p.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + p.nombre + ' -> ' + n + ' coincidencia(s)');
  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + p.nombre + '] y encontre ' + n + '.');
  }
  comp = comp.split(p.viejo).join(p.nuevo);
}

const nChip = contar(vet, CHIP_VIEJO);
console.log('  ' + (nChip === 1 ? 'OK ' : 'X  ') + 'chip redundante -> ' + nChip + ' coincidencia(s)');
if (nChip !== 1) {
  abortar('esperaba 1 coincidencia del chip y encontre ' + nChip + '.');
}
vet = vet.split(CHIP_VIEJO).join(CHIP_NUEVO);

// --- Verificaciones finales
if (!comp.includes('setZoom(z => Math.min(4')) {
  abortar('el boton de acercar no quedo aplicado.');
}
if (comp.includes('Pellizca para acercar')) {
  abortar('quedo el texto viejo del pellizco.');
}
if (vet.includes("'Días con estado de alerta reciente'")) {
  abortar('quedo el chip redundante.');
}
// Los sintomas concretos tienen que seguir detectandose.
if (!vet.includes('fechasPorSenal.set(etiqueta, lista)')) {
  abortar('se perdio la deteccion de sintomas. No se escribio nada.');
}

fs.writeFileSync(destinoComp, comp, 'utf8');
console.log('');
console.log('OK: ' + RUTA_COMP);
fs.writeFileSync(destinoVet, vet, 'utf8');
console.log('OK: ' + RUTA_VET);
console.log('');
console.log('Listo. Zoom con botones, y el motivo sin el chip vacio.');
