import { addYears, differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns'
import { fromKey, today } from '../../lib/dates'

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** This year's birthday; 29 Feb falls on 28 Feb in non-leap years. */
const inYear = (y: number, month: number, day: number) =>
  new Date(y, month - 1, month === 2 && day === 29 && !isLeap(y) ? 28 : day)

/** The next birthday on or after `base`. */
export function nextBirthday(month: number, day: number, base = today()): Date {
  const d = inYear(base.getFullYear(), month, day)
  return d < base ? inYear(base.getFullYear() + 1, month, day) : d
}

export const daysUntilBirthday = (month: number, day: number, base = today()) =>
  differenceInCalendarDays(nextBirthday(month, day, base), base)

/** Age they turn on their next birthday, if the year is known. */
export const turningAge = (year: number | null, month: number, day: number, base = today()) =>
  year ? nextBirthday(month, day, base).getFullYear() - year : null

/** "14 March" or "14 March 1994". */
export const birthdayLabel = (month: number, day: number, year?: number | null) =>
  format(new Date(2000, month - 1, day), 'd MMMM') + (year ? ` ${year}` : '')

/** "Today", "Tomorrow", "in 5 days", "in 3 months". */
export function untilLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `in ${days} days`
  if (days < 45) { const w = Math.round(days / 7); return `in ${w} ${w === 1 ? 'week' : 'weeks'}` }
  const m = Math.round(days / 30.4)
  return `in ${m} months`
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", "5 months ago", "2 years ago". */
export function agoLabel(key: string, base = today()): string {
  const d = fromKey(key)
  const days = differenceInCalendarDays(base, d)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) { const w = Math.floor(days / 7); return `${w} ${w === 1 ? 'week' : 'weeks'} ago` }
  const months = differenceInCalendarMonths(base, d)
  if (months < 12) return `${Math.max(1, months)} ${months <= 1 ? 'month' : 'months'} ago`
  const years = base < addYears(d, 2) ? 1 : Math.floor(months / 12)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}
