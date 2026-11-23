/** How an exercise is measured. */
export type Kind = 'weight' | 'reps' | 'time' | 'cardio'

export const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'weight', label: 'Weight', hint: 'Reps × kg' },
  { id: 'reps', label: 'Bodyweight', hint: 'Reps, extra kg optional' },
  { id: 'time', label: 'Time', hint: 'Seconds held' },
  { id: 'cardio', label: 'Cardio', hint: 'Minutes, km, km/h' },
]

/** An exercise in your own list. */
export interface Exercise {
  id: string
  /** free-exercise-db id when it came from the catalog, for photos and instructions. */
  catalog_id: string | null
  name: string
  /** Muscle group id, see muscles.ts. */
  muscle: string
  kind: Kind
  /** Optional link to a video showing how to do it. */
  video_url: string
  /** Removed from your list but kept so old workouts still show it. */
  archived: boolean
  created_at: string
}

export interface Workout {
  id: string
  /** yyyy-MM-dd */
  date: string
  started_at: string
  /** null while the workout is in progress. */
  ended_at: string | null
  /** Exercises in the order they were added. */
  exercise_ids: string[]
  note: string
  created_at: string
}

/** One logged set. Which fields are used depends on the exercise's kind. */
export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  reps: number | null
  /** kg; for bodyweight exercises, extra weight. */
  weight: number | null
  seconds: number | null
  /** km */
  distance: number | null
  /** km/h */
  speed: number | null
  created_at: string
}

export type SetValues = Pick<WorkoutSet, 'reps' | 'weight' | 'seconds' | 'distance' | 'speed'>

/** An entry of the built-in catalog (catalog.json, built by scripts/reps-catalog.mjs). */
export interface CatalogEntry {
  id: string
  name: string
  primary: string[]
  secondary: string[]
  equipment: string
  category: string
  level: string
  force: string
  steps: string[]
  /** Number of photos (0 or 2: start and end position). */
  photos: number
}
