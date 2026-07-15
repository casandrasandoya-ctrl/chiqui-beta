import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Notificaciones de "racha en riesgo" -- estilo Duolingo.
//
// Ruta separada del recordatorio normal (app/api/recordatorio). La llama
// el mismo servicio externo (cron-job.org) UNA VEZ POR HORA, pero solo
// actúa cuando son las 22:00 hora Chile -- las demás horas no hacen nada
// (por eso no importa si el cron la llama cada hora, es intencional y
// simplifica la configuración en cron-job.org).
//
// A las 22:00, revisa a TODOS los usuarios con notificaciones activas
// (sin importar la hora de su recordatorio normal) y, por cada mascota
// sin registro hoy, calcula si tenía una racha de registro y/o de
// paseos que está a punto de perder. Si es así, manda una notificación
// por cada racha en riesgo (registro y paseo van SEPARADAS, ya que no
// todas las mascotas pasean).
//
// Protegida con CRON_SECRET, igual que el recordatorio normal.

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
  const hora = horaChile.replace(/[^0-9]/g, '').padStart(2, '0').slice(0, 2)
  return `${hora}:00`
}

function fechaChile(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date)
}

const HORA_ENVIO = '22:00'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const horaActual = horaActualChile()
  if (horaActual !== HORA_ENVIO) {
    return NextResponse.json({ mensaje: 'No es la hora de envío', hora: horaActual })
  }

  webpush.setVapidDetails(
    'mailto:contacto@chiqui-app.cl',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = crearClienteAdmin()
  const hoy = fechaChile()

  // Usuarios con notificaciones activas, sin importar la hora que
  // eligieron para su recordatorio normal -- esta es una notificación
  // distinta e independiente de esa preferencia.
  const { data: usuarios } = await supabase
    .from('preferencias_usuario')
    .select('user_id')
    .eq('notificaciones_activas', true)

  if (!usuarios || usuarios.length === 0) {
    return NextResponse.json({ mensaje: 'Sin usuarios con notificaciones activas', enviados: 0 })
  }

  let totalEnviados = 0
  let totalErrores = 0

  for (const u of usuarios) {
    const { data: mascotas } = await supabase
      .from('mascotas')
      .select('id, nombre, especie')
      .eq('user_id', u.user_id)
    if (!mascotas || mascotas.length === 0) continue

    const { data: suscripciones } = await supabase
      .from('suscripciones_push')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', u.user_id)
    if (!suscripciones || suscripciones.length === 0) continue

    for (const mascota of mascotas) {
      // Si ya registró hoy, no hay ninguna racha en riesgo para esta
      // mascota -- se salta sin calcular nada más.
      const { data: registroHoy } = await supabase
        .from('registros_diarios')
        .select('id')
        .eq('mascota_id', mascota.id)
        .eq('fecha', hoy)
        .maybeSingle()
      if (registroHoy) continue

      // Traemos los últimos 40 días de registros para calcular ambas
      // rachas (registro y paseo) contando hacia atrás desde AYER, ya
      // que confirmamos que hoy no tiene registro.
      const hace40 = new Date()
      hace40.setDate(hace40.getDate() - 40)
      const { data: historial } = await supabase
        .from('registros_diarios')
        .select('fecha, paseo')
        .eq('mascota_id', mascota.id)
        .gte('fecha', fechaChile(hace40))

      const fechasRegistro = new Set((historial || []).map(r => r.fecha))
      const mapaPaseo = new Map((historial || []).map(r => [r.fecha, r.paseo]))

      let rachaRegistro = 0
      let rachaPaseo = 0
      let cortoRegistro = false
      let cortoPaseo = false

      for (let i = 1; i <= 40; i++) {
        const d = new Date(hoy + 'T00:00:00')
        d.setDate(d.getDate() - i)
        const f = fechaChile(d)

        if (!cortoRegistro) {
          if (fechasRegistro.has(f)) rachaRegistro++
          else cortoRegistro = true
        }
        if (mascota.especie === 'Perro' && !cortoPaseo) {
          const p = mapaPaseo.get(f)
          if (p && p !== 'no_paseo') rachaPaseo++
          else cortoPaseo = true
        }
      }

      // Racha de registro en riesgo (>=1 día ya acumulado)
      if (rachaRegistro >= 1) {
        const payload = JSON.stringify({
          title: 'CHIQUI Entre Señales',
          body: `¡Llevas ${rachaRegistro} día${rachaRegistro === 1 ? '' : 's'} seguidos registrando a ${mascota.nombre}! No pierdas tu racha, quedan pocas horas hoy.`,
          url: '/registro-diario',
        })
        for (const sub of suscripciones) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { urgency: 'high' }
            )
            totalEnviados++
          } catch (err: any) {
            totalErrores++
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('suscripciones_push').delete().eq('id', sub.id)
            }
          }
        }
      }

      // Racha de paseo en riesgo (solo perros, >=1 día ya acumulado).
      // Va en una notificación SEPARADA de la de registro.
      if (mascota.especie === 'Perro' && rachaPaseo >= 1) {
        const payload = JSON.stringify({
          title: 'CHIQUI Entre Señales',
          body: `¡Llevas ${rachaPaseo} día${rachaPaseo === 1 ? '' : 's'} seguidos de paseo con ${mascota.nombre}! No pierdas la racha, aún puedes salir hoy.`,
          url: '/registro-diario',
        })
        for (const sub of suscripciones) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { urgency: 'high' }
            )
            totalEnviados++
          } catch (err: any) {
            totalErrores++
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('suscripciones_push').delete().eq('id', sub.id)
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ hora: horaActual, usuarios: usuarios.length, enviados: totalEnviados, errores: totalErrores })
}
