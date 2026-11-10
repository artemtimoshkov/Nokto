import type { Priority } from '../lib/types'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'

export const PRIORITY_LABEL: Record<Priority, string> = { 1: 'Priority 1', 2: 'Priority 2', 3: 'Priority 3' }

export function PriorityPicker({ open, value, onChange, onClose }: {
  open: boolean; value: Priority; onChange(p: Priority): void; onClose(): void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Priority">
      <div className="list">
        {([1, 2, 3] as Priority[]).map(p => (
          <button key={p} className="row" onClick={() => { onChange(p); onClose() }}>
            <Icon d={I.flag} className={`flag p${p}`} fill={p !== 3} />
            <span className="grow">{PRIORITY_LABEL[p]}</span>
            {value === p && <Icon d={I.check} className="accent" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
