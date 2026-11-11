import { Suspense } from 'react'
import { MINI_APPS } from '../apps/registry'
import { Icon, I } from '../components/Icon'
import { go } from '../lib/route'

/** `#/apps` shows the launcher; `#/apps/<id>/…` opens that mini app. */
export function MiniApps({ path, demo, user, onAccount }: { path: string[]; demo: boolean; user: string; onAccount(): void }) {
  const app = MINI_APPS.find(a => a.id === path[0])
  if (app) {
    return (
      <Suspense fallback={<main className="screen" />}>
        <app.Component demo={demo} user={user} path={path.slice(1)} />
      </Suspense>
    )
  }
  return (
    <main className="screen wide">
      <header className="head">
        <div><h1>Mini apps</h1></div>
        <button className="avatar mobile-only" aria-label="Account" onClick={onAccount}><Icon d={I.user} size={18} /></button>
      </header>
      <ul className="areas">
        {MINI_APPS.map(a => (
          <li key={a.id}>
            <button className="area-row app-row" onClick={() => go(`/apps/${a.id}`)}>
              <span className="area-top">
                <span className="area-icon"><Icon d={a.icon} size={22} /></span>
                <span className="area-name grow">{a.name}</span>
                <Icon d={I.chevron} size={16} className="muted mobile-only" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
