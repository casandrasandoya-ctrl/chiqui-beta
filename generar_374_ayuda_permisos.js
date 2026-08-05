const fs = require('fs');
const path = require('path');

// ============================================================
// generar_374_ayuda_permisos.js
// ============================================================
// LO QUE APRENDIMOS CON DANIELA
// En la app instalada desde Google Play, el permiso de notificaciones
// hay que concederlo tambien en los AJUSTES DE ANDROID. No basta con
// aceptar el aviso de la app. Casandra lo descubrio sola porque hizo la
// app; Daniela lo resolvio porque le mandaron un video.
//
// NADIE MAS VA A TENER ESO. Y es muy probable que ahi este parte de la
// explicacion del 18% de notificaciones activas: gente que quiso, se
// topo con una pared invisible y abandono.
//
// QUE HACE ESTE SCRIPT
// Cuando activar FALLA por permisos, muestra los pasos exactos para ese
// telefono. Solo en ese caso: si funciona, no aparece nada.
//
// CUATRO ESCENARIOS, CUATRO MENSAJES
//   Android + app instalada -> Ajustes > Aplicaciones > CHIQUI
//   Android + navegador     -> el candado de la barra de direcciones
//   iPhone + agregada       -> Ajustes > Notificaciones > CHIQUI
//   iPhone + Safari suelto  -> primero hay que agregarla a inicio
//
// El ultimo es el que mas importa acertar: en iPhone las notificaciones
// web SOLO existen con la app agregada a la pantalla de inicio. Ningun
// ajuste sirve si no se hizo eso antes.
//
// SALIDA SEGURA
// Si no se logra determinar el entorno, se muestra un texto generico en
// vez de instrucciones equivocadas. Unas instrucciones de Android en un
// iPhone no solo no sirven: hacen que la app parezca rota.
//
// REQUISITO: scripts 363 y 373 desplegados.
//
// Hace reemplazos exactos. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'components/ConfiguracionNotificaciones.tsx';

