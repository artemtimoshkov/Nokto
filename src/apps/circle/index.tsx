import { useMemo } from 'react'
import type { MiniAppProps } from '../registry'
import { localCircle, supabaseCircle } from './backend'
import { CircleProvider } from './store'
import { FriendList } from './FriendList'
import { FriendDetail } from './FriendDetail'
import './circle.css'

/** Circle: a small friends CRM. Routes: `#/apps/circle` and `#/apps/circle/<friend id>`. */
export default function CircleApp({ demo, path }: MiniAppProps) {
  const backend = useMemo(() => (demo ? localCircle() : supabaseCircle()), [demo])
  return (
    <CircleProvider backend={backend}>
      {path[0] ? <FriendDetail key={path[0]} id={path[0]} /> : <FriendList />}
    </CircleProvider>
  )
}
