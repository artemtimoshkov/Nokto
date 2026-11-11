import { useEffect, useState } from 'react'

export type Tab = 'today' | 'goals' | 'apps'
/** `#/apps/<app>/<…rest>`: `path` is everything after `apps`, handed to the mini app. */
export type Route = { tab: 'today' } | { tab: 'goals'; area?: string } | { tab: 'apps'; path: string[] }

const parse = (): Route => {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] === 'goals') return { tab: 'goals', area: parts[1] || undefined }
  if (parts[0] === 'apps') return { tab: 'apps', path: parts.slice(1) }
  return { tab: 'today' }
}

export function useRoute(): Route {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const f = () => setR(parse())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return r
}

export const go = (path: string) => { location.hash = path }
