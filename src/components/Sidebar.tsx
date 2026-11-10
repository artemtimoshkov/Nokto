import { useMemo, useState } from 'react'
import { AreaSheet } from './AreaSheet'
import { Icon, I } from './Icon'
import { iconPath } from '../data/areas'
import { useStore } from '../lib/store'
import { groupTodos } from '../lib/sort'
import { go, type Route } from '../lib/route'

/** Laptop navigation. Hidden on phones, where the bottom tab bar is used. */
export function Sidebar({ route, email, onAccount }: { route: Route; email: string; onAccount(): void }) {
  const { todos, goals, areas } = useStore()
  const due = useMemo(() => groupTodos(todos).filter(s => s.kind === 'today' || s.kind === 'overdue').reduce((n, s) => n + s.todos.length, 0), [todos])
  const area = route.tab === 'goals' ? route.area : undefined
  const [adding, setAdding] = useState(false)
  return (
    <aside className="sidebar">
      <div className="brand"><Icon d={I.star} size={20} fill />Nokto</div>
      <nav className="side-nav">
        <button className={route.tab === 'today' ? 'active' : ''} onClick={() => go('/today')}>
          <Icon d={I.today} size={19} /><span className="grow">Today</span>{due > 0 && <span className="side-count">{due}</span>}
        </button>
        <button className={route.tab === 'goals' && !area ? 'active' : ''} onClick={() => go('/goals')}>
          <Icon d={I.star} size={19} /><span className="grow">Bucket list</span>
        </button>
      </nav>
      <nav className="side-nav areas-nav">
        {areas.map(a => {
          const open = goals.filter(g => g.area === a.id && !g.done).length
          return (
            <button key={a.id} className={area === a.id ? 'active' : ''} onClick={() => go(`/goals/${a.id}`)}>
              <Icon d={iconPath(a.icon)} size={17} /><span className="grow">{a.name}</span>{open > 0 && <span className="side-count">{open}</span>}
            </button>
          )
        })}
        <button className="side-add" onClick={() => setAdding(true)}><Icon d={I.plus} size={17} /><span className="grow">Add area</span></button>
      </nav>
      <AreaSheet open={adding} area={null} onClose={() => setAdding(false)} />
      <button className="side-account" onClick={onAccount}>
        <span className="avatar sm"><Icon d={I.user} size={15} /></span><span className="grow ellipsis">{email}</span>
      </button>
    </aside>
  )
}
