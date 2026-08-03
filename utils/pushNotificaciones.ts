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
export async function activarNotificaciones(): Promise<{ exito: boolean; error?: string }> {
  if (!notificacionesSoportadas()) {
    return { exito: false, error: 'Este navegador no soporta notificaciones.' }
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    return { exito: false, error: 'No diste permiso para las notificaciones.' }
  }

  // navigator.serviceWorker.ready puede no resolverse NUNCA si el
  // service worker no llega a activarse. Ese await dejaba el boton
  // en "Activando..." para siempre, sin error ni pista.
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

  // Sin este try/catch, un fallo aca rompia la promesa entera y el
  // componente se quedaba congelado en "Activando...".
  let subscription: PushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  } catch (e: any) {
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

  const subscriptionJson = subscription.toJSON()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { exito: false, error: 'Sesión no encontrada.' }

  const { error } = await supabase.from('suscripciones_push').upsert({
    user_id: user.id,
    endpoint: subscriptionJson.endpoint!,
    p256dh: subscriptionJson.keys!.p256dh,
    auth: subscriptionJson.keys!.auth,
  }, { onConflict: 'endpoint' })

  if (error) return { exito: false, error: 'No se pudo guardar la suscripción.' }

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
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
