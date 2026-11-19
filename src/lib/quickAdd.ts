import { addDays, addMonths, getISODay, isSameISOWeek } from 'date-fns'
import { thisWeekend, toKey } from './dates'
import type { Priority } from './types'

/**
 * Quick-add parsing: pulls a due date, time and priority out of a new task's
 * text, Todoist-style. "Go for a walk on December 12 at 5pm p2" →
 * { title: 'Go for a walk', date: '…-12-12', time: '17:00', priority: 2 }.
 */
export interface QuickAdd {
  title: string
  date: string | null // yyyy-MM-dd
  time: string | null // HH:mm
  priority: Priority | null
}

export interface QuickAddOptions {
  /** Look for a date/time (off once the user has picked one by hand). */
  date?: boolean
  /** Look for p1/p2/p3 (off once the user has picked one by hand). */
  priority?: boolean
  now?: Date
}

type Kind = 'date' | 'time' | 'priority'
interface Hit { kind: Kind; start: number; end: number; value: string | Priority }
interface Rule { kind: Kind; re: RegExp; read(m: RegExpExecArray, today: Date): string | Priority | null }

const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?'
const WEEKDAY = '(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sunday)'
const DATE_PREP = '(?:(?:on|by|due|for)\\s+)?'
const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

const monthIndex = (s: string) => ['ja', 'fe', 'mar', 'ap', 'may', 'jun', 'jul', 'au', 'se', 'oc', 'no', 'de']
  .findIndex(p => s.toLowerCase().startsWith(p))
const isoWeekday = (s: string) => ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].indexOf(s.toLowerCase().slice(0, 2)) + 1

/** A calendar date; without a year, a date already past rolls to next year. */
function calendarDate(month: number, day: number, year: string | undefined, today: Date): string | null {
  const y = year ? Number(year) : today.getFullYear()
  let d = new Date(y, month, day)
  if (d.getMonth() !== month) return null // e.g. 31 February
  if (!year && d < today) d = new Date(y + 1, month, day)
  return toKey(d)
}

function weekday(name: string, modifier: string | undefined, today: Date): string {
  let d = addDays(today, (isoWeekday(name) - getISODay(today) + 7) % 7)
  // "next friday" = the Friday of next week, not the one still coming this week.
  if (modifier?.toLowerCase() === 'next' && isSameISOWeek(d, today)) d = addDays(d, 7)
  return toKey(d)
}

function clock(h: number, m: number, meridiem?: string): string | null {
  if (meridiem) {
    if (h < 1 || h > 12) return null
    const pm = meridiem.toLowerCase().startsWith('p')
    h = (h % 12) + (pm ? 12 : 0)
  }
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Order matters: earlier rules win where matches overlap.
const RULES: Rule[] = [
  { kind: 'date', re: new RegExp(`\\b${DATE_PREP}(?:the\\s+)?day after (?:tomorrow|tmrw?)\\b`, 'gi'),
    read: (_, t) => toKey(addDays(t, 2)) },
  { kind: 'date', re: new RegExp(`\\b${DATE_PREP}${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'gi'),
    read: (m, t) => calendarDate(monthIndex(m[1]), Number(m[2]), m[3], t) },
  { kind: 'date', re: new RegExp(`\\b${DATE_PREP}(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?:,?\\s+(\\d{4}))?\\b`, 'gi'),
    read: (m, t) => calendarDate(monthIndex(m[2]), Number(m[1]), m[3], t) },
  { kind: 'date', re: /\bin\s+(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d{1,3})\s+(day|week|month)s?\b/gi,
    read: (m, t) => {
      const n = NUMBERS[m[1].toLowerCase()] ?? Number(m[1])
      const unit = m[2].toLowerCase()
      return toKey(unit === 'month' ? addMonths(t, n) : addDays(t, unit === 'week' ? n * 7 : n))
    } },
  { kind: 'date', re: /\b(?:(?:on|by|for)\s+)?(?:(this|next)\s+)?weekend\b/gi,
    read: (m, t) => toKey(m[1]?.toLowerCase() === 'next' ? addDays(thisWeekend(t), 7) : thisWeekend(t)) },
  { kind: 'date', re: /\bnext week\b/gi,
    read: (_, t) => toKey(addDays(t, 8 - getISODay(t))) }, // next Monday
  { kind: 'date', re: new RegExp(`\\b${DATE_PREP}(today|tonight|tomorrow|tmrw|tmr)\\b`, 'gi'),
    read: (m, t) => toKey(addDays(t, /^(today|tonight)$/i.test(m[1]) ? 0 : 1)) },
  { kind: 'date', re: new RegExp(`\\b${DATE_PREP}(?:(this|next)\\s+)?${WEEKDAY}\\b`, 'gi'),
    read: (m, t) => weekday(m[2], m[1], t) },
  { kind: 'time', re: /(?:\b(?:at|by)\s+|@\s*)?\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?)(?![a-z])/gi,
    read: m => clock(Number(m[1]), Number(m[2] ?? 0), m[3]) },
  { kind: 'time', re: /(?:\b(?:at|by)\s+|@\s*)?\b([01]?\d|2[0-3]):([0-5]\d)\b/gi,
    read: m => clock(Number(m[1]), Number(m[2])) },
  { kind: 'time', re: /(?:\b(?:at|by)\s+|@\s*)?\b(noon|midnight)\b/gi,
    read: m => m[1].toLowerCase() === 'noon' ? '12:00' : '00:00' },
  { kind: 'priority', re: /\bp([123])\b/gi,
    read: m => Number(m[1]) as Priority },
]

function tidy(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '')
}

export function parseQuickAdd(text: string, opts: QuickAddOptions = {}): QuickAdd {
  const { date: wantDate = true, priority: wantPriority = true, now = new Date() } = opts
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  const hits: Hit[] = []
  for (const rule of RULES) {
    if (rule.kind === 'priority' ? !wantPriority : !wantDate) continue
    rule.re.lastIndex = 0
    for (let m: RegExpExecArray | null; (m = rule.re.exec(text));) {
      const start = m.index, end = start + m[0].length
      if (hits.some(h => start < h.end && h.start < end)) continue
      const value = rule.read(m, today)
      if (value != null) hits.push({ kind: rule.kind, start, end, value })
    }
  }

  // When something is said twice, the last mention wins; the others stay in the title.
  const last = (kind: Kind) => hits.filter(h => h.kind === kind).sort((a, b) => b.start - a.start)[0]
  const used = [last('date'), last('time'), last('priority')].filter((h): h is Hit => !!h)

  let date = (used.find(h => h.kind === 'date')?.value as string | undefined) ?? null
  const time = (used.find(h => h.kind === 'time')?.value as string | undefined) ?? null
  const priority = (used.find(h => h.kind === 'priority')?.value as Priority | undefined) ?? null

  // A time on its own means today — or tomorrow once that time has passed.
  if (time && !date) {
    const [h, m] = time.split(':').map(Number)
    const at = new Date(today); at.setHours(h, m)
    date = toKey(at <= now ? addDays(today, 1) : today)
  }

  let title = text
  for (const h of [...used].sort((a, b) => b.start - a.start)) title = title.slice(0, h.start) + ' ' + title.slice(h.end)
  title = tidy(title)
  if (!title) title = text.trim() // "Tomorrow" alone stays a task called "Tomorrow"

  return { title, date, time, priority }
}
