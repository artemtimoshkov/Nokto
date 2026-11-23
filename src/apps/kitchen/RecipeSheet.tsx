import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { uuid } from '../../lib/uuid'
import { useKitchen } from './store'
import { guessAction, guessMinutes, guessUses, parseRecipe } from './parse'
import { emptyRecipe, stepMinutes, type Ingredient, type Recipe, type RecipeDraft, type Step } from './types'
import { K } from './icons'

const PASTE_HINT = `Banana bread
Serves 10

Ingredients
3 ripe bananas
75 g butter, melted
150 g brown sugar
…

Method
1. Preheat the oven to 180°C.
2. Mash the bananas…`

const newIngredient = (): Ingredient => ({ id: uuid(), name: '', amount: '' })
const newStep = (): Step => ({ id: uuid(), text: '', action: '', minutes: null, uses: [] })

/** Add (recipe = null) or edit a recipe. New recipes can also be pasted in as text. */
export function RecipeSheet({ open, recipe, onClose }: { open: boolean; recipe: Recipe | null; onClose(): void }) {
  const kitchen = useKitchen()
  const [d, setD] = useState<RecipeDraft>(emptyRecipe)
  const [tags, setTags] = useState('')
  const [mode, setMode] = useState<'write' | 'paste'>('write')
  const [paste, setPaste] = useState('')
  const [confirm, setConfirm] = useState(false)
  /** Steps whose ingredients or minutes were set by hand, so typing no longer overwrites them. */
  const [manual, setManual] = useState<Set<string>>(new Set())
  const titleRef = useRef<HTMLInputElement>(null)
  const focusNext = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (recipe) {
      const { id: _i, created_at: _c, ...rest } = recipe
      setD({ ...rest, ingredients: rest.ingredients.map(i => ({ ...i })), steps: rest.steps.map(s => ({ ...s, uses: [...s.uses] })) })
      setManual(new Set(rest.steps.map(s => s.id)))
    } else {
      setD({ ...emptyRecipe(), ingredients: [newIngredient()], steps: [newStep()] })
      setManual(new Set())
      setTimeout(() => titleRef.current?.focus(), 60)
    }
    setTags(recipe?.tags.join(', ') ?? '')
    setMode('write'); setPaste(''); setConfirm(false)
  }, [open, recipe])

  useEffect(() => {
    if (!focusNext.current) return
    const el = document.querySelector<HTMLElement>(`[data-focus="${focusNext.current}"]`)
    focusNext.current = null
    el?.focus()
  })

  const set = <Key extends keyof RecipeDraft>(k: Key, v: RecipeDraft[Key]) => setD(x => ({ ...x, [k]: v }))
  const setIng = (i: number, p: Partial<Ingredient>) => setD(x => ({ ...x, ingredients: x.ingredients.map((g, j) => j === i ? { ...g, ...p } : g) }))
  const setStep = (i: number, p: Partial<Step>) => setD(x => ({ ...x, steps: x.steps.map((s, j) => j === i ? { ...s, ...p } : s) }))
  const mark = (sid: string) => setManual(m => new Set(m).add(sid))

  const addIngredient = (at = d.ingredients.length) => {
    const g = newIngredient()
    focusNext.current = `ing-${g.id}`
    setD(x => ({ ...x, ingredients: [...x.ingredients.slice(0, at), g, ...x.ingredients.slice(at)] }))
  }
  const addStep = () => {
    const s = newStep()
    focusNext.current = `step-${s.id}`
    setD(x => ({ ...x, steps: [...x.steps, s] }))
  }
  const move = (i: number, by: number) => setD(x => {
    const j = i + by
    if (j < 0 || j >= x.steps.length) return x
    const steps = [...x.steps];[steps[i], steps[j]] = [steps[j], steps[i]]
    return { ...x, steps }
  })

  const typeStep = (i: number, text: string) => {
    const s = d.steps[i]
    const named = d.ingredients.filter(g => g.name.trim())
    setStep(i, manual.has(s.id) ? { text } : { text, uses: guessUses(text, named, d.steps[i - 1]?.uses), minutes: guessMinutes(text) })
  }
  const toggleUse = (i: number, iid: string) => {
    const s = d.steps[i]
    mark(s.id)
    setStep(i, { uses: s.uses.includes(iid) ? s.uses.filter(x => x !== iid) : [...s.uses, iid] })
  }

  const readPaste = () => {
    const p = parseRecipe(paste)
    setD(x => ({ ...p, title: p.title || x.title, emoji: x.emoji, ingredients: p.ingredients.length ? p.ingredients : [newIngredient()], steps: p.steps.length ? p.steps : [newStep()] }))
    setManual(new Set())
    setMode('write')
  }

  const submit = () => {
    const title = d.title.trim()
    if (!title) return
    const ingredients = d.ingredients.map(g => ({ ...g, name: g.name.trim(), amount: g.amount.trim() })).filter(g => g.name)
    const known = new Set(ingredients.map(g => g.id))
    const clean: RecipeDraft = {
      ...d, title,
      emoji: d.emoji.trim(),
      servings: Math.max(1, Math.round(d.servings) || 1),
      tags: [...new Set(tags.split(',').map(t => t.trim()).filter(Boolean))],
      ingredients,
      steps: d.steps.map(s => ({ ...s, text: s.text.trim(), action: s.action.trim(), uses: s.uses.filter(u => known.has(u)) })).filter(s => s.text),
      notes: d.notes.trim(), source: d.source.trim(),
    }
    if (recipe) kitchen.save(recipe.id, clean)
    else go(`/apps/kitchen/${kitchen.add(clean)}`)
    onClose()
  }

  const named = d.ingredients.filter(g => g.name.trim())
  const autoTime = stepMinutes(d)

  return (
    <>
      <Sheet open={open && !confirm} onClose={onClose} className="todo-sheet k-sheet">
        {!recipe && (
          <div className="seg k-mode" role="radiogroup" aria-label="How to add">
            <button role="radio" aria-checked={mode === 'write'} className={mode === 'write' ? 'sel' : ''} onClick={() => setMode('write')}><Icon d={K.edit} size={15} />Write it</button>
            <button role="radio" aria-checked={mode === 'paste'} className={mode === 'paste' ? 'sel' : ''} onClick={() => setMode('paste')}><Icon d={K.paste} size={15} />Paste text</button>
          </div>
        )}

        {mode === 'paste' ? (
          <div className="k-form">
            <p className="muted small hint">Paste a recipe from a website, a note or a message. You can check everything before saving.</p>
            <textarea className="c-input c-area k-paste" rows={12} placeholder={PASTE_HINT} value={paste} onChange={e => setPaste(e.target.value)} autoFocus />
            <button className="btn primary wide" disabled={!paste.trim()} onClick={readPaste}>Read recipe</button>
          </div>
        ) : (
          <>
            <div className="k-title-row">
              <input className="k-emoji-input" aria-label="Emoji" placeholder="🍽️" value={d.emoji} maxLength={4} onChange={e => set('emoji', e.target.value)} />
              <input ref={titleRef} className="title-input" placeholder="Recipe name" value={d.title} enterKeyHint="next" onChange={e => set('title', e.target.value)} />
            </div>

            <div className="k-form">
              <div className="k-pair">
                <label className="c-field">
                  <span className="c-label">Serves</span>
                  <input className="c-input" inputMode="numeric" value={d.servings || ''} onChange={e => set('servings', Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0)} />
                </label>
                <label className="c-field">
                  <span className="c-label">Total time (min)</span>
                  <input className="c-input" inputMode="numeric" placeholder={autoTime ? `${autoTime} from steps` : 'From steps'}
                    value={d.time_minutes ?? ''} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); set('time_minutes', v ? Number(v) : null) }} />
                </label>
              </div>
              <label className="c-field">
                <span className="c-label">Tags</span>
                <input className="c-input" placeholder="Pasta, Quick, Weeknight" value={tags} onChange={e => setTags(e.target.value)} />
              </label>

              <div className="c-field">
                <span className="c-label">Ingredients</span>
                <div className="k-rows">
                  {d.ingredients.map((g, i) => (
                    <div key={g.id} className="k-ing-row">
                      <input className="c-input k-amount" placeholder="200 g" aria-label="Amount" value={g.amount} onChange={e => setIng(i, { amount: e.target.value })} />
                      <input className="c-input grow" placeholder="Ingredient" aria-label="Ingredient" data-focus={`ing-${g.id}`} value={g.name} enterKeyHint="next"
                        onChange={e => setIng(i, { name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(i + 1) } }} />
                      <button className="icon-btn danger" aria-label="Remove ingredient" onClick={() => set('ingredients', d.ingredients.filter((_, j) => j !== i))}><Icon d={I.x} size={16} /></button>
                    </div>
                  ))}
                  <button className="c-link" onClick={() => addIngredient()}>+ Add ingredient</button>
                </div>
              </div>

              <div className="c-field">
                <span className="c-label">Steps</span>
                <div className="k-rows">
                  {d.steps.map((s, i) => (
                    <div key={s.id} className="k-step-edit">
                      <div className="k-step-edit-top">
                        <span className="k-num sm">{i + 1}</span>
                        <textarea className="c-input c-area grow" rows={2} placeholder={i === 0 ? 'Preheat the oven to 180°C.' : 'What to do'} data-focus={`step-${s.id}`}
                          value={s.text} onChange={e => typeStep(i, e.target.value)} />
                      </div>
                      <div className="k-step-edit-meta">
                        <input className="c-input k-min" inputMode="numeric" placeholder="min" aria-label="Minutes"
                          value={s.minutes ?? ''} onChange={e => { mark(s.id); const v = e.target.value.replace(/\D/g, '').slice(0, 4); setStep(i, { minutes: v ? Number(v) : null }) }} />
                        <input className="c-input grow" placeholder={guessAction(s.text) || 'Short label for the table'} aria-label="Short label for the table"
                          value={s.action} onChange={e => setStep(i, { action: e.target.value })} />
                        <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon d={K.up} size={16} /></button>
                        <button className="icon-btn" aria-label="Move down" disabled={i === d.steps.length - 1} onClick={() => move(i, 1)}><Icon d={K.down} size={16} /></button>
                        <button className="icon-btn danger" aria-label="Remove step" onClick={() => set('steps', d.steps.filter((_, j) => j !== i))}><Icon d={I.x} size={16} /></button>
                      </div>
                      {named.length > 0 && (
                        <div className="k-uses" role="group" aria-label="Ingredients used in this step">
                          {named.map(g => (
                            <button key={g.id} className={`k-use-chip ${s.uses.includes(g.id) ? 'on' : ''}`} aria-pressed={s.uses.includes(g.id)} onClick={() => toggleUse(i, g.id)}>{g.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="c-link" onClick={addStep}>+ Add step</button>
                </div>
              </div>

              <label className="c-field">
                <span className="c-label">Notes</span>
                <textarea className="c-input c-area" rows={3} placeholder="Tips, swaps, what to serve it with…" value={d.notes} onChange={e => set('notes', e.target.value)} />
              </label>
              <label className="c-field">
                <span className="c-label">Source</span>
                <input className="c-input" placeholder="Link, book or person" value={d.source} onChange={e => set('source', e.target.value)} />
              </label>
            </div>

            <div className="sheet-foot">
              {recipe
                ? <button className="icon-btn danger" aria-label="Delete recipe" onClick={() => setConfirm(true)}><Icon d={I.trash} /></button>
                : <span />}
              <button className="send" aria-label={recipe ? 'Save recipe' : 'Add recipe'} disabled={!d.title.trim()} onClick={submit}>
                <Icon d={recipe ? I.check : I.arrowUp} size={20} />
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={open && confirm} onClose={() => setConfirm(false)}>
        <p className="confirm-text">Delete {recipe?.title}?</p>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { kitchen.remove(recipe!.id); onClose(); go('/apps/kitchen') }}>Delete</button>
        </div>
      </Sheet>
    </>
  )
}
