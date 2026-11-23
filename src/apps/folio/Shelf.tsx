import { useMemo, useState } from 'react'
import { Icon, I } from '../../components/Icon'
import { SearchBar, matches } from '../../components/SearchBar'
import { go } from '../../lib/route'
import { useFolio } from './store'
import { Cover } from './Cover'
import { Stars } from './Stars'
import { BookSheet } from './BookSheet'
import { readLabel, shelfGroups } from './shelf'
import type { Book } from './types'
import { F } from './icons'

const searchable = (b: Book) => [b.title, b.author, b.summary, b.thoughts, b.recommend_to, ...b.lessons, ...b.quotes]

export function Shelf() {
  const { books, loading, notSetUp } = useFolio()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const groups = useMemo(() => shelfGroups(books), [books])
  const results = useMemo(() => q.trim() ? groups.flatMap(g => g.books).filter(b => searchable(b).some(t => matches(t, q))) : null, [q, groups])
  const thisYear = String(new Date().getFullYear())
  const finishedThisYear = books.filter(b => b.status === 'finished' && b.finished_on?.startsWith(thisYear)).length

  return (
    <main className="screen wide">
      <button className="back mobile-only" onClick={() => go('/apps')}><Icon d={I.back} size={18} />Mini apps</button>
      <header className="head">
        <div>
          <h1>Folio</h1>
          {!loading && books.length > 0 && (
            <p className="sub">{books.length} {books.length === 1 ? 'book' : 'books'}{finishedThisYear > 0 && ` · ${finishedThisYear} read in ${thisYear}`}</p>
          )}
        </div>
      </header>

      {notSetUp ? (
        <div className="empty">
          <div className="empty-mark"><Icon d={F.book} size={34} /></div>
          <p>Folio isn't set up yet.</p>
          <p className="muted small">Run <code>supabase/schema.sql</code> again in the Supabase SQL Editor, then reopen this page.</p>
        </div>
      ) : (
        <>
          {books.length > 0 && <SearchBar value={q} onChange={setQ} placeholder="Search books, lessons and quotes" />}
          {!results && books.length > 0 && <button className="add-row desktop-only" onClick={() => setAdding(true)}><Icon d={I.plus} size={18} />Add book</button>}

          {results && (results.length
            ? <ul className="f-shelf results">{results.map(b => <BookCard key={b.id} b={b} />)}</ul>
            : <p className="muted f-none">No books match “{q.trim()}”.</p>)}

          {!results && groups.map(g => (
            <section key={g.key} className="group">
              <h2 className={g.key === 'reading' ? 'accent' : ''}>{g.title}{g.key !== 'reading' && <span className="f-count">{g.books.length}</span>}</h2>
              <ul className="f-shelf">{g.books.map(b => <BookCard key={b.id} b={b} />)}</ul>
            </section>
          ))}

          {!loading && books.length === 0 && (
            <div className="empty">
              <div className="empty-mark"><Icon d={F.book} size={34} /></div>
              <p>Your shelf of books you've read.</p>
              <p className="muted small">Key lessons, favourite quotes, and who you'd hand it to next.</p>
              <div className="row-btns" style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => setAdding(true)}>Add a book</button>
              </div>
            </div>
          )}
        </>
      )}

      {!notSetUp && <button className="fab mobile-only" aria-label="Add book" onClick={() => setAdding(true)}><Icon d={I.plus} size={26} /></button>}
      <BookSheet open={adding} book={null} onClose={() => setAdding(false)} />
    </main>
  )
}

function BookCard({ b }: { b: Book }) {
  const when = readLabel(b)
  return (
    <li>
      <button className="f-card" onClick={() => go(`/apps/folio/${b.id}`)}>
        <span className="f-card-cover">
          <Cover book={b} width={150} />
        </span>
        <span className="f-card-title">{b.title}</span>
        {b.author && <span className="f-card-author ellipsis">{b.author}</span>}
        <span className="f-card-meta">
          {b.status === 'reading' && <span className="f-badge">Reading</span>}
          {b.rating ? <Stars value={b.rating} size={12} /> : null}
          {when && <span className="ellipsis">{when}</span>}
        </span>
      </button>
    </li>
  )
}
