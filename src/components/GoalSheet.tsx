import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon, I } from './Icon'
import type { AreaId, Goal } from '../lib/types'
import { useStore } from '../lib/store'
import { areaById } from '../data/areas'

export function GoalSheet({ open, area, goal, onClose }: { open: boolean; area: AreaId; goal: Goal | null; onClose(): void }) {
  const store = useStore()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? ''); setNote(goal?.note ?? '')
    if (!goal) setTimeout(() => ref.current?.focus(), 60)
  }, [open, goal])

  const submit = () => {
    const t = title.trim()
    if (!t) return
    if (goal) store.saveGoal(goal.id, { title: t, note: note.trim() })
    else store.addGoal(area, t, note.trim())
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} className="todo-sheet">
      <div className="sheet-kicker">{areaById(area)?.name}</div>
      <textarea ref={ref} className="title-input" rows={1} placeholder="Item" value={title}
        onChange={e => setTitle(e.target.value.replace(/\n/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
      <textarea className="note-input" rows={3} placeholder="Note" value={note}
        onChange={e => setNote(e.target.value)} />
      <div className="sheet-foot">
        {goal
          ? <button className="icon-btn danger" aria-label="Delete item" onClick={() => { store.deleteGoal(goal.id); onClose() }}><Icon d={I.trash} /></button>
          : <span />}
        <button className="send" aria-label={goal ? 'Save item' : 'Add item'} disabled={!title.trim()} onClick={submit}>
          <Icon d={goal ? I.check : I.arrowUp} size={20} />
        </button>
      </div>
    </Sheet>
  )
}
