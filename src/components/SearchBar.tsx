import { useEffect, useRef } from 'react'
import { Icon, I } from './Icon'

/** iOS-style search field. Press "/" on a laptop to jump into it. */
export function SearchBar({ value, onChange, placeholder = 'Search' }: { value: string; onChange(v: string): void; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) { e.preventDefault(); ref.current?.focus() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <div className="search">
      <Icon d={I.search} size={16} />
      <input ref={ref} type="search" inputMode="search" enterKeyHint="search" placeholder={placeholder} value={value}
        aria-label={placeholder} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { onChange(''); ref.current?.blur() } }} />
      {value && <button className="search-clear" aria-label="Clear search" onClick={() => { onChange(''); ref.current?.focus() }}><Icon d={I.x} size={12} /></button>}
    </div>
  )
}

/** Case- and accent-insensitive "contains" match. */
export function matches(text: string, query: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return norm(text).includes(norm(query.trim()))
}
