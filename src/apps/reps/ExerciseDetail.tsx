import { useState } from 'react'
import { format } from 'date-fns'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { fromKey } from '../../lib/dates'
import { useReps } from './store'
import { agoLabel, best, history, setLabel, summary } from './logic'
import { useCatalogEntry } from './catalog'
import { ExerciseInfo } from './Info'
import { ExerciseSheet } from './ExerciseSheet'
import { R } from './icons'
import { KINDS } from './types'

/** How to do it, your best set, and every time you did it. */
export function ExerciseDetail({ id }: { id: string }) {
  const reps = useReps()
  const e = reps.exercise(id)
  const entry = useCatalogEntry(e?.catalog_id)
  const [edit, setEdit] = useState(false)
  const [howTo, setHowTo] = useState(false)

  if (!e) {
    if (!reps.loading) go('/apps/reps/exercises')
    return <main className="screen" />
  }

  const sessions = history(e.id, reps.workouts, reps.sets)
  const top = best(e.kind, sessions.flatMap(s => s.sets))
  const total = sessions.reduce((n, s) => n + s.sets.length, 0)

  return (
    <main className="screen">
      <button className="back" onClick={() => go('/apps/reps/exercises')}><Icon d={I.back} size={18} />My exercises</button>
      <header className="head">
        <div className="grow">
          <h1 className="r-title">{e.name}</h1>
          <p className="sub">{KINDS.find(k => k.id === e.kind)?.hint}{e.archived ? ' · Removed from your list' : ''}</p>
        </div>
        <button className="avatar" aria-label="Edit exercise" onClick={() => setEdit(true)}><Icon d={R.edit} size={18} /></button>
      </header>

      {e.archived && (
        <button className="btn ghost wide" onClick={() => reps.saveExercise(e.id, { archived: false })}>Add back to my exercises</button>
      )}

      <div className="r-tiles">
        <div className="r-tile">
          <span className="r-tile-label"><Icon d={R.trophy} size={15} />Best</span>
          <span className="r-tile-value">{top ? setLabel(e.kind, top) : '–'}</span>
        </div>
        <div className="r-tile">
          <span className="r-tile-label"><Icon d={R.timer} size={15} />Done</span>
          <span className="r-tile-value">{sessions.length ? `${sessions.length}×` : 'Not yet'}</span>
          {sessions.length > 0 && <span className="r-tile-sub">{total} sets · last {agoLabel(sessions[0].workout.date).toLowerCase()}</span>}
        </div>
      </div>

      {(entry || e.video_url) && (
        <section className="group">
          <button className="disclose" onClick={() => setHowTo(v => !v)}>
            <Icon d={I.chevron} size={14} className={howTo ? 'rot' : ''} />How to do it
          </button>
          {howTo && <div className="r-howto"><ExerciseInfo entry={entry} exercise={e} /></div>}
        </section>
      )}

      <section className="group">
        <h2>History</h2>
        {sessions.length === 0 && <p className="muted small">Add it to a workout and your sets show up here.</p>}
        <ul className="todos">
          {sessions.map(s => (
            <li key={s.workout.id} className="todo" onClick={() => go(`/apps/reps/w/${s.workout.id}`)}>
              <div className="todo-body">
                <div className="r-hist-date">{format(fromKey(s.workout.date), 'EEE d MMM yyyy')} · {agoLabel(s.workout.date)}</div>
                <div className="todo-title">{summary(e.kind, s.sets)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ExerciseSheet open={edit} exercise={e} onClose={() => setEdit(false)} />
    </main>
  )
}
