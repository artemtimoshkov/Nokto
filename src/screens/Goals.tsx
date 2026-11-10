import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { iconPath } from '../data/areas'
import { Icon, I } from '../components/Icon'
import { SearchBar, matches } from '../components/SearchBar'
import { GoalRow } from '../components/GoalRow'
import { GoalSheet } from '../components/GoalSheet'
import { AreaSheet } from '../components/AreaSheet'
import type { Goal } from '../lib/types'
import { go } from '../lib/route'

export function Goals({ onAccount }: { onAccount(): void }) {
  const { goals, areas, loading, areaOf } = useStore()
  const [q, setQ] = useState('')
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null })
  const [addArea, setAddArea] = useState(false)
  const done = goals.filter(g => g.done).length

  const results = useMemo(() => {
    if (!q.trim()) return null
    return goals
      .filter(g => matches(g.title, q) || matches(g.note, q) || matches(areaOf(g.area)?.name ?? '', q))
      .sort((a, b) => Number(a.done) - Number(b.done))
  }, [q, goals, areaOf])

  return (
    <main className="screen wide">
      <header className="head">
        <div>
          <h1>Bucket list</h1>
          {!loading && goals.length > 0 && <p className="sub">{done} / {goals.length}</p>}
        </div>
        <button className="avatar mobile-only" aria-label="Account" onClick={onAccount}><Icon d={I.user} size={18} /></button>
      </header>
      <SearchBar value={q} onChange={setQ} />

      {results ? (
        <ul className="todos results">
          {results.map(g => <GoalRow key={g.id} goal={g} showArea onOpen={() => setGoalSheet({ open: true, goal: g })} />)}
        </ul>
      ) : (
        <>
          <div className="progress" aria-hidden="true"><span style={{ width: goals.length ? `${(done / goals.length) * 100}%` : 0 }} /></div>
          <ul className="areas">
            {areas.map(a => {
              const mine = goals.filter(g => g.area === a.id)
              const d = mine.filter(g => g.done).length
              const open = mine.filter(g => !g.done).slice(0, 4)
              return (
                <li key={a.id}>
                  <button className="area-row" onClick={() => go(`/goals/${a.id}`)}>
                    <span className="area-top">
                      <span className="area-icon"><Icon d={iconPath(a.icon)} size={22} /></span>
                      <span className="grow area-name">{a.name}</span>
                      <span className="count">{mine.length ? `${d} / ${mine.length}` : ''}</span>
                      <Icon d={I.chevron} size={16} className="muted mobile-only" />
                    </span>
                    {open.length > 0 && (
                      <span className="area-preview desktop-only">
                        {open.map(g => <span key={g.id}>{g.title}</span>)}
                      </span>
                    )}
                    {mine.length > 0 && <span className="area-bar desktop-only"><span style={{ width: `${(d / mine.length) * 100}%` }} /></span>}
                  </button>
                </li>
              )
            })}
            <li>
              <button className="area-row achieved-area" onClick={() => go('/goals/achieved')}>
                <span className="area-top">
                  <span className="area-icon"><Icon d={I.trophy} size={22} /></span>
                  <span className="grow area-name">Achieved</span>
                  <span className="count">{done || ''}</span>
                  <Icon d={I.chevron} size={16} className="muted mobile-only" />
                </span>
                {done > 0 && (
                  <span className="area-preview desktop-only">
                    {goals.filter(g => g.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')).slice(0, 4).map(g => <span key={g.id}>{g.title}</span>)}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button className="area-row add-area" onClick={() => setAddArea(true)}>
                <span className="area-top">
                  <span className="area-icon"><Icon d={I.plus} size={22} /></span>
                  <span className="grow area-name">Add area</span>
                </span>
              </button>
            </li>
          </ul>
        </>
      )}

      {goalSheet.goal && (
        <GoalSheet open={goalSheet.open} area={goalSheet.goal.area} goal={goalSheet.goal}
          onClose={() => setGoalSheet(s => ({ ...s, open: false }))} />
      )}
      <AreaSheet open={addArea} area={null} onClose={() => setAddArea(false)} />
    </main>
  )
}
