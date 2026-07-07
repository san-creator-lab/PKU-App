/** Local-timezone date helpers. All app "days" are the device's local days. */

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Monday of the week containing the given date (ISO week start). */
export function weekStartISO(iso: string = todayISO()): string {
  const d = new Date(`${iso}T12:00:00`)
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

export function formatDateNL(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatShortNL(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatTimeNL(timestamptz: string): string {
  return new Date(timestamptz).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
