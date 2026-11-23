import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useReps } from './store'
import { lastSession, summary } from './logic'
import { MUSCLES, muscleOrder } from './muscles'
import { InfoSheet } from './Info'
import { ExerciseSheet } from './ExerciseSheet'
import { R } from './icons'
import type { Exercise, Workout } from './types'

/** Pick one of your exercises to add to a workout, by muscle. */
export function PickSheet({ open, workout, onClose }: { open: boolean; workout: Workout; onClose(): void }) {
  const reps = useReps()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  useEffect(() => { if (open) { setQ(''); setInfo(null) } }, [open])

  const present = useMemo(() => MUSCLES.filter(m => reps.mine.some(e => e.muscle === m.id)), [reps.mine])
  const list = reps.mine
    .filter(e => !muscle || e.muscle === muscle)
    .filter(e => !q.trim() || matches(e.name, q))
    .sort((a, b) => muscleOrder(a.muscle) - muscleOrder(b.muscle) || a.name.localeCompare(b.name))

  const add = (e: Exercise) => { reps.addToWorkout(workout.id, e.id); onClose() }
  const groups = MUSCLES.map(m => ({ ...m, items: list.filter(e => e.muscle === m.id) })).filter(g => g.items.length)

  return (
    <>
      <Sheet open={open && !info && !creating} onClose={onClose} className="r-pick" title="Add exercise">
        {reps.mine.length > 0 && (
          <>
            <input className="r-input r-search" placeholder="Search your exercises" value={q} onChange={e => setQ(e.target.value)} enterKeyHint="search" />
            {present.length > 1 && (
              <div className="chips">
                <button className={`chip ${!muscle ? 'set' : ''}`} onClick={() => setMuscle(null)}>All</button>
                {present.map(m => (
                  <button key={m.id} className={`chip ${muscle === m.id ? 'set' : ''}`} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>{m.label}</button>
                ))}
              </div>
            )}
          </>
        )}

        {groups.map(g => (
          <section key={g.id} className="r-pick-group">
            <h3>{g.label}</h3>
            <ul className="todos">
              {g.items.map(e => {
                const inIt = workout.exercise_ids.includes(e.id)
                const last = lastSession(e.id, workout, reps.workouts, reps.sets)
                return (
                  <li key={e.id} className={`todo r-pick-row ${inIt ? 'in' : ''}`} onClick={() => !inIt && add(e)}>
                    <div className="todo-body">
                      <div className="todo-title">{e.name}</div>
                      <div className="todo-meta"><span className="ellipsis">{inIt ? 'In this workout' : last ? `Last: ${summary(e.kind, last.sets)}` : 'Not done yet'}</span></div>
                    </div>
                    <button className="icon-btn" aria-label={`How to do ${e.name}`} onClick={ev => { ev.stopPropagation(); setInfo(e) }}><Icon d={R.info} size={19} /></button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        {reps.mine.length === 0 && <p className="muted center r-pick-empty">Your list is empty. Add exercises you know how to do, and they'll show up here.</p>}
        {reps.mine.length > 0 && !groups.length && <p className="muted center r-pick-empty">Nothing matches.</p>}

        <div className="r-pick-more">
          <button className="add-row" onClick={() => { onClose(); go(`/apps/reps/catalog/${workout.id}`) }}><Icon d={I.search} size={18} />Find exercises in the catalog</button>
          <button className="add-row" onClick={() => setCreating(true)}><Icon d={I.plus} size={18} />Create your own</button>
        </div>
      </Sheet>

      <InfoSheet open={open && !!info} catalogId={info?.catalog_id} exercise={info ?? undefined} onClose={() => setInfo(null)}>
        {info && !workout.exercise_ids.includes(info.id) && <button className="btn primary wide" onClick={() => add(info)}>Add to workout</button>}
      </InfoSheet>
      <ExerciseSheet open={open && creating} exercise={null} onClose={() => setCreating(false)} onCreated={e => { reps.addToWorkout(workout.id, e.id); onClose() }} />
    </>
  )
}
