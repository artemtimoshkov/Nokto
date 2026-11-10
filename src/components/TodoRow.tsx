import { useRef, useState } from 'react'
import type { Todo } from '../lib/types'
import { Check } from './Check'
import { Icon, I } from './Icon'
import { areaById } from '../data/areas'
import { dayLabel, timeLabel } from '../lib/dates'
import { useStore } from '../lib/store'

const THRESHOLD = 88 // px to swipe left before it counts as "missed"

export function TodoRow({ todo, showDate, overdue, onOpen }: { todo: Todo; showDate: boolean; overdue?: boolean; onOpen(): void }) {
  const { completeTodo, missTodo } = useStore()
  const [dx, setDx] = useState(0)
  const [missing, setMissing] = useState(false)
  const start = useRef<{ x: number; y: number; horiz: boolean | null } | null>(null)
  const swiped = useRef(false)

  const area = areaById(todo.area)
  const when = [showDate && todo.due_date ? dayLabel(todo.due_date) : null, todo.due_time ? timeLabel(todo.due_time) : null].filter(Boolean).join(' ')
  const hasMeta = when || todo.recurrence || area

  const miss = () => {
    if (navigator.vibrate) navigator.vibrate(12)
    setMissing(true)
    setTimeout(() => { missTodo(todo); setMissing(false); setDx(0) }, 420)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY, horiz: null }; swiped.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current; if (!s) return
    const t = e.touches[0]; const mx = t.clientX - s.x; const my = t.clientY - s.y
    if (s.horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.horiz = Math.abs(mx) > Math.abs(my)
    if (!s.horiz) return
    swiped.current = true
    const x = Math.min(0, mx)
    setDx(x < -THRESHOLD ? -THRESHOLD - (-x - THRESHOLD) * 0.35 : x) // rubber-band past the threshold
  }
  const onTouchEnd = () => {
    const s = start.current; start.current = null
    setTimeout(() => { swiped.current = false }, 60) // swallow only the click right after a swipe
    if (!s?.horiz) return
    if (dx <= -THRESHOLD) miss(); else setDx(0)
  }

  const armed = dx <= -THRESHOLD
  return (
    <li className={`todo-wrap ${missing ? 'missing' : ''}`}>
      <div className={`swipe-bg ${armed ? 'armed' : ''}`} aria-hidden="true" style={{ opacity: Math.min(1, -dx / 40) }}>
        <Icon d={I.x} size={18} /><span>Missed</span>
      </div>
      <div className="todo" style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: start.current ? 'none' : undefined }}
        onClick={() => { if (!swiped.current) onOpen() }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={() => { start.current = null; setDx(0) }}>
        <Check priority={todo.priority} onToggle={() => completeTodo(todo)} label={`Complete ${todo.title}`} />
        <div className="todo-body">
          <div className="todo-title">{todo.title}</div>
          {hasMeta && (
            <div className="todo-meta">
              {when && <span className={overdue ? 'accent' : ''}>{when}</span>}
              {todo.recurrence && <Icon d={I.repeat} size={12} />}
              {area && <span className="todo-area">{area.name}</span>}
            </div>
          )}
        </div>
        <button className="miss-btn" aria-label={`Missed ${todo.title}`} title="Missed"
          onClick={e => { e.stopPropagation(); miss() }}>
          <Icon d={I.x} size={16} />
        </button>
      </div>
    </li>
  )
}
