export const I = {
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 7.5h.01',
  clock: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M12 7v5l3 2',
  repeat: 'M17 2l3 3-3 3 M4 11V9a4 4 0 0 1 4-4h12 M7 22l-3-3 3-3 M20 13v2a4 4 0 0 1-4 4H4',
  sun: 'M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  sunrise: 'M17 18a5 5 0 0 0-10 0 M12 2v7 M4.2 10.2l1.4 1.4 M1 18h2 M21 18h2 M18.4 11.6l1.4-1.4 M23 22H1 M8 6l4-4 4 4',
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3 M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z M5 18v2 M19 18v2',
  none: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M5.6 5.6l12.8 12.8',
  arrowUp: 'M12 19V5 M5 12l7-7 7 7',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  today: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M12 13.5v3',
  star: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6',
  note: 'M4 6h16 M4 12h16 M4 18h10',
  x: 'M6 6l12 12 M18 6L6 18',
  missed: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M9 9l6 6 M15 9l-6 6',
}

export function Icon({ d, size = 20, className, fill }: { d: string; size?: number; className?: string; fill?: boolean }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
