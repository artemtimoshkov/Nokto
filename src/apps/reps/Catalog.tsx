import { useMemo, useState } from 'react'
import { Icon, I } from '../../components/Icon'
import { SearchBar, matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useStore } from '../../lib/store'
import { useReps } from './store'
import { useCatalog } from './catalog'
import { MUSCLES, cap, catalogKind, catalogMuscle, equipmentLabel } from './muscles'
import { InfoSheet, Photos } from './Info'
import type { CatalogEntry } from './types'

const PAGE = 60

/**
 * Browse the built-in catalog and add the exercises you know to your list.
 * Opened from a workout (`catalog/<workout id>`), adding also puts it in that workout.
 */
export function Catalog({ workoutId }: { workoutId?: string }) {
  const reps = useReps()
  const { notify } = useStore()
  const catalog = useCatalog()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [stretches, setStretches] = useState(false)
  const [info, setInfo] = useState<CatalogEntry | null>(null)
  const [shown, setShown] = useState(PAGE)
  const workout = workoutId ? reps.workout(workoutId) : undefined
  const back = workout ? `/apps/reps/w/${workout.id}` : '/apps/reps/exercises'

  const mineIds = useMemo(() => new Set(reps.mine.map(e => e.catalog_id).filter(Boolean)), [reps.mine])
  const list = useMemo(() => (catalog ?? []).filter(c =>
    (!muscle || catalogMuscle(c) === muscle) &&
    (stretches ? c.category === 'stretching' : c.category !== 'stretching' || !!q.trim()) &&
    (!q.trim() || matches(c.name, q) || matches(c.equipment, q) || c.primary.some(m => matches(m, q)))
  ), [catalog, muscle, stretches, q])

  const add = (c: CatalogEntry) => {
    const e = reps.addExercise({ catalog_id: c.id, name: c.name, muscle: catalogMuscle(c), kind: catalogKind(c), video_url: '' })
    if (workout) { reps.addToWorkout(workout.id, e.id); go(back) }
    else notify(`Added ${c.name}`)
  }
  const filter = (m: string | null) => { setMuscle(m); setShown(PAGE) }

  return (
    <main className="screen">
      <button className="back" onClick={() => go(back)}><Icon d={I.back} size={18} />{workout ? 'Workout' : 'My exercises'}</button>
      <header className="head">
        <div>
          <h1>Catalog</h1>
          <p className="sub">{workout ? 'Pick one to add it to your list and this workout' : 'Add the ones you know how to do'}</p>
        </div>
      </header>
      <SearchBar value={q} onChange={v => { setQ(v); setShown(PAGE) }} placeholder="Search exercises, equipment, muscles" />
      <div className="chips r-cat-chips">
        <button className={`chip ${!muscle ? 'set' : ''}`} onClick={() => filter(null)}>All</button>
        {MUSCLES.map(m => (
          <button key={m.id} className={`chip ${muscle === m.id ? 'set' : ''}`} onClick={() => filter(muscle === m.id ? null : m.id)}>{m.label}</button>
        ))}
        <button className={`chip ${stretches ? 'set' : ''}`} onClick={() => { setStretches(s => !s); setShown(PAGE) }}>Stretches</button>
      </div>

      {!catalog && <p className="muted center quiet">Loading exercises…</p>}
      {catalog && <p className="muted small r-cat-count">{list.length} {list.length === 1 ? 'exercise' : 'exercises'}</p>}
      <ul className="todos">
        {list.slice(0, shown).map(c => {
          const have = mineIds.has(c.id)
          return (
            <li key={c.id} className="todo r-ex" onClick={() => setInfo(c)}>
              <Photos entry={c} size="thumb" />
              <div className="todo-body">
                <div className="todo-title">{c.name}</div>
                <div className="todo-meta"><span className="ellipsis">{[equipmentLabel(c.equipment), cap(c.level)].filter(Boolean).join(' · ')}</span></div>
              </div>
              <button className={`r-add ${have ? 'have' : ''}`} aria-label={have ? `${c.name} is in your list` : `Add ${c.name}`} disabled={have && !workout}
                onClick={ev => { ev.stopPropagation(); add(c) }}>
                <Icon d={have ? I.check : I.plus} size={18} />
              </button>
            </li>
          )
        })}
      </ul>
      {list.length > shown && <button className="btn ghost wide" onClick={() => setShown(s => s + PAGE * 2)}>Show more</button>}

      <InfoSheet open={!!info} catalogId={info?.id} onClose={() => setInfo(null)}>
        {info && (mineIds.has(info.id) && !workout
          ? <p className="muted center small">In your list</p>
          : <button className="btn primary wide" onClick={() => { add(info); setInfo(null) }}>
              {workout ? 'Add to workout' : 'Add to my exercises'}
            </button>)}
      </InfoSheet>
    </main>
  )
}
