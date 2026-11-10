import { addDays, addMonths, getDaysInMonth, getISODay, startOfISOWeek, format } from 'date-fns'
import type { Recurrence } from './types'
import { fromKey, toKey, today, ordinal } from './dates'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function withMonthDay(d: Date, day: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), 1)
  r.setDate(Math.min(day, getDaysInMonth(r)))
  return r
}

/** The next occurrence strictly after `from`, ignoring the end date. */
function stepAfter(rec: Recurrence, from: Date): Date {
  const interval = Math.max(1, rec.interval || 1)
  switch (rec.freq) {
    case 'daily': {
      if (rec.weekdaysOnly) {
        let d = addDays(from, 1)
        while (getISODay(d) >= 6) d = addDays(d, 1)
        return d
      }
      return addDays(from, interval)
    }
    case 'weekly': {
      const days = (rec.byWeekday?.length ? [...rec.byWeekday] : [getISODay(from)]).sort((a, b) => a - b)
      const cur = getISODay(from)
      const later = days.find(d => d > cur)
      if (later) return addDays(from, later - cur)
      const nextWeek = addDays(startOfISOWeek(from), 7 * interval)
      return addDays(nextWeek, days[0] - 1)
    }
    case 'monthly': {
      const day = rec.byMonthDay ?? from.getDate()
      return withMonthDay(addMonths(new Date(from.getFullYear(), from.getMonth(), 1), interval), day)
    }
  }
}

/** First date on/after `start` that matches the rule (e.g. weekly on Fri starting Tue → Fri). */
export function alignStart(rec: Recurrence, start: Date): Date {
  if (rec.freq === 'daily' && rec.weekdaysOnly && getISODay(start) >= 6) return stepAfter(rec, start)
  if (rec.freq === 'weekly' && rec.byWeekday?.length && !rec.byWeekday.includes(getISODay(start))) {
    const days = [...rec.byWeekday].sort((a, b) => a - b)
    const cur = getISODay(start)
    const later = days.find(d => d > cur)
    return later ? addDays(start, later - cur) : addDays(startOfISOWeek(start), 7 + days[0] - 1)
  }
  if (rec.freq === 'monthly' && rec.byMonthDay) {
    const thisMonth = withMonthDay(start, rec.byMonthDay)
    return thisMonth >= start ? thisMonth : withMonthDay(addMonths(new Date(start.getFullYear(), start.getMonth(), 1), 1), rec.byMonthDay)
  }
  return start
}

/**
 * Where a recurring to-do goes when it's ticked off: the next occurrence after
 * its due date that is also after today (so overdue repeats don't pile up).
 * Returns null when the series has ended.
 */
export function nextDue(rec: Recurrence, dueKey: string | null, now = today()): string | null {
  let d = dueKey ? fromKey(dueKey) : now
  let guard = 0
  do { d = stepAfter(rec, d) } while (d <= now && guard++ < 2000)
  if (rec.endsOn && d > fromKey(rec.endsOn)) return null
  return toKey(d)
}

export function describe(rec: Recurrence): string {
  const n = Math.max(1, rec.interval || 1)
  let s: string
  switch (rec.freq) {
    case 'daily':
      s = rec.weekdaysOnly ? 'Every weekday' : n === 1 ? 'Every day' : `Every ${n} days`
      break
    case 'weekly': {
      const days = (rec.byWeekday ?? []).slice().sort((a, b) => a - b)
      const names = days.length === 1 ? DAY_NAMES[days[0] - 1] : days.map(d => DAY_SHORT[d - 1]).join(', ')
      s = (n === 1 ? 'Every week' : `Every ${n} weeks`) + (names ? ` on ${names}` : '')
      break
    }
    case 'monthly': {
      const on = rec.byMonthDay ? ` on the ${ordinal(rec.byMonthDay)}` : ''
      s = n === 1 ? `Every month${on}` : n === 3 ? `Every quarter${on}` : n === 12 ? `Every year${on}` : `Every ${n} months${on}`
      break
    }
  }
  if (rec.endsOn) s += `, until ${format(fromKey(rec.endsOn), 'd MMM yyyy')}`
  return s
}

/** The preset list shown in the Repeat menu, adapted to the chosen date. */
export function presets(base: Date): { label: string; rule: Recurrence }[] {
  const wd = getISODay(base)
  const md = base.getDate()
  const rules: Recurrence[] = [
    { freq: 'daily', interval: 1 },
    { freq: 'daily', interval: 1, weekdaysOnly: true },
    { freq: 'weekly', interval: 1, byWeekday: [wd] },
    { freq: 'monthly', interval: 1, byMonthDay: md },
    { freq: 'monthly', interval: 3, byMonthDay: md },
  ]
  return rules.map(rule => ({ label: describe(rule), rule }))
}

export function sameRule(a: Recurrence | null, b: Recurrence | null): boolean {
  if (!a || !b) return a === b
  const norm = (r: Recurrence) => JSON.stringify({ f: r.freq, i: r.interval, w: r.byWeekday ?? [], m: r.byMonthDay ?? null, wd: !!r.weekdaysOnly, e: r.endsOn ?? null })
  return norm(a) === norm(b)
}
