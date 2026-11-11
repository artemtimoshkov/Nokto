import type { Friend } from './types'

const TINTS = ['#e5372b', '#f08a3e', '#d4a72c', '#3fa36b', '#2f8fbf', '#5b6ee1', '#9b5de5', '#d6589e']

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'

/** Photo, or initials on a colour picked from the name. */
export function Avatar({ friend, size = 40 }: { friend: Pick<Friend, 'name' | 'photo'>; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  if (friend.photo) return <img className="c-avatar" style={style} src={friend.photo} alt="" />
  const tint = TINTS[[...friend.name].reduce((h, c) => h + c.charCodeAt(0), 0) % TINTS.length]
  return <span className="c-avatar" style={{ ...style, color: tint, background: `color-mix(in srgb, ${tint} 14%, transparent)` }}>{initials(friend.name)}</span>
}
