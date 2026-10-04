import { DATA_TABLES, db } from '../db/schema'
import { getSetting, setSetting } from '../db/repo/settings'
import { isoDate } from './weeklyStats'

const BACKUP_PREFIX = 'work-manager-backup-'
const KEEP_BACKUPS = 14

export interface BackupFile {
  app: 'work-manager'
  version: 1
  exportedAt: string
  data: Record<string, unknown[]>
}

export async function exportData(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {}
  for (const name of DATA_TABLES) data[name] = await db.table(name).toArray()
  return { app: 'work-manager', version: 1, exportedAt: new Date().toISOString(), data }
}

/** Replaces all data with the backup's contents. */
export async function importData(backup: unknown) {
  const b = backup as BackupFile
  if (!b || b.app !== 'work-manager' || typeof b.data !== 'object') {
    throw new Error('This file is not a Work Manager backup.')
  }
  await db.transaction('rw', DATA_TABLES.map((n) => db.table(n)), async () => {
    for (const name of DATA_TABLES) {
      const rows = b.data[name]
      if (!Array.isArray(rows)) continue
      await db.table(name).clear()
      await db.table(name).bulkPut(rows)
    }
  })
}

export async function downloadBackup() {
  const json = JSON.stringify(await exportData(), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${BACKUP_PREFIX}${isoDate(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Asks the browser not to evict our storage under disk pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export const folderBackupSupported = () => typeof window.showDirectoryPicker === 'function'

export async function pickBackupFolder(): Promise<string | null> {
  if (!window.showDirectoryPicker) return null
  const dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'work-manager-backups' })
  await setSetting('backupDir', dir)
  await setSetting('lastBackupDate', null)
  await runAutoBackup({ force: true })
  return dir.name
}

export type BackupResult = 'done' | 'skipped' | 'no-folder' | 'needs-permission' | 'error'

/**
 * Writes today's backup into the chosen folder (once a day) and keeps the newest 14 files.
 * Returns 'needs-permission' when the browser wants the user to re-grant folder access.
 */
export async function runAutoBackup({ force = false } = {}): Promise<BackupResult> {
  const dir = await getSetting('backupDir')
  if (!dir) return 'no-folder'
  const today = isoDate(new Date())
  if (!force && (await getSetting('lastBackupDate')) === today) return 'skipped'
  try {
    const permission = (await dir.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
    if (permission !== 'granted') return 'needs-permission'

    const file = await dir.getFileHandle(`${BACKUP_PREFIX}${today}.json`, { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(await exportData()))
    await writable.close()
    await setSetting('lastBackupDate', today)

    if (dir.keys) {
      const names: string[] = []
      for await (const name of dir.keys()) if (name.startsWith(BACKUP_PREFIX) && name.endsWith('.json')) names.push(name)
      names.sort().reverse()
      for (const old of names.slice(KEEP_BACKUPS)) await dir.removeEntry(old)
    }
    return 'done'
  } catch (err) {
    console.error('Auto-backup failed', err)
    return 'error'
  }
}

/** Must be called from a click handler: browsers only show the permission prompt after a user gesture. */
export async function regrantBackupPermission(): Promise<boolean> {
  const dir = await getSetting('backupDir')
  if (!dir?.requestPermission) return false
  const result = await dir.requestPermission({ mode: 'readwrite' })
  if (result !== 'granted') return false
  return (await runAutoBackup()) !== 'error'
}
