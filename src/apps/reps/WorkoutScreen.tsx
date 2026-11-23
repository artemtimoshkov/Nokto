import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { dayLabel, toKey, today } from '../../lib/dates'
import { useReps } from './store'
import { agoLabel, durationLabel, lastSession, nextSet, num, parseNum, setLabel, setsOf, summary, workoutEnd } from './logic'
import { muscleLabel } from './muscles'
import { InfoSheet } from './Info'
import { PickSheet } from './PickSheet'
import { useTick } from './Home'
import { R } from './icons'
import type { Exercise, Kind, SetValues, Workout, WorkoutSet } from './types'

export function WorkoutScreen({ id }: { id: string }) {
  const reps = useReps()
  const w = reps.workout(id)
  const live = !!w && reps.active?.id === w.id
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(false)
  useTick(live)

  // A new workout opens straight on the exercise list.
  const opened = useRef(false)
  useEffect(() => {
    if (!w || opened.current) return
    opened.current = true
    if (live && !w.exercise_ids.length) setPicking(true)
  }, [w, live])

  if (!w) {
    if (!reps.loading) go('/apps/reps')
    return <main className="screen" />
  }

  const end = workoutEnd(w, reps.sets)
  const started = new Date(w.started_at)
  const length = (live ? Date.now() : end ? new Date(end).getTime() : started.getTime()) - started.getTime()
  const exercises = w.exercise_ids.map(x => reps.exercise(x)).filter((e): e is Exercise => !!e)
  const finish = () => { reps.finishWorkout(w.id); go('/apps/reps') }

  return (
    <main className="screen">
      <button className="back" onClick={() => go('/apps/reps')}><Icon d={I.back} size={18} />Reps</button>
      <header className="head">
        <div>
          <h1>{live ? 'Workout' : dayLabel(w.date)}</h1>
          <p className="sub r-sub">
            {live && <span className="r-live-dot" />}
            {live ? `Started ${format(started, 'HH:mm')} · ${durationLabel(length)}` : `${format(started, 'HH:mm')}${length > 60000 ? ` · ${durationLabel(length)}` : ''}`}
          </p>
        </div>
        <button className="avatar" aria-label="Delete workout" onClick={() => setConfirm(true)}><Icon d={I.trash} size={17} /></button>
      </header>

      {!live && (
        <label className="r-date-row">
          <span className="muted">Date</span>
          <input type="date" className="date-input" value={w.date} max={toKey(today())} onChange={e => e.target.value && reps.saveWorkout(w.id, { date: e.target.value })} />
        </label>
      )}

      {exercises.map(e => <Block key={e.id} w={w} ex={e} />)}

      <button className="add-row r-add-ex" onClick={() => setPicking(true)}><Icon d={I.plus} size={18} />Add exercise</button>

      {live && (
        <button className="btn primary wide r-finish" onClick={finish}>
          {reps.sets.some(s => s.workout_id === w.id) ? 'Finish workout' : 'Cancel workout'}
        </button>
      )}

      <PickSheet open={picking} workout={w} onClose={() => setPicking(false)} />
      <Sheet open={confirm} onClose={() => setConfirm(false)}>
        <p className="confirm-text">Delete this workout and all its sets?</p>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { setConfirm(false); reps.deleteWorkout(w.id); go('/apps/reps') }}>Delete</button>
        </div>
      </Sheet>
    </main>
  )
}

