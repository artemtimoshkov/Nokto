import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'
import { ICONS } from '../data/areas'
import type { Area } from '../lib/types'
import { useStore } from '../lib/store'
import { go } from '../lib/route'

/** Add (area = null) or edit an area of life: name, icon, delete. */
export function AreaSheet({ open, area, onClose }: { open: boolean; area: Area | null; onClose(): void }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('star')
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(area?.name ?? ''); setIcon(area?.icon ?? 'star'); setConfirm(false)
    if (!area) setTimeout(() => ref.current?.focus(), 60)
  }, [open, area])

  const submit = () => {
    const n = name.trim()
    if (!n) return
    if (area) store.saveArea(area.id, { name: n, icon })
    else go(`/goals/${store.addArea(n, icon)}`)
    onClose()
  }

  const count = area ? store.goals.filter(g => g.area === area.id).length : 0

  return (
    <>
      <Sheet open={open && !confirm} onClose={onClose} className="area-sheet">
        <input ref={ref} className="title-input" placeholder="Area" value={name} enterKeyHint="done"
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <div className="icon-grid">
          {Object.entries(ICONS).map(([k, d]) => (
            <button key={k} className={icon === k ? 'sel' : ''} aria-label={k} aria-pressed={icon === k} onClick={() => setIcon(k)}>
              <Icon d={d} size={20} />
            </button>
          ))}
        </div>
        <div className="sheet-foot">
          {area
            ? <button className="icon-btn danger" aria-label="Delete area" onClick={() => setConfirm(true)}><Icon d={I.trash} /></button>
            : <span />}
          <button className="send" aria-label={area ? 'Save area' : 'Add area'} disabled={!name.trim()} onClick={submit}>
            <Icon d={area ? I.check : I.arrowUp} size={20} />
          </button>
        </div>
      </Sheet>

      <Sheet open={open && confirm} onClose={() => setConfirm(false)}>
        <p className="confirm-text">Delete {area?.name}{count ? ` and ${count} ${count === 1 ? 'item' : 'items'}` : ''}?</p>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { store.deleteArea(area!.id); onClose(); go('/goals') }}>Delete</button>
        </div>
      </Sheet>
    </>
  )
}
