import type { Insight, WeeklyStats } from '../db/types'
import { formatMinutes } from './time'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function change(now: number, prev: number): string {
  if (prev === 0) return ''
  const pct = Math.round(((now - prev) / prev) * 100)
  if (pct === 0) return ' (same as last week)'
  return ` (${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% vs last week)`
}

/** Turns weekly stats into short, rule-based observations and suggestions. */
export function generateInsights(s: WeeklyStats): Insight[] {
  const out: Insight[] = []
  const done = s.completed.length

  if (done > 0) {
    out.push({ kind: 'win', text: `Completed ${done} task${done === 1 ? '' : 's'}${change(done, s.prevCompletedCount)}.` })
  } else {
    out.push({ kind: 'warn', text: 'No tasks completed this week. Pick one small task and finish it first next week.' })
  }

  if (s.totalMinutes > 0) {
    out.push({ kind: 'win', text: `Logged ${formatMinutes(s.totalMinutes)} of focused work${change(s.totalMinutes, s.prevTotalMinutes)}.` })
  } else if (done > 0) {
    out.push({ kind: 'tip', text: 'No time was tracked. Use the timer so your estimates and reviews get more accurate.' })
  }

  if (s.estimate) {
    const ratio = s.estimate.actualMin / s.estimate.estimatedMin
    const pct = Math.round(Math.abs(ratio - 1) * 100)
    if (ratio > 1.2) {
      out.push({ kind: 'warn', text: `Tasks took ${pct}% longer than estimated. Pad new estimates by about ${pct}%, or split big tasks.` })
    } else if (ratio < 0.8) {
      out.push({ kind: 'tip', text: `Tasks took ${pct}% less time than estimated. You can plan more per day.` })
    } else {
      out.push({ kind: 'win', text: 'Your estimates were within 20% of actual time. Nice calibration.' })
    }
  }

  if (s.stuck.length > 0) {
    out.push({
      kind: 'warn',
      text: `${s.stuck.length} task${s.stuck.length === 1 ? ' has' : 's have'} been in progress for over 5 days (${s.stuck
        .slice(0, 3)
        .map((t) => t.key)
        .join(', ')}). Split, finish or move ${s.stuck.length === 1 ? 'it' : 'them'} back to the backlog.`,
    })
  }

  if (s.overdue.length > 0) {
    out.push({ kind: 'warn', text: `${s.overdue.length} overdue task${s.overdue.length === 1 ? '' : 's'}. Reschedule or drop them so due dates stay meaningful.` })
  }

  if (s.wipLimit > 0 && s.inProgressCount > s.wipLimit) {
    out.push({ kind: 'warn', text: `${s.inProgressCount} tasks are in progress (limit ${s.wipLimit}). Finish before starting new ones.` })
  }

  if (s.plannedNotDone > 0) {
    out.push({ kind: 'tip', text: `${s.plannedNotDone} task${s.plannedNotDone === 1 ? '' : 's'} planned this week ${s.plannedNotDone === 1 ? 'was' : 'were'} not finished. Plan fewer tasks per day.` })
  }

  if (s.createdCount > Math.max(3, done * 2)) {
    out.push({ kind: 'tip', text: `You added ${s.createdCount} tasks but finished ${done}. Prune the backlog so it stays useful.` })
  }

  if (s.totalMinutes >= 60) {
    const best = s.minutesByWeekday.indexOf(Math.max(...s.minutesByWeekday))
    const parts = Object.entries(s.minutesByPartOfDay).sort((a, b) => b[1] - a[1])
    out.push({ kind: 'tip', text: `Most productive: ${WEEKDAY_NAMES[best]}s, mostly in the ${parts[0][0]}. Protect that time for deep work.` })

    const top = s.minutesByProject[0]
    if (s.minutesByProject.length > 1 && top.minutes / s.totalMinutes > 0.7) {
      out.push({ kind: 'tip', text: `${top.project} took ${Math.round((top.minutes / s.totalMinutes) * 100)}% of your time. Check that other projects aren't stalling.` })
    }
  }

  return out
}
