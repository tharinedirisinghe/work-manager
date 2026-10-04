import { ENTITY_COLORS } from '../../components/styles'
import { db, newId } from '../schema'

export const LABEL_COLORS = ENTITY_COLORS

export async function createLabel(name: string, color?: string): Promise<string> {
  const count = await db.labels.count()
  const id = newId()
  await db.labels.add({ id, name: name.trim(), color: color ?? LABEL_COLORS[count % LABEL_COLORS.length] })
  return id
}

/** Finds labels by name (case-insensitive), creating missing ones. Returns their ids. */
export async function ensureLabels(names: string[]): Promise<string[]> {
  const all = await db.labels.toArray()
  const ids: string[] = []
  for (const name of names) {
    const found = all.find((l) => l.name.toLowerCase() === name.toLowerCase())
    if (found) {
      ids.push(found.id)
    } else {
      const id = await createLabel(name)
      all.push({ id, name, color: '' })
      ids.push(id)
    }
  }
  return ids
}

export async function deleteLabel(id: string) {
  await db.transaction('rw', [db.labels, db.tasks], async () => {
    await db.tasks
      .filter((t) => t.labelIds.includes(id))
      .modify((t) => {
        t.labelIds = t.labelIds.filter((x) => x !== id)
      })
    await db.labels.delete(id)
  })
}
