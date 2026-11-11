import type { Area, Goal, LogEntry, Todo } from './types'
import { supabase } from './supabase'
import { uuid } from './uuid'
import { DEFAULT_AREAS, SEED } from '../data/areas'
import { isTransient, withOutbox, type Synced } from './outbox'

export interface Backend {
  listAreas(): Promise<Area[]>
  insertArea(a: Area): Promise<void>
  updateArea(id: string, patch: Partial<Area>): Promise<void>
  /** Deletes the area and its goals; tasks in it keep existing with no area. */
  deleteArea(id: string): Promise<void>
  listGoals(): Promise<Goal[]>
  listTodos(): Promise<Todo[]>
  insertGoal(g: Goal): Promise<void>
  updateGoal(id: string, patch: Partial<Goal>): Promise<void>
  deleteGoal(id: string): Promise<void>
  insertTodo(t: Todo): Promise<void>
  updateTodo(id: string, patch: Partial<Todo>): Promise<void>
  deleteTodo(id: string): Promise<void>
  log(e: LogEntry): Promise<void>
  unlog(id: string): Promise<void>
}

const normTodo = (t: any): Todo => ({ ...t, due_time: t.due_time ? String(t.due_time).slice(0, 5) : null })

function check<T>(r: { data: T; error: any }): T {
  if (r.error) throw r.error
  return r.data
}

/** Retry when offline, but otherwise don't let history get in the way. */
function soft(r: { error: any }) {
  if (!r.error) return
  if (isTransient(r.error)) throw r.error
  console.warn('todo_log', r.error.message)
}

export const supabaseBackend = (): Backend => {
  const sb = supabase!
  return {
    async listAreas() {
      const r = await sb.from('areas').select('id,name,icon,position').order('position').order('created_at')
      // Database not migrated yet (no areas table): use the defaults.
      if (r.error) { console.warn('areas', r.error.message); return DEFAULT_AREAS }
      return r.data as Area[]
    },
    async insertArea(a) { check(await sb.from('areas').insert(a)) },
    async updateArea(id, patch) { check(await sb.from('areas').update(patch).eq('id', id)) },
    async deleteArea(id) {
      check(await sb.from('goals').delete().eq('area', id))
      check(await sb.from('todos').update({ area: null }).eq('area', id))
      check(await sb.from('areas').delete().eq('id', id))
    },
    async listGoals() { return check(await sb.from('goals').select('*').order('position').order('created_at')) as Goal[] },
    async listTodos() {
      let r = await sb.from('todos').select('*').is('completed_at', null).is('failed_at', null)
      // Database not migrated yet (no failed_at column): fall back gracefully.
      if (r.error?.code === '42703') r = await sb.from('todos').select('*').is('completed_at', null)
      return (check(r) as any[]).map(normTodo)
    },
    async insertGoal(g) { check(await sb.from('goals').insert(g)) },
    async updateGoal(id, patch) { check(await sb.from('goals').update(patch).eq('id', id)) },
    async deleteGoal(id) { check(await sb.from('goals').delete().eq('id', id)) },
    async insertTodo(t) { check(await sb.from('todos').insert(t)) },
    async updateTodo(id, patch) { check(await sb.from('todos').update(patch).eq('id', id)) },
    async deleteTodo(id) { check(await sb.from('todos').delete().eq('id', id)) },
    // History is best-effort: never let it break completing a task.
    async log(e) { soft(await sb.from('todo_log').insert(e)) },
    async unlog(id) { soft(await sb.from('todo_log').delete().eq('id', id)) },
  }
}

/** Supabase behind the offline outbox: reads go to the server, changes queue on the device. */
export const syncedBackend = (userId: string): Backend & Synced =>
  withOutbox(supabaseBackend(), `core:${userId}`, ['listAreas', 'listGoals', 'listTodos'])

/** Demo mode: everything lives in this browser only. */
export const localBackend = (): Backend => {
  const K = 'nokto-demo-v1'
  type S = { goals: Goal[]; todos: Todo[]; log?: LogEntry[]; areas?: Area[] }
  const uid = uuid
  const now = () => new Date().toISOString()
  const load = (): S => {
    try { const s = localStorage.getItem(K); if (s) return JSON.parse(s) } catch {}
    const goals: Goal[] = Object.keys(SEED).flatMap(area =>
      SEED[area].map((title, position) => ({ id: uid(), area, title, note: '', done: false, done_at: null, position, created_at: now() })))
    return { goals, todos: [], areas: DEFAULT_AREAS }
  }
  let s = load()
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  if (!s.areas) s.areas = DEFAULT_AREAS
  return {
    async listAreas() { return [...s.areas!] },
    async insertArea(a) { s.areas = [...s.areas!, a]; save() },
    async updateArea(id, p) { s.areas = s.areas!.map(a => a.id === id ? { ...a, ...p } : a); save() },
    async deleteArea(id) {
      s.areas = s.areas!.filter(a => a.id !== id)
      s.goals = s.goals.filter(g => g.area !== id)
      s.todos = s.todos.map(t => t.area === id ? { ...t, area: null } : t)
      save()
    },
    async listGoals() { return [...s.goals] },
    async listTodos() { return s.todos.filter(t => !t.completed_at && !t.failed_at) },
    async insertGoal(g) { s.goals.push(g); save() },
    async updateGoal(id, p) { s.goals = s.goals.map(g => g.id === id ? { ...g, ...p } : g); save() },
    async deleteGoal(id) { s.goals = s.goals.filter(g => g.id !== id); save() },
    async insertTodo(t) { s.todos.push(t); save() },
    async updateTodo(id, p) { s.todos = s.todos.map(t => t.id === id ? { ...t, ...p } : t); save() },
    async deleteTodo(id) { s.todos = s.todos.filter(t => t.id !== id); save() },
    async log(e) { s.log = [...(s.log ?? []), e]; save() },
    async unlog(id) { s.log = (s.log ?? []).filter(x => x.id !== id); save() },
  }
}