const PARES = [
  // ---------------------------------------------------------
  // 1. Las instrucciones segun el dispositivo
  // ---------------------------------------------------------
  {
    nombre: 'instrucciones por dispositivo',
    viejo: 'export default function ConfiguracionNotificaciones() {',
    nuevo: [
      "// Los pasos cambian por completo segun donde este corriendo la app.",
      "// Mostrar los de Android en un iPhone no solo no sirve: hace que la",
      "// app parezca rota.",
      "function instruccionesPermiso(): { titulo: string; pasos: string[]; cierre: string } | null {",
      "  if (typeof window === 'undefined') return null",
      "  let ios = false",
      "  let instalada = false",
      "  try {",
      "    ios = esIOS()",
      "    instalada = estaInstalada()",
      "  } catch {",
      "    // Salida segura: si no se puede determinar el entorno, mejor un",
      "    // texto generico que unas instrucciones equivocadas.",
      "    return {",
      "      titulo: '⚠️ Falta autorizar las notificaciones',",
      "      pasos: ['Busca CHIQUI en los ajustes de notificaciones de tu teléfono', 'Actívalas desde ahí'],",
      "      cierre: 'Después vuelve aquí y toca Activar de nuevo.',",
      "    }",
      "  }",
      "",
      "  if (ios && instalada) {",
      "    return {",
      "      titulo: '⚠️ Falta un paso en tu iPhone',",
      "      pasos: ['Abre Ajustes', 'Entra a Notificaciones', 'Busca CHIQUI en la lista', 'Activa \"Permitir notificaciones\"'],",
      "      cierre: 'Después vuelve aquí y toca Activar de nuevo.',",
      "    }",
      "  }",
      "",
      "  if (ios) {",
      "    // En iPhone las notificaciones web SOLO existen con la app",
      "    // agregada a inicio. Ningún ajuste sirve si no se hizo eso antes.",
      "    return {",
      "      titulo: '⚠️ Primero agrega CHIQUI a tu pantalla de inicio',",
      "      pasos: ['Toca el botón de compartir en Safari', 'Elige \"Agregar a pantalla de inicio\"', 'Abre CHIQUI desde ese ícono'],",
      "      cierre: 'En iPhone las notificaciones solo funcionan con la app agregada a inicio.',",
      "    }",
      "  }",
      "",
      "  if (instalada) {",
      "    return {",
      "      titulo: '⚠️ Falta un paso en tu teléfono',",
      "      pasos: ['Abre los Ajustes de tu teléfono', 'Entra a Aplicaciones', 'Busca CHIQUI', 'Entra a Notificaciones y actívalas'],",
      "      cierre: 'Android pide este permiso aparte del aviso de la app. Después vuelve aquí y toca Activar de nuevo.',",
      "    }",
      "  }",
      "",
      "  return {",
      "    titulo: '⚠️ Tu navegador bloqueó las notificaciones',",
      "    pasos: ['Toca el candado 🔒 junto a la dirección web', 'Busca \"Notificaciones\"', 'Cámbialo a \"Permitir\"'],",
      "    cierre: 'Después recarga la página y toca Activar de nuevo.',",
      "  }",
      "}",
      "",
      "export default function ConfiguracionNotificaciones() {",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 2. Estado
  // ---------------------------------------------------------
  {
    nombre: 'estado de la ayuda',
    viejo: "  const [diag, setDiag] = useState<{ permiso: string; navegador: boolean; base: boolean } | null>(null)",
    nuevo: [
      "  const [diag, setDiag] = useState<{ permiso: string; navegador: boolean; base: boolean } | null>(null)",
      "  // Los pasos para autorizar en el teléfono. Solo se muestran cuando",
      "  // activar falló por permisos: si funciona, no aparece nada.",
      "  const [ayudaPermiso, setAyudaPermiso] = useState(false)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 3. Se levanta solo si el fallo fue de permisos
  // ---------------------------------------------------------
  {
    nombre: 'levantar la ayuda al fallar',
    viejo: [
      "        setError(resultado.error || 'No se pudo activar.')",
      "        return",
    ].join('\n'),
    nuevo: [
      "        setError(resultado.error || 'No se pudo activar.')",
      "        // Solo si el permiso NO está concedido: si falló por otra",
      "        // razón (conexión, base de datos), estos pasos no ayudan y",
      "        // solo confundirían.",
      "        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {",
      "          setAyudaPermiso(true)",
      "        }",
      "        return",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 4. Se baja al reintentar
  // ---------------------------------------------------------
  {
    nombre: 'limpiar la ayuda al reintentar',
    viejo: [
      "  async function manejarActivar() {",
      "    setProcesando(true)",
      "    setError('')",
    ].join('\n'),
    nuevo: [
      "  async function manejarActivar() {",
      "    setProcesando(true)",
      "    setError('')",
      "    setAyudaPermiso(false)",
    ].join('\n'),
  },

  // ---------------------------------------------------------
  // 5. Mostrarla
  // ---------------------------------------------------------
  {
    nombre: 'tarjeta de instrucciones',
    viejo: "        {soportado && !iosNoInstalado && permisoDenegado && (",
    nuevo: [
      "        {/* Pasos para autorizar. No se muestra junto al bloque de",
      "            iPhone-sin-instalar, que ya explica lo suyo. */}",
      "        {ayudaPermiso && !iosNoInstalado && (() => {",
      "          const ayuda = instruccionesPermiso()",
      "          if (!ayuda) return null",
      "          return (",
      '            <div className="bg-[#F07A30]/10 border border-[#F07A30]/30 rounded-xl p-3 mb-3">',
      '              <p className="text-xs font-bold text-[#3D2B1F] mb-1.5">{ayuda.titulo}</p>',
      '              <div className="space-y-0.5">',
      "                {ayuda.pasos.map((paso, i) => (",
      '                  <p key={i} className="text-[11px] text-[#8A7560] leading-relaxed">{i + 1}. {paso}</p>',
      "                ))}",
      "              </div>",
      '              <p className="text-[11px] text-[#3D2B1F] mt-2 leading-relaxed">{ayuda.cierre}</p>',
      "            </div>",
      "          )",
      "        })()}",
      "        {soportado && !iosNoInstalado && permisoDenegado && (",
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

if (contenido.includes('instruccionesPermiso')) {
  abortar('el componente ya tiene las instrucciones. Parece que este script ya se corrio.');
}
if (!contenido.includes('setDiag')) {
  abortar('falta el diagnostico del script 363. Correlo primero.');
}
// Las dos funciones de entorno tienen que estar importadas.
for (const f of ['esIOS', 'estaInstalada']) {
  if (!contenido.includes(f)) {
    abortar('el componente no importa ' + f + '. No se puede distinguir el dispositivo.');
  }
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
  'function instruccionesPermiso',
  'const [ayudaPermiso, setAyudaPermiso]',
  'setAyudaPermiso(true)',
  'setAyudaPermiso(false)',
  'const ayuda = instruccionesPermiso()',
];
for (const e of ESPERADOS) {
  if (contar(contenido, e) !== 1) {
    abortar('la verificacion final fallo para [' + e + '].');
  }
}

fs.writeFileSync(destino, contenido, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('Listo. Quien no logre activar ahora sabe que hacer en SU telefono.');
