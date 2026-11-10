import type { AreaId } from '../lib/types'
import { useStore } from '../lib/store'
import { iconPath } from '../data/areas'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'

export function AreaPicker({ open, value, onChange, onClose }: {
  open: boolean; value: AreaId | null; onChange(a: AreaId | null): void; onClose(): void
}) {
  const { areas } = useStore()
  const pick = (a: AreaId | null) => { onChange(a); onClose() }
  return (
    <Sheet open={open} onClose={onClose} title="Area">
      <div className="list">
        <button className="row" onClick={() => pick(null)}>
          <Icon d={I.none} className="muted" /><span className="grow">No area</span>
          {value === null && <Icon d={I.check} className="accent" />}
        </button>
        {areas.map(a => (
          <button key={a.id} className="row" onClick={() => pick(a.id)}>
            <Icon d={iconPath(a.icon)} /><span className="grow">{a.name}</span>
            {value === a.id && <Icon d={I.check} className="accent" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
