import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, I } from '../components/Icon'
import { GoalRow } from '../components/GoalRow'
import { GoalSheet } from '../components/GoalSheet'
import { SearchBar, matches } from '../components/SearchBar'
import type { Goal } from '../lib/types'
import { go } from '../lib/route'

/** Every achieved bucket list item, newest first. Tap the circle to reopen one. */
export function Achieved() {
  const { goals, areaOf } = useStore()
  const [sheet, setSheet] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null })
  const [q, setQ] = useState('')
  const all = useMemo(() => goals.filter(g => g.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')), [goals])
  const shown = q.trim() ? all.filter(g => matches(g.title, q) || matches(g.note, q) || matches(areaOf(g.area)?.name ?? '', q)) : all

  return (
    <main className="screen">
      <button className="back mobile-only" onClick={() => go('/goals')}><Icon d={I.back} size={18} />Bucket list</button>
      <header className="head">
        <div>
          <div className="head-icon muted"><Icon d={I.trophy} size={26} /></div>
          <h1>Achieved</h1>
          {all.length > 0 && <p className="sub">{all.length}</p>}
        </div>
      </header>
      {all.length > 5 && <SearchBar value={q} onChange={setQ} />}
      <ul className="todos">
        {shown.map(g => <GoalRow key={g.id} goal={g} showArea onOpen={() => setSheet({ open: true, goal: g })} />)}
      </ul>
      {sheet.goal && <GoalSheet open={sheet.open} area={sheet.goal.area} goal={sheet.goal} onClose={() => setSheet(s => ({ ...s, open: false }))} />}
    </main>
  )
}
