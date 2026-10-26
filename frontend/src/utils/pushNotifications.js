import { api } from './api'

function decodeApplicationServerKey(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0))
}

export async function getPushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, subscribed: false, permission: 'unsupported' }
  }
  const [subscription, serverState] = await Promise.all([
    navigator.serviceWorker.getRegistration('/').then(registration => registration?.pushManager.getSubscription()),
    api.get('/api/v1/settings/push/subscription/')
  ])
  return {
    supported: true,
    subscribed: Boolean(subscription && serverState.subscribed),
    permission: Notification.permission
  }
}

export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('This browser does not support push notifications.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const { public_key: publicKey } = await api.get('/api/v1/settings/push/config/')
  if (!publicKey) throw new Error('Browser push is not configured on this server yet.')
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeApplicationServerKey(publicKey)
  })
  await api.post('/api/v1/settings/push/subscription/', subscription.toJSON())
  return true
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await api.delete('/api/v1/settings/push/subscription/', { endpoint: subscription.endpoint })
  await subscription.unsubscribe()
}
