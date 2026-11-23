import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../../lib/store'
import { readCache, writeCache } from '../../lib/cache'
import type { Synced } from '../../lib/outbox'
import { NotSetUp, uuid, type FolioBackend } from './backend'
import { normBook, type Book, type BookDraft } from './types'

interface Folio {
  books: Book[]
  loading: boolean
  /** The Supabase table doesn't exist yet. */
  notSetUp: boolean
  book(id: string): Book | undefined
  addBook(d: BookDraft): string
  saveBook(id: string, patch: Partial<Book>): void
  deleteBook(id: string): void
}

const Ctx = createContext<Folio | null>(null)
export const useFolio = () => useContext(Ctx)!

/** Same offline model as Circle: open from the device copy, replace it from the server once nothing is queued. */
export function FolioProvider({ backend, cacheKey, children }: { backend: FolioBackend & Partial<Synced>; cacheKey?: string; children: ReactNode }) {
  const { notify } = useStore()
  const [cached] = useState(() => readCache<Book[]>(cacheKey))
  const [books, setBooks] = useState<Book[]>(() => (cached ?? []).map(normBook))
  const [loading, setLoading] = useState(!cached)
  const [notSetUp, setNotSetUp] = useState(false)

  const refresh = useCallback(async () => {
    try {
      if (navigator.onLine === false) return
      if (backend.flush && !(await backend.flush())) return
      const v = backend.version?.()
      const d = await backend.load()
      if (backend.version && (backend.version() !== v || backend.pending!() > 0)) return
      setBooks(d); setNotSetUp(false)
    } catch (e) {
      if (e instanceof NotSetUp) setNotSetUp(true)
      else console.error(e)
    } finally { setLoading(false) }
  }, [backend])

  useEffect(() => {
    if (!loading && !notSetUp) writeCache(cacheKey, books)
  }, [cacheKey, books, loading, notSetUp])

  useEffect(() => {
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onVis) }
  }, [refresh])

  const fail = useCallback((e: unknown) => { console.error(e); notify("Couldn't sync. Retrying…"); refresh() }, [notify, refresh])

  const folio = useMemo<Folio>(() => ({
    books, loading, notSetUp,
    book: id => books.find(b => b.id === id),
    addBook(d) {
      const b: Book = { ...d, id: uuid(), created_at: new Date().toISOString() }
      setBooks(bs => [...bs, b])
      backend.insertBook(b).catch(fail)
      return b.id
    },
    saveBook(id, patch) {
      setBooks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
      backend.updateBook(id, patch).catch(fail)
    },
    deleteBook(id) {
      const b = books.find(x => x.id === id)
      setBooks(bs => bs.filter(x => x.id !== id))
      backend.deleteBook(id).catch(fail)
      if (b) notify(`Deleted ${b.title}`, () => { setBooks(bs => [...bs, b]); backend.insertBook(b).catch(fail) })
    },
  }), [books, loading, notSetUp, backend, fail, notify])

  return <Ctx.Provider value={folio}>{children}</Ctx.Provider>
}
