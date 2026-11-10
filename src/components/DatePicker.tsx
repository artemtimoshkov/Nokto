import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { Sheet } from './Sheet'
import { Calendar } from './Calendar'
import { TimePicker } from './TimePicker'
import { RepeatPicker } from './RepeatPicker'
import { Icon, I } from './Icon'
import type { Recurrence } from '../lib/types'
import { fromKey, thisWeekend, timeLabel, toKey, today } from '../lib/dates'
import { alignStart, describe } from '../lib/recurrence'

export interface When { date: string | null; time: string | null; recurrence: Recurrence | null }

export function DatePicker({ open, value, onChange, onClose }: {
  open: boolean; value: When; onChange(w: When): void; onClose(): void
}) {
  const [sub, setSub] = useState<null | 'time' | 'repeat'>(null)
  const t = today()
  const quick = [
    { label: 'Today', icon: I.today, date: t, cls: 'q-today' },
    { label: 'Tomorrow', icon: I.sunrise, date: addDays(t, 1), cls: 'q-tomorrow' },
    { label: 'This weekend', icon: I.sofa, date: thisWeekend(t), cls: 'q-weekend' },
  ]
  const setDate = (date: string | null) =>
    onChange(date ? { ...value, date } : { date: null, time: null, recurrence: null })
  const base = value.date ? fromKey(value.date) : t

  return (
    <>
      <Sheet open={open && !sub} onClose={onClose} className="date-sheet">
        {value.date && (
          <div className="date-current">
            {format(fromKey(value.date), 'EEEE, d MMMM')}
            {value.time && <span className="muted"> · {timeLabel(value.time)}</span>}
          </div>
        )}
        <div className="list compact">
          {quick.map(q => (
            <button key={q.label} className={`row ${q.cls}`} onClick={() => { setDate(toKey(q.date)); onClose() }}>
              <Icon d={q.icon} /><span className="grow">{q.label}</span>
              <span className="muted small">{format(q.date, 'EEE')}</span>
            </button>
          ))}
          <button className="row q-none" onClick={() => { setDate(null); onClose() }}>
            <Icon d={I.none} /><span className="grow">No date</span>
          </button>
        </div>

        <Calendar value={value.date} onPick={k => setDate(k)} />

        <div className="date-foot">
          <button className={`foot-btn ${value.time ? 'set' : ''}`} onClick={() => setSub('time')}>
            <Icon d={I.clock} size={18} />{value.time ? timeLabel(value.time) : 'Time'}
          </button>
          <button className={`foot-btn ${value.recurrence ? 'set' : ''}`} onClick={() => setSub('repeat')}>
            <Icon d={I.repeat} size={18} /><span className="ellipsis">{value.recurrence ? describe(value.recurrence) : 'Repeat'}</span>
          </button>
        </div>
        <div className="sheet-actions">
          <button className="btn primary wide" onClick={onClose}>Done</button>
        </div>
      </Sheet>

      <TimePicker open={open && sub === 'time'} value={value.time}
        onChange={time => onChange({ ...value, time, date: time && !value.date ? toKey(t) : value.date })}
        onClose={() => setSub(null)} />

      <RepeatPicker open={open && sub === 'repeat'} base={base} value={value.recurrence}
        onChange={recurrence => onChange({
          ...value, recurrence,
          date: recurrence ? toKey(alignStart(recurrence, base)) : value.date,
        })}
        onClose={() => setSub(null)} />
    </>
  )
}
