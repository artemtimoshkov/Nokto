/**
 * Offline sync. Every change is written to an outbox in localStorage first and
 * sent to Supabase in order. With no connection the outbox just waits, and it
 * is replayed when the device is back online (or the app is opened again).
 *
 * Rows get their ids on the device, so a change can be queued before the
 * server has ever seen the row. Replaying is safe: updates and deletes are
 * idempotent, and an insert that already reached the server (duplicate key)
 * counts as done.
 */
import { useEffect, useState } from 'react'

interface Op { id: string; method: string; args: unknown[]; tries?: number }

export interface Synced {
  /** Send everything queued. Resolves true once the outbox is empty. */
  flush(): Promise<boolean>
  /** Changes waiting to be sent. */
  pending(): number
  /** Goes up by one with every queued change. */
  version(): number
}

const P = 'nokto-outbox:'
const MAX_TRIES = 3

/** True when the error means "couldn't reach the server" or "try again later", not "the server said no". */
export function isTransient(e: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const code = e?.code == null ? '' : String(e.code)
  if (!code) return true // fetch failed: postgrest reports these with an empty code
  if (/^PGRST3/.test(code)) return true // JWT expired / missing: auth will refresh
  if (/^(08|53|57)/.test(code)) return true // connection, resources, operator intervention
  return false
}

// ----- shared status for the UI ------------------------------------------
const boxes = new Set<{ pending(): number }>()
const listeners = new Set<() => void>()
const dropListeners = new Set<(e: unknown) => void>()
const emit = () => listeners.forEach(l => l())

export function totalPending() { let n = 0; boxes.forEach(b => { n += b.pending() }); return n }
export function onDrop(cb: (e: unknown) => void) { dropListeners.add(cb); return () => { dropListeners.delete(cb) } }

/** { online, pending }: whether the device is connected and how many changes wait to sync. */
export function useSyncStatus() {
  const read = () => ({ online: navigator.onLine !== false, pending: totalPending() })
  const [s, setS] = useState(read)
  useEffect(() => {
    const on = () => setS(read())
    listeners.add(on)
    window.addEventListener('online', on); window.addEventListener('offline', on)
    return () => { listeners.delete(on); window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  }, [])
  return s
}

/**
 * Wraps a backend so that every method not listed in `reads` is queued.
 * Queued methods resolve straight away; the store has already updated the screen.
 */
export function withOutbox<B extends object>(remote: B, key: string, reads: (keyof B)[]): B & Synced {
  const K = P + key
  const load = (): Op[] => { try { return JSON.parse(localStorage.getItem(K) ?? '[]') } catch { return [] } }
  const store = (q: Op[]) => { try { localStorage.setItem(K, JSON.stringify(q)) } catch (e) { console.warn('outbox', e) } }
  // localStorage is the source of truth (read-modify-write), so two tabs don't overwrite each other's changes.
  const edit = (f: (q: Op[]) => Op[]) => { store(f(load())); emit() }

  let version = 0
  let running: Promise<boolean> | null = null
  let retry: number | undefined

  const schedule = () => {
    window.clearTimeout(retry)
    retry = window.setTimeout(() => { flush() }, 30_000)
  }

  const flush = (): Promise<boolean> => {
    if (running) return running
    running = (async () => {
      for (;;) {
        const op = load()[0]
        if (!op) return true
        if (navigator.onLine === false) return false
        try {
          await (remote as any)[op.method](...op.args)
        } catch (e: any) {
          const duplicate = op.method.startsWith('insert') && e?.code === '23505'
          if (!duplicate) {
            if (isTransient(e)) { schedule(); return false }
            const tries = (op.tries ?? 0) + 1
            if (tries < MAX_TRIES) {
              edit(q => q.map(x => x.id === op.id ? { ...x, tries } : x))
              schedule(); return false
            }
            console.error('Dropping change the server rejected', op, e)
            dropListeners.forEach(l => l(e))
          }
        }
        edit(q => q.filter(x => x.id !== op.id))
      }
    })().finally(() => { running = null })
    return running
  }

  const wrapped: any = {
    flush,
    pending: () => load().length,
    version: () => version,
  }
  for (const m of Object.keys(remote) as (keyof B & string)[]) {
    const fn = (remote as any)[m]
    if (typeof fn !== 'function') continue
    wrapped[m] = reads.includes(m)
      ? (...args: unknown[]) => fn(...args)
      : async (...args: unknown[]) => {
          version++
          edit(q => [...q, { id: Math.random().toString(36).slice(2) + Date.now().toString(36), method: m, args }])
          flush()
        }
  }

  boxes.add(wrapped)
  window.addEventListener('online', () => { flush() })
  if (load().length) flush()
  return wrapped
}
