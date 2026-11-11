import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { toKey, today } from '../../lib/dates'
import { useCircle } from './store'
import type { FriendNote } from './types'

/** Add (note = null) or edit a note about a conversation. */
export function NoteSheet({ open, friendId, note, onClose }: { open: boolean; friendId: string; note: FriendNote | null; onClose(): void }) {
  const circle = useCircle()
  const [body, setBody] = useState('')
  const [date, setDate] = useState(toKey(today()))
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!open) return
    setBody(note?.body ?? ''); setDate(note?.date ?? toKey(today()))
    if (!note) setTimeout(() => ref.current?.focus(), 60)
  }, [open, note])

  const submit = () => {
    const b = body.trim()
    if (!b) return
    const d = date || toKey(today())
    if (note) circle.saveNote(note, { body: b, date: d })
    else circle.addNote(friendId, b, d)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} className="todo-sheet">
      <div className="sheet-kicker">{circle.friend(friendId)?.name}</div>
      <textarea ref={ref} className="note-input c-note-input" rows={5} placeholder="What did you talk about? Anything to ask next time?"
        value={body} onChange={e => setBody(e.target.value)} />
      <label className="c-date-row">
        <span className="muted">Date</span>
        <input type="date" className="date-input" value={date} max={toKey(today())} onChange={e => setDate(e.target.value)} />
      </label>
      <div className="sheet-foot">
        {note
          ? <button className="icon-btn danger" aria-label="Delete note" onClick={() => { circle.deleteNote(note); onClose() }}><Icon d={I.trash} /></button>
          : <span />}
        <button className="send" aria-label={note ? 'Save note' : 'Add note'} disabled={!body.trim()} onClick={submit}>
          <Icon d={note ? I.check : I.arrowUp} size={20} />
        </button>
      </div>
    </Sheet>
  )
}
