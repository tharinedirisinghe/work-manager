import Dexie, { type EntityTable } from 'dexie'
import type { Activity, Comment, Label, Project, Review, Setting, Task, TimeEntry } from './types'

const OLD_TO_MUTED: Record<string, string> = {
  '#6366f1': '#6a86a8',
  '#0ea5e9': '#6a86a8',
  '#10b981': '#5b8a84',
  '#14b8a6': '#5b8a84',
  '#f59e0b': '#b0955a',
  '#eab308': '#b0955a',
  '#ef4444': '#b0806a',
  '#f97316': '#b0806a',
  '#ec4899': '#a86f82',
  '#8b5cf6': '#8c7aa8',
  '#a855f7': '#8c7aa8',
  '#22c55e': '#7f9b6c',
  '#64748b': '#7c8590',
}

class WorkManagerDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  tasks!: EntityTable<Task, 'id'>
  labels!: EntityTable<Label, 'id'>
  timeEntries!: EntityTable<TimeEntry, 'id'>
  comments!: EntityTable<Comment, 'id'>
  activity!: EntityTable<Activity, 'id'>
  reviews!: EntityTable<Review, 'weekStart'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('work-manager')
    this.version(1).stores({
      projects: 'id, createdAt',
      tasks: 'id, projectId, status, plannedFor, dueDate, updatedAt, completedAt',
      labels: 'id, name',
      timeEntries: 'id, taskId, start',
      comments: 'id, taskId, createdAt',
      activity: 'id, taskId, at',
      reviews: 'weekStart',
      settings: 'key',
    })
    // v2: move projects and labels from the old saturated colors to the muted palette.
    this.version(2).upgrade(async (tx) => {
      const remap = (c: string) => OLD_TO_MUTED[c.toLowerCase()] ?? c
      await tx.table('projects').toCollection().modify((p: Project) => void (p.color = remap(p.color)))
      await tx.table('labels').toCollection().modify((l: Label) => void (l.color = remap(l.color)))
    })
  }
}

export const db = new WorkManagerDB()

/** Tables included in backups (settings are excluded: they hold the API key and folder handle). */
export const DATA_TABLES = ['projects', 'tasks', 'labels', 'timeEntries', 'comments', 'activity', 'reviews'] as const
export type DataTable = (typeof DATA_TABLES)[number]

export const newId = () => crypto.randomUUID()
