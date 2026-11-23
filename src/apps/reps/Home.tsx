import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, startOfWeek } from 'date-fns'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { dayLabel, fromKey, today } from '../../lib/dates'
import { useReps } from './store'
import { durationLabel, newestFirst, workoutEnd, workoutMuscles } from './logic'
import { muscleLabel } from './muscles'
import { R } from './icons'
import type { Workout } from './types'

/** Back button, title and the Workouts / Exercises switch shared by both lists. */
export function RepsHead({ tab, sub }: { tab: 'workouts' | 'exercises'; sub?: string }) {
  return (
    <>
      <button className="back mobile-only" onClick={() => go('/apps')}><Icon d={I.back} size={18} />Mini apps</button>
      <header className="head">
        <div>
          <h1>Reps</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
      </header>
      <div className="seg r-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'workouts'} className={tab === 'workouts' ? 'sel' : ''} onClick={() => go('/apps/reps')}>Workouts</button>
        <button role="tab" aria-selected={tab === 'exercises'} className={tab === 'exercises' ? 'sel' : ''} onClick={() => go('/apps/reps/exercises')}>My exercises</button>
      </div>
    </>
  )
}

export function NotSetUpNote() {
  return (
    <div className="empty">
      <div className="empty-mark"><Icon d={R.dumbbell} size={34} /></div>
      <p>Reps isn't set up yet.</p>
      <p className="muted small">Run <code>supabase/schema.sql</code> again in the Supabase SQL Editor, then reopen this page.</p>
    </div>
  )
}

/** Re-render every 30 s so running timers move. */
export function useTick(on = true) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => set(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [on])
}

export function Home() {
  const reps = useReps()
  const { workouts, sets, active, loading, notSetUp } = reps
  useTick(!!active)

  const done = useMemo(() => workouts.filter(w => w.id !== active?.id && sets.some(s => s.workout_id === w.id)).sort(newestFirst), [workouts, sets, active])
  const weekStart = startOfWeek(today(), { weekStartsOn: 1 })
  const thisWeek = done.filter(w => fromKey(w.date) >= weekStart).length

  const start = () => go(`/apps/reps/w/${active ? active.id : reps.startWorkout()}`)
  const sub = done.length ? `${done.length} ${done.length === 1 ? 'workout' : 'workouts'} · ${thisWeek} this week` : undefined

  // Group by month, newest first.
  const months: { label: string; items: Workout[] }[] = []
  for (const w of done) {
    const label = format(fromKey(w.date), fromKey(w.date).getFullYear() === today().getFullYear() ? 'MMMM' : 'MMMM yyyy')
    const last = months[months.length - 1]
    if (last?.label === label) last.items.push(w)
    else months.push({ label, items: [w] })
  }

  if (notSetUp) return <main className="screen"><RepsHead tab="workouts" /><NotSetUpNote /></main>

  return (
    <main className="screen">
      <RepsHead tab="workouts" sub={sub} />

      {active ? (
        <button className="r-live" onClick={start}>
          <span className="r-live-dot" />
          <span className="grow">
            <span className="r-live-title">Workout in progress</span>
            <span className="r-live-sub">
              Started {format(new Date(active.started_at), 'HH:mm')} · {durationLabel(Date.now() - new Date(active.started_at).getTime())}
            </span>
          </span>
          <span className="r-live-go">Continue</span>
        </button>
      ) : (
        <button className="btn primary wide r-start" onClick={start}><Icon d={R.play} size={18} fill />Start workout</button>
      )}

      {months.map(m => (
        <section key={m.label} className="group">
          <h2>{m.label}</h2>
          <ul className="todos">{m.items.map(w => <WorkoutRow key={w.id} w={w} />)}</ul>
        </section>
      ))}

      {!loading && !done.length && !active && (
        <div className="empty r-empty">
          <div className="empty-mark"><Icon d={R.dumbbell} size={34} /></div>
          <p>Log your first workout.</p>
          <p className="muted small">
            {reps.mine.length
              ? 'Tap Start workout, add an exercise and log your sets. Next time, Reps fills in what you did.'
              : 'First add the exercises you know to My exercises, then tap Start workout.'}
          </p>
          {!reps.mine.length && (
            <div className="row-btns" style={{ marginTop: 18 }}>
              <button className="btn ghost" onClick={() => go('/apps/reps/catalog')}>Browse exercises</button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function WorkoutRow({ w }: { w: Workout }) {
  const { exercises, sets } = useReps()
  const muscles = workoutMuscles(w, exercises, sets)
  const count = new Set(sets.filter(s => s.workout_id === w.id).map(s => s.exercise_id)).size
  const end = workoutEnd(w, sets)
  const mins = end ? new Date(end).getTime() - new Date(w.started_at).getTime() : 0
  const days = differenceInCalendarDays(today(), fromKey(w.date))
  const when = days < 7 ? dayLabel(w.date) : format(fromKey(w.date), 'EEE d MMM')
  return (
    <li className="todo r-workout" onClick={() => go(`/apps/reps/w/${w.id}`)}>
      <div className="r-date">
        <span className="r-date-d">{format(fromKey(w.date), 'd')}</span>
        <span className="r-date-m">{format(fromKey(w.date), 'EEE')}</span>
      </div>
      <div className="todo-body">
        <div className="todo-title">{muscles.map(muscleLabel).join(', ') || 'Workout'}</div>
        <div className="todo-meta">
          <span className="ellipsis">{when} · {count} {count === 1 ? 'exercise' : 'exercises'}{mins > 60000 ? ` · ${durationLabel(mins)}` : ''}</span>
        </div>
      </div>
    </li>
  )
}
