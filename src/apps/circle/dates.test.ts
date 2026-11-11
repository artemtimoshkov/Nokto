import { describe, expect, it } from 'vitest'
import { agoLabel, daysUntilBirthday, nextBirthday, turningAge, untilLabel } from './dates'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('birthdays', () => {
  it('is today when the date matches', () => {
    expect(daysUntilBirthday(11, 11, d(2026, 11, 11))).toBe(0)
  })
  it('rolls over to next year once it has passed', () => {
    expect(nextBirthday(1, 5, d(2026, 11, 11))).toEqual(d(2027, 1, 5))
    expect(daysUntilBirthday(11, 10, d(2026, 11, 11))).toBe(364)
  })
  it('puts 29 February on the 28th in non-leap years', () => {
    expect(nextBirthday(2, 29, d(2026, 1, 1))).toEqual(d(2026, 2, 28))
    expect(nextBirthday(2, 29, d(2028, 1, 1))).toEqual(d(2028, 2, 29))
  })
  it('works out the age they are turning', () => {
    expect(turningAge(1994, 3, 14, d(2026, 11, 11))).toBe(33)
    expect(turningAge(1994, 12, 1, d(2026, 11, 11))).toBe(32)
    expect(turningAge(null, 12, 1, d(2026, 11, 11))).toBeNull()
  })
  it('labels the wait', () => {
    expect(untilLabel(0)).toBe('Today')
    expect(untilLabel(1)).toBe('Tomorrow')
    expect(untilLabel(5)).toBe('in 5 days')
    expect(untilLabel(14)).toBe('in 2 weeks')
    expect(untilLabel(120)).toBe('in 4 months')
  })
})

describe('last contact', () => {
  const base = d(2026, 11, 11)
  it('labels how long ago', () => {
    expect(agoLabel('2026-11-11', base)).toBe('Today')
    expect(agoLabel('2026-11-10', base)).toBe('Yesterday')
    expect(agoLabel('2026-11-07', base)).toBe('4 days ago')
    expect(agoLabel('2026-10-28', base)).toBe('2 weeks ago')
    expect(agoLabel('2026-09-30', base)).toBe('2 months ago')
    expect(agoLabel('2025-10-01', base)).toBe('1 year ago')
    expect(agoLabel('2023-06-01', base)).toBe('3 years ago')
  })
})
