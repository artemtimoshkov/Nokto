import { format } from 'date-fns'
import { fromKey } from '../../lib/dates'
import type { Book } from './types'

const mon = (k: string) => format(fromKey(k), 'MMM')
const year = (k: string) => k.slice(0, 4)

/**
 * When you read it, as short as it can be:
 * "Mar 2026", "Jan – Mar 2026", "Dec 2025 – Jan 2026", "since 3 Nov", "".
 */
export function readLabel(b: Pick<Book, 'status' | 'started_on' | 'finished_on'>): string {
  const { started_on: s, finished_on: f } = b
  if (b.status === 'reading') return s ? `since ${format(fromKey(s), 'd MMM')}` : ''
  if (!f) return s ? `Started ${mon(s)} ${year(s)}` : ''
  if (!s || s > f || s.slice(0, 7) === f.slice(0, 7)) return `${mon(f)} ${year(f)}`
  if (year(s) === year(f)) return `${mon(s)} – ${mon(f)} ${year(f)}`
  return `${mon(s)} ${year(s)} – ${mon(f)} ${year(f)}`
}

export interface ShelfGroup { key: string; title: string; books: Book[] }

const desc = (a: string | null, b: string | null) => (b ?? '').localeCompare(a ?? '')

/** "Reading now" first, then finished books by the year you finished them, newest first. */
export function shelfGroups(books: Book[]): ShelfGroup[] {
  const groups: ShelfGroup[] = []
  const reading = books.filter(b => b.status === 'reading')
    .sort((a, b) => desc(a.started_on, b.started_on) || b.created_at.localeCompare(a.created_at))
  if (reading.length) groups.push({ key: 'reading', title: 'Reading now', books: reading })

  const done = books.filter(b => b.status === 'finished')
    .sort((a, b) => desc(a.finished_on, b.finished_on) || b.created_at.localeCompare(a.created_at))
  for (const b of done) {
    const key = b.finished_on ? year(b.finished_on) : 'undated'
    let g = groups.find(x => x.key === key)
    if (!g) groups.push(g = { key, title: key === 'undated' ? 'Finished' : key, books: [] })
    g.books.push(b)
  }
  // Undated finished books go last.
  const i = groups.findIndex(g => g.key === 'undated')
  if (i >= 0) groups.push(...groups.splice(i, 1))
  return groups
}

/** Lessons / quotes with the blanks taken out. */
export const filled = (xs: string[]) => xs.map(x => x.trim()).filter(Boolean)
