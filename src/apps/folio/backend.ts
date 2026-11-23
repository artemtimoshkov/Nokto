import { supabase } from '../../lib/supabase'
import { withOutbox, type Synced } from '../../lib/outbox'
import { uuid } from '../../lib/uuid'
import { normBook, type Book } from './types'

/** Thrown when the Supabase table for Folio hasn't been created yet. */
export class NotSetUp extends Error {}

export interface FolioBackend {
  load(): Promise<Book[]>
  insertBook(b: Book): Promise<void>
  updateBook(id: string, patch: Partial<Book>): Promise<void>
  deleteBook(id: string): Promise<void>
}

export { uuid }

function check(r: { error: any }) { if (r.error) throw r.error }
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205'

export const supabaseFolio = (): FolioBackend => {
  const sb = supabase!
  return {
    async load() {
      const r = await sb.from('books').select('*').order('created_at')
      if (missingTable(r.error)) throw new NotSetUp()
      check(r)
      return (r.data as any[]).map(normBook)
    },
    async insertBook({ created_at: _c, ...b }) { check(await sb.from('books').insert(b)) },
    async updateBook(id, patch) { check(await sb.from('books').update(patch).eq('id', id)) },
    async deleteBook(id) { check(await sb.from('books').delete().eq('id', id)) },
  }
}

/** Supabase behind the offline outbox (see lib/outbox.ts). */
export const syncedFolio = (userId: string): FolioBackend & Synced =>
  withOutbox(supabaseFolio(), `folio:${userId}`, ['load'])

/** Demo mode: everything lives in this browser only. */
export const localFolio = (): FolioBackend => {
  const K = 'nokto-demo-folio-v1'
  let s: Book[]
  try { s = (JSON.parse(localStorage.getItem(K) ?? '') as any[]).map(normBook) } catch { s = demoSeed() }
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  return {
    async load() { return [...s] },
    async insertBook(b) { s = [...s, b]; save() },
    async updateBook(id, p) { s = s.map(b => b.id === id ? { ...b, ...p } : b); save() },
    async deleteBook(id) { s = s.filter(b => b.id !== id); save() },
  }
}

function demoSeed(): Book[] {
  const now = new Date()
  const ago = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10) }
  const created_at = now.toISOString()
  const base = { id: '', created_at, cover: null, thoughts: '', summary: '', recommend_to: '', quotes: [] as string[] }
  return [
    {
      ...base, id: uuid(), title: 'Meditations', author: 'Marcus Aurelius', status: 'reading', rating: null,
      started_on: ago(9), finished_on: null,
      lessons: ['You control your judgements, not events.', 'Do the work in front of you, and do it well.', ''],
      quotes: ['The happiness of your life depends upon the quality of your thoughts.'],
    },
    {
      ...base, id: uuid(), title: 'The Old Man and the Sea', author: 'Ernest Hemingway', status: 'finished', rating: 5,
      started_on: ago(70), finished_on: ago(58),
      summary: 'An ageing Cuban fisherman goes far out alone, hooks a giant marlin and fights it for three days, then loses it to sharks on the way home.',
      lessons: ['Dignity lies in how you struggle, not in the result.', 'Respect what you are up against.', 'Pride can carry you too far out.'],
      thoughts: 'Short, but it stayed with me for weeks. The ending feels like a loss and a win at the same time.',
      quotes: ['A man can be destroyed but not defeated.', 'Every day is a new day. It is better to be lucky. But I would rather be exact.'],
      recommend_to: 'Anyone who thinks they don’t like classics. It’s a two-evening read.',
    },
    {
      ...base, id: uuid(), title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', status: 'finished', rating: 4,
      started_on: ago(420), finished_on: ago(380),
      summary: 'Two systems run your mind: a fast, intuitive one and a slow, deliberate one. Most errors in judgement come from trusting the fast one when you shouldn’t.',
      lessons: ['What you see is all there is: we judge from whatever is in front of us.', 'Losses hurt about twice as much as gains feel good.', 'Anchors move numbers even when they’re obviously random.'],
      thoughts: 'Dense in the middle, but it changed how I read the news.',
      recommend_to: 'Anyone who makes decisions for a living: founders, investors, doctors.',
    },
  ]
}
