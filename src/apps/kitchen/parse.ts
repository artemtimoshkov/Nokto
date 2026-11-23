/**
 * Turning plain text into a recipe, so a recipe copied from a website, a note
 * or a message can be pasted in one go. Also the guesses made while typing a
 * step: which ingredients it uses, how long it takes, and a short label.
 */
import { uuid } from '../../lib/uuid'
import type { Ingredient, RecipeDraft, Step } from './types'
import { emptyRecipe } from './types'

const UNITS = [
  'g', 'gr', 'gram', 'grams', 'kg', 'mg', 'ml', 'l', 'cl', 'dl', 'litre', 'litres', 'liter', 'liters', 'oz', 'lb', 'lbs', 'pound', 'pounds',
  'tsp', 'tsps', 'teaspoon', 'teaspoons', 'tbsp', 'tbsps', 'tablespoon', 'tablespoons', 'tbs', 'cup', 'cups', 'pinch', 'pinches', 'dash',
  'clove', 'cloves', 'can', 'cans', 'tin', 'tins', 'pack', 'packs', 'packet', 'packets', 'bunch', 'bunches', 'handful', 'handfuls',
  'slice', 'slices', 'piece', 'pieces', 'sprig', 'sprigs', 'stick', 'sticks', 'knob', 'large', 'medium', 'small',
]
const QTY = /^(?:\d+\s+\d+\/\d+|\d+\s*[¼½¾⅓⅔⅛]|\d+\/\d+|[¼½¾⅓⅔⅛]|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(?:\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛]))?/
const BULLET = /^\s*(?:[-–—•*·▢□☐◦]+|\d+[.)]|step\s*\d+[:.)]?)\s*/i

/** "200g plain flour" → { amount: "200g", name: "plain flour" }. */
export function splitIngredient(line: string): { amount: string; name: string } {
  const s = line.replace(BULLET, '').trim()
  const toTaste = s.match(/^(.*?),?\s+(to taste|as needed|for serving|to serve|optional)$/i)
  const q = s.match(QTY)
  if (!q) {
    if (toTaste) return { amount: toTaste[2].toLowerCase(), name: toTaste[1] }
    const a = s.match(/^(a pinch of|a pinch|a handful of|a knob of|a splash of|a dash of|a few)\s+(.*)$/i)
    return a ? { amount: a[1].replace(/ of$/i, ''), name: a[2] } : { amount: '', name: s }
  }
  let amount = q[0]
  let rest = s.slice(amount.length)
  const unit = rest.match(/^\s*([a-zA-Z]+)\.?\b/)
  if (unit && UNITS.includes(unit[1].toLowerCase())) { amount += rest.slice(0, unit[0].length); rest = rest.slice(unit[0].length) }
  rest = rest.replace(/^\s*(of\s+)?/i, '').trim()
  return { amount: amount.trim(), name: rest || amount.trim() }
}

const SKIP = new Set(['of', 'and', 'or', 'the', 'a', 'an', 'to', 'for', 'fresh', 'large', 'small', 'medium', 'plain', 'chopped', 'finely', 'roughly', 'sliced', 'diced', 'minced', 'grated', 'ground', 'whole', 'extra', 'virgin', 'unsalted', 'salted', 'free', 'range', 'ripe', 'room', 'temperature', 'softened', 'melted', 'cold', 'warm', 'hot', 'dried', 'optional', 'taste', 'good', 'quality', 'cooked', 'raw', 'peeled', 'boneless', 'skinless', 'about', 'roughly', 'thinly', 'packed', 'heaped', 'level', 'light', 'dark', 'baby', 'self', 'raising', 'rising'])

const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(oes|ches|shes|ses)$/, m => m.slice(0, -2)).replace(/s$/, '')
const words = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter(Boolean)

