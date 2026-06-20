// Service Worker de CHIQUI Entre Señales.
//
// Por que existe: Chrome (y otros navegadores basados en Chromium) solo
// muestran el boton de "Instalar app" si, ademas del manifest, existe un
// service worker registrado con un manejador de "fetch". Sin esto, el
// manifest por si solo no alcanza para que la app sea instalable.
//
// Este service worker tiene dos responsabilidades:
// 1) El manejador de fetch (abajo), que satisface el requisito de
//    instalabilidad. Por ahora simplemente deja pasar todas las
//    peticiones de red sin modificarlas (no se esta cacheando nada para
//    uso offline todavia, eso quedaria como una mejora futura si se
//    decide agregar soporte sin conexion).
// 2) El manejador de "push" (mas abajo), que es lo que permite mostrar
//    una notificacion cuando el servidor manda un recordatorio, incluso
//    con la app cerrada. Esto se activara en la siguiente entrega
//    cuando se conecte el sistema de notificaciones push.

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
// notificacion (ver la funcion programada que se agregara mas adelante),
// el navegador despierta este service worker y dispara este evento,
// incluso si la app esta cerrada.
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
