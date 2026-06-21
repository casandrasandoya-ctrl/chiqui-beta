import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Esta ruta la llama un servicio externo (cron-job.org) UNA VEZ POR HORA,
// en punto. Cada vez que se ejecuta:
//   1. Calcula la hora actual en Chile (America/Santiago).
//   2. Busca los usuarios que activaron notificaciones y eligieron
//      justo esa hora como su recordatorio.
//   3. Para cada uno, revisa cada una de sus mascotas: si no tiene
//      registro de HOY, le manda una notificacion separada por mascota
//      (no una sola agrupada -- asi se definio).
//   4. Si una mascota ya tiene registro hoy, no se le manda nada (no
//      tiene sentido recordarle algo que ya hizo).
//
// Protegida con CRON_SECRET para que solo el servicio de cron autorizado
// pueda activarla -- sin esto, cualquiera podria llamar esta URL y
// hacer que se manden notificaciones falsas a los usuarios.

function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function horaActualChile(): string {
  const ahora = new Date()
  const horaChile = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    hour12: false,
  }).format(ahora)
  // El formato puede devolver "20" o "20:00" segun el navegador/runtime;
  // normalizamos siempre a "HH:00" porque los horarios disponibles son
  // en punto.
  const hora = horaChile.replace(/[^0-9]/g, '').padStart(2, '0').slice(0, 2)
  return `${hora}:00`
}

function fechaHoyChile(): string {
  const ahora = new Date()
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  webpush.setVapidDetails(
    'mailto:contacto@chiqui-app.cl',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = crearClienteAdmin()
  const horaActual = horaActualChile()
  const hoy = fechaHoyChile()

  // Paso 1: usuarios con recordatorio activo justo a esta hora.
  const { data: usuarios } = await supabase
    .from('preferencias_usuario')
    .select('user_id')
    .eq('notificaciones_activas', true)
    .eq('hora_recordatorio', horaActual)

  if (!usuarios || usuarios.length === 0) {
    return NextResponse.json({ mensaje: 'Sin usuarios para esta hora', hora: horaActual, enviados: 0 })
  }

  let totalEnviados = 0
  let totalErrores = 0

  for (const u of usuarios) {
    // Paso 2: mascotas de este usuario.
    const { data: mascotas } = await supabase
      .from('mascotas')
      .select('id, nombre')
      .eq('user_id', u.user_id)

    if (!mascotas || mascotas.length === 0) continue

    // Paso 3: suscripciones push de este usuario (puede tener mas de
    // una si instalo en varios dispositivos).
    const { data: suscripciones } = await supabase
      .from('suscripciones_push')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', u.user_id)

    if (!suscripciones || suscripciones.length === 0) continue

    for (const mascota of mascotas) {
      // Paso 4: revisar si esta mascota ya tiene registro hoy.
      const { data: registroHoy } = await supabase
        .from('registros_diarios')
        .select('id')
        .eq('mascota_id', mascota.id)
        .eq('fecha', hoy)
        .maybeSingle()

      if (registroHoy) continue // ya registro hoy, no se le manda nada

      const payload = JSON.stringify({
        title: 'CHIQUI Entre Señales',
        body: `¿Cómo estuvo ${mascota.nombre} hoy? Aún no lo has registrado.`,
        url: '/registro-diario',
      })

      for (const sub of suscripciones) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            // urgency: 'high' le pide al servicio de push (FCM en Android,
            // APNs en iOS) que intente entregar el mensaje de inmediato,
            // incluso si el dispositivo esta en modo de ahorro de bateria
            // (Doze). Sin esto, Android puede demorar la entrega visual
            // hasta que la persona abra el telefono o la app -- que es
            // justo lo que se observo en las pruebas.
            { urgency: 'high' }
          )
          totalEnviados++
        } catch (err: any) {
          totalErrores++
          // Si la suscripcion ya no es valida (ej. el usuario desinstalo
          // la app o revoco el permiso desde el navegador), la limpiamos
          // de la base de datos para no seguir intentando en vano.
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('suscripciones_push').delete().eq('id', sub.id)
          }
        }
      }
    }
  }

  return NextResponse.json({ hora: horaActual, usuarios: usuarios.length, enviados: totalEnviados, errores: totalErrores })
}
