import { Icon, I } from './Icon'
import { go, type Tab } from '../lib/route'

export function TabBar({ tab }: { tab: Tab }) {
  return (
    <nav className="tabbar">
      <button className={tab === 'today' ? 'active' : ''} onClick={() => go('/today')}>
        <Icon d={I.today} size={22} /><span>Today</span>
      </button>
      <button className={tab === 'goals' ? 'active' : ''} onClick={() => go('/goals')}>
        <Icon d={I.star} size={22} /><span>Bucket list</span>
      </button>
      <button className={tab === 'apps' ? 'active' : ''} onClick={() => go('/apps')}>
        <Icon d={I.apps} size={22} /><span>Mini apps</span>
      </button>
    </nav>
  )
}
