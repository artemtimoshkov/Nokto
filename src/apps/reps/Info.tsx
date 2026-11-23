import { useEffect, useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon } from '../../components/Icon'
import { useCatalogEntry } from './catalog'
import { cap, catalogMuscle, equipmentLabel, muscleLabel, photoUrl } from './muscles'
import { R } from './icons'
import type { CatalogEntry, Exercise } from './types'

/** The start and end position, swapped every second so it reads as the movement. */
export function Photos({ entry, size = 'big' }: { entry: CatalogEntry; size?: 'big' | 'thumb' }) {
  const [frame, setFrame] = useState(0)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    if (size === 'thumb' || entry.photos < 2) return
    const t = setInterval(() => setFrame(f => 1 - f), 1100)
    return () => clearInterval(t)
  }, [entry.id, entry.photos, size])
  if (!entry.photos || broken) {
    return size === 'thumb'
      ? <span className="r-thumb r-thumb-empty"><Icon d={R.dumbbell} size={20} /></span>
      : null
  }
  if (size === 'thumb') {
    return <img className="r-thumb" src={photoUrl(entry.id, 0)} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
  }
  return (
    <div className="r-photos" aria-label={`${entry.name}, start and end position`}>
      {[0, 1].slice(0, entry.photos).map(n => (
        <img key={n} src={photoUrl(entry.id, n)} alt="" className={frame === n ? 'on' : ''} onError={() => setBroken(true)} />
      ))}
      {entry.photos > 1 && <span className="r-frame">{frame === 0 ? 'Start' : 'End'}</span>}
    </div>
  )
}

/** Photos, muscles and step-by-step instructions. */
export function ExerciseInfo({ entry, exercise }: { entry: CatalogEntry | null; exercise?: Exercise }) {
  const tags = entry
    ? [muscleLabel(exercise?.muscle ?? catalogMuscle(entry)), equipmentLabel(entry.equipment), cap(entry.level)].filter(Boolean)
    : exercise ? [muscleLabel(exercise.muscle)] : []
  const secondary = entry?.secondary.length ? entry.secondary.map(cap).join(', ') : ''
  return (
    <>
      {entry && <Photos entry={entry} />}
      <div className="r-tags">{tags.map(t => <span key={t} className="r-tag">{t}</span>)}</div>
      {entry && (
        <p className="r-works muted small">
          Works {entry.primary.join(', ')}{secondary && <>, also {secondary.toLowerCase()}</>}
        </p>
      )}
      {exercise?.video_url && (
        <a className="r-video" href={exercise.video_url} target="_blank" rel="noopener noreferrer">
          <Icon d={R.video} size={18} />Watch how to do it
        </a>
      )}
      {entry?.steps.length ? (
        <ol className="r-steps">{entry.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      ) : !exercise?.video_url && (
        <p className="muted small">No instructions for your own exercises. Add a video link to remember how it goes.</p>
      )}
    </>
  )
}

/** Info window for a catalog or own exercise, with an optional action at the bottom. */
export function InfoSheet({ open, catalogId, exercise, onClose, children }: {
  open: boolean; catalogId: string | null | undefined; exercise?: Exercise; onClose(): void; children?: ReactNode
}) {
  const entry = useCatalogEntry(catalogId ?? exercise?.catalog_id)
  const name = exercise?.name ?? entry?.name ?? ''
  return (
    <Sheet open={open} onClose={onClose} className="r-info" title={name}>
      {(entry || exercise) && <ExerciseInfo entry={entry} exercise={exercise} />}
      {children && <div className="r-info-foot">{children}</div>}
    </Sheet>
  )
}
