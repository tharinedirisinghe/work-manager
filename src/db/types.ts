export type Status = 'backlog' | 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]

export const statusLabel = (s: Status) => STATUSES.find((x) => x.id === s)!.label
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.id === p)!.label
export const priorityRank = (p: Priority) => PRIORITIES.findIndex((x) => x.id === p)

export interface Project {
  id: string
  name: string
  key: string
  color: string
  nextNumber: number
  archived: boolean
  createdAt: number
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  projectId: string
  number: number
  title: string
  description: string
  status: Status
  priority: Priority
  labelIds: string[]
  /** yyyy-MM-dd */
  dueDate: string | null
  estimateMin: number | null
  /** Fractional sort position within a status column. */
  order: number
  checklist: ChecklistItem[]
  /** yyyy-MM-dd the task is planned for (Today view). */
  plannedFor: string | null
  createdAt: number
  updatedAt: number
  /** First time the task entered In Progress. */
  startedAt: number | null
  completedAt: number | null
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface TimeEntry {
  id: string
  taskId: string
  start: number
  /** null while the timer is running. */
  end: number | null
  note: string
}

export interface Comment {
  id: string
  taskId: string
  body: string
  createdAt: number
  editedAt: number | null
}

export type ActivityType = 'created' | 'status' | 'priority' | 'due' | 'estimate' | 'comment'

export interface Activity {
  id: string
  taskId: string
  type: ActivityType
  from: string | null
  to: string | null
  at: number
}

export interface Insight {
  kind: 'win' | 'warn' | 'tip'
  text: string
}

export interface TaskSummary {
  key: string
  title: string
  project: string
  estimateMin: number | null
  actualMin: number
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  completed: TaskSummary[]
  createdCount: number
  startedCount: number
  totalMinutes: number
  prevCompletedCount: number
  prevTotalMinutes: number
  minutesByProject: { project: string; minutes: number }[]
  /** Monday..Sunday */
  minutesByWeekday: number[]
  minutesByPartOfDay: { morning: number; afternoon: number; evening: number; night: number }
  estimate: { tasks: number; estimatedMin: number; actualMin: number } | null
  overdue: { key: string; title: string; dueDate: string }[]
  stuck: { key: string; title: string; days: number }[]
  plannedNotDone: number
  inProgressCount: number
  wipLimit: number
}

export interface Review {
  weekStart: string
  createdAt: number
  stats: WeeklyStats
  insights: Insight[]
  aiReport: string | null
}

export interface Setting {
  key: string
  value: unknown
}