/** One exercise in the workout: what you did last time, today's sets, and a button for the next set. */
function Block({ w, ex }: { w: Workout; ex: Exercise }) {
  const reps = useReps()
  const [info, setInfo] = useState(false)
  const current = setsOf(reps.sets, w.id, ex.id)
  const last = lastSession(ex.id, w, reps.workouts, reps.sets)
  const next = nextSet(ex.kind, current, last?.sets ?? null)

  return (
    <section className="r-block">
      <div className="r-block-head">
        <button className="r-block-name" onClick={() => setInfo(true)}>
          <span className="r-block-title">{ex.name}</span>
          <Icon d={R.info} size={16} className="r-block-i" />
        </button>
        <button className="icon-btn danger" aria-label={`Remove ${ex.name} from this workout`} onClick={() => reps.removeFromWorkout(w.id, ex.id)}><Icon d={I.x} size={16} /></button>
      </div>
      <div className="r-last">
        {last
          ? <><span className="r-last-when">Last time · {agoLabel(last.workout.date)}</span>{summary(ex.kind, last.sets)}</>
          : <span className="r-last-when">First time · {muscleLabel(ex.muscle)}</span>}
      </div>

      {current.length > 0 && (
        <ol className="r-sets">
          {current.map((s, i) => <SetRow key={s.id} n={i + 1} kind={ex.kind} set={s} />)}
        </ol>
      )}

      <button className="r-add-set" onClick={() => reps.addSet(w.id, ex.id, next)}>
        <Icon d={I.plus} size={16} />Set {current.length + 1}<span className="r-add-set-v">{setLabel(ex.kind, next)}</span>
      </button>

      <InfoSheet open={info} catalogId={ex.catalog_id} exercise={ex} onClose={() => setInfo(false)}>
        <button className="btn ghost wide" onClick={() => { setInfo(false); go(`/apps/reps/e/${ex.id}`) }}>History and settings</button>
      </InfoSheet>
    </section>
  )
}

type Field = { key: keyof SetValues; unit: string; label: string; scale?: number; int?: boolean; placeholder?: string }

const FIELDS: Record<Kind, Field[]> = {
  weight: [{ key: 'reps', unit: '×', label: 'Reps', int: true }, { key: 'weight', unit: 'kg', label: 'Weight in kg' }],
  reps: [{ key: 'reps', unit: 'reps', label: 'Reps', int: true }, { key: 'weight', unit: '+kg', label: 'Extra weight in kg', placeholder: '0' }],
  time: [{ key: 'seconds', unit: 'sec', label: 'Seconds', int: true }],
  cardio: [
    { key: 'seconds', unit: 'min', label: 'Minutes', scale: 60 },
    { key: 'distance', unit: 'km', label: 'Distance in km', placeholder: '–' },
    { key: 'speed', unit: 'km/h', label: 'Speed in km/h', placeholder: '–' },
  ],
}

const show = (v: number | null, f: Field) => v == null ? '' : num(f.scale ? v / f.scale : v)

/** A logged set; edit any number in place. */
function SetRow({ n, kind, set }: { n: number; kind: Kind; set: WorkoutSet }) {
  const reps = useReps()
  return (
    <li className="r-set">
      <span className="r-set-n">{n}</span>
      <div className="r-set-fields">
        {FIELDS[kind].map(f => <NumField key={f.key} field={f} value={set[f.key]} onSave={v => reps.saveSet(set.id, { [f.key]: v })} />)}
      </div>
      <button className="icon-btn danger" aria-label={`Delete set ${n}`} onClick={() => reps.deleteSet(set.id)}><Icon d={I.x} size={15} /></button>
    </li>
  )
}

function NumField({ field: f, value, onSave }: { field: Field; value: number | null; onSave(v: number | null): void }) {
  const [text, setText] = useState(show(value, f))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setText(show(value, f)) }, [value, f])
  const commit = () => {
    focused.current = false
    let v = parseNum(text)
    if (v != null && f.scale) v = Math.round(v * f.scale)
    if (v != null && f.int) v = Math.round(v)
    if (v !== value) onSave(v)
    setText(show(v, f))
  }
  return (
    <label className="r-num">
      <input aria-label={f.label} inputMode={f.int ? 'numeric' : 'decimal'} enterKeyHint="done" placeholder={f.placeholder ?? '0'} value={text}
        onFocus={e => { focused.current = true; e.target.select() }}
        onChange={e => setText(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      <span>{f.unit}</span>
    </label>
  )
}
