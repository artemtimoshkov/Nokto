import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Mini apps: small side apps that live under the "Mini apps" tab.
 * Each one sits in its own folder under src/apps/, owns its data and styles,
 * and is only downloaded when it is first opened.
 */
export interface MiniAppProps {
  /** Demo mode: keep data in this browser instead of Supabase. */
  demo: boolean
  /** The signed-in user's id ('demo' in demo mode), for keeping an offline copy per account. */
  user: string
  /** Route segments after `#/apps/<id>/`. */
  path: string[]
}

export interface MiniApp {
  id: string
  name: string
  icon: string
  Component: LazyExoticComponent<ComponentType<MiniAppProps>>
}

export const MINI_APPS: MiniApp[] = [
  {
    id: 'circle',
    name: 'Circle',
    icon: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M3 19c0-3 3-5 6-5s6 2 6 5 M16 5.5a3 3 0 0 1 0 5.5 M18 14c2 .6 3 2.4 3 5',
    Component: lazy(() => import('./circle')),
  },
  {
    id: 'kitchen',
    name: 'Raw',
    icon: 'M8 3v5a4 4 0 0 0 8 0V3 M12 3v7 M12 12v9',
    Component: lazy(() => import('./kitchen')),
  },
  {
    id: 'folio',
    name: 'TL;DR',
    icon: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z M4 20a2 2 0 0 0 2 2h13v-4 M8 7h7',
    Component: lazy(() => import('./folio')),
  },
  {
    id: 'reps',
    name: 'Reps',
    icon: 'M6.5 6.5v11 M17.5 6.5v11 M3.5 9v6 M20.5 9v6 M6.5 12h11',
    Component: lazy(() => import('./reps')),
  },
]
