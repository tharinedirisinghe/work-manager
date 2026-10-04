import { db, newId } from '../schema'
import { logActivity } from './activity'

export async function addComment(taskId: string, body: string) {
  await db.transaction('rw', [db.comments, db.activity], async () => {
    await db.comments.add({ id: newId(), taskId, body: body.trim(), createdAt: Date.now(), editedAt: null })
    await logActivity(taskId, 'comment')
  })
}

export function editComment(id: string, body: string) {
  return db.comments.update(id, { body: body.trim(), editedAt: Date.now() })
}

export function deleteComment(id: string) {
  return db.comments.delete(id)
}
