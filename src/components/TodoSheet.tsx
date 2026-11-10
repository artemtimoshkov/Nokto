import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'
import { AreaPicker } from './AreaPicker'
import { PriorityPicker } from './PriorityPicker'
import { DatePicker, type When } from './DatePicker'
import { areaById } from '../data/areas'
import type { AreaId, Priority, Todo } from '../lib/types'
import { useStore } from '../lib/store'
import { dayLabel, timeLabel } from '../lib/dates'

type Panel = null | 'date' | 'priority' | 'area'

/** Add (todo = null) or edit a to-do. */
export function TodoSheet({ open, todo, onClose }: { open: boolean; todo: Todo | null; onClose(): void }) {
  const store = useStore()
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaId | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [when, setWhen] = useState<When>({ date: null, time: null, recurrence: null })
  const [panel, setPanel] = useState<Panel>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setPanel(null)
    setTitle(todo?.title ?? '')
    setArea(todo?.area ?? null)
    setPriority(todo ? todo.priority : null)
    setWhen({ date: todo?.due_date ?? null, time: todo?.due_time ?? null, recurrence: todo?.recurrence ?? null })
    if (!todo) setTimeout(() => input.current?.focus(), 60)
  }, [open, todo])

  const submit = () => {
    const t = title.trim()
    if (!t) return
    const data = { title: t, area, priority: priority ?? 3, due_date: when.date, due_time: when.time, recurrence: when.recurrence }
    if (todo) { store.saveTodo(todo.id, data); onClose() }
    else {
      store.addTodo(data)
      // Stay open for quick entry of the next one, Todoist-style.
      setTitle(''); setPriority(null); setArea(null); setWhen({ date: null, time: null, recurrence: null })
      input.current?.focus()
    }
  }

  const a = areaById(area)
  const dateText = when.date ? dayLabel(when.date) + (when.time ? ' ' + timeLabel(when.time) : '') : 'Date'

  return (
    <>
      <Sheet open={open && !panel} onClose={onClose} className="todo-sheet">
        <textarea ref={input} className="title-input" rows={1} placeholder="Task"
          value={title} enterKeyHint="done"
          onChange={e => setTitle(e.target.value.replace(/\n/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
        <div className="chips">
          <button className={`chip ${when.date ? 'set' : ''} ${when.date && dayLabel(when.date) === 'Today' ? 'today' : ''}`} onClick={() => setPanel('date')}>
            <Icon d={I.calendar} size={16} />{dateText}
            {when.recurrence && <Icon d={I.repeat} size={13} />}
          </button>
          <button className={`chip ${priority ? 'set p' + priority : ''}`} onClick={() => setPanel('priority')}>
            <Icon d={I.flag} size={16} fill={!!priority && priority < 3} />{priority ? `P${priority}` : 'Priority'}
          </button>
          <button className={`chip ${a ? 'set' : ''}`} onClick={() => setPanel('area')}>
            <Icon d={a?.icon ?? I.tag} size={16} />{a?.name ?? 'Area'}
          </button>
        </div>
        <div className="sheet-foot">
          {todo
            ? <button className="icon-btn danger" aria-label="Delete" onClick={() => { store.deleteTodo(todo.id); onClose() }}><Icon d={I.trash} /></button>
            : <span />}
          <button className="send" aria-label={todo ? 'Save' : 'Add to-do'} disabled={!title.trim()} onClick={submit}>
            {todo ? <Icon d={I.check} size={20} /> : <Icon d={I.arrowUp} size={20} />}
          </button>
        </div>
      </Sheet>

      <DatePicker open={open && panel === 'date'} value={when} onChange={setWhen} onClose={() => setPanel(null)} />
      <PriorityPicker open={open && panel === 'priority'} value={priority ?? 3} onChange={setPriority} onClose={() => setPanel(null)} />
      <AreaPicker open={open && panel === 'area'} value={area} onChange={setArea} onClose={() => setPanel(null)} />
    </>
  )
}
