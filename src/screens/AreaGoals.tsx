import { useState } from 'react'
import { useStore } from '../lib/store'
import { areaById } from '../data/areas'
import { Icon, I } from '../components/Icon'
import { Check } from '../components/Check'
import { GoalSheet } from '../components/GoalSheet'
import type { AreaId, Goal } from '../lib/types'
import { go } from '../lib/route'

export function AreaGoals({ areaId }: { areaId: AreaId }) {
  const { goals, toggleGoal } = useStore()
  const area = areaById(areaId)
  const [sheet, setSheet] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null })
  const [showDone, setShowDone] = useState(false)
  if (!area) { go('/goals'); return null }

  const mine = goals.filter(g => g.area === areaId).sort((a, b) => a.position - b.position || (a.created_at < b.created_at ? -1 : 1))
  const open = mine.filter(g => !g.done)
  const done = mine.filter(g => g.done)

  const row = (g: Goal) => (
    <li key={g.id} className={`goal ${g.done ? 'done' : ''}`} onClick={() => setSheet({ open: true, goal: g })}>
      <Check checked={g.done} priority={3} onToggle={() => toggleGoal(g)} label={`${g.done ? 'Reopen' : 'Achieve'} ${g.title}`} />
      <div className="todo-body">
        <div className="todo-title">{g.title}</div>
        {g.note && <div className="todo-meta note">{g.note}</div>}
      </div>
    </li>
  )

  return (
    <main className="screen">
      <button className="back mobile-only" onClick={() => go('/goals')}><Icon d={I.back} size={18} />Bucket list</button>
      <header className="head">
        <div>
          <div className="head-icon"><Icon d={area.icon} size={26} /></div>
          <h1>{area.name}</h1>
          {mine.length > 0 && <p className="sub">{done.length} / {mine.length}</p>}
        </div>
      </header>

      <button className="add-row desktop-only" onClick={() => setSheet({ open: true, goal: null })}><Icon d={I.plus} size={18} />Add item</button>
      <ul className="todos">{open.map(row)}</ul>

      {!!done.length && (
        <section className="group">
          <button className="disclose" onClick={() => setShowDone(s => !s)}>
            <Icon d={I.chevron} size={14} className={showDone ? 'rot' : ''} />Achieved <span className="muted">{done.length}</span>
          </button>
          {showDone && <ul className="todos">{done.map(row)}</ul>}
        </section>
      )}

      <button className="fab mobile-only" aria-label="Add item" onClick={() => setSheet({ open: true, goal: null })}>
        <Icon d={I.plus} size={26} />
      </button>
      <GoalSheet open={sheet.open} area={areaId} goal={sheet.goal} onClose={() => setSheet(s => ({ ...s, open: false }))} />
    </main>
  )
}
