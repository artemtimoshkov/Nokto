import { useMemo } from 'react'
import type { MiniAppProps } from '../registry'
import { localReps, syncedReps } from './backend'
import { RepsProvider } from './store'
import { Home } from './Home'
import { Library } from './Library'
import { Catalog } from './Catalog'
import { WorkoutScreen } from './WorkoutScreen'
import { ExerciseDetail } from './ExerciseDetail'
import './reps.css'

/**
 * Reps: a workout log built around the exercises you know.
 * Routes under `#/apps/reps`: (workouts), `exercises`, `catalog[/<workout id>]`, `w/<workout id>`, `e/<exercise id>`.
 */
export default function RepsApp({ demo, user, path }: MiniAppProps) {
  const backend = useMemo(() => (demo ? localReps() : syncedReps(user)), [demo, user])
  const [a, b] = path
  return (
    <RepsProvider backend={backend} cacheKey={demo ? undefined : `reps:${user}`}>
      {a === 'w' && b ? <WorkoutScreen key={b} id={b} />
        : a === 'e' && b ? <ExerciseDetail key={b} id={b} />
        : a === 'catalog' ? <Catalog key={b ?? ''} workoutId={b} />
        : a === 'exercises' ? <Library />
        : <Home />}
    </RepsProvider>
  )
}
