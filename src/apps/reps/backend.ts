import { supabase } from '../../lib/supabase'
import { withOutbox, type Synced } from '../../lib/outbox'
import { uuid } from '../../lib/uuid'
import { toKey } from '../../lib/dates'
import type { Exercise, Workout, WorkoutSet } from './types'

export interface RepsData { exercises: Exercise[]; workouts: Workout[]; sets: WorkoutSet[] }

/** Thrown when the Supabase tables for Reps haven't been created yet. */
export class NotSetUp extends Error {}

export interface RepsBackend {
  load(): Promise<RepsData>
  insertExercise(e: Exercise): Promise<void>
  updateExercise(id: string, patch: Partial<Exercise>): Promise<void>
  /** Also deletes its sets. */
  deleteExercise(id: string): Promise<void>
  insertWorkout(w: Workout): Promise<void>
  updateWorkout(id: string, patch: Partial<Workout>): Promise<void>
  /** Also deletes its sets. */
  deleteWorkout(id: string): Promise<void>
  insertSet(s: WorkoutSet): Promise<void>
  updateSet(id: string, patch: Partial<WorkoutSet>): Promise<void>
  deleteSet(id: string): Promise<void>
}

export { uuid }

function check(r: { error: any }) { if (r.error) throw r.error }
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205'
const strip = ({ user_id: _u, ...rest }: any) => rest
const n = (v: unknown) => v == null ? null : Number(v)

/** Supabase can return numeric columns as strings. */
const normSet = (s: any): WorkoutSet => ({
  ...strip(s), reps: n(s.reps), weight: n(s.weight), seconds: n(s.seconds), distance: n(s.distance), speed: n(s.speed),
})
const normWorkout = (w: any): Workout => ({ ...strip(w), exercise_ids: Array.isArray(w.exercise_ids) ? w.exercise_ids : [], note: w.note ?? '' })
const normExercise = (e: any): Exercise => ({ ...strip(e), video_url: e.video_url ?? '', archived: !!e.archived })

/** Fetch every row, a page at a time: sets add up over the years. */
async function all(q: () => any): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const r = await q().range(from, from + 999)
    if (missingTable(r.error)) throw new NotSetUp()
    check(r)
    out.push(...r.data)
    if (r.data.length < 1000) return out
  }
}

export const supabaseReps = (): RepsBackend => {
  const sb = supabase!
  return {
    async load() {
      const [e, w, s] = await Promise.all([
        all(() => sb.from('reps_exercises').select('*').order('created_at')),
        all(() => sb.from('reps_workouts').select('*').order('started_at')),
        all(() => sb.from('reps_sets').select('*').order('created_at')),
      ])
      return { exercises: e.map(normExercise), workouts: w.map(normWorkout), sets: s.map(normSet) }
    },
    async insertExercise(e) { check(await sb.from('reps_exercises').insert(e)) },
    async updateExercise(id, p) { check(await sb.from('reps_exercises').update(p).eq('id', id)) },
    async deleteExercise(id) { check(await sb.from('reps_exercises').delete().eq('id', id)) },
    async insertWorkout(w) { check(await sb.from('reps_workouts').insert(w)) },
    async updateWorkout(id, p) { check(await sb.from('reps_workouts').update(p).eq('id', id)) },
    async deleteWorkout(id) { check(await sb.from('reps_workouts').delete().eq('id', id)) },
    async insertSet(s) { check(await sb.from('reps_sets').insert(s)) },
    async updateSet(id, p) { check(await sb.from('reps_sets').update(p).eq('id', id)) },
    async deleteSet(id) { check(await sb.from('reps_sets').delete().eq('id', id)) },
  }
}

/** Supabase behind the offline outbox (see lib/outbox.ts). */
export const syncedReps = (userId: string): RepsBackend & Synced =>
  withOutbox(supabaseReps(), `reps:${userId}`, ['load'])

