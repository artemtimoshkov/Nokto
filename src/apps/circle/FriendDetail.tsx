import { useState } from 'react'
import { format } from 'date-fns'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { fromKey, toKey, today } from '../../lib/dates'
import { useCircle } from './store'
import { Avatar } from './Avatar'
import { FriendSheet } from './FriendSheet'
import { NoteSheet } from './NoteSheet'
import { CLOSENESS, type FriendNote } from './types'
import { agoLabel, birthdayLabel, daysUntilBirthday, turningAge, untilLabel } from './dates'
import { C } from './icons'
import { instagramLink, linkedinLink } from './social'

export function FriendDetail({ id }: { id: string }) {
  const circle = useCircle()
  const f = circle.friend(id)
  const [edit, setEdit] = useState(false)
  const [note, setNote] = useState<{ open: boolean; note: FriendNote | null }>({ open: false, note: null })

  if (!f) {
    if (!circle.loading) go('/apps/circle')
    return <main className="screen" />
  }

  const notes = circle.notesOf(f.id)
  const hasBday = f.birth_month && f.birth_day
  const days = hasBday ? daysUntilBirthday(f.birth_month!, f.birth_day!) : null
  const age = hasBday ? turningAge(f.birth_year, f.birth_month!, f.birth_day!) : null
  const facts = [
    { icon: C.home, label: 'Grew up', value: f.grew_up },
    { icon: C.globe, label: 'Nationality', value: f.nationality },
    { icon: C.pin, label: 'Lives in', value: f.lives_in },
    { icon: C.work, label: 'Work', value: f.work },
    { icon: C.heart, label: 'Partner', value: f.partner },
    { icon: C.spark, label: 'How we met', value: f.how_we_met },
  ].filter(x => x.value.trim())
  const socials = [
    { icon: C.linkedin, label: 'LinkedIn', link: linkedinLink(f.linkedin) },
    { icon: C.instagram, label: 'Instagram', link: instagramLink(f.instagram) },
  ].filter(x => x.link)
  const empty = !facts.length && !socials.length && !f.siblings.length && !f.about.trim() && !hasBday
  const addNote = () => setNote({ open: true, note: null })

  return (
    <main className="screen">
      <button className="back mobile-only" onClick={() => go('/apps/circle')}><Icon d={I.back} size={18} />Circle</button>
      <header className="head c-head">
        <div className="c-who">
          <Avatar friend={f} size={72} />
          <div>
            <h1>{f.name}</h1>
            <p className="sub">{CLOSENESS.find(c => c.id === f.closeness)?.label}</p>
          </div>
        </div>
        <button className="avatar" aria-label="Edit friend" onClick={() => setEdit(true)}><Icon d={C.edit} size={18} /></button>
      </header>

      <div className="c-tiles">
        <div className={`c-tile ${days === 0 ? 'hot' : ''}`}>
          <span className="c-tile-label"><Icon d={C.cake} size={15} />Birthday</span>
          {hasBday ? (
            <>
              <span className="c-tile-value">{birthdayLabel(f.birth_month!, f.birth_day!)}</span>
              <span className="c-tile-sub">{days === 0 ? 'Today!' : untilLabel(days!)}{age ? ` · turns ${age}` : ''}</span>
            </>
          ) : <button className="c-tile-value muted" onClick={() => setEdit(true)}>Add</button>}
        </div>
        <div className="c-tile">
          <span className="c-tile-label"><Icon d={C.chat} size={15} />Last talked</span>
          <span className="c-tile-value">{f.last_contact ? agoLabel(f.last_contact) : 'Not logged'}</span>
          {f.last_contact !== toKey(today())
            ? <button className="c-tile-btn" onClick={() => circle.talkedToday(f)}>Talked today</button>
            : <span className="c-tile-sub">{format(fromKey(f.last_contact!), 'd MMM')}</span>}
        </div>
      </div>

      {(facts.length > 0 || f.siblings.length > 0 || socials.length > 0) && (
        <ul className="c-facts">
          {facts.map(x => (
            <li key={x.label}><Icon d={x.icon} size={18} /><span className="c-fact-label">{x.label}</span><span className="c-fact-value">{x.value}</span></li>
          ))}
          {socials.map(x => (
            <li key={x.label}>
              <Icon d={x.icon} size={18} /><span className="c-fact-label">{x.label}</span>
              <a className="c-fact-value c-social" href={x.link!.href} target="_blank" rel="noopener noreferrer">{x.link!.label}</a>
            </li>
          ))}
          {f.siblings.length > 0 && (
            <li>
              <Icon d={C.people} size={18} /><span className="c-fact-label">{f.siblings.length === 1 ? 'Sibling' : 'Siblings'}</span>
              <span className="c-fact-value">
                {f.siblings.map((s, i) => <span key={i} className="c-sib">{s.name}{s.note && <span className="muted"> · {s.note}</span>}</span>)}
              </span>
            </li>
          )}
        </ul>
      )}

      {f.about.trim() && <p className="c-about">{f.about}</p>}
      {empty && <button className="add-row" onClick={() => setEdit(true)}><Icon d={I.plus} size={18} />Add birthday, siblings, where they grew up…</button>}

      <section className="group">
        <h2>Notes</h2>
        <button className="add-row" onClick={addNote}><Icon d={I.plus} size={18} />What did you talk about?</button>
        <ul className="todos">
          {notes.map(n => (
            <li key={n.id} className="todo c-note" onClick={() => setNote({ open: true, note: n })}>
              <div className="todo-body">
                <div className="c-note-date">{format(fromKey(n.date), 'd MMM yyyy')} · {agoLabel(n.date)}</div>
                <div className="c-note-body">{n.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <FriendSheet open={edit} friend={f} onClose={() => setEdit(false)} />
      <NoteSheet open={note.open} friendId={f.id} note={note.note} onClose={() => setNote(s => ({ ...s, open: false }))} />
    </main>
  )
}
