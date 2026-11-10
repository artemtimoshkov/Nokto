import { useState } from 'react'
import { addMonths, format, startOfMonth, startOfISOWeek, addDays, isSameMonth, endOfMonth } from 'date-fns'
import { toKey, today } from '../lib/dates'
import { Icon, I } from './Icon'

export function Calendar({ value, onPick, min }: { value: string | null; onPick(k: string): void; min?: string }) {
  const [month, setMonth] = useState(() => startOfMonth(value ? new Date(value + 'T00:00') : today()))
  const t = toKey(today())
  // In the current month, start at this week — past weeks can't be picked anyway.
  const start = isSameMonth(month, today()) ? startOfISOWeek(today()) : startOfISOWeek(month)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const afterEnd = days.findIndex(d => d > endOfMonth(month))
  const weeks = afterEnd === -1 ? 6 : Math.ceil(afterEnd / 7)
  return (
    <div className="cal">
      <div className="cal-head">
        <span className="cal-month">{format(month, 'MMMM yyyy')}</span>
        <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><Icon d={I.back} size={18} /></button>
        <button className="icon-btn" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><Icon d={I.chevron} size={18} /></button>
      </div>
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {days.slice(0, weeks * 7).map(d => {
          const k = toKey(d)
          const out = !isSameMonth(d, month)
          const disabled = (min ?? t) > k
          return (
            <button key={k} disabled={disabled}
              className={`cal-day ${out ? 'out' : ''} ${k === t ? 'is-today' : ''} ${k === value ? 'sel' : ''}`}
              onClick={() => onPick(k)}>{d.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}
