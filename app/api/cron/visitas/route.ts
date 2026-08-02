import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// AVISO DE VISITA VETERINARIA — el día antes
// ============================================================
// Ruta separada de las otras dos (recordatorio diario y racha en
// riesgo). La llama el mismo servicio externo (cron-job.org) UNA VEZ
// POR HORA, pero solo actúa a las 19:00 hora Chile — las demás horas
// no hacen nada. Ese patrón es el mismo de racha-riesgo: simplifica la
// configuración porque todas las rutas se llaman igual, cada hora.
//
// POR QUÉ EL DÍA ANTES Y NO EL MISMO DÍA
// Una hora con el veterinario casi siempre necesita preparación:
// ayuno para exámenes, encontrar el transportín, pedir permiso en el
// trabajo, cargar el carnet. Avisar la mañana misma llega tarde para
// todo eso.
//
// POR QUÉ A LAS 19:00
// Es la hora en que la mayoría ya está en su casa y todavía puede
// organizar el día siguiente. Más tarde (22:00, como la racha) sería
// casi lo mismo que avisar en la mañana.
//
// UNA SOLA NOTIFICACIÓN POR VISITA, no por mascota: si alguien lleva
// dos animales el mismo día, recibe dos avisos, que es lo correcto —
// son dos horas distintas.
//
// Protegida con CRON_SECRET, igual que las otras dos rutas.

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

const HORA_ENVIO = '19:00'

// Texto según el tipo de visita. El motivo, si existe, dice más que el
// tipo, así que tiene prioridad.
function descripcionVisita(tipo: string | null, motivo: string | null): string {
  if (motivo && motivo.trim()) return motivo.trim()
  if (tipo === 'examenes') return 'exámenes'
  if (tipo === 'enfermedad') return 'control por enfermedad'
  if (tipo === 'tratamiento') return 'tratamiento'
  return 'control de rutina'
}

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

  // Mañana, en hora de Chile. Se construye a mediodía para que los
  // cambios de horario de verano no corran el día.
  const manianaDate = new Date()
  manianaDate.setDate(manianaDate.getDate() + 1)
  const maniana = fechaChile(manianaDate)

  // Paso 1: todas las visitas agendadas para mañana. Se consulta por
  // fecha primero (son pocas filas) en vez de recorrer usuario por
  // usuario: la mayoría de los días no habrá ninguna.
  const { data: visitas } = await supabase
    .from('visitas_veterinarias')
    .select('id, user_id, mascota_id, fecha, hora, tipo, motivo, veterinario')
    .eq('fecha', maniana)

  if (!visitas || visitas.length === 0) {
    return NextResponse.json({ mensaje: 'Sin visitas para mañana', fecha: maniana, enviados: 0 })
  }

  // Paso 2: de esos usuarios, solo los que tienen notificaciones
  // activas. Una visita agendada no autoriza a escribirle a alguien que
  // apagó los avisos.
  const idsUsuarios = Array.from(new Set(visitas.map(v => v.user_id).filter(Boolean)))
  const { data: activos } = await supabase
    .from('preferencias_usuario')
    .select('user_id')
    .eq('notificaciones_activas', true)
    .in('user_id', idsUsuarios)

  const conNotif = new Set((activos || []).map(a => a.user_id))
  if (conNotif.size === 0) {
    return NextResponse.json({ mensaje: 'Nadie con notificaciones activas', fecha: maniana, enviados: 0 })
  }

  // Paso 3: nombres de las mascotas involucradas.
  const idsMascotas = Array.from(new Set(visitas.map(v => v.mascota_id).filter(Boolean)))
  const { data: mascotas } = await supabase
    .from('mascotas')
    .select('id, nombre')
    .in('id', idsMascotas)
  const nombrePorMascota = new Map((mascotas || []).map(m => [m.id, m.nombre]))

  // Paso 4: suscripciones push de esos usuarios (alguien puede tener
  // más de una si instaló la app en varios dispositivos).
  const { data: subs } = await supabase
    .from('suscripciones_push')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', Array.from(conNotif))

  const subsPorUsuario = new Map<string, any[]>()
  for (const s of (subs || [])) {
    const arr = subsPorUsuario.get(s.user_id) || []
    arr.push(s)
    subsPorUsuario.set(s.user_id, arr)
  }

  let totalEnviados = 0
  let totalErrores = 0

  for (const v of visitas) {
    if (!conNotif.has(v.user_id)) continue

    const suscripciones = subsPorUsuario.get(v.user_id) || []
    if (suscripciones.length === 0) continue

    const nombre = nombrePorMascota.get(v.mascota_id) || 'tu mascota'
    const hora = v.hora ? ` a las ${String(v.hora).slice(0, 5)}` : ''
    const quien = v.veterinario ? ` con ${v.veterinario}` : ''
    const detalle = descripcionVisita(v.tipo, v.motivo)

    const payload = JSON.stringify({
      title: 'CHIQUI Entre Señales',
      body: `🏥 Mañana ${nombre} tiene hora${hora}${quien}: ${detalle}.`,
      url: '/prevencion',
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
        // Suscripción muerta (app desinstalada o permiso revocado): se
        // limpia para no seguir intentando en vano.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('suscripciones_push').delete().eq('id', sub.id)
        }
      }
    }
  }

  return NextResponse.json({
    hora: horaActual,
    fecha: maniana,
    visitas: visitas.length,
    enviados: totalEnviados,
    errores: totalErrores,
  })
}
