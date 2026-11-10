import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Bottom sheet. Slides up; tap the backdrop or swipe down on the handle to close. */
export function Sheet({ open, onClose, children, title, className = '' }: {
  open: boolean; onClose(): void; children: ReactNode; title?: string; className?: string
}) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))) }
    else { setShown(false); const t = setTimeout(() => setMounted(false), 280); return () => clearTimeout(t) }
  }, [open])
  // Freeze the page behind the sheet so it can't scroll while typing.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    html.classList.add('sheet-open')
    const n = Number(html.dataset.sheets ?? 0) + 1
    html.dataset.sheets = String(n)
    return () => {
      const left = Number(html.dataset.sheets ?? 1) - 1
      html.dataset.sheets = String(left)
      if (left <= 0) html.classList.remove('sheet-open')
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!mounted) return null

  let startY = 0
  return createPortal(
    <div className={`sheet-root ${shown ? 'shown' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle"
          onTouchStart={e => { startY = e.touches[0].clientY }}
          onTouchEnd={e => { if (e.changedTouches[0].clientY - startY > 40) onClose() }}>
          <span />
        </div>
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
