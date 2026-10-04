import { addDays, format, startOfWeek } from 'date-fns'
import type { Activity, Project, Task, TimeEntry, WeeklyStats } from '../db/types'
import { entryMinutes } from './time'

export interface StatsInput {
  projects: Project[]
  tasks: Task[]
  timeEntries: TimeEntry[]
  activity: Activity[]
  wipLimit: number
}

const DAY = 86400000
const STUCK_DAYS = 5

export const weekStartOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
export const isoDate = (d: Date | number) => format(d, 'yyyy-MM-dd')

function partOfDay(hour: number): keyof WeeklyStats['minutesByPartOfDay'] {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/** Collects the facts for the week starting at `weekStart` (a Monday). For the current week, stats are "so far". */
export function computeWeeklyStats(input: StatsInput, weekStart: Date, now = new Date()): WeeklyStats {
  const start = weekStart.getTime()
  const end = addDays(weekStart, 7).getTime()
  const prevStart = addDays(weekStart, -7).getTime()
  const asOf = Math.min(end, now.getTime())
  const asOfIso = isoDate(asOf - 1)
  const between = (t: number | null, a: number, b: number) => t !== null && t >= a && t < b

  const projects = new Map(input.projects.map((p) => [p.id, p]))
  const tasks = new Map(input.tasks.map((t) => [t.id, t]))
  const keyOf = (t: Task) => `${projects.get(t.projectId)?.key ?? '?'}-${t.number}`
  const projectName = (t: Task | undefined) => (t && projects.get(t.projectId)?.name) || 'Unknown'

  const minutesByTask = new Map<string, number>()
  for (const e of input.timeEntries) {
    minutesByTask.set(e.taskId, (minutesByTask.get(e.taskId) ?? 0) + entryMinutes(e, asOf))
  }

  const weekEntries = input.timeEntries.filter((e) => between(e.start, start, end))
  const prevEntries = input.timeEntries.filter((e) => between(e.start, prevStart, start))
  const sum = (entries: TimeEntry[]) => entries.reduce((s, e) => s + entryMinutes(e, asOf), 0)

  const byProject = new Map<string, number>()
  const minutesByWeekday = [0, 0, 0, 0, 0, 0, 0]
  const minutesByPartOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const e of weekEntries) {
    const m = entryMinutes(e, asOf)
    const name = projectName(tasks.get(e.taskId))
    byProject.set(name, (byProject.get(name) ?? 0) + m)
    const d = new Date(e.start)
    minutesByWeekday[(d.getDay() + 6) % 7] += m
    minutesByPartOfDay[partOfDay(d.getHours())] += m
  }

  const completedTasks = input.tasks.filter((t) => t.status === 'done' && between(t.completedAt, start, end))
  const completed = completedTasks.map((t) => ({
    key: keyOf(t),
    title: t.title,
    project: projectName(t),
    estimateMin: t.estimateMin,
    actualMin: Math.round(minutesByTask.get(t.id) ?? 0),
  }))

  const compared = completed.filter((t) => t.estimateMin && t.actualMin > 0)
  const estimate = compared.length
    ? {
        tasks: compared.length,
        estimatedMin: compared.reduce((s, t) => s + t.estimateMin!, 0),
        actualMin: compared.reduce((s, t) => s + t.actualMin, 0),
      }
    : null

  const open = input.tasks.filter((t) => t.status !== 'done')
  const weekStartIso = isoDate(weekStart)
  const weekEndIso = isoDate(addDays(weekStart, 6))

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    completed,
    createdCount: input.tasks.filter((t) => between(t.createdAt, start, end)).length,
    startedCount: new Set(
      input.activity
        .filter((a) => a.type === 'status' && a.to === 'in_progress' && between(a.at, start, end))
        .map((a) => a.taskId),
    ).size,
    totalMinutes: Math.round(sum(weekEntries)),
    prevCompletedCount: input.tasks.filter((t) => t.status === 'done' && between(t.completedAt, prevStart, start)).length,
    prevTotalMinutes: Math.round(sum(prevEntries)),
    minutesByProject: [...byProject]
      .map(([project, minutes]) => ({ project, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes),
    minutesByWeekday: minutesByWeekday.map(Math.round),
    minutesByPartOfDay: {
      morning: Math.round(minutesByPartOfDay.morning),
      afternoon: Math.round(minutesByPartOfDay.afternoon),
      evening: Math.round(minutesByPartOfDay.evening),
      night: Math.round(minutesByPartOfDay.night),
    },
    estimate,
    overdue: open
      .filter((t) => t.dueDate && t.dueDate < asOfIso)
      .map((t) => ({ key: keyOf(t), title: t.title, dueDate: t.dueDate! })),
    stuck: open
      .filter((t) => t.status === 'in_progress' && t.startedAt && asOf - t.startedAt > STUCK_DAYS * DAY)
      .map((t) => ({ key: keyOf(t), title: t.title, days: Math.floor((asOf - t.startedAt!) / DAY) })),
    plannedNotDone: open.filter((t) => t.plannedFor && t.plannedFor >= weekStartIso && t.plannedFor <= weekEndIso).length,
    inProgressCount: open.filter((t) => t.status === 'in_progress').length,
    wipLimit: input.wipLimit,
  }
}
