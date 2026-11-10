import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { iconPath } from '../data/areas'
import { Icon, I } from '../components/Icon'
import { GoalRow } from '../components/GoalRow'
import { GoalSheet } from '../components/GoalSheet'
import { AreaSheet } from '../components/AreaSheet'
import { SearchBar, matches } from '../components/SearchBar'
import type { AreaId, Goal } from '../lib/types'
import { go } from '../lib/route'

export function AreaGoals({ areaId }: { areaId: AreaId }) {
  const { goals, areaOf, loading } = useStore()
  const area = areaOf(areaId)
  const [sheet, setSheet] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null })
  const [editArea, setEditArea] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [q, setQ] = useState('')

  const mine = useMemo(() => goals.filter(g => g.area === areaId)
    .sort((a, b) => a.position - b.position || (a.created_at < b.created_at ? -1 : 1)), [goals, areaId])
  if (!area) { if (!loading) go('/goals'); return null }

  const shown = q.trim() ? mine.filter(g => matches(g.title, q) || matches(g.note, q)) : mine
  const open = shown.filter(g => !g.done)
  const done = shown.filter(g => g.done)
  const row = (g: Goal) => <GoalRow key={g.id} goal={g} onOpen={() => setSheet({ open: true, goal: g })} />

  return (
    <main className="screen">
      <button className="back mobile-only" onClick={() => go('/goals')}><Icon d={I.back} size={18} />Bucket list</button>
      <header className="head">
        <div>
          <div className="head-icon"><Icon d={iconPath(area.icon)} size={26} /></div>
          <h1>{area.name}</h1>
          {mine.length > 0 && <p className="sub">{mine.filter(g => g.done).length} / {mine.length}</p>}
        </div>
        <button className="avatar" aria-label="Edit area" onClick={() => setEditArea(true)}><Icon d={I.more} size={20} /></button>
      </header>
      {mine.length > 5 && <SearchBar value={q} onChange={setQ} />}

      <button className="add-row desktop-only" onClick={() => setSheet({ open: true, goal: null })}><Icon d={I.plus} size={18} />Add item</button>
      <ul className="todos">{open.map(row)}</ul>

      {!!done.length && (
        <section className="group">
          <button className="disclose" onClick={() => setShowDone(s => !s)}>
            <Icon d={I.chevron} size={14} className={showDone || q ? 'rot' : ''} />Achieved <span className="muted">{done.length}</span>
          </button>
          {(showDone || q) && <ul className="todos">{done.map(row)}</ul>}
        </section>
      )}

      <button className="fab mobile-only" aria-label="Add item" onClick={() => setSheet({ open: true, goal: null })}>
        <Icon d={I.plus} size={26} />
      </button>
      <GoalSheet open={sheet.open} area={areaId} goal={sheet.goal} onClose={() => setSheet(s => ({ ...s, open: false }))} />
      <AreaSheet open={editArea} area={area} onClose={() => setEditArea(false)} />
    </main>
  )
}
