import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal browser globals for the outbox (vitest runs in node here).
const mem = new Map<string, string>()
const listeners: Record<string, (() => void)[]> = {}
const nav = { onLine: true }
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) },
  window: { setTimeout: () => 0, clearTimeout: () => {}, addEventListener: (t: string, f: () => void) => (listeners[t] ??= []).push(f) },
})
Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })

const { withOutbox, onDrop } = await import('./outbox')

const offline = () => Object.assign(new Error('TypeError: Failed to fetch'), { code: '' })

function fakeRemote() {
  const calls: string[] = []
  let fail: (() => any) | null = null
  const remote = {
    async list() { return calls.length },
    async insertThing(id: string) { if (fail) throw fail(); calls.push('insert ' + id) },
    async updateThing(id: string) { if (fail) throw fail(); calls.push('update ' + id) },
  }
  return { remote, calls, setFail: (f: (() => any) | null) => { fail = f } }
}

describe('outbox', () => {
  beforeEach(() => { mem.clear(); nav.onLine = true })

  it('keeps changes while offline and sends them in order once back online', async () => {
    const { remote, calls } = fakeRemote()
    nav.onLine = false
    const b = withOutbox(remote, 'a', ['list'])
    await b.insertThing('1'); await b.updateThing('1')
    expect(await b.flush()).toBe(false)
    expect(b.pending()).toBe(2)
    expect(calls).toEqual([])

    nav.onLine = true
    expect(await b.flush()).toBe(true)
    expect(calls).toEqual(['insert 1', 'update 1'])
    expect(b.pending()).toBe(0)
  })

  it('survives a reload: the queue lives in storage', async () => {
    nav.onLine = false
    withOutbox(fakeRemote().remote, 'b', ['list']).insertThing('x')
    nav.onLine = true
    const { remote, calls } = fakeRemote()
    const b = withOutbox(remote, 'b', ['list'])
    expect(await b.flush()).toBe(true)
    expect(calls).toEqual(['insert x'])
  })

  it('waits on network errors and treats a duplicate insert as done', async () => {
    const { remote, calls, setFail } = fakeRemote()
    const b = withOutbox(remote, 'c', ['list'])
    setFail(offline)
    await b.insertThing('1')
    expect(await b.flush()).toBe(false)
    expect(b.pending()).toBe(1)

    setFail(() => ({ code: '23505', message: 'duplicate key' })) // it reached the server last time
    expect(await b.flush()).toBe(true)
    expect(calls).toEqual([])
  })

  it('drops a change the server keeps rejecting, so the rest can go through', async () => {
    const { remote, calls } = fakeRemote()
    const picky = { ...remote, async updateThing(id: string) { if (id === 'bad') throw { code: '22P02', message: 'invalid input' }; return remote.updateThing(id) } }
    const dropped = vi.fn()
    const off = onDrop(dropped)
    const b = withOutbox(picky, 'd', ['list'])
    nav.onLine = false
    await b.updateThing('bad'); await b.updateThing('good')
    nav.onLine = true
    expect(await b.flush()).toBe(false)
    expect(await b.flush()).toBe(false)
    expect(await b.flush()).toBe(true) // third rejection: dropped
    expect(dropped).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['update good'])
    off()
  })

  it('passes reads straight through', async () => {
    const b = withOutbox(fakeRemote().remote, 'e', ['list'])
    expect(await b.list()).toBe(0)
    expect(b.pending()).toBe(0)
  })
})
