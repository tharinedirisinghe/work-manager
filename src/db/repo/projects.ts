import { ENTITY_COLORS } from '../../components/styles'
import { db, newId } from '../schema'
import type { Project } from '../types'

export const PROJECT_COLORS = ENTITY_COLORS

/** "My Portfolio Web" -> "MPW", "portfolio" -> "PORT" */
export function deriveKey(name: string): string {
  const words = name.trim().split(/[^A-Za-z0-9]+/).filter(Boolean)
  const key = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? 'PRJ')
  return key.slice(0, 4).toUpperCase() || 'PRJ'
}

export async function createProject(name: string, key?: string, color?: string): Promise<string> {
  const count = await db.projects.count()
  const project: Project = {
    id: newId(),
    name: name.trim(),
    key: (key?.trim() || deriveKey(name)).toUpperCase(),
    color: color ?? PROJECT_COLORS[count % PROJECT_COLORS.length],
    nextNumber: 1,
    archived: false,
    createdAt: Date.now(),
  }
  await db.projects.add(project)
  return project.id
}

export function updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'key' | 'color' | 'archived'>>) {
  return db.projects.update(id, patch)
}

export async function deleteProject(id: string) {
  await db.transaction('rw', [db.projects, db.tasks, db.timeEntries, db.comments, db.activity], async () => {
    const taskIds = (await db.tasks.where('projectId').equals(id).primaryKeys()) as string[]
    await db.timeEntries.where('taskId').anyOf(taskIds).delete()
    await db.comments.where('taskId').anyOf(taskIds).delete()
    await db.activity.where('taskId').anyOf(taskIds).delete()
    await db.tasks.bulkDelete(taskIds)
    await db.projects.delete(id)
  })
}
