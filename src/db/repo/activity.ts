import { db, newId } from '../schema'
import type { ActivityType } from '../types'

export function logActivity(taskId: string, type: ActivityType, from: string | null = null, to: string | null = null) {
  return db.activity.add({ id: newId(), taskId, type, from, to, at: Date.now() })
}
