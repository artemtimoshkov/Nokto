import { describe, it, expect } from 'vitest'
import { parseQuickAdd } from './quickAdd'

// Wednesday 18 Nov 2026, 10:00
const NOW = new Date(2026, 10, 18, 10, 0)
const p = (text: string, opts = {}) => parseQuickAdd(text, { now: NOW, ...opts })

describe('dates', () => {
  it('month and day, dropping the "on"', () =>
    expect(p('Go for a walk on December 12')).toEqual({ title: 'Go for a walk', date: '2026-12-12', time: null, priority: null }))
  it('day before month, ordinals, abbreviations', () => {
    expect(p('Dentist 12th of Dec').date).toBe('2026-12-12')
    expect(p('Dentist 3 jan').date).toBe('2027-01-03')
    expect(p('Dentist Dec. 1st').date).toBe('2026-12-01')
  })
  it('past dates roll to next year unless a year is given', () => {
    expect(p('Taxes March 3').date).toBe('2027-03-03')
    expect(p('Taxes March 3, 2026').date).toBe('2026-03-03')
  })
  it('rejects impossible dates', () =>
    expect(p('Party Feb 31')).toMatchObject({ title: 'Party Feb 31', date: null }))
  it('relative words', () => {
    expect(p('Call mom today')).toMatchObject({ title: 'Call mom', date: '2026-11-18' })
    expect(p('Call mom tonight').date).toBe('2026-11-18')
    expect(p('Call mom tomorrow').date).toBe('2026-11-19')
    expect(p('Call mom tmrw').date).toBe('2026-11-19')
    expect(p('Call mom the day after tomorrow')).toMatchObject({ title: 'Call mom', date: '2026-11-20' })
    expect(p('Renew passport in 2 weeks').date).toBe('2026-12-02')
    expect(p('Renew passport in three days').date).toBe('2026-11-21')
    expect(p('Renew passport in a month').date).toBe('2026-12-18')
    expect(p('Plan trip next week').date).toBe('2026-11-23')
    expect(p('Clean garage this weekend').date).toBe('2026-11-21')
  })
  it('weekdays', () => {
    expect(p('Gym friday')).toMatchObject({ title: 'Gym', date: '2026-11-20' })
    expect(p('Gym on Wed').date).toBe('2026-11-18') // today
    expect(p('Gym monday').date).toBe('2026-11-23')
    expect(p('Gym next friday').date).toBe('2026-11-27')
    expect(p('Gym next monday').date).toBe('2026-11-23')
  })
  it('the last date mentioned wins', () =>
    expect(p('Prep Monday report on Friday')).toMatchObject({ title: 'Prep Monday report', date: '2026-11-20' }))
})

describe('times', () => {
  it('with a date', () =>
    expect(p('Dinner tomorrow at 7pm')).toEqual({ title: 'Dinner', date: '2026-11-19', time: '19:00', priority: null }))
  it('formats', () => {
    expect(p('Call 5:30pm').time).toBe('17:30')
    expect(p('Call at 9 am').time).toBe('09:00')
    expect(p('Call 12am').time).toBe('00:00')
    expect(p('Call at 18:45').time).toBe('18:45')
    expect(p('Lunch at noon').time).toBe('12:00')
  })
  it('alone means today, or tomorrow once passed', () => {
    expect(p('Call at 3pm').date).toBe('2026-11-18')
    expect(p('Call at 8am').date).toBe('2026-11-19')
  })
  it('leaves plain numbers alone', () =>
    expect(p('Read 20 pages')).toMatchObject({ title: 'Read 20 pages', date: null, time: null }))
})

describe('priority', () => {
  it('p1–p3 anywhere', () => {
    expect(p('Pay rent p1')).toMatchObject({ title: 'Pay rent', priority: 1 })
    expect(p('P2 pay rent').priority).toBe(2)
    expect(p('Pay rent p4').priority).toBe(null)
    expect(p('Fix mp3 player').priority).toBe(null)
  })
})

describe('everything together', () => {
  it('strips every match and tidies up', () =>
    expect(p('Go for a walk on December 12 at 5pm, p2')).toEqual({ title: 'Go for a walk', date: '2026-12-12', time: '17:00', priority: 2 }))
  it('keeps the text if nothing else is left', () =>
    expect(p('Tomorrow')).toMatchObject({ title: 'Tomorrow', date: '2026-11-19' }))
  it('skips what the user already set by hand', () => {
    expect(p('Walk tomorrow p1', { date: false })).toMatchObject({ title: 'Walk tomorrow', date: null, priority: 1 })
    expect(p('Walk tomorrow p1', { priority: false })).toMatchObject({ title: 'Walk p1', date: '2026-11-19', priority: null })
  })
  it('does not treat area words as anything', () =>
    expect(p('Dinner with friends')).toMatchObject({ title: 'Dinner with friends', date: null, priority: null }))
})
