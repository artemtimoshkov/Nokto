import type { Todo } from '../lib/types'
import { Check } from './Check'
import { Icon, I } from './Icon'
import { areaById } from '../data/areas'
import { dayLabel, timeLabel } from '../lib/dates'
import { useStore } from '../lib/store'

export function TodoRow({ todo, showDate, overdue, onOpen }: { todo: Todo; showDate: boolean; overdue?: boolean; onOpen(): void }) {
  const { completeTodo } = useStore()
  const area = areaById(todo.area)
  const when = [showDate && todo.due_date ? dayLabel(todo.due_date) : null, todo.due_time ? timeLabel(todo.due_time) : null].filter(Boolean).join(' ')
  const hasMeta = when || todo.recurrence || area
  return (
    <li className="todo" onClick={onOpen}>
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
    </li>
  )
}