/** Demo mode: everything lives in this browser only. */
export const localReps = (): RepsBackend => {
  const K = 'nokto-demo-reps-v1'
  let s: RepsData
  try { s = JSON.parse(localStorage.getItem(K) ?? '') } catch { s = demoSeed() }
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  const patch = <T extends { id: string }>(xs: T[], id: string, p: Partial<T>) => xs.map(x => x.id === id ? { ...x, ...p } : x)
  return {
    async load() { return { exercises: [...s.exercises], workouts: [...s.workouts], sets: [...s.sets] } },
    async insertExercise(e) { s.exercises = [...s.exercises, e]; save() },
    async updateExercise(id, p) { s.exercises = patch(s.exercises, id, p); save() },
    async deleteExercise(id) { s.exercises = s.exercises.filter(e => e.id !== id); s.sets = s.sets.filter(x => x.exercise_id !== id); save() },
    async insertWorkout(w) { s.workouts = [...s.workouts, w]; save() },
    async updateWorkout(id, p) { s.workouts = patch(s.workouts, id, p); save() },
    async deleteWorkout(id) { s.workouts = s.workouts.filter(w => w.id !== id); s.sets = s.sets.filter(x => x.workout_id !== id); save() },
    async insertSet(x) { s.sets = [...s.sets, x]; save() },
    async updateSet(id, p) { s.sets = patch(s.sets, id, p); save() },
    async deleteSet(id) { s.sets = s.sets.filter(x => x.id !== id); save() },
  }
}

function demoSeed(): RepsData {
  const created_at = new Date().toISOString()
  const ex = (catalog_id: string, name: string, muscle: string, kind: Exercise['kind']): Exercise =>
    ({ id: uuid(), catalog_id, name, muscle, kind, video_url: '', archived: false, created_at })
  const bench = ex('Barbell_Bench_Press_-_Medium_Grip', 'Barbell Bench Press - Medium Grip', 'chest', 'weight')
  const pushup = ex('Pushups', 'Pushups', 'chest', 'reps')
  const dips = ex('Dips_-_Triceps_Version', 'Dips - Triceps Version', 'triceps', 'reps')
  const press = ex('Dumbbell_Shoulder_Press', 'Dumbbell Shoulder Press', 'shoulders', 'weight')
  const pullup = ex('Pullups', 'Pullups', 'back', 'reps')
  const row = ex('Bent_Over_Barbell_Row', 'Bent Over Barbell Row', 'back', 'weight')
  const plank = ex('Plank', 'Plank', 'abs', 'time')
  const run = ex('Running_Treadmill', 'Running, Treadmill', 'cardio', 'cardio')

  const workouts: Workout[] = []
  const sets: WorkoutSet[] = []
  const day = (ago: number, hour: number, min = 0) => { const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(hour, min, 0, 0); return d }
  const workout = (ago: number, items: [Exercise, Partial<WorkoutSet>[]][]) => {
    const start = day(ago, 18, 30)
    const w: Workout = {
      id: uuid(), date: toKey(start), started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + (items.length * 11 + 4) * 60000).toISOString(),
      exercise_ids: items.map(([e]) => e.id), note: '', created_at: start.toISOString(),
    }
    let t = start.getTime()
    for (const [e, ss] of items) for (const x of ss) {
      t += 2.5 * 60000
      sets.push({ id: uuid(), workout_id: w.id, exercise_id: e.id, reps: null, weight: null, seconds: null, distance: null, speed: null, ...x, created_at: new Date(t).toISOString() })
    }
    workouts.push(w)
  }
  const r = (reps: number, weight: number | null = null) => ({ reps, weight })
  workout(9, [[bench, [r(10, 55), r(10, 55), r(8, 55)]], [press, [r(10, 14), r(10, 14), r(10, 14)]], [dips, [r(12), r(10), r(10)]]])
  workout(6, [[pullup, [r(8), r(7), r(6)]], [row, [r(10, 40), r(10, 40), r(10, 40)]], [plank, [{ seconds: 60 }, { seconds: 45 }]]])
  workout(2, [[bench, [r(10, 57.5), r(10, 57.5), r(9, 57.5)]], [pushup, [r(20), r(15)]], [press, [r(10, 16), r(9, 16), r(8, 16)]]])
  workout(1, [[run, [{ seconds: 25 * 60, distance: 4.5, speed: 10.8 }]]])
  return { exercises: [bench, pushup, dips, press, pullup, row, plank, run], workouts, sets }
}
