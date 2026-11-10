import type { Goal } from '../lib/types'
import { Check } from './Check'
import { useStore } from '../lib/store'

export function GoalRow({ goal, showArea, onOpen }: { goal: Goal; showArea?: boolean; onOpen(): void }) {
  const { toggleGoal, areaOf } = useStore()
  const area = showArea ? areaOf(goal.area) : undefined
  return (
    <li className={`goal ${goal.done ? 'done' : ''}`} onClick={onOpen}>
      <Check checked={goal.done} priority={3} onToggle={() => toggleGoal(goal)} label={`${goal.done ? 'Reopen' : 'Achieve'} ${goal.title}`} />
      <div className="todo-body">
        <div className="todo-title">{goal.title}</div>
        {(goal.note || area) && (
          <div className="todo-meta">
            {goal.note && <span className="note-inline">{goal.note}</span>}
            {area && <span className="todo-area">{area.name}</span>}
          </div>
        )}
      </div>
    </li>
  )
}
