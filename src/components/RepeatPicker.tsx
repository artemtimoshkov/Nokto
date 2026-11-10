import { useEffect, useState } from 'react'
import { getISODay } from 'date-fns'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'
import type { Recurrence } from '../lib/types'
import { presets, sameRule, describe } from '../lib/recurrence'
import { toKey } from '../lib/dates'

export function RepeatPicker({ open, base, value, onChange, onClose }: {
  open: boolean; base: Date; value: Recurrence | null; onChange(r: Recurrence | null): void; onClose(): void
}) {
  const [custom, setCustom] = useState(false)
  const list = presets(base)
  const isCustom = !!value && !list.some(p => sameRule(p.rule, value))
  const pick = (r: Recurrence | null) => { onChange(r); onClose() }
  return (
    <>
      <Sheet open={open && !custom} onClose={onClose} title="Repeat">
        <div className="list">
          <button className="row" onClick={() => pick(null)}>
            <span className="grow">Doesn't repeat</span>{!value && <Icon d={I.check} className="accent" />}
          </button>
          {list.map(p => (
            <button key={p.label} className="row" onClick={() => pick(p.rule)}>
              <span className="grow">{p.label}</span>{sameRule(p.rule, value) && <Icon d={I.check} className="accent" />}
            </button>
          ))}
          <button className="row" onClick={() => setCustom(true)}>
            <span className="grow">Custom…</span>
            {isCustom && <span className="muted small">{describe(value!)}</span>}
            <Icon d={I.chevron} className="muted" size={16} />
          </button>
        </div>
      </Sheet>
      <CustomRepeat open={open && custom} base={base} value={value}
        onClose={() => setCustom(false)}
        onDone={r => { setCustom(false); pick(r) }} />
    </>
  )
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function CustomRepeat({ open, base, value, onClose, onDone }: {
  open: boolean; base: Date; value: Recurrence | null; onClose(): void; onDone(r: Recurrence): void
}) {
  const [n, setN] = useState('1')
  const [unit, setUnit] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [days, setDays] = useState<number[]>([getISODay(base)])
  const [ends, setEnds] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (value && !value.weekdaysOnly) {
      setN(String(value.interval)); setUnit(value.freq)
      setDays(value.byWeekday?.length ? value.byWeekday : [getISODay(base)])
      setEnds(value.endsOn ?? null)
    } else { setN('1'); setUnit('weekly'); setDays([getISODay(base)]); setEnds(null) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const interval = Math.max(1, Math.min(99, parseInt(n) || 1))
  const rule: Recurrence = {
    freq: unit, interval,
    ...(unit === 'weekly' ? { byWeekday: days.length ? days : [getISODay(base)] } : {}),
    ...(unit === 'monthly' ? { byMonthDay: base.getDate() } : {}),
    endsOn: ends,
  }
  const toggle = (d: number) => setDays(ds => ds.includes(d) ? (ds.length > 1 ? ds.filter(x => x !== d) : ds) : [...ds, d])

  return (
    <Sheet open={open} onClose={onClose} title="Custom">
      <div className="form">
        <div className="field-row">
          <span className="label">Every</span>
          <input className="num" inputMode="numeric" value={n} aria-label="Interval"
            onChange={e => setN(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          <select value={unit} onChange={e => setUnit(e.target.value as any)} aria-label="Unit">
            <option value="daily">{interval === 1 ? 'day' : 'days'}</option>
            <option value="weekly">{interval === 1 ? 'week' : 'weeks'}</option>
            <option value="monthly">{interval === 1 ? 'month' : 'months'}</option>
          </select>
        </div>

        {unit === 'weekly' && (
          <div className="dow">
            {DOW.map((d, i) => (
              <button key={i} aria-label={DOW_FULL[i]} aria-pressed={days.includes(i + 1)}
                className={days.includes(i + 1) ? 'sel' : ''} onClick={() => toggle(i + 1)}>{d}</button>
            ))}
          </div>
        )}

        <div className="label section-label">Ends</div>
        <div className="seg">
          <button className={!ends ? 'sel' : ''} onClick={() => setEnds(null)}>Never</button>
          <button className={ends ? 'sel' : ''} onClick={() => setEnds(e => e ?? defaultEnd(base))}>On date</button>
        </div>
        {ends && (
          <input type="date" className="date-input" value={ends} aria-label="End date"
            onChange={e => setEnds(e.target.value || null)} />
        )}

        <p className="summary">{describe(rule)}</p>
      </div>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={onClose}>Back</button>
        <button className="btn primary" onClick={() => onDone(rule)}>Done</button>
      </div>
    </Sheet>
  )
}

function defaultEnd(base: Date) {
  const d = new Date(base); d.setMonth(d.getMonth() + 3)
  return toKey(d)
}
