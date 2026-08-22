const fs = require('fs');
const path = require('path');

// ============================================================
// generar_430_limite_supabase_panel.js
// ============================================================
// LA CAUSA REAL DEL "0 DE 83"
//
// Supabase corta las consultas en 1000 FILAS, sin importar el .limit()
// que se pida. Es un limite del servidor, no del cliente.
//
// La tabla registros_diarios ya tiene 1017 filas. Y la consulta del
// panel no pedia ningun orden:
//
//   .select('...').limit(50000)   ->  llegaban 1000 filas cualesquiera
//
// Sin .order, Postgres devuelve las filas en el orden que le convenga.
// Los 17 mas recientes —los de hoy— quedaban fuera, y por eso el panel
// mostraba cero aunque los datos estuvieran ahi.
//
// Esto explica todo lo que veiamos:
//   - Los registros existian y pasaban todos los filtros (lo confirmamos
//     con SQL: 14 de 14 sobrevivian).
//   - La vacuna y el peso SI aparecian: esas tablas son mucho mas
//     chicas y caben enteras en las 1000 filas.
//   - No era la fecha, ni el perfil, ni las mascotas archivadas.
//
// EL ARREGLO
//   .order('fecha', { ascending: false })  -> primero los mas recientes
//   .range(0, 4999)                        -> pide 5000 explicitamente
//
// Si algun dia se pasa de 5000, lo que se pierde son los registros mas
// ANTIGUOS, no los de hoy. Es la perdida correcta si hay que elegir.
//
// Hace un reemplazo exacto. Si algo no calza, ABORTA sin escribir.
// ============================================================

const RUTA = 'app/admin/page.tsx';

const VIEJO = "    db.from('registros_diarios').select('user_id, mascota_id, fecha, paseo, se_bano, corte_unas, limpieza_dental, limpieza_oidos, cambio_alimento, probo_alimento_nuevo, compro_alimento').limit(50000),";
const NUEVO = "    // Supabase corta en 1000 filas por consulta, sin importar el\n    // .limit() que se pida. La tabla ya tiene mas de 1000 registros, asi\n    // que se traian solo los primeros mil EN UN ORDEN CUALQUIERA \u2014 y los\n    // mas recientes, los de hoy, quedaban fuera.\n    //\n    // Con .order descendente y .range se piden 5000 explicitamente,\n    // empezando por los mas nuevos. Si algun dia se pasa de 5000, lo que\n    // se pierde son los mas antiguos, no los de hoy.\n    db.from('registros_diarios')\n      .select('user_id, mascota_id, fecha, paseo, se_bano, corte_unas, limpieza_dental, limpieza_oidos, cambio_alimento, probo_alimento_nuevo, compro_alimento')\n      .order('fecha', { ascending: false })\n      .range(0, 4999),";

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

if (c.includes(".range(0, 4999)")) {
  abortar('la consulta ya pide el rango. Parece que este script ya se corrio.');
}

const n = contar(c, VIEJO);
console.log('  ' + (n === 1 ? 'OK ' : 'X  ') + 'consulta de registros -> ' + n + ' coincidencia(s)');
if (n !== 1) {
  abortar('esperaba 1 coincidencia y encontre ' + n + '. Pasale a Claude la linea de la consulta de registros_diarios.');
}

c = c.split(VIEJO).join(NUEVO);

// --- Verificaciones
if (!c.includes(".order('fecha', { ascending: false })\n      .range(0, 4999)")) {
  abortar('el orden y el rango no quedaron aplicados juntos.');
}
if (c.includes(".limit(50000)")) {
  // Otras consultas pueden tener limit; solo importa que la de
  // registros_diarios ya no lo use.
  const posRegs = c.indexOf("from('registros_diarios')");
  const tramo = c.slice(posRegs, posRegs + 500);
  if (tramo.includes('.limit(50000)')) {
    abortar('la consulta de registros todavia usa limit.');
  }
}
// Las columnas tienen que seguir todas: los cubos de cuidados las usan.
for (const col of ['paseo', 'se_bano', 'corte_unas', 'cambio_alimento']) {
  if (!c.includes(col)) {
    abortar('se perdio la columna [' + col + '] al reemplazar.');
  }
}

fs.writeFileSync(destino, c, 'utf8');
console.log('');
console.log('OK: ' + RUTA);
console.log('');
console.log('NOTA: la consulta de medicamento_tomas tambien usa .limit(50000)');
console.log('y le pasara lo mismo cuando llegue a 1000 filas. Avisale a Claude');
console.log('cuando el conteo de dosis empiece a verse bajo.');
console.log('');
console.log('Listo. El panel ya deberia ver los registros de hoy.');
