import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Icon, I } from '../../components/Icon'
import { go } from '../../lib/route'
import { useCircle } from './store'
import { Avatar } from './Avatar'
import { photoFromFile } from './photo'
import { CLOSENESS, emptyFriend, type Friend, type FriendDraft, type Sibling } from './types'
import { C } from './icons'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const TEXT_FIELDS: { key: keyof FriendDraft & ('grew_up' | 'nationality' | 'lives_in' | 'work' | 'partner' | 'how_we_met' | 'linkedin' | 'instagram'); label: string; placeholder: string }[] = [
  { key: 'grew_up', label: 'Grew up', placeholder: 'City, country' },
  { key: 'nationality', label: 'Nationality', placeholder: 'e.g. Ukrainian, Canadian' },
  { key: 'lives_in', label: 'Lives in', placeholder: 'City' },
  { key: 'work', label: 'Work', placeholder: 'What they do' },
  { key: 'partner', label: 'Partner', placeholder: 'Name' },
  { key: 'how_we_met', label: 'How we met', placeholder: 'Where, when, through whom' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'Profile link or username' },
  { key: 'instagram', label: 'Instagram', placeholder: '@username' },
]

/** Add (friend = null) or edit a friend. */
export function FriendSheet({ open, friend, onClose }: { open: boolean; friend: Friend | null; onClose(): void }) {
  const circle = useCircle()
  const [d, setD] = useState<FriendDraft>(emptyFriend)
  const [year, setYear] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (friend) { const { id: _i, created_at: _c, ...rest } = friend; setD({ ...rest, siblings: [...rest.siblings] }) }
    else { setD(emptyFriend()); setTimeout(() => nameRef.current?.focus(), 60) }
    setYear(friend?.birth_year ? String(friend.birth_year) : '')
    setConfirm(false); setPhotoError(false)
  }, [open, friend])

  const set = <K extends keyof FriendDraft>(k: K, v: FriendDraft[K]) => setD(x => ({ ...x, [k]: v }))
  const setSib = (i: number, patch: Partial<Sibling>) => set('siblings', d.siblings.map((s, j) => j === i ? { ...s, ...patch } : s))

  const pick = async (file?: File) => {
    if (!file) return
    try { set('photo', await photoFromFile(file)); setPhotoError(false) } catch { setPhotoError(true) }
  }

  const thisYear = new Date().getFullYear()
  const validYear = /^\d{4}$/.test(year) && Number(year) > 1900 && Number(year) <= thisYear

  const submit = () => {
    const name = d.name.trim()
    if (!name) return
    const clean: FriendDraft = {
      ...d, name,
      ...Object.fromEntries(TEXT_FIELDS.map(f => [f.key, d[f.key].trim()])),
      about: d.about.trim(),
      siblings: d.siblings.map(s => ({ name: s.name.trim(), note: s.note.trim() })).filter(s => s.name),
      birth_day: d.birth_month ? d.birth_day : null,
      birth_year: d.birth_month && d.birth_day && validYear ? Number(year) : null,
    }
    if (friend) circle.saveFriend(friend.id, clean)
    else go(`/apps/circle/${circle.addFriend(clean)}`)
    onClose()
  }

  const maxDay = d.birth_month ? DAYS_IN[d.birth_month - 1] : 31

  return (
    <>
      <Sheet open={open && !confirm} onClose={onClose} className="todo-sheet c-sheet">
        <div className="c-photo-row">
          <button className="c-photo" aria-label={d.photo ? 'Change photo' : 'Add photo'} onClick={() => fileRef.current?.click()}>
            {d.photo || d.name.trim() ? <Avatar friend={d} size={64} /> : <span className="c-photo-empty"><Icon d={C.camera} size={24} /></span>}
            <span className="c-photo-badge"><Icon d={C.camera} size={13} /></span>
          </button>
          <input ref={nameRef} className="title-input" placeholder="Name" value={d.name} enterKeyHint="done"
            onChange={e => set('name', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {d.photo && <button className="c-link" onClick={() => set('photo', null)}>Remove photo</button>}
        {photoError && <p className="error small">Couldn't read that image. Try a JPEG or PNG.</p>}

        <div className="seg c-seg" role="radiogroup" aria-label="Type of friend">
          {CLOSENESS.map(c => (
            <button key={c.id} role="radio" aria-checked={d.closeness === c.id} className={d.closeness === c.id ? 'sel' : ''}
              onClick={() => set('closeness', c.id)}>{c.label}</button>
          ))}
        </div>

        <div className="c-form">
          <div className="c-field">
            <span className="c-label">Birthday</span>
            <div className="c-bday-inputs">
              <select aria-label="Birth day" value={d.birth_day ?? ''} onChange={e => set('birth_day', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
              <select aria-label="Birth month" value={d.birth_month ?? ''} onChange={e => {
                const m = e.target.value ? Number(e.target.value) : null
                setD(x => ({ ...x, birth_month: m, birth_day: m && x.birth_day && x.birth_day > DAYS_IN[m - 1] ? DAYS_IN[m - 1] : x.birth_day }))
              }}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <input className={`c-input c-year ${year && !validYear ? 'bad' : ''}`} inputMode="numeric" placeholder="Year" aria-label="Birth year (optional)"
                value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            {year.length === 4 && !validYear && <span className="error small">Year should be between 1901 and {thisYear}.</span>}
          </div>

          {TEXT_FIELDS.map(f => (
            <label key={f.key} className="c-field">
              <span className="c-label">{f.label}</span>
              <input className="c-input" placeholder={f.placeholder} value={d[f.key]} onChange={e => set(f.key, e.target.value)}
                {...(f.key === 'linkedin' || f.key === 'instagram' ? { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, inputMode: 'url' as const } : {})} />
            </label>
          ))}

          <div className="c-field">
            <span className="c-label">Siblings</span>
            <div className="c-sibs">
              {d.siblings.map((s, i) => (
                <div key={i} className="c-sib-row">
                  <input className="c-input" placeholder="Name" aria-label="Sibling name" value={s.name} onChange={e => setSib(i, { name: e.target.value })} />
                  <input className="c-input grow" placeholder="Older sister, 32…" aria-label="About this sibling" value={s.note} onChange={e => setSib(i, { note: e.target.value })} />
                  <button className="icon-btn danger" aria-label="Remove sibling" onClick={() => set('siblings', d.siblings.filter((_, j) => j !== i))}><Icon d={I.x} size={16} /></button>
                </div>
              ))}
              <button className="c-link" onClick={() => set('siblings', [...d.siblings, { name: '', note: '' }])}>+ Add sibling</button>
            </div>
          </div>

          <label className="c-field">
            <span className="c-label">About</span>
            <textarea className="c-input c-area" rows={3} placeholder="Background, interests, kids, pets, food they love…"
              value={d.about} onChange={e => set('about', e.target.value)} />
          </label>
        </div>

        <div className="sheet-foot">
          {friend
            ? <button className="icon-btn danger" aria-label="Delete friend" onClick={() => setConfirm(true)}><Icon d={I.trash} /></button>
            : <span />}
          <button className="send" aria-label={friend ? 'Save friend' : 'Add friend'} disabled={!d.name.trim()} onClick={submit}>
            <Icon d={friend ? I.check : I.arrowUp} size={20} />
          </button>
        </div>
      </Sheet>

      <Sheet open={open && confirm} onClose={() => setConfirm(false)}>
        <p className="confirm-text">Delete {friend?.name} and their notes?</p>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { circle.deleteFriend(friend!.id); onClose(); go('/apps/circle') }}>Delete</button>
        </div>
      </Sheet>
    </>
  )
}