/** The words that identify an ingredient: "2 ripe bananas, mashed" → ["banana"]. */
export function keyWords(name: string): string[] {
  const main = name.split(/[,(]/)[0]
  const ws = words(main).filter(w => w.length > 2 && !SKIP.has(w)).map(stem)
  if (!ws.length) return []
  // The head noun is usually last ("olive oil" → oil). A two-word name also keeps its first word ("parmesan cheese").
  return ws.length > 1 ? [ws[ws.length - 1], ws[0]] : ws
}

const MIXTURE = /\b(batter|mixture|mix|dough|sauce|everything|filling|paste|soup|stew|it all|them)\b/i

/**
 * Ingredients a step mentions. `prev` is what the step before used: a step that
 * talks about "the batter" or "the mixture" carries on with it.
 */
export function guessUses(text: string, ingredients: Ingredient[], prev: string[] = []): string[] {
  const inStep = new Set(words(text).map(stem))
  const hits = ingredients.filter(i => {
    const k = keyWords(i.name)
    return k.length > 0 && inStep.has(k[0]) || (k.length > 1 && inStep.has(k[1]) && !ingredients.some(o => o !== i && keyWords(o.name)[0] === k[1]))
  }).map(i => i.id)
  if (MIXTURE.test(text)) for (const id of prev) if (!hits.includes(id) && ingredients.some(i => i.id === id)) hits.push(id)
  return hits
}

/** "Bake for 25–30 minutes, then rest 10 min" → 40. */
export function guessMinutes(text: string): number | null {
  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi
  let total = 0, found = false, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const v = parseFloat((m[2] ?? m[1]).replace(',', '.'))
    total += /^h/i.test(m[3]) ? v * 60 : v
    found = true
  }
  if (/\bovernight\b/i.test(text)) { total += 8 * 60; found = true }
  return found ? Math.round(total) : null
}

const DANGLING = /\s+(and|or|with|in|into|to|the|of|for|on|at|a|an|then|until|over|from|by)$/i

/** A short label for the table: the first clause without articles, a few words long. */
export function guessAction(text: string): string {
  const first = text.split(/[.;:!]|,\s*(?:then|and then)\s|\s(?:then|and then|while|until)\s/i)[0] ?? ''
  const ws = first.replace(/\b(the|a|an|your)\b\s*/gi, '').replace(/\s+/g, ' ').trim().split(' ')
  let out = ''
  for (const w of ws) { if ((out + ' ' + w).trim().length > 28) break; out = (out + ' ' + w).trim() }
  while (DANGLING.test(out)) out = out.replace(DANGLING, '')
  return out.replace(/,$/, '') || ws[0] || ''
}

export const actionOf = (s: Step) => s.action.trim() || guessAction(s.text)

const HEAD_ING = /^\s*#*\s*(ingredients?|you(?:'|’)ll need|what you need|shopping list)\s*:?\s*$/i
const HEAD_STEP = /^\s*#*\s*(method|steps?|instructions?|directions?|preparation|how to make( it)?|to make)\s*:?\s*$/i
const HEAD_NOTES = /^\s*#*\s*(notes?|tips?)\s*:?\s*$/i
const SERVES = /^\s*(?:serves|servings?|makes|yields?|for)\s*:?\s*(\d+)(?:\s*(?:people|persons?|portions?|servings?))?\s*$/i

/** Paste a whole recipe: a title, an ingredients list and the steps, with or without headings. */
export function parseRecipe(text: string): RecipeDraft {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const r = emptyRecipe()
  const ing: string[] = [], steps: string[] = [], notes: string[] = []
  let mode: 'top' | 'ing' | 'step' | 'notes' = 'top'
  const hasHeads = lines.some(l => HEAD_ING.test(l) || HEAD_STEP.test(l))

  for (const l of lines) {
    if (HEAD_ING.test(l)) { mode = 'ing'; continue }
    if (HEAD_STEP.test(l)) { mode = 'step'; continue }
    if (HEAD_NOTES.test(l)) { mode = 'notes'; continue }
    const serves = l.match(SERVES)
    if (serves && l.length < 40) { r.servings = Math.min(50, Math.max(1, +serves[1])); continue }
    if (mode === 'top') {
      if (!r.title && !QTY.test(l.replace(BULLET, ''))) { r.title = l.replace(/^#+\s*/, ''); continue }
      if (hasHeads) { notes.push(l); continue }
      // No headings: short lines that start with an amount are ingredients, the rest are steps.
      const bare = l.replace(BULLET, '')
      if ((QTY.test(bare) || /^(a pinch|a handful|salt|pepper)/i.test(bare)) && bare.length < 70) ing.push(l)
      else if (/^https?:\/\//.test(l)) r.source = l
      else steps.push(l)
    } else if (mode === 'ing') ing.push(l)
    else if (mode === 'step') steps.push(l)
    else notes.push(l)
  }

  r.ingredients = ing.map(l => ({ id: uuid(), ...splitIngredient(l) })).filter(i => i.name)
  r.steps = steps
    .map(l => l.replace(BULLET, '').trim())
    .filter(Boolean)
    .reduce<Step[]>((acc, t) => [...acc, { id: uuid(), text: t, action: '', minutes: guessMinutes(t), uses: guessUses(t, r.ingredients, acc[acc.length - 1]?.uses) }], [])
  r.notes = notes.join('\n')
  return r
}
