import { useEffect, useState } from 'react'

export type Route = { tab: 'today' } | { tab: 'goals'; area?: string }

const parse = (): Route => {
  const parts = location.hash.replace(/^#\/?/, '').split('/')
  if (parts[0] === 'goals') return { tab: 'goals', area: parts[1] || undefined }
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
