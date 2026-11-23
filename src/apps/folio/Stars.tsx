import { Icon } from '../../components/Icon'
import { F } from './icons'

/** Five stars. With onChange, tap a star to rate; tap the same star again to clear. */
export function Stars({ value, size = 14, onChange }: { value: number | null; size?: number; onChange?(v: number | null): void }) {
  const v = value ?? 0
  if (!onChange) {
    return (
      <span className="f-stars" role="img" aria-label={value ? `${value} out of 5 stars` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map(i => <Icon key={i} d={F.star} size={size} fill={i <= v} className={i <= v ? 'on' : ''} />)}
      </span>
    )
  }
  return (
    <span className="f-stars edit" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" role="radio" aria-checked={i === v} aria-label={`${i} ${i === 1 ? 'star' : 'stars'}`}
          className={i <= v ? 'on' : ''} onClick={() => onChange(i === v ? null : i)}>
          <Icon d={F.star} size={size} fill={i <= v} />
        </button>
      ))}
    </span>
  )
}
