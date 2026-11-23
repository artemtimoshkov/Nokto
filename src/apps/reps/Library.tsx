import { useState } from 'react'
import { Icon, I } from '../../components/Icon'
import { SearchBar, matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useReps } from './store'
import { agoLabel, lastSession, summary } from './logic'
import { MUSCLES } from './muscles'
import { useCatalogEntry } from './catalog'
import { Photos } from './Info'
import { ExerciseSheet } from './ExerciseSheet'
import { NotSetUpNote, RepsHead } from './Home'
import { R } from './icons'
import type { Exercise } from './types'

/** The exercises you know how to do, grouped by muscle. */
export function Library() {
  const reps = useReps()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  if (reps.notSetUp) return <main className="screen"><RepsHead tab="exercises" /><NotSetUpNote /></main>

  const list = reps.mine.filter(e => !q.trim() || matches(e.name, q))
  const groups = MUSCLES.map(m => ({ ...m, items: list.filter(e => e.muscle === m.id).sort((a, b) => a.name.localeCompare(b.name)) })).filter(g => g.items.length)
  const n = reps.mine.length

  return (
    <main className="screen">
      <RepsHead tab="exercises" sub={n ? `${n} ${n === 1 ? 'exercise' : 'exercises'} you know` : undefined} />
      {n > 6 && <SearchBar value={q} onChange={setQ} placeholder="Search your exercises" />}
      <button className="add-row" onClick={() => go('/apps/reps/catalog')}><Icon d={I.search} size={18} />Add from the catalog</button>
      <button className="add-row" onClick={() => setCreating(true)}><Icon d={I.plus} size={18} />Create your own</button>

      {groups.map(g => (
        <section key={g.id} className="group">
          <h2>{g.label} <span className="count">{g.items.length}</span></h2>
          <ul className="todos">{g.items.map(e => <ExerciseRow key={e.id} e={e} />)}</ul>
        </section>
      ))}

      {!reps.loading && !n && (
        <div className="empty r-empty">
          <div className="empty-mark"><Icon d={R.dumbbell} size={34} /></div>
          <p>Only the exercises you like and know.</p>
          <p className="muted small">Pick them from about 900 in the catalog, each with photos and instructions, or create your own.</p>
        </div>
      )}
      {n > 0 && q.trim() && !groups.length && <p className="muted center quiet">Nothing matches.</p>}

      <ExerciseSheet open={creating} exercise={null} onClose={() => setCreating(false)} />
    </main>
  )
}

function ExerciseRow({ e }: { e: Exercise }) {
  const { workouts, sets } = useReps()
  const entry = useCatalogEntry(e.catalog_id)
  const last = lastSession(e.id, null, workouts, sets)
  return (
    <li className="todo r-ex" onClick={() => go(`/apps/reps/e/${e.id}`)}>
      {entry ? <Photos entry={entry} size="thumb" /> : <span className="r-thumb r-thumb-empty"><Icon d={R.dumbbell} size={20} /></span>}
      <div className="todo-body">
        <div className="todo-title">{e.name}</div>
        <div className="todo-meta"><span className="ellipsis">{last ? `${agoLabel(last.workout.date)} · ${summary(e.kind, last.sets)}` : 'Not done yet'}</span></div>
      </div>
    </li>
  )
}
