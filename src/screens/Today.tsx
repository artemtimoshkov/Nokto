import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useStore } from '../lib/store'
import { groupTodos } from '../lib/sort'
import { fromKey, today, dayLabel } from '../lib/dates'
import { TodoRow } from '../components/TodoRow'
import { TodoSheet } from '../components/TodoSheet'
import { Icon, I } from '../components/Icon'
import type { Todo } from '../lib/types'
import { SearchBar, matches } from '../components/SearchBar'
import { compareTodos } from '../lib/sort'

export function Today({ onAccount }: { onAccount(): void }) {
  const { todos, loading, areaOf } = useStore()
  const [q, setQ] = useState('')
  const sections = useMemo(() => groupTodos(todos).filter(s => s.todos.length), [todos])
  const results = useMemo(() => q.trim()
    ? todos.filter(t => !t.completed_at && !t.failed_at && (matches(t.title, q) || matches(areaOf(t.area)?.name ?? '', q))).sort(compareTodos)
    : null, [q, todos, areaOf])
  const [sheet, setSheet] = useState<{ open: boolean; todo: Todo | null }>({ open: false, todo: null })
  const add = () => setSheet({ open: true, todo: null })

  return (
    <main className="screen">
      <header className="head">
        <div>
          <h1>Today</h1>
          <p className="sub">{format(today(), 'EEEE d MMMM')}</p>
        </div>
        <button className="avatar mobile-only" aria-label="Account" onClick={onAccount}><Icon d={I.user} size={18} /></button>
      </header>

      {todos.length > 0 && <SearchBar value={q} onChange={setQ} />}
      {!results && <button className="add-row desktop-only" onClick={add}><Icon d={I.plus} size={18} />Add task</button>}

      {results && (
        <ul className="todos results">
          {results.map(t => <TodoRow key={t.id} todo={t} showDate onOpen={() => setSheet({ open: true, todo: t })} />)}
        </ul>
      )}

      {!loading && !results && sections.map(s => {
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

      <button className="fab mobile-only" aria-label="Add task" onClick={add}><Icon d={I.plus} size={26} /></button>
      <TodoSheet open={sheet.open} todo={sheet.todo} onClose={() => setSheet(s => ({ ...s, open: false }))} />
    </main>
  )
}
