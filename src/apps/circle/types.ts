export type Closeness = 'best' | 'good' | 'acquaintance'

export const CLOSENESS: { id: Closeness; label: string; plural: string }[] = [
  { id: 'best', label: 'Best friend', plural: 'Best friends' },
  { id: 'good', label: 'Good friend', plural: 'Good friends' },
  { id: 'acquaintance', label: 'Acquaintance', plural: 'Acquaintances' },
]

export interface Sibling { name: string; note: string }

export interface Friend {
  id: string
  name: string
  closeness: Closeness
  /** Small square JPEG as a data URL, or null. */
  photo: string | null
  birth_month: number | null // 1–12
  birth_day: number | null // 1–31
  birth_year: number | null // optional: age is shown only when known
  grew_up: string
  nationality: string
  lives_in: string
  work: string
  partner: string
  how_we_met: string
  /** Profile URL or username. */
  linkedin: string
  /** Profile URL or @username. */
  instagram: string
  siblings: Sibling[]
  about: string
  /** yyyy-MM-dd: the last time you talked or met. */
  last_contact: string | null
  created_at: string
}

export interface FriendNote {
  id: string
  friend_id: string
  body: string
  /** yyyy-MM-dd: when the conversation happened. */
  date: string
  created_at: string
}

export type FriendDraft = Omit<Friend, 'id' | 'created_at'>

export const emptyFriend = (): FriendDraft => ({
  name: '', closeness: 'good', photo: null, birth_month: null, birth_day: null, birth_year: null,
  grew_up: '', nationality: '', lives_in: '', work: '', partner: '', how_we_met: '', linkedin: '', instagram: '',
  siblings: [], about: '', last_contact: null,
})
