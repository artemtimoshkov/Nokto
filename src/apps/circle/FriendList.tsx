import { useMemo, useState } from 'react'
import { Icon, I } from '../../components/Icon'
import { SearchBar, matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useCircle } from './store'
import { Avatar } from './Avatar'
import { FriendSheet } from './FriendSheet'
import { CLOSENESS, type Friend, type FriendNote } from './types'
import { agoLabel, daysUntilBirthday, turningAge, untilLabel } from './dates'
import { C } from './icons'

const open = (f: Friend) => go(`/apps/circle/${f.id}`)

const searchable = (f: Friend, notes: FriendNote[]) => [
  f.name, f.grew_up, f.nationality, f.lives_in, f.work, f.partner, f.how_we_met, f.about,
  ...f.siblings.flatMap(s => [s.name, s.note]), ...notes.filter(n => n.friend_id === f.id).map(n => n.body),
]

export function FriendList() {
  const { friends, notes, loading, notSetUp } = useCircle()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const sorted = useMemo(() => [...friends].sort((a, b) => a.name.localeCompare(b.name)), [friends])
  const results = useMemo(() => q.trim() ? sorted.filter(f => searchable(f, notes).some(t => matches(t, q))) : null, [q, sorted, notes])
  const upcoming = useMemo(() => sorted
    .filter(f => f.birth_month && f.birth_day)
    .map(f => ({ f, days: daysUntilBirthday(f.birth_month!, f.birth_day!) }))
    .filter(x => x.days <= 30)
    .sort((a, b) => a.days - b.days), [sorted])

  return (
    <main className="screen">
      <button className="back mobile-only" onClick={() => go('/apps')}><Icon d={I.back} size={18} />Mini apps</button>
      <header className="head">
        <div>
          <h1>Circle</h1>
          {!loading && friends.length > 0 && <p className="sub">{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</p>}
        </div>
      </header>

      {notSetUp ? (
        <div className="empty">
          <div className="empty-mark"><Icon d={C.people} size={34} /></div>
          <p>Circle isn't set up yet.</p>
          <p className="muted small">Run <code>supabase/schema.sql</code> again in the Supabase SQL Editor, then reopen this page.</p>
        </div>
      ) : (
        <>
          {friends.length > 0 && <SearchBar value={q} onChange={setQ} placeholder="Search friends and notes" />}
          {!results && <button className="add-row desktop-only" onClick={() => setAdding(true)}><Icon d={I.plus} size={18} />Add friend</button>}

          {results && <ul className="todos results">{results.map(f => <FriendRow key={f.id} f={f} />)}</ul>}

          {!results && upcoming.length > 0 && (
            <section className="group">
              <h2>Birthdays soon</h2>
              <ul className="c-bdays">
                {upcoming.map(({ f, days }) => {
                  const age = turningAge(f.birth_year, f.birth_month!, f.birth_day!)
                  return (
                    <li key={f.id}>
                      <button className={`c-bday ${days === 0 ? 'today' : ''}`} onClick={() => open(f)}>
                        <Avatar friend={f} size={44} />
                        <span className="c-bday-name ellipsis">{f.name.split(' ')[0]}</span>
                        <span className="c-bday-when">{untilLabel(days)}{age ? ` · ${age}` : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {!results && CLOSENESS.map(c => {
            const group = sorted.filter(f => f.closeness === c.id)
            if (!group.length) return null
            return (
              <section key={c.id} className="group">
                <h2>{c.plural}</h2>
                <ul className="todos">{group.map(f => <FriendRow key={f.id} f={f} />)}</ul>
              </section>
            )
          })}

          {!loading && friends.length === 0 && (
            <div className="empty">
              <div className="empty-mark"><Icon d={C.people} size={34} /></div>
              <p>Keep track of the people you care about.</p>
              <p className="muted small">Birthdays, siblings, where they grew up, and what you talked about last time.</p>
              <div className="row-btns" style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => setAdding(true)}>Add a friend</button>
              </div>
            </div>
          )}
        </>
      )}

      {!notSetUp && <button className="fab mobile-only" aria-label="Add friend" onClick={() => setAdding(true)}><Icon d={I.plus} size={26} /></button>}
      <FriendSheet open={adding} friend={null} onClose={() => setAdding(false)} />
    </main>
  )
}

function FriendRow({ f }: { f: Friend }) {
  const days = f.birth_month && f.birth_day ? daysUntilBirthday(f.birth_month, f.birth_day) : null
  return (
    <li className="todo c-friend" onClick={() => open(f)}>
      <Avatar friend={f} size={40} />
      <div className="todo-body">
        <div className="todo-title">{f.name}</div>
        <div className="todo-meta">
          <span className="ellipsis">{f.last_contact ? `Talked ${agoLabel(f.last_contact).toLowerCase()}` : f.lives_in || f.how_we_met || 'No contact logged'}</span>
          {days !== null && days <= 14 && <span className="c-soon"><Icon d={C.cake} size={13} />{untilLabel(days)}</span>}
        </div>
      </div>
    </li>
  )
}
