const fs = require('fs');
const path = require('path');

// ============================================================
// generar_324_filtrar_archivadas.js
// ============================================================
// REQUISITO: el archivo archivar_mascota.sql YA debe estar corrido en
// Supabase. Si la columna archivada_en no existe, TODAS estas consultas
// fallan y la app manda a crear una mascota nueva. No correr antes.
//
// Agrega .is('archivada_en', null) a las 8 consultas de la tabla
// mascotas que hay en la app. Mientras ninguna mascota este archivada,
// el comportamiento es exactamente el mismo que hoy.
//
// Las dos MAS importantes son las rutas de cron: sin ese filtro, una
// mascota archivada seguiria generando notificaciones push todos los
// dias ("Como estuvo Rocky hoy?"), que es justo lo que no puede pasar.
//
// Verifica los 8 archivos ANTES de escribir cualquiera. Si falla una
// sola verificacion, ABORTA sin modificar nada.
// ============================================================

const FILTRO = ".is('archivada_en', null)";

const CAMBIOS = [
  // ---- Pantallas que traen la lista completa (mismo texto en 4 archivos)
  {
    ruta: 'app/perfil/page.tsx',
    nombre: 'lista de mascotas en Perfil',
    viejo: "await supabase.from('mascotas').select('*').order('created_at', { ascending: true })",
    nuevo: "await supabase.from('mascotas').select('*').is('archivada_en', null).order('created_at', { ascending: true })",
  },
  {
    ruta: 'app/analisis/page.tsx',
    nombre: 'lista de mascotas en Analisis',
    viejo: "await supabase.from('mascotas').select('*').order('created_at', { ascending: true })",
    nuevo: "await supabase.from('mascotas').select('*').is('archivada_en', null).order('created_at', { ascending: true })",
  },
  {
    ruta: 'app/prevencion/page.tsx',
    nombre: 'lista de mascotas en Salud/Prevencion',
    viejo: "await supabase.from('mascotas').select('*').order('created_at', { ascending: true })",
    nuevo: "await supabase.from('mascotas').select('*').is('archivada_en', null).order('created_at', { ascending: true })",
  },
  {
    ruta: 'app/calendario/page.tsx',
    nombre: 'lista de mascotas en Calendario',
    viejo: "await supabase.from('mascotas').select('*').order('created_at', { ascending: true })",
    nuevo: "await supabase.from('mascotas').select('*').is('archivada_en', null).order('created_at', { ascending: true })",
  },

  // ---- Registro diario (selecciona columnas especificas)
  {
    ruta: 'app/registro-diario/page.tsx',
    nombre: 'lista de mascotas en Registro diario',
    viejo: "await supabase.from('mascotas').select('id,nombre,especie,raza,foto_url,sexo,castrado,seguimiento_reproductivo,fecha_nacimiento').order('created_at', { ascending: true })",
    nuevo: "await supabase.from('mascotas').select('id,nombre,especie,raza,foto_url,sexo,castrado,seguimiento_reproductivo,fecha_nacimiento').is('archivada_en', null).order('created_at', { ascending: true })",
  },

  // ---- Dashboard (consulta en varias lineas)
  {
    ruta: 'app/dashboard/page.tsx',
    nombre: 'lista de mascotas en Dashboard',
    viejo: [
      "    .from('mascotas')",
      "    .select('id, nombre, especie, raza, foto_url')",
      "    .order('created_at', { ascending: true })",
    ].join('\n'),
    nuevo: [
      "    .from('mascotas')",
      "    .select('id, nombre, especie, raza, foto_url')",
      "    .is('archivada_en', null)",
      "    .order('created_at', { ascending: true })",
    ].join('\n'),
  },

  // ---- CRON: recordatorio diario (el mas sensible)
  {
    ruta: 'app/api/cron/recordatorios/route.ts',
    nombre: 'CRON recordatorio diario',
    viejo: [
      "      .from('mascotas')",
      "      .select('id, nombre')",
      "      .eq('user_id', u.user_id)",
    ].join('\n'),
    nuevo: [
      "      .from('mascotas')",
      "      .select('id, nombre')",
      "      .eq('user_id', u.user_id)",
      "      // Las mascotas archivadas NO reciben recordatorios. Si alguien",
      "      // archivo a su mascota porque fallecio, recibir cada noche un",
      "      // \"Como estuvo hoy?\" seria doloroso y ademas inutil.",
      "      .is('archivada_en', null)",
    ].join('\n'),
  },

  // ---- CRON: racha en riesgo
  {
    ruta: 'app/api/racha-riesgo/route.ts',
    nombre: 'CRON racha en riesgo',
    viejo: [
      "      .from('mascotas')",
      "      .select('id, nombre, especie')",
      "      .eq('user_id', u.user_id)",
    ].join('\n'),
    nuevo: [
      "      .from('mascotas')",
      "      .select('id, nombre, especie')",
      "      .eq('user_id', u.user_id)",
      "      // Misma razon que en el recordatorio diario: una mascota",
      "      // archivada no genera avisos de racha en riesgo.",
      "      .is('archivada_en', null)",
    ].join('\n'),
  },
];

function contar(texto, buscado) {
  return texto.split(buscado).length - 1;
}

function abortar(motivo) {
  console.log('');
  console.log('ABORTADO: ' + motivo);
  console.log('No se modifico NINGUN archivo. Avisale a Claude lo que dice este mensaje.');
  process.exit(1);
}

// ============================================================
// PASO 1 — Verificar los 8 archivos ANTES de escribir ninguno
// ============================================================
console.log('Verificando los ' + CAMBIOS.length + ' archivos...');
console.log('');

const preparados = [];

for (const c of CAMBIOS) {
  const destino = path.join(process.cwd(), c.ruta);

  if (!fs.existsSync(destino)) {
    abortar('no se encontro ' + c.ruta + '. Corre el script desde la raiz del proyecto.');
  }

  const contenido = fs.readFileSync(destino, 'utf8');

  if (contenido.includes(FILTRO)) {
    abortar(c.ruta + ' ya tiene el filtro. Parece que este script ya se corrio.');
  }

  const n = contar(contenido, c.viejo);
  console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + c.nombre + ' -> ' + n + ' coincidencia(s)');

  if (n !== 1) {
    abortar('esperaba 1 coincidencia de [' + c.nombre + '] en ' + c.ruta + ' y encontre ' + n + '.');
  }

  preparados.push({ destino: destino, ruta: c.ruta, contenido: contenido.split(c.viejo).join(c.nuevo) });
}

// ============================================================
// PASO 2 — Verificar que cada resultado quedo bien ANTES de escribir
// ============================================================
for (const p of preparados) {
  if (contar(p.contenido, FILTRO) !== 1) {
    abortar('el filtro no quedo aplicado correctamente en ' + p.ruta + '.');
  }
}

// ============================================================
// PASO 3 — Escribir (recien aca se toca el disco)
// ============================================================
console.log('');
for (const p of preparados) {
  fs.writeFileSync(p.destino, p.contenido, 'utf8');
  console.log('OK: ' + p.ruta);
}

console.log('');
console.log('Listo. Las mascotas archivadas quedan fuera de las 8 consultas.');
console.log('Como todavia no hay ninguna archivada, no deberias notar ningun cambio.');
