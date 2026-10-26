self.addEventListener('push', event => {
  if (!event.data) return
  const payload = event.data.json()
  event.waitUntil(self.registration.showNotification(payload.title || 'LinkUp', {
    body: payload.body || 'You have a new notification.',
    data: { url: payload.url || '/notifications' }
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = event.notification.data?.url || '/notifications'
  event.waitUntil(clients.openWindow(new URL(path, self.location.origin).href))
})
