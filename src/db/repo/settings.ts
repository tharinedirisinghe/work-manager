import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  /** Max tasks in progress before warning; 0 disables the warning. */
  wipLimit: number
  apiKey: string
  lastBackupDate: string | null
  backupDir: FileSystemDirectoryHandle | null
  defaultProjectId: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  wipLimit: 3,
  apiKey: '',
  lastBackupDate: null,
  backupDir: null,
  defaultProjectId: null,
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = await db.settings.get(key)
  return row ? (row.value as Settings[K]) : DEFAULT_SETTINGS[key]
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value })
}

export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useLiveQuery(() => getSetting(key), [key], DEFAULT_SETTINGS[key])
}
