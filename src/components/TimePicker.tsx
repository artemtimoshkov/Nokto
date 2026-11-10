import { useEffect, useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { Wheel } from './Wheel'

const uses24h = (() => {
  try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === false } catch { return false }
})()

const H12 = Array.from({ length: 12 }, (_, i) => i + 1)        // 1…12
const H24 = Array.from({ length: 24 }, (_, i) => i)            // 0…23
const MIN = Array.from({ length: 60 }, (_, i) => i)            // 0…59
const pad = (n: number) => String(n).padStart(2, '0')

function defaultTime(): [number, number] {
  const d = new Date()
  return [(d.getHours() + 1) % 24, 0]
}

/** iPhone-style time wheel: hour · minute · AM/PM (or 24-hour where that's the locale). */
export function TimePicker({ open, value, onChange, onClose }: {
  open: boolean; value: string | null; onChange(t: string | null): void; onClose(): void
}) {
  const [h, setH] = useState(9)   // 0–23
  const [m, setM] = useState(0)

  useEffect(() => {
    if (!open) return
    const [hh, mm] = value ? value.split(':').map(Number) : defaultTime()
    setH(hh); setM(mm)
  }, [open, value])

  const h12 = h % 12 === 0 ? 12 : h % 12
  const pm = h >= 12
  const periods = useMemo(() => ['AM', 'PM'], [])

  return (
    <Sheet open={open} onClose={onClose} className="time-sheet">
      <div className="wheels">
        <div className="wheel-band" aria-hidden="true" />
        {uses24h ? (
          <>
            <Wheel label="Hour" items={H24} value={h} onChange={setH} loop format={pad} align="right" />
            <Wheel label="Minute" items={MIN} value={m} onChange={setM} loop format={pad} align="left" />
          </>
        ) : (
          <>
            <Wheel label="Hour" items={H12} value={h12} loop align="right"
              onChange={v => setH((v % 12) + (pm ? 12 : 0))} />
            <Wheel label="Minute" items={MIN} value={m} onChange={setM} loop format={pad} />
            <Wheel label="AM or PM" items={periods} value={pm ? 'PM' : 'AM'} align="left"
              onChange={p => setH((h % 12) + (p === 'PM' ? 12 : 0))} />
          </>
        )}
      </div>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={() => { onChange(null); onClose() }}>Clear</button>
        <button className="btn primary" onClick={() => { onChange(`${pad(h)}:${pad(m)}`); onClose() }}>Done</button>
      </div>
    </Sheet>
  )
}
