import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../../lib/store'
import { toKey, today } from '../../lib/dates'
import { NotSetUp, uuid, type CircleBackend } from './backend'
import type { Friend, FriendDraft, FriendNote } from './types'

interface Circle {
  friends: Friend[]
  notes: FriendNote[]
  loading: boolean
  /** The Supabase tables don't exist yet. */
  notSetUp: boolean
  friend(id: string): Friend | undefined
  notesOf(id: string): FriendNote[]
  addFriend(d: FriendDraft): string
  saveFriend(id: string, patch: Partial<Friend>): void
  deleteFriend(id: string): void
  /** Mark that you talked today. */
  talkedToday(f: Friend): void
  addNote(friendId: string, body: string, date: string): void
  saveNote(n: FriendNote, patch: Partial<FriendNote>): void
  deleteNote(n: FriendNote): void
}

const Ctx = createContext<Circle | null>(null)
export const useCircle = () => useContext(Ctx)!

const byDate = (a: FriendNote, b: FriendNote) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
const later = (a: string | null, b: string) => (!a || b > a ? b : a)

export function CircleProvider({ backend, children }: { backend: CircleBackend; children: ReactNode }) {
  const { notify } = useStore()
  const [friends, setFriends] = useState<Friend[]>([])
  const [notes, setNotes] = useState<FriendNote[]>([])
  const [loading, setLoading] = useState(true)
  const [notSetUp, setNotSetUp] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const d = await backend.load()
      setFriends(d.friends); setNotes(d.notes); setNotSetUp(false)
    } catch (e) {
      if (e instanceof NotSetUp) setNotSetUp(true)
      else console.error(e)
    } finally { setLoading(false) }
  }, [backend])
  useEffect(() => { refresh() }, [refresh])

  const fail = useCallback((e: unknown) => { console.error(e); notify("Couldn't sync. Retrying…"); refresh() }, [notify, refresh])

  const circle = useMemo<Circle>(() => {
    const patchFriend = (id: string, patch: Partial<Friend>) => {
      setFriends(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f))
      backend.updateFriend(id, patch).catch(fail)
    }
    /** A note about a conversation also moves "last talked" forward. */
    const bump = (friendId: string, date: string) => {
      const f = friends.find(x => x.id === friendId)
      if (f && later(f.last_contact, date) !== f.last_contact) patchFriend(friendId, { last_contact: date })
    }
    return {
      friends, notes, loading, notSetUp,
      friend: id => friends.find(f => f.id === id),
      notesOf: id => notes.filter(n => n.friend_id === id).sort(byDate),

      addFriend(d) {
        const f: Friend = { ...d, id: uuid(), created_at: new Date().toISOString() }
        setFriends(fs => [...fs, f])
        backend.insertFriend(f).catch(fail)
        return f.id
      },
      saveFriend: patchFriend,
      deleteFriend(id) {
        const f = friends.find(x => x.id === id)
        const mine = notes.filter(n => n.friend_id === id)
        setFriends(fs => fs.filter(x => x.id !== id))
        setNotes(ns => ns.filter(n => n.friend_id !== id))
        backend.deleteFriend(id).catch(fail)
        if (f) notify(`Deleted ${f.name}`, () => {
          setFriends(fs => [...fs, f]); setNotes(ns => [...ns, ...mine])
          backend.insertFriend(f).then(() => Promise.all(mine.map(n => backend.insertNote(n)))).catch(fail)
        })
      },
      talkedToday(f) {
        const prev = f.last_contact
        patchFriend(f.id, { last_contact: toKey(today()) })
        notify(`Talked to ${f.name.split(' ')[0]} today`, () => patchFriend(f.id, { last_contact: prev }))
      },

      addNote(friendId, body, date) {
        const n: FriendNote = { id: uuid(), friend_id: friendId, body, date, created_at: new Date().toISOString() }
        setNotes(ns => [n, ...ns])
        backend.insertNote(n).catch(fail)
        bump(friendId, date)
      },
      saveNote(n, patch) {
        setNotes(ns => ns.map(x => x.id === n.id ? { ...x, ...patch } : x))
        backend.updateNote(n.id, patch).catch(fail)
        if (patch.date) bump(n.friend_id, patch.date)
      },
      deleteNote(n) {
        setNotes(ns => ns.filter(x => x.id !== n.id))
        backend.deleteNote(n.id).catch(fail)
        notify('Note deleted', () => { setNotes(ns => [...ns, n]); backend.insertNote(n).catch(fail) })
      },
    }
  }, [friends, notes, loading, notSetUp, backend, fail, notify])

  return <Ctx.Provider value={circle}>{children}</Ctx.Provider>
}
