import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Backend } from './backend'
import type { Area, AreaId, Goal, Todo } from './types'
import { nextDue } from './recurrence'
import { dayLabel } from './dates'

export type TodoDraft = Omit<Todo, 'id' | 'created_at' | 'completed_at' | 'failed_at'>
interface Toast { id: number; text: string; undo?: () => void }

interface Store {
  areas: Area[]
  areaOf(id: AreaId | null | undefined): Area | undefined
  addArea(name: string, icon: string): string
  saveArea(id: AreaId, patch: Partial<Area>): void
  deleteArea(id: AreaId): void
  goals: Goal[]
  todos: Todo[]
  loading: boolean
  toast: Toast | null
  dismissToast(): void
  addTodo(d: TodoDraft): void
  saveTodo(id: string, patch: Partial<Todo>): void
  completeTodo(t: Todo): void
  missTodo(t: Todo): void
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
  const [areas, setAreas] = useState<Area[]>([])
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
      const [a, g, t] = await Promise.all([backend.listAreas(), backend.listGoals(), backend.listTodos()])
      setAreas(a); setGoals(g); setTodos(t)
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

  /**
   * Done or missed: a one-off task leaves the list (completed_at / failed_at);
   * a repeating task moves to its next date, so only today's occurrence goes.
   */
  const finish = (t: Todo, status: 'done' | 'missed') => {
    const prev = { due_date: t.due_date, completed_at: t.completed_at ?? null, failed_at: t.failed_at ?? null }
    const next = t.recurrence ? nextDue(t.recurrence, t.due_date) : null
    const stamp = new Date().toISOString()
    const patch: Partial<Todo> = next ? { due_date: next } : status === 'done' ? { completed_at: stamp } : { failed_at: stamp }
    setTodos(ts => next ? ts.map(x => x.id === t.id ? { ...x, ...patch } : x) : ts.filter(x => x.id !== t.id))
    backend.updateTodo(t.id, patch).catch(fail)
    const logId = crypto.randomUUID?.() ?? tmpId()
    const real = !t.id.startsWith('tmp-')
    backend.log({ id: logId, todo_id: real ? t.id : null, title: t.title, due_date: t.due_date, status }).catch(() => {})
    const undo = () => {
      setTodos(ts => next ? ts.map(x => x.id === t.id ? { ...x, ...prev } : x) : [...ts, { ...t, ...prev }])
      const revert: Partial<Todo> = next ? { due_date: prev.due_date } : status === 'done' ? { completed_at: null } : { failed_at: null }
      backend.updateTodo(t.id, revert).catch(fail)
      backend.unlog(logId).catch(() => {})
    }
    const label = status === 'done' ? 'Completed' : 'Missed'
    show(next ? `${label} · next ${dayLabel(next).toLowerCase()}` : label, undo)
  }

  const store = useMemo<Store>(() => ({
    areas, goals, todos, loading, toast,
    areaOf: id => (id ? areas.find(a => a.id === id) : undefined),
    addArea(name, icon) {
      const id = crypto.randomUUID?.() ?? tmpId()
      const a: Area = { id, name, icon, position: areas.reduce((m, x) => Math.max(m, x.position), -1) + 1 }
      setAreas(as => [...as, a])
      backend.insertArea(a).catch(fail)
      return id
    },
    saveArea(id, patch) {
      setAreas(as => as.map(a => a.id === id ? { ...a, ...patch } : a))
      backend.updateArea(id, patch).catch(fail)
    },
    deleteArea(id) {
      setAreas(as => as.filter(a => a.id !== id))
      setGoals(gs => gs.filter(g => g.area !== id))
      setTodos(ts => ts.map(t => t.area === id ? { ...t, area: null } : t))
      backend.deleteArea(id).catch(fail)
    },
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
    completeTodo(t) { finish(t, 'done') },
    missTodo(t) { finish(t, 'missed') },
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
  }), [areas, goals, todos, loading, toast, backend, fail, show])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
