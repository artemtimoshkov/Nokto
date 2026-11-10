import type { AreaId } from '../lib/types'

export interface Area { id: AreaId; name: string; icon: string }

// 24×24 single-stroke line icons (paths only).
export const AREAS: Area[] = [
  { id: 'health', name: 'Health', icon: 'M3 12h4l2-5 4 10 2-5h6' },
  { id: 'hobbies', name: 'Hobbies', icon: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z' },
  { id: 'work', name: 'Work', icon: 'M4 8h16v11H4z M9 8V5h6v3 M4 13h16' },
  { id: 'business', name: 'Business', icon: 'M4 19h16 M6 15l4-4 3 3 6-6 M15 8h4v4' },
  { id: 'friends', name: 'Friends', icon: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M3 19c0-3 3-5 6-5s6 2 6 5 M16 5.5a3 3 0 0 1 0 5.5 M18 14c2 .6 3 2.4 3 5' },
  { id: 'family', name: 'Family', icon: 'M4 11l8-6 8 6 M6 9.5V19h12V9.5 M10 19v-5h4v5' },
  { id: 'purpose', name: 'Purpose', icon: 'M12 3v18 M3 12h18 M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z' },
  { id: 'money', name: 'Money', icon: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M15 9c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2.2 0 3 6 1.6 6 4.6 0 1.4-1.3 2.2-3 2.2-1.4 0-2.6-.6-3-1.6 M12 6v1.5 M12 16.5V18' },
  { id: 'relationship', name: 'Relationship', icon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
  { id: 'other', name: 'Other', icon: 'M6 12h.01 M12 12h.01 M18 12h.01' },
]

export const areaById = (id: AreaId | null | undefined) => AREAS.find(a => a.id === id)

export const SEED: Record<AreaId, string[]> = {
  health: ['Run a marathon', 'Reach and keep my ideal weight', 'Sleep 8 hours consistently', 'Do a 7-day silent retreat'],
  hobbies: ['Learn to play the piano', 'Become fluent in a new language', 'Learn to surf', 'Write a book'],
  work: ['Become a recognized expert in my field', 'Speak at a major conference', "Lead a team I'm proud of"],
  business: ['Launch my own company', 'Reach $1M in annual revenue', 'Build something that runs without me'],
  friends: ['Take a trip with my closest friends every year', 'Host a regular dinner for friends', 'Reconnect with an old friend'],
  family: ['Take my parents on their dream trip', "Record my grandparents' life stories", 'Be there for every important family moment'],
  purpose: ['Write down my personal mission', 'Mentor 10 people', 'Give back to a cause I care about'],
  money: ['Build a 6-month emergency fund', 'Become debt-free', 'Reach financial independence', 'Buy my own home'],
  relationship: ['Find a partner I deeply love', 'Get married', 'Plan a once-in-a-lifetime honeymoon'],
  other: ['Visit 50 countries', 'See the Northern Lights', 'Skydive'],
}
