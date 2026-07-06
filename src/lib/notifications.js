import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

const IS_NATIVE = Capacitor.isNativePlatform()

export function idHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

export async function requestNotificationPermission() {
  if (!IS_NATIVE) return false
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

export async function scheduleBillReminder(id, title, body, date, reminderDays = 3) {
  if (!IS_NATIVE) return false
  const due = new Date(date)
  const reminder = new Date(due)
  reminder.setDate(due.getDate() - reminderDays)
  reminder.setHours(9, 0, 0, 0)

  if (reminder <= new Date()) return false

  await LocalNotifications.schedule({
    notifications: [
      {
        id: idHash(id),
        title,
        body,
        schedule: { at: reminder },
        extra: { billId: id }
      }
    ]
  })
  return true
}

export async function scheduleDailyReminder(id, title, body, hour = 20, minute = 0) {
  if (!IS_NATIVE) return false
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { on: { hour, minute } },
        extra: { recurring: true }
      }
    ]
  })
  return true
}

export async function cancelNotifications(ids) {
  if (!IS_NATIVE) return
  await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
}

export async function cancelAllNotifications() {
  if (!IS_NATIVE) return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications })
  }
}
