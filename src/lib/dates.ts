import { addDays, format, parseISO, getISODay, isSameDay } from 'date-fns'

export const toKey = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromKey = (k: string) => parseISO(k)
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

/** Saturday of this weekend — or today if it's already the weekend. */
export function thisWeekend(base = today()): Date {
  const iso = getISODay(base)
  if (iso >= 6) return base
  return addDays(base, 6 - iso)
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Human label for a due date relative to today: Today, Tomorrow, Fri, 14 Nov. */
export function dayLabel(key: string, base = today()): string {
  const d = fromKey(key)
  if (isSameDay(d, base)) return 'Today'
  if (isSameDay(d, addDays(base, 1))) return 'Tomorrow'
  if (isSameDay(d, addDays(base, -1))) return 'Yesterday'
  const diff = Math.round((d.getTime() - base.getTime()) / 86400000)
  if (diff > 1 && diff < 7) return format(d, 'EEEE')
  return format(d, d.getFullYear() === base.getFullYear() ? 'd MMM' : 'd MMM yyyy')
}

export function timeLabel(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return format(d, m === 0 ? 'h a' : 'h:mm a').toLowerCase()
}
