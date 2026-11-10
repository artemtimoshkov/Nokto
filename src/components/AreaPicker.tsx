import { AREAS } from '../data/areas'
import type { AreaId } from '../lib/types'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'

export function AreaPicker({ open, value, onChange, onClose }: {
  open: boolean; value: AreaId | null; onChange(a: AreaId | null): void; onClose(): void
}) {
  const pick = (a: AreaId | null) => { onChange(a); onClose() }
  return (
    <Sheet open={open} onClose={onClose} title="Area">
      <div className="list">
        <button className="row" onClick={() => pick(null)}>
          <Icon d={I.none} className="muted" /><span className="grow">No area</span>
          {value === null && <Icon d={I.check} className="accent" />}
        </button>
        {AREAS.map(a => (
          <button key={a.id} className="row" onClick={() => pick(a.id)}>
            <Icon d={a.icon} /><span className="grow">{a.name}</span>
            {value === a.id && <Icon d={I.check} className="accent" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
