import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './schema'
import type { Project } from './types'

export const useProjects = () => useLiveQuery(() => db.projects.orderBy('createdAt').toArray(), [], [])

export const useProject = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await db.projects.get(id)) ?? null) : null), [id])

export const useProjectMap = () => {
  const projects = useProjects()
  return new Map<string, Project>(projects.map((p) => [p.id, p]))
}

export const useTasks = (projectId?: string) =>
  useLiveQuery(
    () => (projectId ? db.tasks.where('projectId').equals(projectId).toArray() : db.tasks.toArray()),
    [projectId],
    [],
  )

export const useTask = (id: string | null) => useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id])

export const useLabels = () => useLiveQuery(() => db.labels.orderBy('name').toArray(), [], [])

export const useTimeEntries = (taskId?: string) =>
  useLiveQuery(
    () => (taskId ? db.timeEntries.where('taskId').equals(taskId).sortBy('start') : db.timeEntries.toArray()),
    [taskId],
    [],
  )

/** Total tracked minutes per task (a running timer counts up to now). */
export const useMinutesByTask = () => {
  const entries = useTimeEntries()
  const map = new Map<string, number>()
  const now = Date.now()
  for (const e of entries) map.set(e.taskId, (map.get(e.taskId) ?? 0) + ((e.end ?? now) - e.start) / 60000)
  return map
}

export const useRunningEntry =() => useLiveQuery(() => db.timeEntries.filter((e) => e.end === null).first(), [])

export const useComments = (taskId: string) =>
  useLiveQuery(() => db.comments.where('taskId').equals(taskId).sortBy('createdAt'), [taskId], [])

export const useActivity = (taskId: string) =>
  useLiveQuery(() => db.activity.where('taskId').equals(taskId).sortBy('at'), [taskId], [])

export const useReviews = () => useLiveQuery(() => db.reviews.orderBy('weekStart').reverse().toArray(), [], [])

export const taskKey = (project: Project | null | undefined, number: number) => `${project?.key ?? '?'}-${number}`
