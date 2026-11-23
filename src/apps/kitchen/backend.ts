import { supabase } from '../../lib/supabase'
import { withOutbox, type Synced } from '../../lib/outbox'
import { emptyRecipe, type Recipe } from './types'
import { sampleRecipes } from './samples'

/** Thrown when the Supabase table for Kitchen hasn't been created yet. */
export class NotSetUp extends Error {}

export interface KitchenBackend {
  load(): Promise<Recipe[]>
  insertRecipe(r: Recipe): Promise<void>
  updateRecipe(id: string, patch: Partial<Recipe>): Promise<void>
  deleteRecipe(id: string): Promise<void>
}

function check(r: { error: any }) { if (r.error) throw r.error }
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205'

export const norm = (r: any): Recipe => {
  const { user_id: _u, ...rest } = r ?? {}
  const x = { ...emptyRecipe(), ...rest }
  return {
    ...x,
    tags: Array.isArray(x.tags) ? x.tags : [],
    ingredients: Array.isArray(x.ingredients) ? x.ingredients : [],
    steps: Array.isArray(x.steps) ? x.steps.map((s: any) => ({ action: '', minutes: null, uses: [], ...s })) : [],
  }
}

export const supabaseKitchen = (): KitchenBackend => {
  const sb = supabase!
  return {
    async load() {
      const r = await sb.from('recipes').select('*').order('title')
      if (missingTable(r.error)) throw new NotSetUp()
      check(r)
      return (r.data as any[]).map(norm)
    },
    async insertRecipe({ created_at: _c, ...r }) { check(await sb.from('recipes').insert(r)) },
    async updateRecipe(id, { created_at: _c, id: _i, ...patch }) { check(await sb.from('recipes').update(patch).eq('id', id)) },
    async deleteRecipe(id) { check(await sb.from('recipes').delete().eq('id', id)) },
  }
}

/** Supabase behind the offline outbox (see lib/outbox.ts). */
export const syncedKitchen = (userId: string): KitchenBackend & Synced =>
  withOutbox(supabaseKitchen(), `kitchen:${userId}`, ['load'])

/** Demo mode: everything lives in this browser only. */
export const localKitchen = (): KitchenBackend => {
  const K = 'nokto-demo-kitchen-v1'
  let s: Recipe[]
  try { s = (JSON.parse(localStorage.getItem(K) ?? '') as any[]).map(norm) } catch { s = sampleRecipes() }
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  return {
    async load() { return [...s] },
    async insertRecipe(r) { s = [...s, r]; save() },
    async updateRecipe(id, p) { s = s.map(r => r.id === id ? { ...r, ...p } : r); save() },
    async deleteRecipe(id) { s = s.filter(r => r.id !== id); save() },
  }
}
