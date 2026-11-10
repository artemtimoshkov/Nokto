import { useEffect, useState } from 'react'

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const f = () => setMatch(m.matches)
    m.addEventListener('change', f); f()
    return () => m.removeEventListener('change', f)
  }, [query])
  return match
}

export const DESKTOP = '(min-width: 900px)'
export const useDesktop = () => useMedia(DESKTOP)
