import { describe, expect, it } from 'vitest'
import { isActive, lastSession, nextSet, parseNum, setLabel, summary } from './logic'
import { catalogKind, catalogMuscle } from './muscles'
import type { CatalogEntry, SetValues, Workout, WorkoutSet } from './types'

const s = (reps: number | null, weight: number | null = null, seconds: number | null = null): SetValues =>
  ({ reps, weight, seconds, distance: null, speed: null })

describe('summary', () => {
  it('folds repeated sets', () => {
    expect(summary('weight', [s(10, 20), s(10, 20), s(10, 20)])).toBe('3×10 @ 20 kg')
    expect(summary('weight', [s(10, 20), s(10, 20), s(8, 22.5)])).toBe('2×10 @ 20 kg, 8 @ 22.5 kg')
  })
  it('labels each kind', () => {
    expect(summary('reps', [s(12), s(12, 5)])).toBe('12, 12 +5 kg')
    expect(summary('time', [s(null, null, 45), s(null, null, 90)])).toBe('45s, 1:30')
    expect(setLabel('cardio', { reps: null, weight: null, seconds: 1500, distance: 5, speed: 12 })).toBe('25 min · 5 km · 12 km/h')
  })
})

describe('nextSet', () => {
  const last = [s(12, 20), s(10, 22.5), s(8, 25)]
  it('starts from last time', () => {
    expect(nextSet('weight', [], last)).toMatchObject({ reps: 12, weight: 20 })
  })
  it('follows last time set by set while you repeat it', () => {
    expect(nextSet('weight', [s(12, 20)], last)).toMatchObject({ reps: 10, weight: 22.5 })
    expect(nextSet('weight', [s(12, 20), s(10, 22.5), s(8, 25)], last)).toMatchObject({ reps: 8, weight: 25 })
  })
  it('copies your previous set once you change something', () => {
    expect(nextSet('weight', [s(12, 22.5)], last)).toMatchObject({ reps: 12, weight: 22.5 })
  })
  it('falls back to a blank set', () => {
    expect(nextSet('weight', [], null)).toMatchObject({ reps: 10, weight: null })
    expect(nextSet('time', [], null)).toMatchObject({ seconds: 30 })
  })
})

const w = (id: string, date: string, started = `${date}T18:00:00Z`): Workout =>
  ({ id, date, started_at: started, ended_at: null, exercise_ids: ['e'], note: '', created_at: started })
const set = (workout_id: string, created_at: string, reps = 10): WorkoutSet =>
  ({ id: workout_id + created_at, workout_id, exercise_id: 'e', reps, weight: 20, seconds: null, distance: null, speed: null, created_at })

describe('lastSession', () => {
  const ws = [w('a', '2026-11-01'), w('b', '2026-11-08'), w('c', '2026-11-15')]
  const ss = [set('a', '2026-11-01T18:05:00Z', 8), set('b', '2026-11-08T18:05:00Z', 9), set('c', '2026-11-15T18:05:00Z', 10)]
  it('is the latest workout before this one', () => {
    expect(lastSession('e', ws[2], ws, ss)?.workout.id).toBe('b')
    expect(lastSession('e', ws[1], ws, ss)?.workout.id).toBe('a')
    expect(lastSession('e', ws[0], ws, ss)).toBeNull()
  })
  it('without a workout, is the latest one', () => {
    expect(lastSession('e', null, ws, ss)?.sets[0].reps).toBe(10)
  })
})

describe('isActive', () => {
  it('ends a forgotten workout 4 hours after its last set', () => {
    const x = w('a', '2026-11-01', '2026-11-01T18:00:00Z')
    const t = new Date('2026-11-01T18:30:00Z').getTime()
    expect(isActive(x, [set('a', '2026-11-01T18:20:00Z')], t)).toBe(true)
    expect(isActive(x, [set('a', '2026-11-01T18:20:00Z')], t + 5 * 3600_000)).toBe(false)
    expect(isActive({ ...x, ended_at: '2026-11-01T19:00:00Z' }, [], t)).toBe(false)
  })
})

describe('catalog', () => {
  const c = (p: Partial<CatalogEntry>): CatalogEntry =>
    ({ id: 'x', name: 'X', primary: ['chest'], secondary: [], equipment: 'barbell', category: 'strength', level: 'beginner', force: 'push', steps: [], photos: 2, ...p })
  it('groups muscles and guesses how to log it', () => {
    expect(catalogMuscle(c({ primary: ['lats'] }))).toBe('back')
    expect(catalogMuscle(c({ category: 'cardio', primary: ['quadriceps'] }))).toBe('cardio')
    expect(catalogKind(c({}))).toBe('weight')
    expect(catalogKind(c({ equipment: 'body only' }))).toBe('reps')
    expect(catalogKind(c({ name: 'Plank', force: 'static', equipment: 'body only' }))).toBe('time')
    expect(catalogKind(c({ category: 'cardio' }))).toBe('cardio')
  })
})

it('parseNum accepts commas', () => {
  expect(parseNum('22,5')).toBe(22.5)
  expect(parseNum('')).toBeNull()
  expect(parseNum('abc')).toBeNull()
})
