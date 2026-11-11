import { useMemo } from 'react'
import type { MiniAppProps } from '../registry'
import { localCircle, syncedCircle } from './backend'
import { CircleProvider } from './store'
import { FriendList } from './FriendList'
import { FriendDetail } from './FriendDetail'
import './circle.css'

/** Circle: a small friends CRM. Routes: `#/apps/circle` and `#/apps/circle/<friend id>`. */
export default function CircleApp({ demo, user, path }: MiniAppProps) {
  const backend = useMemo(() => (demo ? localCircle() : syncedCircle(user)), [demo, user])
  return (
    <CircleProvider backend={backend} cacheKey={demo ? undefined : `circle:${user}`}>
      {path[0] ? <FriendDetail key={path[0]} id={path[0]} /> : <FriendList />}
    </CircleProvider>
  )
}
