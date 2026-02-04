// public/sw.js
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200], // VIBRAÇÃO FÍSICA
      data: {
        url: data.url || '/app' // ARMAZENA O LINK
      }
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = event.notification.data.url
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})