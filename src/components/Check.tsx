import { useState } from 'react'
import { Icon, I } from './Icon'

/** Round checkbox. Fills briefly before the parent removes/rolls the item. */
export function Check({ priority = 3, checked = false, onToggle, label }: {
  priority?: 1 | 2 | 3; checked?: boolean; onToggle(): void; label: string
}) {
  const [pop, setPop] = useState(false)
  return (
    <button
      className={`check p${priority} ${checked || pop ? 'on' : ''}`}
      aria-label={label} aria-pressed={checked}
      onClick={e => {
        e.stopPropagation()
        if (checked) return onToggle()
        setPop(true)
        if (navigator.vibrate) navigator.vibrate(8)
        setTimeout(() => { onToggle(); setPop(false) }, 320)
      }}>
      <Icon d={I.check} size={14} />
    </button>
  )
}
