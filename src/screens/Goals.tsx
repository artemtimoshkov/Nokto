import { useStore } from '../lib/store'
import { AREAS } from '../data/areas'
import { Icon, I } from '../components/Icon'
import { go } from '../lib/route'

export function Goals({ onAccount }: { onAccount(): void }) {
  const { goals, loading } = useStore()
  const done = goals.filter(g => g.done).length
  return (
    <main className="screen">
      <header className="head">
        <div>
          <h1>Goals</h1>
          <p className="sub">{loading ? 'Your North Star' : `${done} of ${goals.length} achieved`}</p>
        </div>
        <button className="avatar" aria-label="Account" onClick={onAccount}><Icon d={I.user} size={18} /></button>
      </header>
      <div className="progress" aria-hidden="true"><span style={{ width: goals.length ? `${(done / goals.length) * 100}%` : 0 }} /></div>

      <ul className="areas">
        {AREAS.map(a => {
          const mine = goals.filter(g => g.area === a.id)
          const d = mine.filter(g => g.done).length
          return (
            <li key={a.id}>
              <button className="area-row" onClick={() => go(`/goals/${a.id}`)}>
                <span className="area-icon"><Icon d={a.icon} size={22} /></span>
                <span className="grow">{a.name}</span>
                <span className="count">{mine.length ? `${d} / ${mine.length}` : ''}</span>
                <Icon d={I.chevron} size={16} className="muted" />
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
