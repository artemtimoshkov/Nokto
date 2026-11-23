import type { Book } from './types'

// Cloth-binding colours for generated covers.
const CLOTH = ['#8c2f2b', '#2f4f6f', '#3f6b4f', '#7a5a2a', '#5a3f6b', '#2b5f63', '#6b3247', '#44484f', '#9a6a2e', '#34506b']

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)

/** The book's cover photo, or a cloth-bound cover with the title, coloured from the title. */
export function Cover({ book, width = 120 }: { book: Pick<Book, 'title' | 'author' | 'cover'>; width?: number }) {
  const style = { width, height: width * 1.5, ['--fs' as any]: `${Math.max(9, width * 0.115)}px`, ['--pad' as any]: `${width * 0.12}px` }
  if (book.cover) return <img className="f-cover" style={style} src={book.cover} alt="" />
  const cloth = CLOTH[Math.abs(hash(book.title.trim().toLowerCase() || '?')) % CLOTH.length]
  return (
    <span className="f-cover f-cloth" style={{ ...style, background: cloth }} aria-hidden="true">
      <span className="f-cloth-title">{book.title.trim() || 'Untitled'}</span>
      {width >= 80 && book.author.trim() && <span className="f-cloth-author">{book.author.trim()}</span>}
    </span>
  )
}
