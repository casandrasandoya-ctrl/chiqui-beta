'use client'
import { createClient } from '@/utils/supabase/client'

// Convierte la clave publica VAPID (texto base64) al formato Uint8Array
// que pide la API nativa del navegador. Sin esto, pushManager.subscribe
// rechaza la clave.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// true si el navegador actual soporta notificaciones push en absoluto.
// En iPhone, esto solo es true DESPUES de instalar la PWA a la pantalla
// de inicio -- una pestaña normal de Safari no lo soporta.
export function notificacionesSoportadas(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Detecta si estamos en iOS/iPadOS, para mostrar instrucciones
// especiales de "agregar a inicio" cuando haga falta.
export function esIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// Detecta si la app ya esta corriendo instalada (modo standalone), que
// es requisito en iOS para que las notificaciones funcionen.
export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
}

// Pide permiso de notificaciones, se suscribe ante el navegador, y
// guarda la suscripcion en Supabase para poder usarla despues desde el
// servidor.
// Traduce el error del navegador a algo que la persona pueda
// entender y, si corresponde, resolver.
function manejarErrorSubscribe(e: any): { exito: boolean; error?: string } {
    // Mensajes distintos segun el fallo, para que la persona sepa
    // si puede hacer algo o no.
    const nombre = String(e?.name || '')
    if (nombre === 'NotAllowedError') {
      return { exito: false, error: 'Tu teléfono bloqueó las notificaciones para CHIQUI. Actívalas desde Configuración → Apps → CHIQUI → Notificaciones.' }
    }
    if (nombre === 'AbortError' || nombre === 'NotSupportedError') {
      return { exito: false, error: 'Este navegador no pudo registrar las notificaciones. Si estás en iPhone, agrega CHIQUI a la pantalla de inicio y ábrela desde ahí.' }
    }
    return { exito: false, error: 'No se pudo activar (' + (nombre || 'error desconocido') + '). Intenta de nuevo en unos minutos.' }
}
export async function activarNotificaciones(): Promise<{ exito: boolean; error?: string }> {
  if (!notificacionesSoportadas()) {
    return { exito: false, error: 'Este navegador no soporta notificaciones.' }
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    return { exito: false, error: 'No diste permiso para las notificaciones.' }
  }

  // CAUSA 1: al desplegar una versión nueva, el service worker se
  // reinstala. En esa primera visita puede estar aún instalándose y
  // serviceWorker.ready no responde — por eso el fallo se arreglaba
  // solo al recargar. Registrarlo explícitamente lo despierta.
  // register() es idempotente: si ya existe, devuelve el mismo.
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    // Si ya estaba registrado o el navegador lo rechaza, seguimos:
    // el ready de abajo dirá si hay algo utilizable.
  }

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(resolver => setTimeout(() => resolver(null), 12000)),
  ])
  if (!registration) {
    return { exito: false, error: 'La app no terminó de prepararse. Cierra CHIQUI por completo, vuelve a abrirla e intenta de nuevo.' }
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    return { exito: false, error: 'Falta configuración del servidor.' }
  }

  const opcionesSub: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  }

  // CAUSA 2: si ya hay una suscripción de un intento anterior, se
  // reutiliza. Crear otra encima lanzaría InvalidStateError y el
  // problema se volvería permanente, no pasajero.
  let subscription: PushSubscription | null = await registration.pushManager.getSubscription()

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe(opcionesSub)
    } catch (primerError: any) {
      const primerNombre = String(primerError?.name || '')

      // Suscripción vieja con OTRA clave VAPID: hay que cancelarla
      // antes de poder crear la nueva. Sin esto, falla para siempre.
      if (primerNombre === 'InvalidStateError') {
        try {
          const vieja = await registration.pushManager.getSubscription()
          if (vieja) await vieja.unsubscribe()
        } catch { /* si no se puede cancelar, el reintento dirá */ }
      }

      // CAUSA 3: fallo pasajero justo después de un despliegue. Un
      // solo reintento: si falla dos veces seguidas, es un problema
      // real y hay que decirlo en vez de insistir.
      if (primerNombre === 'InvalidStateError' || primerNombre === 'AbortError' || primerNombre === '') {
        await new Promise(resolver => setTimeout(resolver, 1500))
        try {
          subscription = await registration.pushManager.subscribe(opcionesSub)
        } catch { subscription = null }
      }

      if (!subscription) {
        const e: any = primerError
        return manejarErrorSubscribe(e)
      }
    }
  }

  // Red de seguridad y, de paso, lo que TypeScript necesita para
  // saber que aqui subscription ya no puede ser null.
  if (!subscription) {
    return { exito: false, error: 'No se pudo crear la suscripción. Cierra la app e intenta de nuevo.' }
  }

  const subscriptionJson = subscription.toJSON()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { exito: false, error: 'Sesión no encontrada.' }

  // ¿Ya está guardada esta misma suscripción? Entonces no hay nada
  // que escribir. Volver a hacer upsert obliga a un UPDATE, y si
  // falta la política RLS de UPDATE eso falla — aunque el dato en la
  // base ya sea correcto. Ese era el error que veían las usuarias al
  // intentar activar por segunda vez.
  const { data: yaGuardada } = await supabase
    .from('suscripciones_push')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', subscriptionJson.endpoint!)
    .maybeSingle()

  if (yaGuardada) return { exito: true }

  // No existe: INSERT limpio. No hay nada que actualizar, así que no
  // hace falta el upsert. Tener varias filas por persona es correcto
  // y esperado: una por dispositivo. Las que mueren las limpia el
  // cron cuando el envío devuelve 404 o 410.
  const { error } = await supabase.from('suscripciones_push').insert({
    user_id: user.id,
    endpoint: subscriptionJson.endpoint!,
    p256dh: subscriptionJson.keys!.p256dh,
    auth: subscriptionJson.keys!.auth,
  })

  if (error) {
    // El mensaje real de Postgres viaja tal cual. La frase genérica
    // de antes nos tuvo cuatro rondas adivinando la causa.
    return { exito: false, error: 'No se pudo guardar la suscripción: ' + (error.message || 'error desconocido') }
  }

  return { exito: true }
}

// Cancela la suscripcion, tanto ante el navegador como en Supabase.
export async function desactivarNotificaciones(): Promise<void> {
  if (!notificacionesSoportadas()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    const supabase = createClient()
    await supabase.from('suscripciones_push').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
}

// Revisa si el navegador actual ya tiene una suscripcion activa (util
// para saber que mostrar en la UI: boton de "Activar" o de "Desactivar").
export async function tieneSuscripcionActiva(): Promise<boolean> {
  if (!notificacionesSoportadas()) return false
  try {
    // Mismo trato que al activar: despertar el service worker y no
    // esperar para siempre. Antes, si ready no resolvia, esta
    // funcion se colgaba y el componente —que devuelve null
    // mientras carga— hacia DESAPARECER toda la sección de
    // recordatorio de la pantalla.
    try {
      await navigator.serviceWorker.register('/sw.js')
    } catch { /* ya registrado o rechazado: seguimos */ }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolver => setTimeout(() => resolver(null), 8000)),
    ])
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
