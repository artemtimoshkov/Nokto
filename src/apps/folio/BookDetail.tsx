import { useState, type ReactNode } from 'react'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { toKey, today } from '../../lib/dates'
import { useFolio } from './store'
import { Cover } from './Cover'
import { Stars } from './Stars'
import { BookSheet } from './BookSheet'
import { filled, readLabel } from './shelf'
import { F } from './icons'

export function BookDetail({ id }: { id: string }) {
  const folio = useFolio()
  const b = folio.book(id)
  const [edit, setEdit] = useState(false)

  if (!b) {
    if (!folio.loading) go('/apps/folio')
    return <main className="screen" />
  }

  const lessons = filled(b.lessons)
  const quotes = filled(b.quotes)
  const label = readLabel(b)
  const when = label && label[0].toUpperCase() + label.slice(1)
  const open = () => setEdit(true)
  const finish = () => folio.saveBook(b.id, { status: 'finished', finished_on: toKey(today()) })

  return (
    <main className="screen">
      <button className="back" onClick={() => go('/apps/folio')}><Icon d={I.back} size={18} />TLDR</button>
      <header className="head f-head">
        <div className="f-who">
          <Cover book={b} width={92} />
          <div className="f-who-text">
            <h1>{b.title}</h1>
            {b.author && <p className="sub">{b.author}</p>}
          </div>
        </div>
        <button className="avatar" aria-label="Edit book" onClick={open}><Icon d={F.edit} size={18} /></button>
      </header>

      <div className="f-tiles">
        <div className={`f-tile ${b.status === 'reading' ? 'hot' : ''}`}>
          <span className="f-tile-label"><Icon d={F.book} size={15} />{b.status === 'reading' ? 'Reading' : 'Finished'}</span>
          <span className="f-tile-value">{when || (b.status === 'reading' ? 'In progress' : 'No date')}</span>
          {b.status === 'reading' && <button className="f-tile-btn" onClick={finish}>Mark finished</button>}
        </div>
        <div className="f-tile">
          <span className="f-tile-label"><Icon d={F.star} size={15} />My rating</span>
          <Stars value={b.rating} size={22} onChange={v => folio.saveBook(b.id, { rating: v })} />
        </div>
      </div>

      <Section icon={F.text} title="Summary" empty="Sum it up in a few lines" onAdd={open} has={!!b.summary.trim()}>
        <p className="f-prose">{b.summary}</p>
      </Section>

      <Section icon={F.bulb} title="Three key lessons" empty="What are the three ideas worth keeping?" onAdd={open} has={lessons.length > 0}>
        <ol className="f-lessons">
          {lessons.map((l, i) => <li key={i}><span className="f-num">{i + 1}</span><span>{l}</span></li>)}
        </ol>
      </Section>

      <Section icon={F.thought} title="My thoughts" empty="What did you make of it?" onAdd={open} has={!!b.thoughts.trim()}>
        <p className="f-prose">{b.thoughts}</p>
      </Section>

      <Section icon={F.quote} title={quotes.length === 1 ? 'Favourite quote' : 'Favourite quotes'} empty="Add a line you want to remember" onAdd={open} has={quotes.length > 0}>
        {quotes.map((q, i) => <blockquote key={i} className="f-quote">{q}</blockquote>)}
      </Section>

      <Section icon={F.people} title="I'd recommend it to" empty="Who should read this next?" onAdd={open} has={!!b.recommend_to.trim()}>
        <p className="f-prose">{b.recommend_to}</p>
      </Section>

      <BookSheet open={edit} book={b} onClose={() => setEdit(false)} />
    </main>
  )
}

function Section({ icon, title, empty, has, onAdd, children }: { icon: string; title: string; empty: string; has: boolean; onAdd(): void; children: ReactNode }) {
  return (
    <section className="group f-section">
      <h2><Icon d={icon} size={15} />{title}</h2>
      {has ? <div className="f-section-body" onClick={() => { if (!window.getSelection()?.toString()) onAdd() }}>{children}</div>
        : <button className="add-row" onClick={onAdd}><Icon d={I.plus} size={18} />{empty}</button>}
    </section>
  )
}
