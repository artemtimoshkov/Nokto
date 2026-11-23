/**
 * The recipe table ("tabular recipe notation", as on Cooking for Engineers):
 * ingredients down the side, steps across in time order, and a cell for what
 * happens to each ingredient. Once ingredients are combined they share one
 * tall cell from then on, so you can see the bowl filling up.
 *
 * Each ingredient starts on its own. A step works on every mixture that holds
 * one of its ingredients and joins them into one. Rows are ordered so that
 * each mixture is always a run of neighbouring rows.
 */
import type { Recipe } from './types'
import { actionOf } from './parse'

export interface Cell {
  /** First and last row index (inclusive) into `rows`. */
  from: number
  to: number
  kind: 'act' | 'wait' | 'empty'
}

export interface Column {
  stepIndex: number
  label: string
  /** Minutes from the start when this step begins. */
  start: number
  minutes: number | null
  cells: Cell[]
}

export interface Table {
  /** Ingredient ids, top to bottom. */
  rows: string[]
  /** Steps that use no ingredients (preheat the oven, rest, serve) go in this top row. */
  kitchen: { stepIndex: number; label: string }[]
  columns: Column[]
}

export function buildTable(r: Pick<Recipe, 'ingredients' | 'steps'>): Table {
  const ids = r.ingredients.map(i => i.id)
  const known = new Set(ids)
  // The mixture each ingredient is in, as the ordered list of its ingredients. Merging makes a new list.
  const group = new Map<string, string[]>(ids.map(id => [id, [id]]))
  const started = new Set<string>()
  const firstUse = new Map<string, number>()
  const snaps: { acted: string[] | null; groups: Map<string, string[]>; started: Set<string> }[] = []

  for (const s of r.steps) {
    const touched: string[][] = []
    for (const id of s.uses) {
      if (!known.has(id)) continue
      const g = group.get(id)!
      if (!touched.includes(g)) touched.push(g)
    }
    // Older mixtures first, so what was already in the bowl keeps its place at the top.
    const since = (g: string[]) => Math.min(...g.map(id => firstUse.get(id) ?? Infinity))
    touched.sort((a, b) => since(a) - since(b))
    const acted = touched.length ? touched.flat() : null
    if (acted) for (const id of acted) if (!firstUse.has(id)) firstUse.set(id, firstUse.size)
    if (acted) for (const id of acted) { group.set(id, acted); started.add(id) }
    snaps.push({ acted, groups: new Map(group), started: new Set(started) })
  }

  // Final order: each final mixture in the order it was put together, then unused ingredients.
  // Every earlier mixture is a run inside its final one, so its cells stay neighbours.
  const rows: string[] = []
  for (const id of ids) {
    if (rows.includes(id) || !started.has(id)) continue
    rows.push(...group.get(id)!)
  }
  for (const id of ids) if (!rows.includes(id)) rows.push(id)

  const kitchen: Table['kitchen'] = []
  const columns: Column[] = []
  let t = 0
  r.steps.forEach((s, i) => {
    const { acted, groups, started } = snaps[i]
    const label = actionOf(s)
    if (!acted) kitchen.push({ stepIndex: i, label })
    columns.push({ stepIndex: i, label, start: t, minutes: s.minutes, cells: cellsFor(rows, groups, started, acted) })
    t += s.minutes ?? 0
  })
  return { rows, kitchen, columns }
}

function cellsFor(rows: string[], groups: Map<string, string[]>, started: Set<string>, acted: string[] | null): Cell[] {
  const cells: Cell[] = []
  let key: unknown = undefined
  rows.forEach((id, i) => {
    const g = groups.get(id)!
    const kind: Cell['kind'] = acted && acted.includes(id) ? 'act' : started.has(id) ? 'wait' : 'empty'
    const k = kind === 'empty' ? `e${i}` : g
    const last = cells[cells.length - 1]
    if (last && key === k && last.kind === kind) last.to = i
    else cells.push({ from: i, to: i, kind })
    key = k
  })
  return cells
}
