import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'
import { AreaPicker } from './AreaPicker'
import { PriorityPicker } from './PriorityPicker'
import { DatePicker, type When } from './DatePicker'
import { iconPath } from '../data/areas'
import type { AreaId, Priority, Todo } from '../lib/types'
import { useStore } from '../lib/store'
import { dayLabel, timeLabel } from '../lib/dates'
import { parseQuickAdd } from '../lib/quickAdd'

type Panel = null | 'date' | 'priority' | 'area'

/** Add (todo = null) or edit a to-do. */
export function TodoSheet({ open, todo, onClose }: { open: boolean; todo: Todo | null; onClose(): void }) {
  const store = useStore()
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaId | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [when, setWhen] = useState<When>({ date: null, time: null, recurrence: null })
  const [panel, setPanel] = useState<Panel>(null)
  // Fields picked by hand; typed dates/priorities no longer override these.
  const [touched, setTouched] = useState({ date: false, priority: false })
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setPanel(null)
    setTouched({ date: false, priority: false })
    setTitle(todo?.title ?? '')
    setArea(todo?.area ?? null)
    setPriority(todo ? todo.priority : null)
    setWhen({ date: todo?.due_date ?? null, time: todo?.due_time ?? null, recurrence: todo?.recurrence ?? null })
    if (!todo) setTimeout(() => input.current?.focus(), 60)
  }, [open, todo])

  // New tasks only: read a date, time and priority out of the text as it's typed.
  const parsed = !todo && title.trim()
    ? parseQuickAdd(title, { date: !touched.date, priority: !touched.priority })
    : null
  const effWhen: When = parsed?.date ? { date: parsed.date, time: parsed.time, recurrence: null } : when
  const effPriority = parsed?.priority ?? priority

  const submit = () => {
    const t = (parsed?.title ?? title).trim()
    if (!t) return
    const data = { title: t, area, priority: effPriority ?? 3, due_date: effWhen.date, due_time: effWhen.time, recurrence: effWhen.recurrence }
    if (todo) { store.saveTodo(todo.id, data); onClose() }
    else {
      store.addTodo(data)
      // Stay open for quick entry of the next one, Todoist-style.
      setTitle(''); setPriority(null); setArea(null); setWhen({ date: null, time: null, recurrence: null })
      setTouched({ date: false, priority: false })
      input.current?.focus()
    }
  }

  const a = store.areaOf(area)
  const dateText = effWhen.date ? dayLabel(effWhen.date) + (effWhen.time ? ' ' + timeLabel(effWhen.time) : '') : 'Date'

  return (
    <>
      <Sheet open={open && !panel} onClose={onClose} className="todo-sheet">
        <textarea ref={input} className="title-input" rows={1} placeholder="Task"
          value={title} enterKeyHint="done"
          onChange={e => setTitle(e.target.value.replace(/\n/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
        <div className="chips">
          <button className={`chip ${effWhen.date ? 'set' : ''} ${effWhen.date && dayLabel(effWhen.date) === 'Today' ? 'today' : ''}`} onClick={() => setPanel('date')}>
            <Icon d={I.calendar} size={16} />{dateText}
            {effWhen.recurrence && <Icon d={I.repeat} size={13} />}
          </button>
          <button className={`chip ${effPriority ? 'set p' + effPriority : ''}`} onClick={() => setPanel('priority')}>
            <Icon d={I.flag} size={16} fill={!!effPriority && effPriority < 3} />{effPriority ? `P${effPriority}` : 'Priority'}
          </button>
          <button className={`chip ${a ? 'set' : ''}`} onClick={() => setPanel('area')}>
            <Icon d={a ? iconPath(a.icon) : I.tag} size={16} />{a?.name ?? 'Area'}
          </button>
        </div>
        <div className="sheet-foot">
          {todo
            ? (
              <div className="foot-left">
                <button className="icon-btn danger" aria-label="Delete" onClick={() => { store.deleteTodo(todo.id); onClose() }}><Icon d={I.trash} /></button>
                <button className="miss-text" onClick={() => { onClose(); setTimeout(() => store.missTodo(todo), 200) }}>
                  <Icon d={I.missed} size={18} />Missed
                </button>
              </div>
            )
            : <span />}
          <button className="send" aria-label={todo ? 'Save' : 'Add to-do'} disabled={!title.trim()} onClick={submit}>
            {todo ? <Icon d={I.check} size={20} /> : <Icon d={I.arrowUp} size={20} />}
          </button>
        </div>
      </Sheet>

      <DatePicker open={open && panel === 'date'} value={effWhen} onChange={w => { setWhen(w); setTouched(t => ({ ...t, date: true })) }} onClose={() => setPanel(null)} />
      <PriorityPicker open={open && panel === 'priority'} value={effPriority ?? 3} onChange={p => { setPriority(p); setTouched(t => ({ ...t, priority: true })) }} onClose={() => setPanel(null)} />
      <AreaPicker open={open && panel === 'area'} value={area} onChange={setArea} onClose={() => setPanel(null)} />
    </>
  )
}
