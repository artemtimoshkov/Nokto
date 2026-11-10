import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useStore } from '../lib/store'
import { groupTodos } from '../lib/sort'
import { fromKey, today, dayLabel } from '../lib/dates'
import { TodoRow } from '../components/TodoRow'
import { TodoSheet } from '../components/TodoSheet'
import { Icon, I } from '../components/Icon'
import type { Todo } from '../lib/types'

export function Today({ onAccount }: { onAccount(): void }) {
  const { todos, loading } = useStore()
  const sections = useMemo(() => groupTodos(todos), [todos])
  const [sheet, setSheet] = useState<{ open: boolean; todo: Todo | null }>({ open: false, todo: null })
  const count = sections.find(s => s.kind === 'today')!.todos.length + (sections.find(s => s.kind === 'overdue')?.todos.length ?? 0)

  return (
    <main className="screen">
      <header className="head">
        <div>
          <h1>Today</h1>
          <p className="sub">{format(today(), 'EEEE d MMMM')}{count ? ` · ${count} to do` : ''}</p>
        </div>
        <button className="avatar" aria-label="Account" onClick={onAccount}><Icon d={I.user} size={18} /></button>
      </header>

      {!loading && sections.map(s => {
        if (s.kind === 'today' && !s.todos.length) {
          return todos.length ? <p key="none-today" className="muted small quiet">Nothing due today.</p> : (
            <div key="empty" className="empty">
              <div className="empty-mark"><Icon d={I.star} size={28} /></div>
              <p>A clear day.</p>
              <p className="muted small">Tap + to add a to-do.</p>
            </div>
          )
        }
        const title = s.kind === 'day' ? `${format(fromKey(s.key), 'd MMM')} · ${dayLabel(s.key)}` : s.title
        return (
          <section key={s.key} className="group">
            <h2 className={s.kind === 'overdue' ? 'accent' : ''}>{title}</h2>
            <ul className="todos">
              {s.todos.map(t => (
                <TodoRow key={t.id} todo={t} showDate={s.kind === 'overdue'} overdue={s.kind === 'overdue'}
                  onOpen={() => setSheet({ open: true, todo: t })} />
              ))}
            </ul>
          </section>
        )
      })}

      <button className="fab" aria-label="Add to-do" onClick={() => setSheet({ open: true, todo: null })}>
        <Icon d={I.plus} size={26} />
      </button>
      <TodoSheet open={sheet.open} todo={sheet.todo} onClose={() => setSheet(s => ({ ...s, open: false }))} />
    </main>
  )
}
