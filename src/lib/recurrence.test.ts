import { describe as d, it, expect } from 'vitest'
import { nextDue, presets, describe, alignStart } from './recurrence'
import { fromKey, toKey, thisWeekend } from './dates'
import { groupTodos } from './sort'
import type { Todo } from './types'

const TUE = fromKey('2026-11-10') // Tuesday

d('presets', () => {
  it('adapt to the chosen date', () => {
    expect(presets(TUE).map(p => p.label)).toEqual([
      'Every day', 'Every weekday', 'Every week on Tuesday',
      'Every month on the 10th', 'Every quarter on the 10th',
    ])
    expect(presets(fromKey('2026-11-13'))[2].label).toBe('Every week on Friday')
  })
})

d('nextDue', () => {
  it('daily', () => expect(nextDue({ freq: 'daily', interval: 1 }, '2026-11-10', TUE)).toBe('2026-11-11'))
  it('every 3 days', () => expect(nextDue({ freq: 'daily', interval: 3 }, '2026-11-10', TUE)).toBe('2026-11-13'))
  it('weekday skips weekend', () => expect(nextDue({ freq: 'daily', interval: 1, weekdaysOnly: true }, '2026-11-13', fromKey('2026-11-13'))).toBe('2026-11-16'))
  it('weekly on Tuesday', () => expect(nextDue({ freq: 'weekly', interval: 1, byWeekday: [2] }, '2026-11-10', TUE)).toBe('2026-11-17'))
  it('weekly Mon+Wed+Fri', () => {
    const r = { freq: 'weekly' as const, interval: 1, byWeekday: [1, 3, 5] }
    expect(nextDue(r, '2026-11-11', fromKey('2026-11-11'))).toBe('2026-11-13')
    expect(nextDue(r, '2026-11-13', fromKey('2026-11-13'))).toBe('2026-11-16')
  })
  it('every 2 weeks on Mon+Thu', () => {
    const r = { freq: 'weekly' as const, interval: 2, byWeekday: [1, 4] }
    expect(nextDue(r, '2026-11-12', fromKey('2026-11-12'))).toBe('2026-11-23')
  })
  it('monthly clamps to month end', () => {
    const r = { freq: 'monthly' as const, interval: 1, byMonthDay: 31 }
    expect(nextDue(r, '2027-01-31', fromKey('2027-01-31'))).toBe('2027-02-28')
    expect(nextDue(r, '2027-02-28', fromKey('2027-02-28'))).toBe('2027-03-31')
  })
  it('quarterly', () => expect(nextDue({ freq: 'monthly', interval: 3, byMonthDay: 10 }, '2026-11-10', TUE)).toBe('2027-02-10'))
  it('overdue daily rolls past today', () => expect(nextDue({ freq: 'daily', interval: 1 }, '2026-11-01', TUE)).toBe('2026-11-11'))
  it('ends on date', () => {
    expect(nextDue({ freq: 'daily', interval: 1, endsOn: '2026-11-10' }, '2026-11-10', TUE)).toBeNull()
    expect(nextDue({ freq: 'daily', interval: 1, endsOn: '2026-11-11' }, '2026-11-10', TUE)).toBe('2026-11-11')
  })
})

d('helpers', () => {
  it('describe custom', () => expect(describe({ freq: 'weekly', interval: 3, byWeekday: [1, 5] })).toBe('Every 3 weeks on Mon, Fri'))
  it('alignStart moves to first matching weekday', () => expect(toKey(alignStart({ freq: 'weekly', interval: 1, byWeekday: [5] }, TUE))).toBe('2026-11-13'))
  it('this weekend', () => {
    expect(toKey(thisWeekend(TUE))).toBe('2026-11-14')
    expect(toKey(thisWeekend(fromKey('2026-11-15')))).toBe('2026-11-15')
  })
})

d('groupTodos', () => {
  const mk = (id: string, p: 1 | 2 | 3, date: string | null, time: string | null = null): Todo =>
    ({ id, title: id, area: null, priority: p, due_date: date, due_time: time, recurrence: null, completed_at: null, created_at: id })
  it('sections and order', () => {
    const s = groupTodos([
      mk('a', 3, '2026-11-10'), mk('b', 1, '2026-11-10', '18:00'), mk('c', 1, '2026-11-10', '09:00'),
      mk('d', 2, '2026-11-08'), mk('e', 1, null), mk('f', 2, '2026-11-12'),
    ], TUE)
    expect(s.map(x => x.key)).toEqual(['overdue', 'today', '2026-11-12', 'none'])
    expect(s[1].todos.map(x => x.id)).toEqual(['c', 'b', 'a'])
  })
})
