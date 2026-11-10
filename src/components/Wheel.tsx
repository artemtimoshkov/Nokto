import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const ITEM = 36      // row height, px
const VISIBLE = 5    // rows shown
const PAD = ((VISIBLE - 1) / 2) * ITEM

/**
 * iOS-style rotating picker wheel. Native momentum scrolling + scroll-snap,
 * with a 3D drum effect applied to the rows near the centre. `loop` repeats
 * the items so the wheel spins endlessly like the iPhone clock.
 */
export function Wheel<T extends string | number>({ items, value, onChange, loop = false, format = String, label, align = 'center' }: {
  items: T[]; value: T; onChange(v: T): void; loop?: boolean; format?: (v: T) => string; label: string; align?: 'left' | 'center' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const n = items.length
  const reps = loop ? 9 : 1
  const mid = loop ? Math.floor(reps / 2) : 0
  const settle = useRef<number>()
  const last = useRef<number>(-1)
  const frame = useRef<number>()

  const paint = useCallback(() => {
    const el = ref.current
    if (!el) return
    // Row i is centred when scrollTop === i * ITEM (thanks to the top padding).
    const pos = el.scrollTop / ITEM
    const first = Math.max(0, Math.floor(pos) - 4)
    const lastIdx = Math.min(el.children.length - 1, Math.ceil(pos) + 4)
    for (let i = first; i <= lastIdx; i++) {
      const child = el.children[i] as HTMLElement
      const d = i - pos
      const ad = Math.abs(d)
      child.style.transform = `rotateX(${-d * 18}deg) translateZ(0)`
      child.style.opacity = String(Math.max(0, 1 - ad * 0.28))
      child.classList.toggle('on', ad < 0.5)
    }
  }, [])

  const scrollToIndex = useCallback((i: number, smooth = false) => {
    ref.current?.scrollTo({ top: i * ITEM, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Position on the current value (initially and when it changes from outside).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = items.indexOf(value)
    if (idx < 0) return
    const cur = Math.round(el.scrollTop / ITEM)
    if (cur % n === idx && el.scrollTop > 0) return
    el.scrollTop = (mid * n + idx) * ITEM
    last.current = idx
    paint()
  }, [value, items, n, mid, paint])

  useEffect(() => () => { clearTimeout(settle.current); cancelAnimationFrame(frame.current!) }, [])

  const onScroll = () => {
    cancelAnimationFrame(frame.current!)
    frame.current = requestAnimationFrame(paint)
    const el = ref.current!
    const raw = Math.round(el.scrollTop / ITEM)
    const idx = ((raw % n) + n) % n
    if (idx !== last.current) {
      last.current = idx
      if (navigator.vibrate) navigator.vibrate(1)
    }
    clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      // Quietly re-centre a looping wheel so it never runs out of rows.
      if (loop && Math.abs(Math.floor(raw / n) - mid) > 1) el.scrollTop = (mid * n + idx) * ITEM
      if (items[idx] !== value) onChange(items[idx])
    }, 110)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const el = ref.current!
    const raw = Math.round(el.scrollTop / ITEM)
    if (e.key === 'ArrowDown') { e.preventDefault(); scrollToIndex(loop || raw < n - 1 ? raw + 1 : raw, true) }
    if (e.key === 'ArrowUp') { e.preventDefault(); scrollToIndex(loop || raw > 0 ? raw - 1 : raw, true) }
  }

  const rows = []
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < n; i++) {
      const k = r * n + i
      rows.push(<div key={k} className="wheel-item" onClick={() => scrollToIndex(k, true)}>{format(items[i])}</div>)
    }
  }

  return (
    <div ref={ref} className={`wheel align-${align}`} onScroll={onScroll} tabIndex={0} onKeyDown={onKey}
      role="spinbutton" aria-label={label} aria-valuetext={format(value)}
      style={{ height: ITEM * VISIBLE, paddingTop: PAD, paddingBottom: PAD }}>
      {rows}
    </div>
  )
}
