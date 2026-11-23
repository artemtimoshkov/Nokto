export interface Ingredient {
  id: string
  name: string
  /** Free text such as "200 g", "1 1/2 tsp" or "a pinch". Leading numbers scale with servings. */
  amount: string
}

export interface Step {
  id: string
  /** The full instruction shown in cook mode. */
  text: string
  /** A few words for the recipe table, e.g. "Whisk until pale". Empty = made from the text. */
  action: string
  /** How long the step takes. Steps with minutes get a timer in cook mode. */
  minutes: number | null
  /** Ingredient ids this step works on. Drives the recipe table. */
  uses: string[]
}

export interface Recipe {
  id: string
  title: string
  emoji: string
  servings: number
  /** Total time override in minutes. Null = add up the steps. */
  time_minutes: number | null
  tags: string[]
  ingredients: Ingredient[]
  steps: Step[]
  notes: string
  /** Where it came from: a link, a book, Grandma. */
  source: string
  favourite: boolean
  cooked_count: number
  /** yyyy-MM-dd */
  last_cooked: string | null
  created_at: string
}

export type RecipeDraft = Omit<Recipe, 'id' | 'created_at'>

export const emptyRecipe = (): RecipeDraft => ({
  title: '', emoji: '', servings: 2, time_minutes: null, tags: [], ingredients: [], steps: [],
  notes: '', source: '', favourite: false, cooked_count: 0, last_cooked: null,
})

export const stepMinutes = (r: Pick<Recipe, 'steps'>) => r.steps.reduce((s, x) => s + (x.minutes ?? 0), 0)
export const totalMinutes = (r: Pick<Recipe, 'steps' | 'time_minutes'>) => r.time_minutes ?? stepMinutes(r)

export function durationLabel(min: number): string {
  if (min <= 0) return '–'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** "0:05" style clock for the table's time axis. */
export const clock = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
