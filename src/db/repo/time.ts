import { db, newId } from '../schema'

export async function getRunningEntry() {
  return db.timeEntries.filter((e) => e.end === null).first()
}

/** Starts a timer on a task; only one timer runs at a time. */
export async function startTimer(taskId: string) {
  await db.transaction('rw', db.timeEntries, async () => {
    const now = Date.now()
    await db.timeEntries.filter((e) => e.end === null).modify({ end: now })
    await db.timeEntries.add({ id: newId(), taskId, start: now, end: null, note: '' })
  })
}

export async function stopTimer() {
  const now = Date.now()
  await db.timeEntries.filter((e) => e.end === null).modify({ end: now })
}

/** Adds a manual entry of `minutes` ending at `end`. */
export function addManualEntry(taskId: string, minutes: number, end: number, note = '') {
  return db.timeEntries.add({ id: newId(), taskId, start: end - minutes * 60000, end, note })
}

export function deleteEntry(id: string) {
  return db.timeEntries.delete(id)
}
