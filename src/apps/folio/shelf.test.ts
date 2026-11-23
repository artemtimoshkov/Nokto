import { describe, expect, it } from 'vitest'
import { readLabel, shelfGroups } from './shelf'
import { emptyBook, type Book } from './types'

const book = (p: Partial<Book>): Book => ({ ...emptyBook(), id: Math.random().toString(), created_at: '2026-01-01T00:00:00Z', ...p })

describe('readLabel', () => {
  it('shows when you started a book you are reading', () => {
    expect(readLabel({ status: 'reading', started_on: '2026-11-03', finished_on: null })).toBe('since 3 Nov')
    expect(readLabel({ status: 'reading', started_on: null, finished_on: null })).toBe('')
  })
  it('collapses the range for finished books', () => {
    expect(readLabel({ status: 'finished', started_on: '2026-03-02', finished_on: '2026-03-20' })).toBe('Mar 2026')
    expect(readLabel({ status: 'finished', started_on: '2026-01-10', finished_on: '2026-03-20' })).toBe('Jan – Mar 2026')
    expect(readLabel({ status: 'finished', started_on: '2025-12-10', finished_on: '2026-01-04' })).toBe('Dec 2025 – Jan 2026')
    expect(readLabel({ status: 'finished', started_on: null, finished_on: '2024-07-01' })).toBe('Jul 2024')
    expect(readLabel({ status: 'finished', started_on: null, finished_on: null })).toBe('')
  })
})

describe('shelfGroups', () => {
  it('puts reading first, then finished by year, undated last', () => {
    const g = shelfGroups([
      book({ title: 'A', status: 'finished', finished_on: '2025-05-01' }),
      book({ title: 'B', status: 'finished', finished_on: null }),
      book({ title: 'C', status: 'reading', started_on: '2026-10-01' }),
      book({ title: 'D', status: 'finished', finished_on: '2026-02-01' }),
      book({ title: 'E', status: 'finished', finished_on: '2026-06-01' }),
    ])
    expect(g.map(x => x.title)).toEqual(['Reading now', '2026', '2025', 'Finished'])
    expect(g[1].books.map(b => b.title)).toEqual(['E', 'D'])
  })
})
