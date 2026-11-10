import type { Todo } from './types'
import { toKey, today } from './dates'

export function compareTodos(a: Todo, b: Todo): number {
  if (a.priority !== b.priority) return a.priority - b.priority
  const ad = a.due_date ?? '9999', bd = b.due_date ?? '9999'
  if (ad !== bd) return ad < bd ? -1 : 1
  const at = a.due_time ?? '99', bt = b.due_time ?? '99'
  if (at !== bt) return at < bt ? -1 : 1
  return a.created_at < b.created_at ? -1 : 1
}

export interface Section { key: string; title: string; kind: 'overdue' | 'today' | 'day' | 'none'; todos: Todo[] }

export function groupTodos(todos: Todo[], now = today()): Section[] {
  const t = toKey(now)
  const open = todos.filter(x => !x.completed_at && !x.failed_at)
  const overdue = open.filter(x => x.due_date && x.due_date < t).sort(compareTodos)
  const todayList = open.filter(x => x.due_date === t).sort(compareTodos)
  const future = open.filter(x => x.due_date && x.due_date > t)
  const none = open.filter(x => !x.due_date).sort(compareTodos)

  const byDay = new Map<string, Todo[]>()
  for (const x of future) byDay.set(x.due_date!, [...(byDay.get(x.due_date!) ?? []), x])

  const out: Section[] = []
  if (overdue.length) out.push({ key: 'overdue', title: 'Overdue', kind: 'overdue', todos: overdue })
  out.push({ key: 'today', title: 'Today', kind: 'today', todos: todayList })
  for (const day of [...byDay.keys()].sort()) out.push({ key: day, title: day, kind: 'day', todos: byDay.get(day)!.sort(compareTodos) })
  if (none.length) out.push({ key: 'none', title: 'No date', kind: 'none', todos: none })
  return out
}
