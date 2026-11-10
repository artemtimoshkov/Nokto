export type AreaId =
  | 'health' | 'hobbies' | 'work' | 'business' | 'friends'
  | 'family' | 'purpose' | 'money' | 'relationship' | 'other'

export type Priority = 1 | 2 | 3

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly'
  interval: number
  /** ISO weekdays, 1 = Monday … 7 = Sunday (weekly only) */
  byWeekday?: number[]
  /** Day of month 1–31 (monthly only) */
  byMonthDay?: number
  /** Daily, skipping Saturday and Sunday */
  weekdaysOnly?: boolean
  /** yyyy-MM-dd, inclusive; null/undefined = never ends */
  endsOn?: string | null
}

export interface Todo {
  id: string
  title: string
  area: AreaId | null
  priority: Priority
  due_date: string | null // yyyy-MM-dd
  due_time: string | null // HH:mm
  recurrence: Recurrence | null
  completed_at: string | null
  created_at: string
}

export interface Goal {
  id: string
  area: AreaId
  title: string
  note: string
  done: boolean
  done_at: string | null
  position: number
  created_at: string
}
