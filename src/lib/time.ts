import type { TimeEntry } from '../db/types'

export function entryMinutes(e: TimeEntry, now = Date.now()): number {
  return Math.max(0, ((e.end ?? now) - e.start) / 60000)
}

export function totalMinutes(entries: TimeEntry[], now = Date.now()): number {
  return entries.reduce((sum, e) => sum + entryMinutes(e, now), 0)
}

/** 95 -> "1h 35m", 0 -> "0m" */
export function formatMinutes(min: number): string {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${rest}m`
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`
}

/** 3725000 ms -> "1:02:05" */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Parses "2h", "90m", "1h30m", "1.5h", "45" (minutes). Returns null if invalid. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s))
  const m = s.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/)
  if (!m || (!m[1] && !m[2])) return null
  const total = (m[1] ? parseFloat(m[1]) * 60 : 0) + (m[2] ? parseInt(m[2], 10) : 0)
  return total > 0 ? Math.round(total) : null
}
