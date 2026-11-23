export type BookStatus = 'reading' | 'finished'

export const STATUSES: { id: BookStatus; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'finished', label: 'Finished' },
]

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
  /** 1–5 stars, or null when not rated yet. */
  rating: number | null
  /** yyyy-MM-dd */
  started_on: string | null
  /** yyyy-MM-dd */
  finished_on: string | null
  /** Small 2:3 JPEG as a data URL, or null for a generated cover. */
  cover: string | null
  /** Always three slots; empty ones are skipped on screen. */
  lessons: string[]
  quotes: string[]
  thoughts: string
  summary: string
  recommend_to: string
  created_at: string
}

export type BookDraft = Omit<Book, 'id' | 'created_at'>

export const emptyBook = (): BookDraft => ({
  title: '', author: '', status: 'reading', rating: null, started_on: null, finished_on: null, cover: null,
  lessons: ['', '', ''], quotes: [], thoughts: '', summary: '', recommend_to: '',
})

/** Fill in fields added since a row was saved, and keep lessons at exactly three slots. */
export const normBook = (b: any): Book => {
  const { user_id: _u, ...rest } = b
  const lessons = Array.isArray(b.lessons) ? b.lessons.map(String) : []
  return {
    ...emptyBook(), ...rest,
    lessons: [...lessons, '', '', ''].slice(0, Math.max(3, lessons.length)),
    quotes: Array.isArray(b.quotes) ? b.quotes.map(String) : [],
  }
}
