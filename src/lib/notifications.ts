export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

export type NotificationPreferences = {
  enabled: boolean
  followUpAlerts: boolean
  followUpTime: string
  dailyRouteReminder: boolean
  dailyRouteTime: string
  overdueProspectAlerts: boolean
  overdueProspectTime: string
}

export type NotificationReminderLog = {
  followUps: string
  route: string
  overdue: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  followUpAlerts: true,
  followUpTime: '08:00',
  dailyRouteReminder: true,
  dailyRouteTime: '07:30',
  overdueProspectAlerts: true,
  overdueProspectTime: '09:00',
}

export const DEFAULT_NOTIFICATION_LOG: NotificationReminderLog = {
  followUps: '',
  route: '',
  overdue: '',
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.requestPermission()
}

export async function registerRepRouteServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (error) {
    console.warn('[RepRoute] Service worker registration failed.', error)
    return null
  }
}

export async function showBrowserNotification({
  title,
  body,
  tag,
}: {
  title: string
  body: string
  tag: string
}) {
  if (getBrowserNotificationPermission() !== 'granted') {
    return false
  }

  const options = {
    body,
    tag,
    badge: '/icon-192.png',
    icon: '/icon-192.png',
    data: {
      url: '/',
    },
  }

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return true
    } catch (error) {
      console.warn('[RepRoute] Service worker notification failed, falling back to page notification.', error)
    }
  }

  new Notification(title, options)
  return true
}

export function getLocalDateKey(now = new Date()) {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function hasReminderTimePassed(time: string, now = new Date()) {
  const [hoursText, minutesText] = time.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return false
  }

  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
}
