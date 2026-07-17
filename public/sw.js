// Service Worker de CHIQUI Entre Señales.
//
// Por que existe: Chrome (y otros navegadores basados en Chromium) solo
// muestran el boton de "Instalar app" si, ademas del manifest, existe un
// service worker registrado con un manejador de "fetch". Sin esto, el
// manifest por si solo no alcanza para que la app sea instalable.
//
// Este service worker tiene tres responsabilidades:
// 1) El manejador de fetch (abajo), que satisface el requisito de
//    instalabilidad. Por ahora simplemente deja pasar todas las
//    peticiones de red sin modificarlas (no se esta cacheando nada para
//    uso offline todavia, eso quedaria como una mejora futura si se
//    decide agregar soporte sin conexion).
// 2) El manejador de "push", que es lo que permite mostrar una
//    notificacion cuando el servidor manda un recordatorio, incluso con
//    la app cerrada.
// 3) El manejador de "pushsubscriptionchange" (NUEVO) -- el navegador
//    dispara este evento cuando invalida o rota una suscripcion push
//    por su cuenta (esto puede pasar sin ningun aviso visible, es
//    comportamiento normal del navegador/servicio de push). Sin este
//    manejador, la app nunca se enteraba de que la suscripcion cambio,
//    y la persona tenia que darse cuenta sola (viendo el boton
//    "Activar" de nuevo) y reactivar manualmente. Ahora la app se
//    vuelve a suscribir sola en segundo plano y avisa al servidor.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Manejador de fetch requerido para que Chrome considere la app
// instalable. Por ahora no hace caching, solo deja pasar las peticiones
// normalmente.
self.addEventListener('fetch', () => {
  // Sin logica de cache por ahora -- las peticiones siguen su curso normal.
})

// Manejador de notificaciones push. Cuando el servidor envia una
// notificacion, el navegador despierta este service worker y dispara
// este evento, incluso si la app esta cerrada.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let datos
  try {
    datos = event.data.json()
  } catch {
    datos = { title: 'CHIQUI Entre Señales', body: event.data.text() }
  }

  const opciones = {
    body: datos.body || '¿Cómo estuvo tu compañero hoy?',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: datos.url || '/dashboard' },
  }

  event.waitUntil(
    self.registration.showNotification(datos.title || 'CHIQUI Entre Señales', opciones)
  )
})

// Al tocar la notificacion, abre (o enfoca) la app en la pantalla
// indicada (por defecto, el dashboard).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// NUEVO -- se dispara cuando el navegador invalida o rota la
// suscripcion push por su cuenta (sin que la persona haga nada). Antes
// esto pasaba en silencio: la app quedaba "activada" en la base de
// datos pero sin forma real de recibir avisos, hasta que la persona
// entraba a Perfil y notaba que decia "Activar" de nuevo.
//
// Ahora: apenas ocurre, nos volvemos a suscribir usando la misma clave
// (applicationServerKey) que tenia la suscripcion vieja, y le avisamos
// al servidor para que reemplace el registro guardado -- todo esto
// pasa solo, sin que la persona tenga que abrir la app ni hacer nada.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSubscription = event.oldSubscription
        const applicationServerKey = oldSubscription
          ? oldSubscription.options.applicationServerKey
          : event.newSubscription
            ? event.newSubscription.options.applicationServerKey
            : null

        if (!applicationServerKey) return // no hay forma segura de resuscribir

        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })

        const subJson = newSubscription.toJSON()

        await fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            oldEndpoint: oldSubscription ? oldSubscription.endpoint : null,
            newEndpoint: subJson.endpoint,
            newKeys: subJson.keys,
          }),
        })
      } catch {
        // Si algo falla aca, no hay mucho mas que hacer desde el
        // service worker -- la proxima vez que la persona abra Perfil,
        // va a ver el boton "Activar" y podra reactivar manualmente.
      }
    })()
  )
})
