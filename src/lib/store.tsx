import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Backend } from './backend'
import type { AreaId, Goal, Todo } from './types'
import { nextDue } from './recurrence'
import { describe } from './recurrence'
import { dayLabel } from './dates'

export type TodoDraft = Omit<Todo, 'id' | 'created_at' | 'completed_at'>
interface Toast { id: number; text: string; undo?: () => void }

interface Store {
  goals: Goal[]
  todos: Todo[]
  loading: boolean
  toast: Toast | null
  dismissToast(): void
  addTodo(d: TodoDraft): void
  saveTodo(id: string, patch: Partial<Todo>): void
  completeTodo(t: Todo): void
  deleteTodo(id: string): void
  addGoal(area: AreaId, title: string, note: string): void
  saveGoal(id: string, patch: Partial<Goal>): void
  toggleGoal(g: Goal): void
  deleteGoal(id: string): void
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

const tmpId = () => 'tmp-' + Math.random().toString(36).slice(2)

export function StoreProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>()

  const show = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, undo })
    timer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [g, t] = await Promise.all([backend.listGoals(), backend.listTodos()])
      setGoals(g); setTodos(t)
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [backend])

  useEffect(() => {
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [refresh])

  const fail = useCallback((e: unknown) => { console.error(e); show("Couldn't sync. Retrying…"); refresh() }, [refresh, show])

  const store = useMemo<Store>(() => ({
    goals, todos, loading, toast,
    dismissToast: () => setToast(null),

    addTodo(d) {
      const id = tmpId()
      const optimistic: Todo = { ...d, id, completed_at: null, created_at: new Date().toISOString() }
      setTodos(ts => [...ts, optimistic])
      backend.insertTodo({ ...d, completed_at: null })
        .then(real => setTodos(ts => ts.map(t => t.id === id ? real : t)))
        .catch(fail)
    },
    saveTodo(id, patch) {
      setTodos(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))
      backend.updateTodo(id, patch).catch(fail)
    },
    completeTodo(t) {
      const prev = { due_date: t.due_date, completed_at: t.completed_at }
      const next = t.recurrence ? nextDue(t.recurrence, t.due_date) : null
      const patch: Partial<Todo> = next ? { due_date: next } : { completed_at: new Date().toISOString() }
      setTodos(ts => next ? ts.map(x => x.id === t.id ? { ...x, ...patch } : x) : ts.filter(x => x.id !== t.id))
      backend.updateTodo(t.id, patch).catch(fail)
      const undo = () => {
        setTodos(ts => next ? ts.map(x => x.id === t.id ? { ...x, ...prev } : x) : [...ts, { ...t, ...prev }])
        backend.updateTodo(t.id, prev).catch(fail)
      }
      show(next ? `Next: ${dayLabel(next)} · ${describe(t.recurrence!)}` : 'Completed', undo)
    },
    deleteTodo(id) {
      const t = todos.find(x => x.id === id)
      setTodos(ts => ts.filter(x => x.id !== id))
      backend.deleteTodo(id).catch(fail)
      if (t) show('Deleted', () => { const { id: _i, created_at: _c, ...rest } = t; store.addTodo(rest) })
    },

    addGoal(area, title, note) {
      const id = tmpId()
      const position = goals.filter(g => g.area === area).length
      const g = { area, title, note, done: false, done_at: null, position }
      setGoals(gs => [...gs, { ...g, id, created_at: new Date().toISOString() }])
      backend.insertGoal(g).then(real => setGoals(gs => gs.map(x => x.id === id ? real : x))).catch(fail)
    },
    saveGoal(id, patch) {
      setGoals(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g))
      backend.updateGoal(id, patch).catch(fail)
    },
    toggleGoal(g) {
      const patch = { done: !g.done, done_at: g.done ? null : new Date().toISOString() }
      setGoals(gs => gs.map(x => x.id === g.id ? { ...x, ...patch } : x))
      backend.updateGoal(g.id, patch).catch(fail)
      if (!g.done) show('Achieved ✦', () => store.toggleGoal({ ...g, ...patch }))
    },
    deleteGoal(id) {
      setGoals(gs => gs.filter(x => x.id !== id))
      backend.deleteGoal(id).catch(fail)
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [goals, todos, loading, toast, backend, fail, show])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
