import type { Goal, Todo } from './types'
import { supabase } from './supabase'
import { SEED } from '../data/areas'
import type { AreaId } from './types'

export interface Backend {
  listGoals(): Promise<Goal[]>
  listTodos(): Promise<Todo[]>
  insertGoal(g: Omit<Goal, 'id' | 'created_at'>): Promise<Goal>
  updateGoal(id: string, patch: Partial<Goal>): Promise<void>
  deleteGoal(id: string): Promise<void>
  insertTodo(t: Omit<Todo, 'id' | 'created_at'>): Promise<Todo>
  updateTodo(id: string, patch: Partial<Todo>): Promise<void>
  deleteTodo(id: string): Promise<void>
}

const normTodo = (t: any): Todo => ({ ...t, due_time: t.due_time ? String(t.due_time).slice(0, 5) : null })

function check<T>(r: { data: T; error: any }): T {
  if (r.error) throw r.error
  return r.data
}

export const supabaseBackend = (): Backend => {
  const sb = supabase!
  return {
    async listGoals() { return check(await sb.from('goals').select('*').order('position').order('created_at')) as Goal[] },
    async listTodos() { return (check(await sb.from('todos').select('*').is('completed_at', null)) as any[]).map(normTodo) },
    async insertGoal(g) { return check(await sb.from('goals').insert(g).select().single()) as Goal },
    async updateGoal(id, patch) { check(await sb.from('goals').update(patch).eq('id', id)) },
    async deleteGoal(id) { check(await sb.from('goals').delete().eq('id', id)) },
    async insertTodo(t) { return normTodo(check(await sb.from('todos').insert(t).select().single())) },
    async updateTodo(id, patch) { check(await sb.from('todos').update(patch).eq('id', id)) },
    async deleteTodo(id) { check(await sb.from('todos').delete().eq('id', id)) },
  }
}

/** Demo mode: everything lives in this browser only. */
export const localBackend = (): Backend => {
  const K = 'nokto-demo-v1'
  type S = { goals: Goal[]; todos: Todo[] }
  const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
  const now = () => new Date().toISOString()
  const load = (): S => {
    try { const s = localStorage.getItem(K); if (s) return JSON.parse(s) } catch {}
    const goals: Goal[] = (Object.keys(SEED) as AreaId[]).flatMap(area =>
      SEED[area].map((title, position) => ({ id: uid(), area, title, note: '', done: false, done_at: null, position, created_at: now() })))
    return { goals, todos: [] }
  }
  let s = load()
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  return {
    async listGoals() { return [...s.goals] },
    async listTodos() { return s.todos.filter(t => !t.completed_at) },
    async insertGoal(g) { const x = { ...g, id: uid(), created_at: now() }; s.goals.push(x); save(); return x },
    async updateGoal(id, p) { s.goals = s.goals.map(g => g.id === id ? { ...g, ...p } : g); save() },
    async deleteGoal(id) { s.goals = s.goals.filter(g => g.id !== id); save() },
    async insertTodo(t) { const x = { ...t, id: uid(), created_at: now() }; s.todos.push(x); save(); return x },
    async updateTodo(id, p) { s.todos = s.todos.map(t => t.id === id ? { ...t, ...p } : t); save() },
    async deleteTodo(id) { s.todos = s.todos.filter(t => t.id !== id); save() },
  }
}
