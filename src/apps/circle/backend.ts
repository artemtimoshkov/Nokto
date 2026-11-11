import { supabase } from '../../lib/supabase'
import { withOutbox, type Synced } from '../../lib/outbox'
import { uuid } from '../../lib/uuid'
import { emptyFriend, type Friend, type FriendNote } from './types'

export interface CircleData { friends: Friend[]; notes: FriendNote[] }

/** Thrown when the Supabase tables for Circle haven't been created yet. */
export class NotSetUp extends Error {}

export interface CircleBackend {
  load(): Promise<CircleData>
  insertFriend(f: Friend): Promise<void>
  updateFriend(id: string, patch: Partial<Friend>): Promise<void>
  /** Also deletes the friend's notes. */
  deleteFriend(id: string): Promise<void>
  insertNote(n: FriendNote): Promise<void>
  updateNote(id: string, patch: Partial<FriendNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}

export { uuid }

function check(r: { error: any }) { if (r.error) throw r.error }
const missingTable = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205'

export const supabaseCircle = (): CircleBackend => {
  const sb = supabase!
  return {
    async load() {
      const [f, n] = await Promise.all([
        sb.from('friends').select('*').order('name'),
        sb.from('friend_notes').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      ])
      if (missingTable(f.error) || missingTable(n.error)) throw new NotSetUp()
      check(f); check(n)
      return { friends: (f.data as any[]).map(normFriend), notes: (n.data as any[]).map(normNote) }
    },
    async insertFriend({ created_at: _c, ...f }) { await withoutMissingSocial(f, row => sb.from('friends').insert(row)) },
    async updateFriend(id, patch) { await withoutMissingSocial(patch, row => sb.from('friends').update(row).eq('id', id)) },
    async deleteFriend(id) { check(await sb.from('friends').delete().eq('id', id)) }, // notes cascade
    async insertNote({ created_at: _c, ...n }) { check(await sb.from('friend_notes').insert(n)) },
    async updateNote(id, patch) { check(await sb.from('friend_notes').update(patch).eq('id', id)) },
    async deleteNote(id) { check(await sb.from('friend_notes').delete().eq('id', id)) },
  }
}

/** Supabase behind the offline outbox (see lib/outbox.ts). */
export const syncedCircle = (userId: string): CircleBackend & Synced =>
  withOutbox(supabaseCircle(), `circle:${userId}`, ['load'])

/**
 * The LinkedIn / Instagram columns came later. If the database hasn't been
 * updated yet, save everything else rather than losing the whole change.
 */
async function withoutMissingSocial(row: Record<string, any>, run: (row: Record<string, any>) => PromiseLike<{ error: any }>) {
  const r = await run(row)
  const missing = r.error && (r.error.code === 'PGRST204' || r.error.code === '42703') && /linkedin|instagram/.test(r.error.message ?? '')
  if (!missing) return check(r)
  const { linkedin: _l, instagram: _i, ...rest } = row
  console.warn('Run supabase/schema.sql to save LinkedIn and Instagram.')
  if (Object.keys(rest).length) check(await run(rest))
}

const normFriend = (f: any): Friend => {
  const { user_id: _u, ...rest } = f
  return { ...emptyFriend(), ...rest, siblings: Array.isArray(f.siblings) ? f.siblings : [] }
}
const normNote = (n: any): FriendNote => {
  const { user_id: _u, ...rest } = n
  return rest
}

/** Demo mode: everything lives in this browser only. */
export const localCircle = (): CircleBackend => {
  const K = 'nokto-demo-circle-v1'
  let s: CircleData
  try { s = JSON.parse(localStorage.getItem(K) ?? '') } catch { s = demoSeed() }
  s.friends = s.friends.map(f => ({ ...emptyFriend(), ...f })) // fields added since this was saved
  const save = () => { try { localStorage.setItem(K, JSON.stringify(s)) } catch {} }
  save()
  return {
    async load() { return { friends: [...s.friends], notes: [...s.notes] } },
    async insertFriend(f) { s.friends = [...s.friends, f]; save() },
    async updateFriend(id, p) { s.friends = s.friends.map(f => f.id === id ? { ...f, ...p } : f); save() },
    async deleteFriend(id) { s.friends = s.friends.filter(f => f.id !== id); s.notes = s.notes.filter(n => n.friend_id !== id); save() },
    async insertNote(n) { s.notes = [n, ...s.notes]; save() },
    async updateNote(id, p) { s.notes = s.notes.map(n => n.id === id ? { ...n, ...p } : n); save() },
    async deleteNote(id) { s.notes = s.notes.filter(n => n.id !== id); save() },
  }
}

function demoSeed(): CircleData {
  const now = new Date()
  const ago = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10) }
  const soon = new Date(now); soon.setDate(soon.getDate() + 9)
  const created_at = now.toISOString()
  const maya: Friend = {
    ...emptyFriend(), id: uuid(), created_at, name: 'Maya Lindqvist', closeness: 'best',
    birth_month: soon.getMonth() + 1, birth_day: soon.getDate(), birth_year: 1993,
    grew_up: 'Gothenburg, Sweden', nationality: 'Swedish', lives_in: 'Lisbon', work: 'Product designer',
    partner: 'Tom', how_we_met: 'Flatmates in university', instagram: 'maya.climbs',
    siblings: [{ name: 'Erik', note: 'Older brother, doctor' }, { name: 'Linn', note: 'Younger sister' }],
    about: 'Loves climbing and natural wine. Moved to Lisbon in 2022.', last_contact: ago(12),
  }
  const sam: Friend = {
    ...emptyFriend(), id: uuid(), created_at, name: 'Sam Okafor', closeness: 'good',
    birth_month: 3, birth_day: 14, grew_up: 'Lagos', nationality: 'Nigerian, British', lives_in: 'London',
    work: 'Runs a coffee roastery', how_we_met: 'Friend of Maya', linkedin: 'samokafor', last_contact: ago(95),
  }
  return {
    friends: [maya, sam],
    notes: [
      { id: uuid(), friend_id: maya.id, date: ago(12), created_at, body: 'Thinking about leaving her job to freelance. Tom’s mum was ill, ask how she is.' },
      { id: uuid(), friend_id: maya.id, date: ago(60), created_at, body: 'Planning a climbing trip to Kalymnos in spring.' },
      { id: uuid(), friend_id: sam.id, date: ago(95), created_at, body: 'Opening a second shop in Hackney.' },
    ],
  }
}
