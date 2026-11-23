import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../../lib/store'
import { toKey, today } from '../../lib/dates'
import { readCache, writeCache } from '../../lib/cache'
import { uuid } from '../../lib/uuid'
import type { Synced } from '../../lib/outbox'
import { NotSetUp, norm, type KitchenBackend } from './backend'
import { sampleRecipes } from './samples'
import type { Recipe, RecipeDraft } from './types'

interface Kitchen {
  recipes: Recipe[]
  loading: boolean
  notSetUp: boolean
  recipe(id: string): Recipe | undefined
  add(d: RecipeDraft): string
  save(id: string, patch: Partial<Recipe>): void
  remove(id: string): void
  addSamples(): void
  /** Count a finished cook. */
  cooked(r: Recipe): void
}

const Ctx = createContext<Kitchen | null>(null)
export const useKitchen = () => useContext(Ctx)!

/** Same offline model as Circle: open from the device copy, replace it from the server once nothing is queued. */
export function KitchenProvider({ backend, cacheKey, children }: { backend: KitchenBackend & Partial<Synced>; cacheKey?: string; children: ReactNode }) {
  const { notify } = useStore()
  const [cached] = useState(() => readCache<Recipe[]>(cacheKey))
  const [recipes, setRecipes] = useState<Recipe[]>(() => (cached ?? []).map(norm))
  const [loading, setLoading] = useState(!cached)
  const [notSetUp, setNotSetUp] = useState(false)

  const refresh = useCallback(async () => {
    try {
      if (navigator.onLine === false) return
      if (backend.flush && !(await backend.flush())) return
      const v = backend.version?.()
      const d = await backend.load()
      if (backend.version && (backend.version() !== v || backend.pending!() > 0)) return
      setRecipes(d); setNotSetUp(false)
    } catch (e) {
      if (e instanceof NotSetUp) setNotSetUp(true)
      else console.error(e)
    } finally { setLoading(false) }
  }, [backend])

  useEffect(() => { if (!loading && !notSetUp) writeCache(cacheKey, recipes) }, [cacheKey, recipes, loading, notSetUp])

  useEffect(() => {
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onVis) }
  }, [refresh])

  const fail = useCallback((e: unknown) => { console.error(e); notify("Couldn't sync. Retrying…"); refresh() }, [notify, refresh])

  const kitchen = useMemo<Kitchen>(() => {
    const patch = (id: string, p: Partial<Recipe>) => {
      setRecipes(rs => rs.map(r => r.id === id ? { ...r, ...p } : r))
      backend.updateRecipe(id, p).catch(fail)
    }
    const insert = (r: Recipe) => { setRecipes(rs => [...rs, r]); backend.insertRecipe(r).catch(fail) }
    return {
      recipes, loading, notSetUp,
      recipe: id => recipes.find(r => r.id === id),
      add(d) {
        const r: Recipe = { ...d, id: uuid(), created_at: new Date().toISOString() }
        insert(r)
        return r.id
      },
      save: patch,
      remove(id) {
        const r = recipes.find(x => x.id === id)
        setRecipes(rs => rs.filter(x => x.id !== id))
        backend.deleteRecipe(id).catch(fail)
        if (r) notify(`Deleted ${r.title}`, () => insert(r))
      },
      addSamples() { sampleRecipes().forEach(insert) },
      cooked(r) { patch(r.id, { cooked_count: r.cooked_count + 1, last_cooked: toKey(today()) }) },
    }
  }, [recipes, loading, notSetUp, backend, fail, notify])

  return <Ctx.Provider value={kitchen}>{children}</Ctx.Provider>
}
