import { useState } from 'react'
import { format } from 'date-fns'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { fromKey } from '../../lib/dates'
import { useKitchen } from './store'
import { RecipeSheet } from './RecipeSheet'
import { RecipeTable } from './RecipeTable'
import { scaleAmount } from './amounts'
import { durationLabel, totalMinutes } from './types'
import { K } from './icons'

type View = 'steps' | 'table'
const VIEW_KEY = 'nokto-kitchen-view'
const readView = (): View => { try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'steps' } catch { return 'steps' } }

export function RecipeDetail({ id }: { id: string }) {
  const kitchen = useKitchen()
  const r = kitchen.recipe(id)
  const [edit, setEdit] = useState(false)
  const [view, setViewState] = useState<View>(readView)
  const [serves, setServes] = useState<number | null>(null)
  const [have, setHave] = useState<Set<string>>(new Set())

  if (!r) {
    if (!kitchen.loading) go('/apps/kitchen')
    return <main className="screen" />
  }

  const n = serves ?? r.servings
  const factor = n / (r.servings || 1)
  const total = totalMinutes(r)
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v) } catch {} }
  const toggle = (iid: string) => setHave(s => { const x = new Set(s); x.has(iid) ? x.delete(iid) : x.add(iid); return x })
  const empty = !r.ingredients.length && !r.steps.length

  return (
    <main className="screen wide k-detail">
      <button className="back mobile-only" onClick={() => go('/apps/kitchen')}><Icon d={I.back} size={18} />Kitchen</button>
      <header className="head k-head">
        <div className="k-who">
          <span className="k-emoji lg">{r.emoji || '🍽️'}</span>
          <div>
            <h1>{r.title}</h1>
            {(r.tags.length > 0 || r.cooked_count > 0) && (
              <p className="sub">
                {r.tags.join(' · ')}
                {r.tags.length > 0 && r.cooked_count > 0 && ' · '}
                {r.cooked_count > 0 && `Cooked ${r.cooked_count}×${r.last_cooked ? `, last ${format(fromKey(r.last_cooked), 'd MMM')}` : ''}`}
              </p>
            )}
          </div>
        </div>
        <div className="k-head-btns">
          <button className={`avatar ${r.favourite ? 'k-on' : ''}`} aria-label={r.favourite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={r.favourite}
            onClick={() => kitchen.save(r.id, { favourite: !r.favourite })}><Icon d={K.heart} size={18} fill={r.favourite} /></button>
          <button className="avatar" aria-label="Edit recipe" onClick={() => setEdit(true)}><Icon d={K.edit} size={18} /></button>
        </div>
      </header>

      <div className="k-tiles">
        <div className="k-tile">
          <span className="k-tile-label"><Icon d={K.clock} size={15} />Time</span>
          <span className="k-tile-value">{durationLabel(total)}</span>
        </div>
        <div className="k-tile">
          <span className="k-tile-label"><Icon d={K.people} size={15} />Serves</span>
          <span className="k-stepper">
            <button aria-label="Fewer servings" disabled={n <= 1} onClick={() => setServes(Math.max(1, n - 1))}><Icon d={K.minus} size={16} /></button>
            <span className="k-tile-value">{n}</span>
            <button aria-label="More servings" onClick={() => setServes(n + 1)}><Icon d={I.plus} size={16} /></button>
          </span>
        </div>
      </div>

      {empty && <button className="add-row" onClick={() => setEdit(true)}><Icon d={I.plus} size={18} />Add ingredients and steps</button>}

      <div className="k-cols">
        {r.ingredients.length > 0 && (
          <section className="group k-ingredients">
            <h2>{r.ingredients.length} ingredients{factor !== 1 && <span className="k-scaled"> · for {n}</span>}</h2>
            <ul className="k-ing-list">
              {r.ingredients.map(i => (
                <li key={i.id} className={have.has(i.id) ? 'have' : ''} onClick={() => toggle(i.id)}>
                  <span className={`check ${have.has(i.id) ? 'on' : ''}`}><Icon d={I.check} size={13} /></span>
                  <span className="k-ing-amount">{scaleAmount(i.amount, factor)}</span>
                  <span className="k-ing-name">{i.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.steps.length > 0 && (
          <section className="group k-method">
            <div className="k-method-head">
              <h2>Method</h2>
              <div className="seg k-view" role="radiogroup" aria-label="View">
                <button role="radio" aria-checked={view === 'steps'} className={view === 'steps' ? 'sel' : ''} onClick={() => setView('steps')}><Icon d={K.list} size={15} />Steps</button>
                <button role="radio" aria-checked={view === 'table'} className={view === 'table' ? 'sel' : ''} onClick={() => setView('table')}><Icon d={K.table} size={15} />Table</button>
              </div>
            </div>
            {view === 'steps' ? (
              <ol className="k-steps">
                {r.steps.map((s, i) => (
                  <li key={s.id}>
                    <span className="k-num">{i + 1}</span>
                    <div className="k-step-body">
                      <p>{s.text}</p>
                      {s.minutes ? <span className="k-time"><Icon d={K.clock} size={12} />{durationLabel(s.minutes)}</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <RecipeTable recipe={r} factor={factor} />}
          </section>
        )}
      </div>

      {(r.notes.trim() || r.source.trim()) && (
        <section className="group">
          <h2>Notes</h2>
          {r.notes.trim() && <p className="k-notes">{r.notes}</p>}
          {r.source.trim() && (
            <p className="k-source muted small">
              Source: {/^https?:\/\//.test(r.source.trim()) ? <a href={r.source.trim()} target="_blank" rel="noopener noreferrer">{r.source.trim().replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a> : r.source}
            </p>
          )}
        </section>
      )}

      {r.steps.length > 0 && (
        <div className="k-cta">
          <button className="btn primary k-start" onClick={() => go(`/apps/kitchen/${r.id}/cook/${n}`)}>
            <Icon d={K.play} size={16} fill />Start cooking
          </button>
        </div>
      )}

      <RecipeSheet open={edit} recipe={r} onClose={() => setEdit(false)} />
    </main>
  )
}
