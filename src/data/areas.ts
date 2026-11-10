import type { Area } from '../lib/types'

// 24×24 single-stroke line icons (paths only). Keys are stored on each area.
export const ICONS: Record<string, string> = {
  health: 'M3 12h4l2-5 4 10 2-5h6',
  hobbies: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z',
  work: 'M4 8h16v11H4z M9 8V5h6v3 M4 13h16',
  business: 'M4 19h16 M6 15l4-4 3 3 6-6 M15 8h4v4',
  friends: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M3 19c0-3 3-5 6-5s6 2 6 5 M16 5.5a3 3 0 0 1 0 5.5 M18 14c2 .6 3 2.4 3 5',
  family: 'M4 11l8-6 8 6 M6 9.5V19h12V9.5 M10 19v-5h4v5',
  purpose: 'M12 3v18 M3 12h18 M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  money: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M15 9c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2.2 0 3 6 1.6 6 4.6 0 1.4-1.3 2.2-3 2.2-1.4 0-2.6-.6-3-1.6 M12 6v1.5 M12 16.5V18',
  relationship: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  other: 'M6 12h.01 M12 12h.01 M18 12h.01',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21V5 M8 7h7',
  plane: 'M3 13l7-2 4-8 2 1-2 7 6 2v2l-6-1-3 6h-2l1-6-7-1z',
  globe: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19l7-7',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1z M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  dumbbell: 'M6 7v10 M18 7v10 M3 10v4 M21 10v4 M6 12h12',
  mountain: 'M3 20l6-11 4 6 2-3 6 8z M8 11l1.5 1.5L11 11',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4z M12 17a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7z',
  code: 'M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14',
  palette: 'M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-2 0-1.5 1-2 2.5-2H18a3 3 0 0 0 3-3c0-6-4-11-9-11z M7.5 11h.01 M10 7h.01 M15 7h.01',
  cup: 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z M17 10h1.5a2.5 2.5 0 0 1 0 5H17 M8 3v2 M12 3v2',
  gift: 'M4 10h16v10H4z M3 7h18v3H3z M12 7v13 M12 7c-1-3-5-4-5-1.5S11 7 12 7c1 0 5 1 5-1.5S13 4 12 7',
  paw: 'M12 20c-3 0-5-1.5-5-3.5S9.5 12 12 12s5 2.5 5 4.5-2 3.5-5 3.5z M6 11a1.6 2 0 1 0 0-.01 M18 11a1.6 2 0 1 0 0-.01 M9 7a1.6 2 0 1 0 0-.01 M15 7a1.6 2 0 1 0 0-.01',
  star: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
}

export const iconPath = (key: string | undefined) => ICONS[key ?? ''] ?? ICONS.other

export const DEFAULT_AREAS: Area[] = [
  ['health', 'Health'], ['hobbies', 'Hobbies'], ['work', 'Work'], ['business', 'Business'], ['friends', 'Friends'],
  ['family', 'Family'], ['purpose', 'Purpose'], ['money', 'Money'], ['relationship', 'Relationship'], ['other', 'Other'],
].map(([id, name], position) => ({ id, name, icon: id, position }))

export const SEED: Record<string, string[]> = {
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
