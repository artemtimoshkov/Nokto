import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../../lib/store'
import { toKey } from '../../lib/dates'
import { readCache, writeCache } from '../../lib/cache'
import type { Synced } from '../../lib/outbox'
import { NotSetUp, uuid, type RepsBackend, type RepsData } from './backend'
import { isActive, workoutEnd } from './logic'
import type { Exercise, SetValues, Workout, WorkoutSet } from './types'

export type ExerciseDraft = Pick<Exercise, 'catalog_id' | 'name' | 'muscle' | 'kind' | 'video_url'>

interface Reps {
  exercises: Exercise[]
  workouts: Workout[]
  sets: WorkoutSet[]
  loading: boolean
  notSetUp: boolean
  exercise(id: string): Exercise | undefined
  workout(id: string): Workout | undefined
  /** The workout in progress, if any. */
  active: Workout | undefined
  /** In your list (not removed). */
  mine: Exercise[]

  addExercise(d: ExerciseDraft): Exercise
  saveExercise(id: string, patch: Partial<Exercise>): void
  /** Takes it off your list. Kept (hidden) if any workout used it. */
  removeExercise(id: string): void

  startWorkout(): string
  finishWorkout(id: string): void
  saveWorkout(id: string, patch: Partial<Workout>): void
  deleteWorkout(id: string): void
  addToWorkout(workoutId: string, exerciseId: string): void
  removeFromWorkout(workoutId: string, exerciseId: string): void

  addSet(workoutId: string, exerciseId: string, v: SetValues): void
  saveSet(id: string, patch: Partial<SetValues>): void
  deleteSet(id: string): void
}

const Ctx = createContext<Reps | null>(null)
export const useReps = () => useContext(Ctx)!

