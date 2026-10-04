import { addDays, format } from 'date-fns'
import type { Priority } from '../db/types'
import { parseDuration } from './time'

export interface ParsedQuickAdd {
  title: string
  priority?: Priority
  labels: string[]
  dueDate?: string
  estimateMin?: number
  today: boolean
}

const PRIORITY_ALIASES: Record<string, Priority> = {
  low: 'low',
  l: 'low',
  '1': 'low',
  medium: 'medium',
  med: 'medium',
  m: 'medium',
  '2': 'medium',
  high: 'high',
  h: 'high',
  '3': 'high',
  urgent: 'urgent',
  u: 'urgent',
  '4': 'urgent',
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Resolves "today", "tomorrow", "fri", "+3d", "2026-10-09" to yyyy-MM-dd. */
export function parseDue(value: string, now: Date): string | undefined {
  const v = value.toLowerCase()
  const iso = (d: Date) => format(d, 'yyyy-MM-dd')
  if (v === 'today' || v === 'tod') return iso(now)
  if (v === 'tomorrow' || v === 'tom') return iso(addDays(now, 1))
  const rel = v.match(/^\+(\d+)([dw])$/)
  if (rel) return iso(addDays(now, parseInt(rel[1], 10) * (rel[2] === 'w' ? 7 : 1)))
  const wd = v.length >= 3 ? WEEKDAYS.findIndex((d) => d.startsWith(v)) : -1
  if (wd >= 0) {
    // Next occurrence of that weekday, counting today.
    return iso(addDays(now, (wd - now.getDay() + 7) % 7))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return undefined
}

/**
 * Parses quick-add text such as "Fix nav !high #portfolio due:fri ~2h @today".
 * Tokens that don't parse are kept in the title.
 */
export function parseQuickAdd(input: string, now = new Date()): ParsedQuickAdd {
  const result: ParsedQuickAdd = { title: '', labels: [], today: false }
  const words: string[] = []
  for (const token of input.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase()
    if (lower.startsWith('!') && PRIORITY_ALIASES[lower.slice(1)]) {
      result.priority = PRIORITY_ALIASES[lower.slice(1)]
    } else if (token.startsWith('#') && token.length > 1) {
      result.labels.push(token.slice(1))
    } else if (lower.startsWith('due:') && parseDue(token.slice(4), now)) {
      result.dueDate = parseDue(token.slice(4), now)
    } else if (token.startsWith('~') && parseDuration(token.slice(1))) {
      result.estimateMin = parseDuration(token.slice(1))!
    } else if (lower === '@today') {
      result.today = true
    } else {
      words.push(token)
    }
  }
  result.title = words.join(' ')
  return result
}
