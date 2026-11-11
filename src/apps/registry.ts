import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Mini apps: small side apps that live under the "Mini apps" tab.
 * Each one sits in its own folder under src/apps/, owns its data and styles,
 * and is only downloaded when it is first opened.
 */
export interface MiniAppProps {
  /** Demo mode: keep data in this browser instead of Supabase. */
  demo: boolean
  /** Route segments after `#/apps/<id>/`. */
  path: string[]
}

export interface MiniApp {
  id: string
  name: string
  tagline: string
  icon: string
  Component: LazyExoticComponent<ComponentType<MiniAppProps>>
}

export const MINI_APPS: MiniApp[] = [
  {
    id: 'circle',
    name: 'Circle',
    tagline: 'Friends, birthdays and what you talked about',
    icon: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6z M3 19c0-3 3-5 6-5s6 2 6 5 M16 5.5a3 3 0 0 1 0 5.5 M18 14c2 .6 3 2.4 3 5',
    Component: lazy(() => import('./circle')),
  },
]
