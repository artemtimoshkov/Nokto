import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { useReps, type ExerciseDraft } from './store'
import { MUSCLES } from './muscles'
import { KINDS, type Exercise } from './types'

const blank = (): ExerciseDraft => ({ catalog_id: null, name: '', muscle: 'chest', kind: 'weight', video_url: '' })

/** Create your own exercise (exercise = null) or edit one in your list. */
export function ExerciseSheet({ open, exercise, onClose, onCreated }: {
  open: boolean; exercise: Exercise | null; onClose(): void; onCreated?(e: Exercise): void
}) {
  const reps = useReps()
  const [d, setD] = useState<ExerciseDraft>(blank)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    setD(exercise ? { catalog_id: exercise.catalog_id, name: exercise.name, muscle: exercise.muscle, kind: exercise.kind, video_url: exercise.video_url } : blank())
    if (!exercise) setTimeout(() => nameRef.current?.focus(), 60)
  }, [open, exercise])
  const set = <K extends keyof ExerciseDraft>(k: K, v: ExerciseDraft[K]) => setD(x => ({ ...x, [k]: v }))

  const submit = () => {
    const clean = { ...d, name: d.name.trim(), video_url: d.video_url.trim() }
    if (!clean.name) return
    if (exercise) reps.saveExercise(exercise.id, clean)
    else onCreated?.(reps.addExercise(clean))
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} className="todo-sheet r-sheet">
      <input ref={nameRef} className="title-input" placeholder="Exercise name" value={d.name} enterKeyHint="done"
        onChange={e => set('name', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />

      <div className="r-field">
        <span className="r-label">Muscle</span>
        <div className="r-chip-wrap">
          {MUSCLES.map(m => (
            <button key={m.id} className={`chip ${d.muscle === m.id ? 'set' : ''}`} aria-pressed={d.muscle === m.id} onClick={() => set('muscle', m.id)}>{m.label}</button>
          ))}
        </div>
      </div>

      <div className="r-field">
        <span className="r-label">Log it as</span>
        <div className="seg" role="radiogroup" aria-label="How you log it">
          {KINDS.map(k => (
            <button key={k.id} role="radio" aria-checked={d.kind === k.id} className={d.kind === k.id ? 'sel' : ''} onClick={() => set('kind', k.id)}>{k.label}</button>
          ))}
        </div>
        <span className="muted small">{KINDS.find(k => k.id === d.kind)?.hint}</span>
      </div>

      <label className="r-field">
        <span className="r-label">Video link</span>
        <input className="r-input" placeholder="Optional: YouTube or Instagram link" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={d.video_url} onChange={e => set('video_url', e.target.value)} />
      </label>

      <div className="sheet-foot">
        {exercise
          ? <button className="icon-btn danger" aria-label="Remove from my exercises" onClick={() => { reps.removeExercise(exercise.id); onClose() }}><Icon d={I.trash} /></button>
          : <span />}
        <button className="send" aria-label={exercise ? 'Save exercise' : 'Add exercise'} disabled={!d.name.trim()} onClick={submit}>
          <Icon d={exercise ? I.check : I.arrowUp} size={20} />
        </button>
      </div>
    </Sheet>
  )
}
