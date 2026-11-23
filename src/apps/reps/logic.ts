import { differenceInCalendarDays } from 'date-fns'
import { fromKey, today } from '../../lib/dates'
import type { Exercise, Kind, SetValues, Workout, WorkoutSet } from './types'

/** Numbers as people write them: 22.5, 20, 0.75. */
export const num = (n: number) => String(Math.round(n * 100) / 100)

/** "45s", "1:30", "25 min". */
export function secondsLabel(s: number, cardio = false): string {
  if (cardio) return `${num(s / 60)} min`
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** One set in a few characters: "10 @ 20 kg", "12 +5 kg", "45s", "25 min · 5 km". */
export function setLabel(kind: Kind, s: SetValues): string {
  switch (kind) {
    case 'weight': return `${s.reps ?? 0}${s.weight ? ` @ ${num(s.weight)} kg` : ''}`
    case 'reps': return `${s.reps ?? 0}${s.weight ? ` +${num(s.weight)} kg` : ''}`
    case 'time': return secondsLabel(s.seconds ?? 0)
    case 'cardio': return [
      s.seconds ? secondsLabel(s.seconds, true) : '',
      s.distance ? `${num(s.distance)} km` : '',
      s.speed ? `${num(s.speed)} km/h` : '',
    ].filter(Boolean).join(' · ') || '–'
  }
}

const same = (a: SetValues, b: SetValues) =>
  a.reps === b.reps && a.weight === b.weight && a.seconds === b.seconds && a.distance === b.distance && a.speed === b.speed

/** Sets in a line, repeated ones folded: "3×10 @ 20 kg", "2×10 @ 20 kg, 8 @ 22.5 kg". */
export function summary(kind: Kind, sets: SetValues[]): string {
  const parts: string[] = []
  for (let i = 0; i < sets.length;) {
    let j = i
    while (j + 1 < sets.length && same(sets[j + 1], sets[i])) j++
    const n = j - i + 1, label = setLabel(kind, sets[i])
    parts.push(n > 1 ? (kind === 'cardio' ? `${n}× ${label}` : `${n}×${label}`) : label)
    i = j + 1
  }
  return parts.join(', ')
}

const byTime = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)
export const newestFirst = (a: Workout, b: Workout) => b.date.localeCompare(a.date) || b.started_at.localeCompare(a.started_at)

export const setsOf = (sets: WorkoutSet[], workoutId: string, exerciseId: string) =>
  sets.filter(s => s.workout_id === workoutId && s.exercise_id === exerciseId).sort(byTime)

export interface Session { workout: Workout; sets: WorkoutSet[] }

/** Every workout an exercise was done in, newest first. */
export function history(exerciseId: string, workouts: Workout[], sets: WorkoutSet[]): Session[] {
  const mine = sets.filter(s => s.exercise_id === exerciseId)
  const ids = new Set(mine.map(s => s.workout_id))
  return workouts.filter(w => ids.has(w.id)).sort(newestFirst)
    .map(w => ({ workout: w, sets: mine.filter(s => s.workout_id === w.id).sort(byTime) }))
}

/** The last time you did this exercise before `workout`. */
export function lastSession(exerciseId: string, workout: Workout | null, workouts: Workout[], sets: WorkoutSet[]): Session | null {
  const before = (w: Workout) => !workout || w.id !== workout.id && newestFirst(w, workout) > 0
  return history(exerciseId, workouts, sets).find(s => before(s.workout)) ?? null
}

const pick = (s: SetValues): SetValues => ({ reps: s.reps, weight: s.weight, seconds: s.seconds, distance: s.distance, speed: s.speed })

export function blankSet(kind: Kind): SetValues {
  const s: SetValues = { reps: null, weight: null, seconds: null, distance: null, speed: null }
  if (kind === 'weight' || kind === 'reps') s.reps = 10
  if (kind === 'time') s.seconds = 30
  if (kind === 'cardio') s.seconds = 20 * 60
  return s
}

/**
 * What the next set is pre-filled with. While you're repeating last time's
 * sets one by one, it's last time's next set (so a pyramid carries over).
 * Once you change something, it copies your previous set instead.
 */
export function nextSet(kind: Kind, current: SetValues[], last: SetValues[] | null): SetValues {
  const i = current.length
  if (last?.length) {
    const following = current.every((s, k) => last[k] && same(s, last[k]))
    if (following) return pick(last[Math.min(i, last.length - 1)])
  }
  if (i) return pick(current[i - 1])
  return blankSet(kind)
}

/** Best set: heaviest for weights, most reps, longest hold, longest distance. */
export function best(kind: Kind, sets: SetValues[]): SetValues | null {
  const score = (s: SetValues) => {
    switch (kind) {
      case 'weight': return (s.weight ?? 0) * 1000 + (s.reps ?? 0)
      case 'reps': return (s.weight ?? 0) * 1000 + (s.reps ?? 0)
      case 'time': return s.seconds ?? 0
      case 'cardio': return (s.distance ?? 0) * 100000 + (s.seconds ?? 0)
    }
  }
  return sets.reduce<SetValues | null>((b, s) => !b || score(s) > score(b) ? s : b, null)
}

/** "Today", "Yesterday", "6 days ago", "3 weeks ago". */
export function agoLabel(key: string, base = today()): string {
  const days = differenceInCalendarDays(base, fromKey(key))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30.4)} months ago`
  const y = Math.floor(days / 365)
  return `${y} ${y === 1 ? 'year' : 'years'} ago`
}

/** "52 min", "1 h 10 min". */
export function durationLabel(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** When a workout ended: the end you tapped, or its last set if you never tapped Finish. */
export function workoutEnd(w: Workout, sets: WorkoutSet[]): string | null {
  if (w.ended_at) return w.ended_at
  const last = sets.filter(s => s.workout_id === w.id).sort(byTime).pop()
  return last?.created_at ?? null
}

/** A workout left open for more than 4 hours since its last set counts as finished. */
export const STALE_MS = 4 * 3600_000
export function isActive(w: Workout, sets: WorkoutSet[], now = Date.now()): boolean {
  if (w.ended_at) return false
  const end = workoutEnd(w, sets) ?? w.started_at
  return now - new Date(end).getTime() < STALE_MS
}

/** Muscle groups a workout hit, in the order you did them. */
export function workoutMuscles(w: Workout, exercises: Exercise[], sets: WorkoutSet[]): string[] {
  const done = new Set(sets.filter(s => s.workout_id === w.id).map(s => s.exercise_id))
  const out: string[] = []
  for (const id of w.exercise_ids) {
    const m = exercises.find(e => e.id === id)?.muscle
    if (done.has(id) && m && !out.includes(m)) out.push(m)
  }
  return out
}

/** Parse what was typed into a number field: "22,5" works too. Empty → null. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
