import { useMemo } from 'react'
import type { MiniAppProps } from '../registry'
import { localFolio, syncedFolio } from './backend'
import { FolioProvider } from './store'
import { Shelf } from './Shelf'
import { BookDetail } from './BookDetail'
import './folio.css'

/** Folio: the books you've read. Routes: `#/apps/folio` and `#/apps/folio/<book id>`. */
export default function FolioApp({ demo, user, path }: MiniAppProps) {
  const backend = useMemo(() => (demo ? localFolio() : syncedFolio(user)), [demo, user])
  return (
    <FolioProvider backend={backend} cacheKey={demo ? undefined : `folio:${user}`}>
      {path[0] ? <BookDetail key={path[0]} id={path[0]} /> : <Shelf />}
    </FolioProvider>
  )
}
