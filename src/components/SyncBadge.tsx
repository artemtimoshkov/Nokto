import { useSyncStatus } from '../lib/outbox'

/** A small pill while offline or while changes are still waiting to reach the server. */
export function SyncBadge() {
  const { online, pending } = useSyncStatus()
  if (online && !pending) return null
  const waiting = pending ? ` · ${pending} to sync` : ''
  return <div className="sync-badge" role="status">{online ? 'Syncing…' : `Offline${waiting}`}</div>
}
