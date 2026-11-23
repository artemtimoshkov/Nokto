import type { CatalogEntry, Kind } from './types'

/** Muscle groups, in the order they're listed. */
export const MUSCLES = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'glutes', label: 'Glutes & hips' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
  { id: 'cardio', label: 'Cardio' },
] as const

export const muscleLabel = (id: string) => MUSCLES.find(m => m.id === id)?.label ?? id
export const muscleOrder = (id: string) => { const i = MUSCLES.findIndex(m => m.id === id); return i < 0 ? 99 : i }

/** free-exercise-db's muscle names → our groups. */
const GROUP: Record<string, string> = {
  chest: 'chest',
  lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back',
  shoulders: 'shoulders', neck: 'shoulders',
  biceps: 'biceps', triceps: 'triceps', forearms: 'forearms',
  abdominals: 'abs',
  glutes: 'glutes', abductors: 'glutes', adductors: 'glutes',
  quadriceps: 'quads', hamstrings: 'hamstrings', calves: 'calves',
}

export const groupOf = (muscle: string) => GROUP[muscle] ?? 'abs'

export function catalogMuscle(c: CatalogEntry): string {
  if (c.category === 'cardio') return 'cardio'
  return groupOf(c.primary[0] ?? '')
}

/** A sensible way to measure a catalog exercise. You can change it afterwards. */
export function catalogKind(c: CatalogEntry): Kind {
  if (c.category === 'cardio') return 'cardio'
  if (c.category === 'stretching') return 'time'
  if (c.force === 'static' && /plank|bridge|hold|hang|wall sit/i.test(c.name)) return 'time'
  if (c.equipment === 'body only') return 'reps'
  return 'weight'
}

const PHOTOS = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
export const photoUrl = (catalogId: string, n: number) => `${PHOTOS}${encodeURIComponent(catalogId)}/${n}.jpg`

/** "body only" → "Bodyweight", "e-z curl bar" → "EZ curl bar". */
export function equipmentLabel(e: string): string {
  if (!e || e === 'other') return ''
  if (e === 'body only') return 'Bodyweight'
  if (e === 'e-z curl bar') return 'EZ curl bar'
  return e[0].toUpperCase() + e.slice(1)
}

export const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s
