import { describe, expect, it } from 'vitest'
import { formatNumber, scaleAmount } from './amounts'
import { guessAction, guessMinutes, guessUses, parseRecipe, splitIngredient } from './parse'
import { buildTable } from './table'
import { sampleRecipes } from './samples'
import type { Ingredient, Step } from './types'

describe('scaling amounts', () => {
  it('scales the leading number and keeps the rest', () => {
    expect(scaleAmount('200 g', 2)).toBe('400 g')
    expect(scaleAmount('1 1/2 cups', 2)).toBe('3 cups')
    expect(scaleAmount('½ tsp', 0.5)).toBe('¼ tsp')
    expect(scaleAmount('3', 1 / 3)).toBe('1')
    expect(scaleAmount('2-3 cloves', 2)).toBe('4–6 cloves')
  })
  it('leaves amounts without a number alone', () => {
    expect(scaleAmount('a pinch', 3)).toBe('a pinch')
    expect(scaleAmount('', 3)).toBe('')
  })
  it('rounds grams sensibly', () => {
    expect(scaleAmount('190 g', 1.5)).toBe('285 g')
    expect(scaleAmount('75 g', 0.3)).toBe('23 g')
    expect(scaleAmount('5 g', 0.3)).toBe('1.5 g')
    expect(formatNumber(0.66)).toBe('⅔')
  })
})

describe('reading ingredients', () => {
  it('splits amount, unit and name', () => {
    expect(splitIngredient('200g plain flour')).toEqual({ amount: '200g', name: 'plain flour' })
    expect(splitIngredient('- 2 tbsp olive oil')).toEqual({ amount: '2 tbsp', name: 'olive oil' })
    expect(splitIngredient('3 ripe bananas')).toEqual({ amount: '3', name: 'ripe bananas' })
    expect(splitIngredient('1 cup of milk')).toEqual({ amount: '1 cup', name: 'milk' })
    expect(splitIngredient('Salt, to taste')).toEqual({ amount: 'to taste', name: 'Salt' })
    expect(splitIngredient('a pinch of salt')).toEqual({ amount: 'a pinch', name: 'salt' })
  })
})

describe('guessing from step text', () => {
  const ing: Ingredient[] = [
    { id: 'f', name: 'plain flour', amount: '' }, { id: 'b', name: 'ripe bananas, mashed', amount: '' },
    { id: 'e', name: 'eggs', amount: '' }, { id: 'o', name: 'olive oil', amount: '' },
  ]
  it('finds the ingredients a step mentions', () => {
    expect(guessUses('Mash the banana, then crack in the egg.', ing)).toEqual(['b', 'e'])
    expect(guessUses('Fold in the flour.', ing)).toEqual(['f'])
    expect(guessUses('Heat the oil in a pan.', ing)).toEqual(['o'])
    expect(guessUses('Preheat the oven to 180°C.', ing)).toEqual([])
  })
  it('adds up the minutes', () => {
    expect(guessMinutes('Bake for 25–30 minutes, then rest 10 min.')).toBe(40)
    expect(guessMinutes('Simmer for 1 hour')).toBe(60)
    expect(guessMinutes('Season to taste.')).toBeNull()
  })
  it('makes a short label', () => {
    expect(guessAction('Preheat the oven to 180°C.')).toBe('Preheat oven to 180°C')
    expect(guessAction('Whisk the eggs and sugar until pale and fluffy.')).toBe('Whisk eggs and sugar')
    expect(guessAction('Whisk the flour, eggs and milk until smooth.')).toBe('Whisk flour, eggs and milk')
    expect(guessAction('Melt the butter in a hot pan and fry the batter.')).toBe('Melt butter in hot pan')
  })
})

describe('pasting a recipe', () => {
  it('reads title, servings, ingredients and steps', () => {
    const r = parseRecipe(`Pancakes
Serves 4

Ingredients
- 200 g flour
- 2 eggs
- 300 ml milk

Method
1. Whisk the flour, eggs and milk until smooth.
2. Rest the batter for 30 minutes.
3. Fry in a hot pan, 1 minute each side.`)
    expect(r.title).toBe('Pancakes')
    expect(r.servings).toBe(4)
    expect(r.ingredients.map(i => i.name)).toEqual(['flour', 'eggs', 'milk'])
    expect(r.steps).toHaveLength(3)
    expect(r.steps[0].uses).toHaveLength(3)
    expect(r.steps[1].minutes).toBe(30)
    // "the batter" carries on with what step 1 made
    expect(r.steps[1].uses).toEqual(r.steps[0].uses)
  })
  it('works without headings', () => {
    const r = parseRecipe(`Garlic toast
2 slices bread
1 clove garlic
Toast the bread.
Rub with the garlic.`)
    expect(r.ingredients).toHaveLength(2)
    expect(r.steps.map(s => s.text)).toEqual(['Toast the bread.', 'Rub with the garlic.'])
  })
})

describe('recipe table', () => {
  const ing = (id: string): Ingredient => ({ id, name: id, amount: '' })
  const step = (uses: string[], minutes: number | null = null): Step => ({ id: uses.join() || 'k', text: 'Do', action: 'Do', minutes, uses })

  it('merges ingredients once they are combined and keeps mixtures in neighbouring rows', () => {
    // a and c are mixed first, then b joins: rows must be a, c, b
    const t = buildTable({ ingredients: [ing('a'), ing('b'), ing('c'), ing('d')], steps: [step([], 5), step(['a', 'c'], 2), step(['b']), step(['a', 'b'], 10)] })
    expect(t.rows).toEqual(['a', 'c', 'b', 'd'])
    expect(t.kitchen).toEqual([{ stepIndex: 0, label: 'Do' }])
    expect(t.columns.map(c => c.start)).toEqual([0, 5, 7, 7])
    // step 2: a+c act together, b and d untouched
    expect(t.columns[1].cells).toEqual([{ from: 0, to: 1, kind: 'act' }, { from: 2, to: 2, kind: 'empty' }, { from: 3, to: 3, kind: 'empty' }])
    // step 3: a+c wait in one cell, b acts
    expect(t.columns[2].cells).toEqual([{ from: 0, to: 1, kind: 'wait' }, { from: 2, to: 2, kind: 'act' }, { from: 3, to: 3, kind: 'empty' }])
    // step 4: everything used so far is one mixture
    expect(t.columns[3].cells[0]).toEqual({ from: 0, to: 2, kind: 'act' })
  })

  it('keeps what is already in the bowl above an ingredient added later', () => {
    const t = buildTable({ ingredients: [ing('butter'), ing('flour'), ing('egg')], steps: [step(['flour', 'egg']), step(['butter', 'flour'])] })
    expect(t.rows).toEqual(['flour', 'egg', 'butter'])
  })

  it('gives every sample recipe exactly one action cell per step that uses ingredients', () => {
    for (const r of sampleRecipes()) {
      const t = buildTable(r)
      expect(new Set(t.rows).size).toBe(r.ingredients.length)
      t.columns.forEach((c, i) => {
        const acts = c.cells.filter(x => x.kind === 'act').length
        expect(acts).toBe(r.steps[i].uses.length ? 1 : 0)
      })
    }
  })
})
