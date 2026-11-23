import { useEffect, useState } from 'react'
import type { CatalogEntry } from './types'

let cache: Promise<CatalogEntry[]> | null = null

/** The built-in catalog: ~900 exercises, downloaded (and cached for offline) only when first needed. */
export function loadCatalog(): Promise<CatalogEntry[]> {
  cache ??= import('./catalog.json').then(m => m.default as CatalogEntry[]).catch(e => { cache = null; throw e })
  return cache
}

export function useCatalog(): CatalogEntry[] | null {
  const [c, setC] = useState<CatalogEntry[] | null>(null)
  useEffect(() => {
    let live = true
    loadCatalog().then(x => { if (live) setC(x) }, console.error)
    return () => { live = false }
  }, [])
  return c
}

export function useCatalogEntry(id: string | null | undefined): CatalogEntry | null {
  const c = useCatalog()
  return id && c ? c.find(x => x.id === id) ?? null : null
}
