import { useState, useEffect } from 'react'
import { Sheet } from './Sheet'
import { timeLabel } from '../lib/dates'

const HOURS = Array.from({ length: 24 }, (_, i) => (i + 5) % 24) // start the day at 5 am
const MINUTES = ['00', '15', '30', '45']

export function TimePicker({ open, value, onChange, onClose }: {
  open: boolean; value: string | null; onChange(t: string | null): void; onClose(): void
}) {
  const [h, setH] = useState<number | null>(null)
  const [m, setM] = useState('00')
  useEffect(() => {
    if (!open) return
    if (value) { setH(Number(value.slice(0, 2))); setM(value.slice(3, 5)) } else { setH(null); setM('00') }
  }, [open, value])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <Sheet open={open} onClose={onClose} title="Time">
      <div className="time-grid">
        {HOURS.map(hr => (
          <button key={hr} className={`pill ${h === hr ? 'sel' : ''}`} onClick={() => setH(hr)}>
            {timeLabel(`${pad(hr)}:00`)}
          </button>
        ))}
      </div>
      <div className="seg minutes">
        {MINUTES.map(mm => (
          <button key={mm} className={m === mm ? 'sel' : ''} onClick={() => setM(mm)}>:{mm}</button>
        ))}
      </div>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={() => { onChange(null); onClose() }}>No time</button>
        <button className="btn primary" disabled={h === null} onClick={() => { onChange(`${pad(h!)}:${m}`); onClose() }}>
          {h === null ? 'Done' : `Set ${timeLabel(`${pad(h)}:${m}`)}`}
        </button>
      </div>
    </Sheet>
  )
}
