import { db, newId } from '../schema'
import type { Priority, Status, Task } from '../types'
import { logActivity } from './activity'

export interface NewTask {
  projectId: string
  title: string
  status?: Status
  priority?: Priority
  description?: string
  labelIds?: string[]
  dueDate?: string | null
  estimateMin?: number | null
  plannedFor?: string | null
}

export async function createTask(input: NewTask): Promise<string> {
  return db.transaction('rw', [db.projects, db.tasks, db.activity], async () => {
    const project = await db.projects.get(input.projectId)
    if (!project) throw new Error('Project not found')
    const status = input.status ?? 'todo'
    const column = await db.tasks.where('projectId').equals(input.projectId).filter((t) => t.status === status).toArray()
    const maxOrder = column.reduce((m, t) => Math.max(m, t.order), 0)
    const now = Date.now()
    const task: Task = {
      id: newId(),
      projectId: input.projectId,
      number: project.nextNumber,
      title: input.title.trim(),
      description: input.description ?? '',
      status,
      priority: input.priority ?? 'medium',
      labelIds: input.labelIds ?? [],
      dueDate: input.dueDate ?? null,
      estimateMin: input.estimateMin ?? null,
      order: maxOrder + 1000,
      checklist: [],
      plannedFor: input.plannedFor ?? null,
      createdAt: now,
      updatedAt: now,
      startedAt: status === 'in_progress' ? now : null,
      completedAt: status === 'done' ? now : null,
    }
    await db.projects.update(project.id, { nextNumber: project.nextNumber + 1 })
    await db.tasks.add(task)
    await logActivity(task.id, 'created')
    return task.id
  })
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'projectId' | 'number' | 'createdAt'>>

const fmt = (v: unknown) => (v === null || v === undefined ? null : String(v))

export async function updateTask(id: string, patch: TaskPatch) {
  await db.transaction('rw', [db.tasks, db.activity, db.timeEntries], async () => {
    const old = await db.tasks.get(id)
    if (!old) return
    const now = Date.now()
    const changes: TaskPatch = { ...patch, updatedAt: now }

    if (patch.status && patch.status !== old.status) {
      await logActivity(id, 'status', old.status, patch.status)
      if (patch.status === 'in_progress' && !old.startedAt) changes.startedAt = now
      if (patch.status === 'done') {
        changes.completedAt = now
        // Finishing a task stops its running timer.
        await db.timeEntries
          .where('taskId')
          .equals(id)
          .filter((e) => e.end === null)
          .modify({ end: now })
      } else if (old.status === 'done') {
        changes.completedAt = null
      }
    }
    if (patch.priority && patch.priority !== old.priority) await logActivity(id, 'priority', old.priority, patch.priority)
    if ('dueDate' in patch && patch.dueDate !== old.dueDate) await logActivity(id, 'due', fmt(old.dueDate), fmt(patch.dueDate))
    if ('estimateMin' in patch && patch.estimateMin !== old.estimateMin)
      await logActivity(id, 'estimate', fmt(old.estimateMin), fmt(patch.estimateMin))

    await db.tasks.update(id, changes)
  })
}

/**
 * Applies a change computed from the latest saved task. Use this for edits based on the current
 * value (checklist, labels) so quick successive edits don't overwrite each other.
 */
export async function modifyTask(id: string, change: (task: Task) => TaskPatch) {
  await db.transaction('rw', [db.tasks, db.activity, db.timeEntries], async () => {
    const task = await db.tasks.get(id)
    if (task) await updateTask(id, change(task))
  })
}

export async function deleteTask(id: string) {
  await db.transaction('rw', [db.tasks, db.timeEntries, db.comments, db.activity], async () => {
    await db.timeEntries.where('taskId').equals(id).delete()
    await db.comments.where('taskId').equals(id).delete()
    await db.activity.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}