/** Same offline model as Circle: open from the device copy, replace it from the server once nothing is queued. */
export function RepsProvider({ backend, cacheKey, children }: { backend: RepsBackend & Partial<Synced>; cacheKey?: string; children: ReactNode }) {
  const { notify } = useStore()
  const [cached] = useState(() => readCache<RepsData>(cacheKey))
  const [exercises, setExercises] = useState<Exercise[]>(cached?.exercises ?? [])
  const [workouts, setWorkouts] = useState<Workout[]>(cached?.workouts ?? [])
  const [sets, setSets] = useState<WorkoutSet[]>(cached?.sets ?? [])
  const [loading, setLoading] = useState(!cached)
  const [notSetUp, setNotSetUp] = useState(false)

  const refresh = useCallback(async () => {
    try {
      if (navigator.onLine === false) return
      if (backend.flush && !(await backend.flush())) return
      const v = backend.version?.()
      const d = await backend.load()
      if (backend.version && (backend.version() !== v || backend.pending!() > 0)) return
      setExercises(d.exercises); setWorkouts(d.workouts); setSets(d.sets); setNotSetUp(false)
    } catch (e) {
      if (e instanceof NotSetUp) setNotSetUp(true)
      else console.error(e)
    } finally { setLoading(false) }
  }, [backend])

  useEffect(() => {
    if (!loading && !notSetUp) writeCache(cacheKey, { exercises, workouts, sets })
  }, [cacheKey, exercises, workouts, sets, loading, notSetUp])

  useEffect(() => {
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onVis) }
  }, [refresh])

  const fail = useCallback((e: unknown) => { console.error(e); notify("Couldn't sync. Retrying…"); refresh() }, [notify, refresh])

  const reps = useMemo<Reps>(() => {
    const patchWorkout = (id: string, p: Partial<Workout>) => {
      setWorkouts(ws => ws.map(w => w.id === id ? { ...w, ...p } : w))
      backend.updateWorkout(id, p).catch(fail)
    }
    const workout = (id: string) => workouts.find(w => w.id === id)
    const active = workouts.filter(w => isActive(w, sets)).sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
    return {
      exercises, workouts, sets, loading, notSetUp, active,
      exercise: id => exercises.find(e => e.id === id),
      workout,
      mine: exercises.filter(e => !e.archived),

      addExercise(d) {
        // Adding a catalog exercise you removed earlier brings the old one (and its history) back.
        const old = d.catalog_id ? exercises.find(e => e.catalog_id === d.catalog_id) : undefined
        if (old) {
          if (old.archived) {
            setExercises(es => es.map(e => e.id === old.id ? { ...e, archived: false } : e))
            backend.updateExercise(old.id, { archived: false }).catch(fail)
          }
          return { ...old, archived: false }
        }
        const e: Exercise = { ...d, id: uuid(), archived: false, created_at: new Date().toISOString() }
        setExercises(es => [...es, e])
        backend.insertExercise(e).catch(fail)
        return e
      },
      saveExercise(id, p) {
        setExercises(es => es.map(e => e.id === id ? { ...e, ...p } : e))
        backend.updateExercise(id, p).catch(fail)
      },
      removeExercise(id) {
        const e = exercises.find(x => x.id === id)
        if (!e) return
        const used = sets.some(s => s.exercise_id === id) || workouts.some(w => w.exercise_ids.includes(id))
        if (used) {
          setExercises(es => es.map(x => x.id === id ? { ...x, archived: true } : x))
          backend.updateExercise(id, { archived: true }).catch(fail)
          notify(`Removed ${e.name}`, () => {
            setExercises(es => es.map(x => x.id === id ? { ...x, archived: false } : x))
            backend.updateExercise(id, { archived: false }).catch(fail)
          })
        } else {
          setExercises(es => es.filter(x => x.id !== id))
          backend.deleteExercise(id).catch(fail)
          notify(`Removed ${e.name}`, () => { setExercises(es => [...es, e]); backend.insertExercise(e).catch(fail) })
        }
      },

      startWorkout() {
        const now = new Date()
        const w: Workout = {
          id: uuid(), date: toKey(now), started_at: now.toISOString(), ended_at: null,
          exercise_ids: [], note: '', created_at: now.toISOString(),
        }
        setWorkouts(ws => [...ws, w])
        backend.insertWorkout(w).catch(fail)
        return w.id
      },
      finishWorkout(id) {
        const w = workout(id)
        if (!w) return
        const mine = sets.filter(s => s.workout_id === id)
        if (!mine.length) {
          // Nothing logged: don't keep an empty workout around.
          setWorkouts(ws => ws.filter(x => x.id !== id))
          backend.deleteWorkout(id).catch(fail)
          return
        }
        // If you forgot to tap Finish for a while, end it at the last set.
        const last = workoutEnd(w, sets)!
        const now = Date.now()
        const end = now - new Date(last).getTime() > 30 * 60000 ? last : new Date(now).toISOString()
        patchWorkout(id, { ended_at: end })
      },
      saveWorkout: patchWorkout,
      deleteWorkout(id) {
        const w = workout(id)
        if (!w) return
        const mine = sets.filter(s => s.workout_id === id)
        setWorkouts(ws => ws.filter(x => x.id !== id))
        setSets(ss => ss.filter(s => s.workout_id !== id))
        backend.deleteWorkout(id).catch(fail)
        notify('Workout deleted', () => {
          setWorkouts(ws => [...ws, w]); setSets(ss => [...ss, ...mine])
          backend.insertWorkout(w).then(() => Promise.all(mine.map(s => backend.insertSet(s)))).catch(fail)
        })
      },
      addToWorkout(workoutId, exerciseId) {
        const w = workout(workoutId)
        if (!w || w.exercise_ids.includes(exerciseId)) return
        patchWorkout(workoutId, { exercise_ids: [...w.exercise_ids, exerciseId] })
      },
      removeFromWorkout(workoutId, exerciseId) {
        const w = workout(workoutId)
        if (!w) return
        const mine = sets.filter(s => s.workout_id === workoutId && s.exercise_id === exerciseId)
        const ids = w.exercise_ids
        setSets(ss => ss.filter(s => !mine.includes(s)))
        mine.forEach(s => backend.deleteSet(s.id).catch(fail))
        patchWorkout(workoutId, { exercise_ids: ids.filter(x => x !== exerciseId) })
        if (mine.length) notify('Exercise removed', () => {
          setSets(ss => [...ss, ...mine])
          mine.forEach(s => backend.insertSet(s).catch(fail))
          patchWorkout(workoutId, { exercise_ids: ids })
        })
      },

      addSet(workoutId, exerciseId, v) {
        const s: WorkoutSet = { ...v, id: uuid(), workout_id: workoutId, exercise_id: exerciseId, created_at: new Date().toISOString() }
        setSets(ss => [...ss, s])
        backend.insertSet(s).catch(fail)
      },
      saveSet(id, p) {
        setSets(ss => ss.map(s => s.id === id ? { ...s, ...p } : s))
        backend.updateSet(id, p).catch(fail)
      },
      deleteSet(id) {
        setSets(ss => ss.filter(s => s.id !== id))
        backend.deleteSet(id).catch(fail)
      },
    }
  }, [exercises, workouts, sets, loading, notSetUp, backend, fail, notify])

  return <Ctx.Provider value={reps}>{children}</Ctx.Provider>
}
