import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { toKey, today } from '../../lib/dates'
import { useFolio } from './store'
import { Cover } from './Cover'
import { Stars } from './Stars'
import { coverFromFile } from './cover'
import { emptyBook, STATUSES, type Book, type BookDraft, type BookStatus } from './types'
import { F } from './icons'

/** Add (book = null) or edit a book. */
export function BookSheet({ open, book, onClose }: { open: boolean; book: Book | null; onClose(): void }) {
  const folio = useFolio()
  const [d, setD] = useState<BookDraft>(emptyBook)
  const [confirm, setConfirm] = useState(false)
  const [coverError, setCoverError] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (book) { const { id: _i, created_at: _c, ...rest } = book; setD({ ...rest, lessons: [...rest.lessons], quotes: [...rest.quotes] }) }
    else { setD({ ...emptyBook(), started_on: toKey(today()) }); setTimeout(() => titleRef.current?.focus(), 60) }
    setConfirm(false); setCoverError(false)
  }, [open, book])

  const set = <K extends keyof BookDraft>(k: K, v: BookDraft[K]) => setD(x => ({ ...x, [k]: v }))
  const setLesson = (i: number, v: string) => set('lessons', d.lessons.map((l, j) => j === i ? v : l))
  const setQuote = (i: number, v: string) => set('quotes', d.quotes.map((q, j) => j === i ? v : q))
  const setStatus = (s: BookStatus) => setD(x => ({ ...x, status: s, finished_on: s === 'finished' ? x.finished_on ?? toKey(today()) : x.finished_on }))

  const pick = async (file?: File) => {
    if (!file) return
    try { set('cover', await coverFromFile(file)); setCoverError(false) } catch { setCoverError(true) }
  }

  const submit = () => {
    const title = d.title.trim()
    if (!title) return
    const clean: BookDraft = {
      ...d, title,
      author: d.author.trim(), summary: d.summary.trim(), thoughts: d.thoughts.trim(), recommend_to: d.recommend_to.trim(),
      lessons: d.lessons.map(l => l.trim()),
      quotes: d.quotes.map(q => q.trim()).filter(Boolean),
      finished_on: d.status === 'finished' ? d.finished_on : null,
    }
    if (book) folio.saveBook(book.id, clean)
    else go(`/apps/folio/${folio.addBook(clean)}`)
    onClose()
  }

  const max = toKey(today())

  return (
    <>
      <Sheet open={open && !confirm} onClose={onClose} className="todo-sheet f-sheet">
        <div className="f-top">
          <button className="f-cover-pick" aria-label={d.cover ? 'Change cover' : 'Add cover photo'} onClick={() => fileRef.current?.click()}>
            <Cover book={d} width={64} />
            <span className="f-cover-badge"><Icon d={F.camera} size={13} /></span>
          </button>
          <div className="f-top-fields">
            <input ref={titleRef} className="title-input" placeholder="Title" value={d.title} enterKeyHint="next"
              onChange={e => set('title', e.target.value)} />
            <input className="f-author-input" placeholder="Author" value={d.author} onChange={e => set('author', e.target.value)} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {d.cover && <button className="f-link" onClick={() => set('cover', null)}>Remove cover photo</button>}
        {coverError && <p className="error small">Couldn't read that image. Try a JPEG or PNG.</p>}

        <div className="seg f-seg" role="radiogroup" aria-label="Status">
          {STATUSES.map(s => (
            <button key={s.id} role="radio" aria-checked={d.status === s.id} className={d.status === s.id ? 'sel' : ''}
              onClick={() => setStatus(s.id)}>{s.label}</button>
          ))}
        </div>

        <div className="f-form">
          <div className="f-dates">
            <label className="f-field">
              <span className="f-label">Started</span>
              <input type="date" className="f-input" value={d.started_on ?? ''} max={max} onChange={e => set('started_on', e.target.value || null)} />
            </label>
            {d.status === 'finished' && (
              <label className="f-field">
                <span className="f-label">Finished</span>
                <input type="date" className="f-input" value={d.finished_on ?? ''} max={max} min={d.started_on ?? undefined}
                  onChange={e => set('finished_on', e.target.value || null)} />
              </label>
            )}
          </div>

          <div className="f-field">
            <span className="f-label">My rating</span>
            <Stars value={d.rating} size={26} onChange={v => set('rating', v)} />
          </div>

          <label className="f-field">
            <span className="f-label">Summary</span>
            <textarea className="f-input f-area" rows={3} placeholder="What's it about, in a few lines?"
              value={d.summary} onChange={e => set('summary', e.target.value)} />
          </label>

          <div className="f-field">
            <span className="f-label">Three key lessons</span>
            <div className="f-lesson-inputs">
              {d.lessons.map((l, i) => (
                <div key={i} className="f-lesson-row">
                  <span className="f-num">{i + 1}</span>
                  <textarea className="f-input f-area f-grow" rows={1} placeholder={['The big idea', 'Something to apply', 'Something to remember'][i] ?? 'Another idea'}
                    aria-label={`Lesson ${i + 1}`} value={l} onChange={e => setLesson(i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <label className="f-field">
            <span className="f-label">My thoughts</span>
            <textarea className="f-input f-area" rows={3} placeholder="What you made of it, what surprised you, what you'd argue with…"
              value={d.thoughts} onChange={e => set('thoughts', e.target.value)} />
          </label>

          <div className="f-field">
            <span className="f-label">Favourite quotes</span>
            <div className="f-lesson-inputs">
              {d.quotes.map((q, i) => (
                <div key={i} className="f-lesson-row">
                  <textarea className="f-input f-area f-grow" rows={2} placeholder="A line worth keeping" aria-label={`Quote ${i + 1}`}
                    value={q} onChange={e => setQuote(i, e.target.value)} />
                  <button className="icon-btn danger" aria-label="Remove quote" onClick={() => set('quotes', d.quotes.filter((_, j) => j !== i))}><Icon d={I.x} size={16} /></button>
                </div>
              ))}
              <button className="f-link" onClick={() => set('quotes', [...d.quotes, ''])}>+ Add quote</button>
            </div>
          </div>

          <label className="f-field">
            <span className="f-label">I'd recommend it to</span>
            <input className="f-input" placeholder="Who should read this next?" value={d.recommend_to} onChange={e => set('recommend_to', e.target.value)} />
          </label>
        </div>

        <div className="sheet-foot">
          {book
            ? <button className="icon-btn danger" aria-label="Delete book" onClick={() => setConfirm(true)}><Icon d={I.trash} /></button>
            : <span />}
          <button className="send" aria-label={book ? 'Save book' : 'Add book'} disabled={!d.title.trim()} onClick={submit}>
            <Icon d={book ? I.check : I.arrowUp} size={20} />
          </button>
        </div>
      </Sheet>

      <Sheet open={open && confirm} onClose={() => setConfirm(false)}>
        <p className="confirm-text">Delete {book?.title} from your shelf?</p>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { folio.deleteBook(book!.id); onClose(); go('/apps/folio') }}>Delete</button>
        </div>
      </Sheet>
    </>
  )
}
