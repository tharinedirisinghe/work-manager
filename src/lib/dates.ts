import { differenceInCalendarDays, format, parseISO } from 'date-fns'

/** Human-friendly due date: "Today", "Tomorrow", "Yesterday", "Fri", "9 Oct", "9 Oct 2027". */
export function formatDue(iso: string, now = new Date()): string {
  const date = parseISO(iso)
  const diff = differenceInCalendarDays(date, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return format(date, 'EEE')
  return format(date, date.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy')
}
