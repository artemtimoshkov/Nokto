import { Icon, I } from './Icon'
import { go } from '../lib/route'

export function TabBar({ tab }: { tab: 'today' | 'goals' }) {
  return (
    <nav className="tabbar">
      <button className={tab === 'today' ? 'active' : ''} onClick={() => go('/today')}>
        <Icon d={I.today} size={22} /><span>Today</span>
      </button>
      <button className={tab === 'goals' ? 'active' : ''} onClick={() => go('/goals')}>
        <Icon d={I.star} size={22} /><span>Bucket list</span>
      </button>
    </nav>
  )
}
